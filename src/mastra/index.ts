/**
 * Agentic Ally - Main Agent Framework Entry Point
 *
 * Sets up and configures 5 specialized agents:
 * 1. Microlearning Agent - 4-state orchestrator for training generation
 * 2. Orchestrator Agent - Routes requests to appropriate agents
 * 3. User Info Agent - Gathers user profile and context
 * 4. Policy Summary Agent - Generates legal compliance content
 * 5. Phishing Email Agent - Creates realistic phishing simulations
 *
 * API Endpoints:
 * - POST /chat - Main chat endpoint (routes through orchestrator)
 * - GET /health - Health check endpoint with system status
 *
 * Request Flow:
 * 1. Request arrives at /chat
 * 2. PII masking applied
 * 3. Orchestrator agent determines target agent
 * 4. Specific agent executes (microlearning, phishing, etc.)
 * 5. Response streamed to client
 *
 * Configuration:
 * - Environment variables in .env file
 * - Rate limiting: 100 req/min for /chat, 300 req/min for /health
 * - Cloudflare Workers deployment with KV + D1 backends
 * - Memory: D1Store with optional Turso persistence
 *
 * See CLAUDE.md for architectural philosophy and design decisions.
 * See .cursorrules for code standards and patterns.
 */

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { registerApiRoute } from '@mastra/core/server';
import { Context, Next } from 'hono';
import { D1Store } from '@mastra/cloudflare-d1';
import { RATE_LIMIT_CONFIG } from './constants';

// Silence AI SDK warnings (e.g., unsupported presencePenalty/frequencyPenalty for some models)
(globalThis as any).AI_SDK_LOG_WARNINGS = false;
import { getDeployer } from './deployer';
import { codeReviewCheckTool } from './tools';
import { parseAndValidateRequest } from './utils/chat-request-helpers';
import { extractArtifactIdsFromRoutingContext } from './utils/chat-request-helpers';
import {
  preparePIIMaskedInput,
  extractAndPrepareThreadId,
  buildFinalPromptWithModelOverride,
  routeToAgent,
  createAgentStream,
  injectOrchestratorContext,
} from './utils/chat-orchestration-helpers';
import { normalizeSafeId } from './utils/core/id-utils';

// Barrel imports - clean organization
import {
  microlearningAgent,
  orchestratorAgent,
  phishingEmailAgent,
  userInfoAgent,
  policySummaryAgent,
} from './agents';
import {
  errorHandlerMiddleware,
  authTokenMiddleware,
  contextStorage,
  requestLoggingMiddleware,
  securityHeadersMiddleware,
  bodySizeLimitMiddleware,
  rateLimitMiddleware,
  disablePlayground,
  disableSwagger,
} from './middleware';
import {
  createMicrolearningWorkflow,
  addLanguageWorkflow,
  addMultipleLanguagesWorkflow,
  updateMicrolearningWorkflow,
} from './workflows';
import { ExampleRepo, executeAutonomousGeneration, performHealthCheck } from './services';
import { validateEnvironmentOrThrow } from './utils/core';
import type {
  ChatRequestBody,
  CodeReviewRequestBody,
  AutonomousRequestBody,
  CloudflareEnv,
} from './types';

// Type import for D1 database
import type { D1Database } from './services/example-repo';

// Validate environment variables at startup (fail-fast)
validateEnvironmentOrThrow();

const logger = new PinoLogger({
  name: 'Mastra',
  level: 'info',
});
// Middleware to inject D1 database into ExampleRepo
const injectD1Database = async (c: Context, next: Next) => {
  // Check if we have D1 database in the environment (binding name from wrangler)
  const env = c.env as CloudflareEnv | undefined;
  if (env && env.agentic_ally_embeddings_cache) {
    const repo = ExampleRepo.getInstance();

    // Runtime validation: ensure D1 database binding exists
    const d1Database = env.agentic_ally_embeddings_cache;
    if (!d1Database) {
      logger.warn('d1_database_binding_null_after_check');
      await next();
      return;
    }

    // Type assertion: Cloudflare Workers D1Database type
    repo.setDatabase(d1Database as D1Database);
    logger.info('d1_database_injected');
  } else if (process.env.NODE_ENV === 'development') {
    // Local development - D1 bindings not available in mastra dev
    logger.debug('d1_database_disabled_development_mode');
  } else {
    logger.warn('d1_database_not_available');
  }
  await next();
};

export const mastra = new Mastra({
  workflows: {
    createMicrolearningWorkflow,
    addLanguageWorkflow,
    addMultipleLanguagesWorkflow,
    updateMicrolearningWorkflow
  },
  agents: {
    microlearningAgent,
    phishingEmailAssistant: phishingEmailAgent,
    userInfoAssistant: userInfoAgent,
    policySummaryAssistant: policySummaryAgent,
    orchestrator: orchestratorAgent
  },
  logger,
  deployer: getDeployer(),
  // Note: These env vars are validated at startup by validateEnvironmentOrThrow()
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  storage: new D1Store({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!,
    tablePrefix: "dev_",
  }),
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  server: {
    /**
     * MIDDLEWARE EXECUTION ORDER (left to right = first to last)
     * ========================================================
     *
     * ORDER MATTERS! Each middleware depends on previous ones.
     *
     * 1. contextStorage (FIRST)
     *    - Purpose: Initialize request context + correlation ID
     *    - Why first: All subsequent middleware/handlers need context to be available
     *    - Dependency: None
     *    - Provides: c.get('mastra'), request context, correlationId
     *
     * 2. requestLoggingMiddleware (SECOND)
     *    - Purpose: Log all requests with timing and status
     *    - Why second: Needs correlationId, measures total request duration
     *    - Logs: method, path, status, duration (ms)
     *
     * 3. securityHeadersMiddleware (THIRD)
     *    - Purpose: Add OWASP security headers to all responses
     *    - Why third: Security headers should be applied early
     *    - Adds: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, etc.
     *
     * 4. bodySizeLimitMiddleware (FOURTH)
     *    - Purpose: Prevent DoS via oversized payloads
     *    - Why fourth: Reject large requests before rate limiting counts them
     *    - Rejects: Requests > 1MB with 413 Payload Too Large
     *
     * 5. rateLimitMiddleware (FIFTH)
     *    - Purpose: Rate limiting (security boundary)
     *    - Why fifth: Applied before any business logic executes
     *    - Dependency: contextStorage (for request identification)
     *    - Rejects: Requests exceeding rate limit with 429 (Retry-After header)
     *
     * 6. injectD1Database (SIXTH)
     *    - Purpose: Inject Cloudflare D1 database binding into ExampleRepo
     *    - Why sixth: Handlers need DB access, security checks should complete first
     *    - Dependency: contextStorage
     *    - Modifies: ExampleRepo singleton with D1 database instance
     *
     * 7. disablePlayground & disableSwagger (LAST)
     *    - Purpose: Modify OpenAPI/Swagger documentation
     *    - Why last: Applied after all service setup is complete
     *    - Dependency: All previous middleware
     *    - Modifies: HTTP headers for OpenAPI responses
     *
     * CRITICAL: Do not reorder without understanding dependencies!
     */
    middleware: [
      errorHandlerMiddleware, // First: catch all unhandled errors
      authTokenMiddleware, // Second: require X-AGENTIC-ALLY-TOKEN (skip /health)
      contextStorage,
      requestLoggingMiddleware,
      securityHeadersMiddleware,
      bodySizeLimitMiddleware,
      rateLimitMiddleware({
        maxRequests: RATE_LIMIT_CONFIG.MAX_REQUESTS,
        windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
        skip: (c) => c.req.path === '/health', // Skip health checks from rate limiting
      }),
      injectD1Database,
      disablePlayground,
      disableSwagger
    ],
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        /**
         * POST /chat - Main chat endpoint with PII-aware orchestrator routing
         *
         * SECURITY STRATEGY - PII Handling:
         * ====================================
         *
         * RULE 1: Orchestrator ALWAYS receives MASKED data (no PII exposure)
         * - Purpose: Routing decision should be intent-based, not PII-based
         * - Implementation: maskPII() replaces names, emails, phone numbers
         * - Example: "John's email is john@company.com" → "[PERSON1]'s email is [EMAIL1]"
         *
         * RULE 2: Agent ALWAYS receives UNMASKED data (for tool execution)
         * - Purpose: Tools need real names/emails to work with external APIs (CRM, email, etc.)
         * - Implementation: Original prompt + unmasked taskContext from orchestrator
         * - Example: Agent gets "[CONTEXT: User is in IT dept]\n\nJohn's email is john@company.com"
         *
         * FLOW:
         * -----
         * 1. Parse user input (keep original prompt)
         * 2. Mask prompt + routingContext for orchestrator routing
         * 3. Pass masked data to orchestrator → get taskContext (which is also masked)
         * 4. Unmask taskContext using piiMapping (reverse the masking)
         * 5. Inject unmasked taskContext into original prompt for agent
         * 6. Agent receives: [Original prompt] + [Unmasked orchestrator context]
         *
         * RESULT:
         * -------
         * ✅ Routing is intent-based (not influenced by PII)
         * ✅ Tools get real data they need for external integrations
         * ✅ No PII leaks to orchestrator routing logic
         */
        handler: async (c: Context) => {
          const mastra = c.get('mastra');

          // Step 1: Parse and validate chat request
          let body: ChatRequestBody = {};
          try {
            body = await c.req.json<ChatRequestBody>();
          } catch {
            // ignore JSON parse errors
          }

          const parsedRequest = parseAndValidateRequest(body);
          if (!parsedRequest) {
            return c.json({
              success: false,
              message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.',
            }, 400);
          }

          const { prompt, routingContext } = parsedRequest;

          // Debug: Parse result
          logger.info('🔍 PARSE_RESULT Chat request parsed successfully', {
            prompt: prompt,
            routingContext: routingContext
          });

          // Step 2: Prepare PII-masked orchestrator input
          const { orchestratorInput, piiMapping } = preparePIIMaskedInput(prompt, routingContext);

          // Step 3: Extract or generate thread ID
          const threadId = extractAndPrepareThreadId(body);

          // Step 4: Route to agent
          let routeResult;
          try {
            routeResult = await routeToAgent(mastra, orchestratorInput);
            logger.info('🎬 FINAL_ROUTING Agent selected', {
              agentName: routeResult.agentName,
              taskContext: routeResult.taskContext
            });
          } catch (routingError) {
            logger.error('agent_routing_failed', {
              error: routingError instanceof Error ? routingError.message : String(routingError),
            });
            return c.json({
              success: false,
              error: 'Agent routing failed',
              message: routingError instanceof Error ? routingError.message : 'Unknown routing error',
            }, 500);
          }

          // Verify agent exists
          const agent = mastra.getAgent(routeResult.agentName);
          if (!agent) {
            logger.error('agent_not_found', { agentName: routeResult.agentName });
            return c.json({
              success: false,
              error: 'Agent not found',
              message: `Agent "${routeResult.agentName}" is not available`,
            }, 500);
          }

          // Step 5: Build final prompt with model overrides
          let finalPrompt = buildFinalPromptWithModelOverride(
            prompt,
            body?.modelProvider,
            body?.model
          );

          // Inject deterministic artifact IDs (short, code-derived) so agents don't have to guess from long history
          const {
            microlearningId,
            phishingId,
            resourceId,
            scenarioResourceId,
            landingPageResourceId,
            languageId,
            sendTrainingLanguageId,
            targetUserResourceId,
            targetGroupResourceId,
          } = extractArtifactIdsFromRoutingContext(routingContext);

          if (
            microlearningId ||
            phishingId ||
            resourceId ||
            scenarioResourceId ||
            landingPageResourceId ||
            languageId ||
            sendTrainingLanguageId ||
            targetUserResourceId ||
            targetGroupResourceId
          ) {
            // Canonical / allowlisted [ARTIFACT_IDS] block (key=value, stable order, safe chars only)
            const safeMicrolearningId = normalizeSafeId(microlearningId);
            const safePhishingId = normalizeSafeId(phishingId);
            const safeResourceId = normalizeSafeId(resourceId);
            const safeScenarioResourceId = normalizeSafeId(scenarioResourceId);
            const safeLandingPageResourceId = normalizeSafeId(landingPageResourceId);
            const safeLanguageId = normalizeSafeId(languageId);
            const safeSendTrainingLanguageId = normalizeSafeId(sendTrainingLanguageId);
            const safeTargetUserResourceId = normalizeSafeId(targetUserResourceId);
            const safeTargetGroupResourceId = normalizeSafeId(targetGroupResourceId);

            const parts = [
              safeMicrolearningId ? `microlearningId=${safeMicrolearningId}` : undefined,
              safePhishingId ? `phishingId=${safePhishingId}` : undefined,
              // upload/assign IDs (phishing + training)
              safeResourceId ? `resourceId=${safeResourceId}` : undefined,
              safeScenarioResourceId ? `scenarioResourceId=${safeScenarioResourceId}` : undefined,
              safeLandingPageResourceId ? `landingPageResourceId=${safeLandingPageResourceId}` : undefined,
              safeLanguageId ? `languageId=${safeLanguageId}` : undefined,
              safeSendTrainingLanguageId ? `sendTrainingLanguageId=${safeSendTrainingLanguageId}` : undefined,
              safeTargetUserResourceId ? `targetUserResourceId=${safeTargetUserResourceId}` : undefined,
              safeTargetGroupResourceId ? `targetGroupResourceId=${safeTargetGroupResourceId}` : undefined,
            ].filter(Boolean);

            if (parts.length > 0) {
              finalPrompt = `[ARTIFACT_IDS] ${parts.join(' ')}\n\n${finalPrompt}`;
            }
          }

          // Step 6: Inject orchestrator context (unmasked)
          finalPrompt = injectOrchestratorContext(
            finalPrompt,
            routeResult.taskContext,
            piiMapping
          );

          // Step 7: Create agent stream
          let stream;
          try {
            stream = await createAgentStream(
              agent,
              finalPrompt,
              threadId,
              routeResult.agentName
            );
          } catch (streamError) {
            logger.error('stream_creation_failed', {
              error: streamError instanceof Error ? streamError.message : String(streamError),
            });
            return c.json({
              success: false,
              error: 'Stream creation failed',
              message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
            }, 500);
          }

          return stream.toUIMessageStreamResponse({
            sendReasoning: true
          });
        },
      }),

      registerApiRoute('/health', {
        method: 'GET',
        handler: async (c) => {
          const mastra = c.get('mastra');
          const agents = mastra.getAgents();
          const workflows = mastra.getWorkflows();

          // Perform deep health check with 5s timeout
          const healthResponse = await performHealthCheck(agents, workflows, 5000);

          // Return appropriate HTTP status based on health
          const httpStatus = healthResponse.status === 'healthy' ? 200
            : healthResponse.status === 'degraded' ? 200
              : 503;

          return c.json({
            success: healthResponse.status !== 'unhealthy',
            message: 'Agentic Ally deployment successful',
            ...healthResponse,
          }, httpStatus);
        },
      }),

      registerApiRoute('/code-review-validate', {
        method: 'POST',
        handler: async (c: Context) => {
          try {
            const body = await c.req.json<CodeReviewRequestBody>();

            // Type-safe execution - Tool.execute expects root-level fields matching inputSchema
            if (!codeReviewCheckTool.execute) {
              throw new Error('Code review tool execute method not available');
            }
            const result = await codeReviewCheckTool.execute(body as Parameters<typeof codeReviewCheckTool.execute>[0]);

            if (result.success) {
              return c.json(result, 200);
            } else {
              return c.json(result, 400);
            }
          } catch (error) {
            logger.error('code_review_validation_error', {
              error: error instanceof Error ? error.message : String(error),
            });
            return c.json({
              success: false,
              data: {
                isCorrect: false,
                severity: 'incorrect',
                feedback: 'Error validating code',
                explanation: error instanceof Error ? error.message : 'Unknown error occurred',
                points: 0,
                hint: '',
              },
              error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
          }
        },
      }),

      registerApiRoute('/autonomous', {
        method: 'POST',
        handler: async (c: Context) => {
          try {
            const body = await c.req.json<AutonomousRequestBody>();
            const { token, firstName, lastName, targetUserResourceId, targetGroupResourceId, departmentName, actions, sendAfterPhishingSimulation, preferredLanguage, baseApiUrl } = body;
            const env = c.env as CloudflareEnv | undefined;

            // Validation
            if (!token) {
              return c.json({ success: false, error: 'Missing token' }, 400);
            }

            // Check assignment type: user or group (not both, not neither)
            const isUserAssignment = !!(firstName || targetUserResourceId);
            const isGroupAssignment = !!targetGroupResourceId;

            if (isUserAssignment && isGroupAssignment) {
              return c.json({ success: false, error: 'Cannot specify both user assignment (firstName/targetUserResourceId) and group assignment (targetGroupResourceId)' }, 400);
            }

            if (!isUserAssignment && !isGroupAssignment) {
              return c.json({ success: false, error: 'Must specify either user assignment (firstName) or group assignment (targetGroupResourceId)' }, 400);
            }

            if (!actions || !Array.isArray(actions) || actions.length === 0) {
              return c.json({ success: false, error: 'Missing or invalid actions array' }, 400);
            }
            if (!actions.every((a: string) => a === 'training' || a === 'phishing')) {
              return c.json({ success: false, error: 'Actions must be "training" and/or "phishing"' }, 400);
            }

            logger.info('autonomous_request_received', {
              firstName,
              lastName,
              targetUserResourceId,
              targetGroupResourceId,
              actionsCount: actions.length,
              assignmentType: isUserAssignment ? 'user' : 'group'
            });

            // Primary path: Cloudflare Workflow binding
            try {
              const workflow = env?.AUTONOMOUS_WORKFLOW;
              if (workflow && workflow.create) {
                const instance = await workflow.create({
                  params: {
                    token,
                    firstName,
                    lastName,
                    targetUserResourceId,
                    targetGroupResourceId,
                    departmentName,
                    actions,
                    sendAfterPhishingSimulation,
                    preferredLanguage,
                    baseApiUrl
                  }
                });

                logger.info('autonomous_workflow_started', { workflowId: instance?.id });
                return c.json({
                  success: true,
                  workflowId: instance?.id ?? null,
                  status: 'started',
                  firstName,
                  lastName,
                  targetUserResourceId,
                  targetGroupResourceId,
                  assignmentType: isUserAssignment ? 'user' : 'group',
                  actions
                }, 202);
              }
              logger.warn('autonomous_workflow_binding_missing_falling_back');
            } catch (workflowError) {
              logger.warn('autonomous_workflow_start_failed_falling_back', {
                error: workflowError instanceof Error ? workflowError.message : String(workflowError)
              });
            }

            const requestPayload = {
              token,
              firstName,
              lastName,
              targetUserResourceId,
              targetGroupResourceId,
              departmentName,
              actions: actions as ('training' | 'phishing')[],
              sendAfterPhishingSimulation,
              preferredLanguage,
              baseApiUrl
            };

            // Fallback 1: run in background via waitUntil if available (preferred in Workers)
            try {
              // @ts-ignore - ExecutionContext check for Cloudflare Workers
              if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
                const executionPromise = executeAutonomousGeneration(requestPayload).catch(err => {
                  logger.error('autonomous_background_execution_failed', {
                    error: err instanceof Error ? err.message : String(err)
                  });
                });
                // @ts-ignore
                c.executionCtx.waitUntil(executionPromise);
                logger.debug('background_task_registered_with_waituntil');

                return c.json({
                  success: true,
                  message: 'Autonomous generation started in background. This process may take 5-10 minutes.',
                  status: 'processing',
                  firstName,
                  lastName,
                  targetUserResourceId,
                  targetGroupResourceId,
                  assignmentType: isUserAssignment ? 'user' : 'group',
                  actions
                }, 200);
              }
            } catch (waitUntilError) {
              logger.warn('waituntil_not_available_using_floating_promise', {
                error: waitUntilError instanceof Error ? waitUntilError.message : String(waitUntilError),
              });
            }

            // Fallback 2 (LOCAL DEV): no workflow binding and no waitUntil.
            // Run inline so local requests reliably complete (avoids "floating promise" being dropped).
            logger.warn('autonomous_no_workflow_no_waituntil_running_inline');
            const result = await executeAutonomousGeneration(requestPayload);

            return c.json({
              ...result,
              status: result.success ? 'completed' : 'failed',
            }, 200);

          } catch (error) {
            logger.error('autonomous_endpoint_error', {
              error: error instanceof Error ? error.message : String(error),
            });
            return c.json({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
          }
        },
      }),
    ],
  },
});