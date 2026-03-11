/**
 * Agentic Ally - Main Agent Framework Entry Point
 *
 * Sets up and configures 9 specialized agents:
 * 1. Orchestrator Agent - Routes requests to appropriate agents
 * 2. Microlearning Agent - 4-state orchestrator for training generation
 * 3. Phishing Email Agent - Creates realistic phishing simulations
 * 4. Smishing Agent - SMS-based phishing simulations
 * 5. User Info Agent - Gathers user profile and context
 * 6. Policy Summary Agent - Generates legal compliance content
 * 7. Vishing Call Agent - Initiates outbound vishing calls via ElevenLabs
 * 8. Email IR Analyst - Analyzes suspicious emails and generates IR reports
 * 9. Deepfake Video Agent - Generates AI deepfake video simulations via HeyGen
 *
 * API Endpoints:
 * - POST /chat - Main chat endpoint (routes through orchestrator)
 * - GET /health - Health check endpoint with system status
 *
 * Request Flow:
 * 1. Request arrives at /chat
 * 2. Orchestrator agent determines target agent
 * 3. Specific agent executes (microlearning, phishing, etc.)
 * 4. Response streamed to client
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
import { KV_NAMESPACES, RATE_LIMIT_CONFIG } from './constants';

// Silence AI SDK warnings (e.g., unsupported presencePenalty/frequencyPenalty for some models)
(globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;
import { getDeployer } from './deployer';
import { codeReviewCheckTool } from './tools';
import { parseAndValidateRequest } from './utils/chat-request-helpers';
import { extractArtifactIdsFromRoutingContext } from './utils/chat-request-helpers';
import {
  extractAndPrepareThreadId,
  buildFinalPromptWithModelOverride,
  routeToAgent,
  createAgentStream,
} from './utils/chat-orchestration-helpers';
import { normalizeSafeId } from './utils/core/id-utils';
import { requestStorage } from './utils/core/request-storage';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from './utils/language/language-utils';
import {
  postProcessPhishingEmailHtml,
  postProcessPhishingLandingHtml,
} from './utils/content-processors/phishing-html-postprocessors';
import { vishingPromptHandler } from './routes/vishing-prompt-route';
import { vishingConversationsSummaryHandler } from './routes/vishing-conversations-summary-route';
import { smishingChatHandler } from './routes/smishing-chat-route';
import { emailIRAnalyzeHandler } from './routes/email-ir-route';
import { deepfakeStatusHandler } from './routes/deepfake-status-route';
import { auditVerifyHandler } from './routes/audit-verify-route';
import { phishingTemplateFixerHandler } from './routes/phishing-template-fixer-route';
import { batchAutonomousHandler, batchAutonomousStatusHandler } from './routes/batch-autonomous-route';
import { autonomousHandler } from './routes/autonomous-route';
import { isPublicUnauthenticatedPath } from './middleware/public-endpoint-policy';
import { routeToCSAgent } from './utils/cs-orchestration-helpers';

// Barrel imports - clean organization
import {
  microlearningAgent,
  orchestratorAgent,
  phishingEmailAgent,
  smishingSmsAgent,
  userInfoAgent,
  policySummaryAgent,
  vishingCallAgent,
  deepfakeVideoAgent,
  outOfScopeAgent,
  phishingTemplateFixerAgent,
  phishingLandingPageClassifierAgent,
  companySearchAgent,
  trainingStatsAgent,
  csOrchestratorAgent,
} from './agents';
import {
  errorHandlerMiddleware,
  authTokenMiddleware,
  contextStorage,
  requestLoggingMiddleware,
  securityHeadersMiddleware,
  bodySizeLimitMiddleware,
  rateLimitMiddleware,
  RATE_LIMIT_TIERS,
  gdprAuditMiddleware,
  disablePlayground,
  disableSwagger,
} from './middleware';
import {
  createMicrolearningWorkflow,
  addLanguageWorkflow,
  addMultipleLanguagesWorkflow,
  updateMicrolearningWorkflow,
} from './workflows';
import { ExampleRepo, performHealthCheck, KVService } from './services';
import { validateEnvironmentOrThrow } from './utils/core';
import { normalizeError, logErrorInfo } from './utils/core/error-utils';
import { errorService } from './services/error-service';
import { resolveLogLevel, STRUCTURED_LOG_FORMATTERS } from './utils/core/logger';
import type {
  ChatRequestBody,
  CodeReviewRequestBody,
  CloudflareEnv,
  PhishingEditorBody,
  KvPhishingLandingRecord,
  PhishingEditorLandingPage,
} from './types';

// Type import for D1 database
import type { D1Database } from './services/example-repo';

// Validate environment variables at startup (fail-fast)
validateEnvironmentOrThrow();

const logger = new PinoLogger({
  name: 'Mastra',
  level: resolveLogLevel(),
  formatters: STRUCTURED_LOG_FORMATTERS,
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
    updateMicrolearningWorkflow,
  },
  agents: {
    microlearningAgent,
    phishingEmailAssistant: phishingEmailAgent,
    smishingSmsAssistant: smishingSmsAgent,
    userInfoAssistant: userInfoAgent,
    policySummaryAssistant: policySummaryAgent,
    vishingCallAssistant: vishingCallAgent,
    deepfakeVideoAssistant: deepfakeVideoAgent,
    outOfScope: outOfScopeAgent,
    phishingTemplateFixer: phishingTemplateFixerAgent,
    phishingLandingPageClassifier: phishingLandingPageClassifierAgent,
    orchestrator: orchestratorAgent,
    // Customer Service Agent Swarm
    companySearchAssistant: companySearchAgent,
    trainingStatsAssistant: trainingStatsAgent,
    csOrchestrator: csOrchestratorAgent,
  },
  logger,
  deployer: getDeployer(),
  // Note: These env vars are validated at startup by validateEnvironmentOrThrow()
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  storage: new D1Store({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!,
    tablePrefix: 'dev_',
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
     * 7. gdprAuditMiddleware (SEVENTH)
     *    - Purpose: GDPR Art. 30 automatic audit for personal data endpoints
     *    - Why seventh: Needs companyId (from contextStorage) and D1 (from env)
     *    - Dependency: contextStorage, injectD1Database
     *    - Fire-and-forget: does NOT block the response
     *
     * 8. disablePlayground & disableSwagger (LAST)
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
        maxRequests: RATE_LIMIT_TIERS.PUBLIC_UNAUTH.maxRequests,
        windowMs: RATE_LIMIT_TIERS.PUBLIC_UNAUTH.windowMs,
        keyPrefix: 'ratelimit:public:',
        skip: c => !isPublicUnauthenticatedPath(c.req.path),
      }),
      rateLimitMiddleware({
        maxRequests: RATE_LIMIT_CONFIG.MAX_REQUESTS,
        windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
        skip: c => c.req.path === '/health', // Skip health checks from rate limiting
      }),
      injectD1Database,
      gdprAuditMiddleware, // GDPR Art. 30 — automatic audit for personal data endpoints (requires contextStorage + D1)
      disablePlayground,
      disableSwagger,
    ],
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        /**
         * POST /chat - Main chat endpoint
         *
         * FLOW:
         * -----
         * 1. Parse user input (keep original prompt)
         * 2. Build routing context for orchestrator
         * 3. Pass data to orchestrator → get taskContext
         * 4. Inject taskContext into the prompt for the agent
         * 5. Agent receives: [Original prompt] + [Orchestrator context]
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
            return c.json(
              {
                success: false,
                message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.',
              },
              400
            );
          }

          const { prompt, routingContext } = parsedRequest;

          // Debug: Parse result
          logger.info('🔍 PARSE_RESULT Chat request parsed successfully', {
            prompt: prompt,
            routingContext: routingContext,
          });

          // Step 2: Prepare orchestrator input (no masking)
          const orchestratorInput = routingContext
            ? `Here is the recent conversation history:\n---\n${routingContext}\n---\n\nCurrent user message: "${prompt}"\n\nBased on this history and the current message, decide which agent should handle the request.`
            : prompt;

          // Step 3: Extract or generate thread ID
          const threadId = extractAndPrepareThreadId(body);

          // Persist threadId in request storage so assign tools can use it as batchResourceId
          const store = requestStorage.getStore();
          if (store) store.threadId = threadId;

          // Step 4: Route to agent
          let routeResult;
          try {
            routeResult = await routeToAgent(mastra, orchestratorInput);
            logger.info('🎬 FINAL_ROUTING Agent selected', {
              agentName: routeResult.agentName,
              taskContext: routeResult.taskContext,
            });
          } catch (routingError) {
            const err = normalizeError(routingError);
            const errorInfo = errorService.aiModel(err.message, {
              step: 'agent-routing',
              stack: err.stack,
            });
            logErrorInfo(logger, 'error', 'agent_routing_failed', errorInfo);
            return c.json(
              {
                success: false,
                error: 'Agent routing failed',
                message: routingError instanceof Error ? routingError.message : 'Unknown routing error',
              },
              500
            );
          }

          // Verify agent exists
          const agent = mastra.getAgent(routeResult.agentName);
          if (!agent) {
            logger.error('agent_not_found', { agentName: routeResult.agentName });
            return c.json(
              {
                success: false,
                error: 'Agent not found',
                message: `Agent "${routeResult.agentName}" is not available`,
              },
              500
            );
          }

          // Step 5: Build final prompt with model overrides
          let finalPrompt = buildFinalPromptWithModelOverride(prompt, body?.modelProvider, body?.model);

          // Inject deterministic artifact IDs (short, code-derived) so agents don't have to guess from long history
          const {
            microlearningId,
            phishingId,
            smishingId,
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
            smishingId ||
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
            const safeSmishingId = normalizeSafeId(smishingId);
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
              safeSmishingId ? `smishingId=${safeSmishingId}` : undefined,
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

          // Step 6: Inject orchestrator context
          if (routeResult.taskContext) {
            finalPrompt = `[CONTEXT FROM ORCHESTRATOR: ${routeResult.taskContext}]\n\n${finalPrompt}`;
          }

          // Step 7: Create agent stream
          const generationStartMs = Date.now();
          let stream;
          try {
            stream = await createAgentStream(agent, finalPrompt, threadId, routeResult.agentName);
            const generationDurationMs = Date.now() - generationStartMs;
            logger.info('metric_generation_duration', {
              metric: 'generation_duration_ms',
              generation_duration_ms: generationDurationMs,
              path: '/chat',
              agentName: routeResult.agentName,
            });
          } catch (streamError) {
            const err = normalizeError(streamError);
            const errorInfo = errorService.external(err.message, {
              step: 'stream-creation',
              stack: err.stack,
              agentName: routeResult.agentName,
            });
            logErrorInfo(logger, 'error', 'stream_creation_failed', errorInfo);
            return c.json(
              {
                success: false,
                error: 'Stream creation failed',
                message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
              },
              500
            );
          }

          return stream.toUIMessageStreamResponse({
            sendReasoning: true,
          });
        },
      }),

      registerApiRoute('/health', {
        method: 'GET',
        handler: async c => {
          const mastra = c.get('mastra');
          const agents = mastra.getAgents();
          const workflows = mastra.getWorkflows();

          // Perform deep health check with 5s timeout (includes D1 when env available)
          const env = c.env as Record<string, unknown> | undefined;
          const healthResponse = await performHealthCheck(agents, workflows, 5000, env);

          // Sentry status (observability)
          const sentryDsn = env?.SENTRY_DSN ?? (typeof process !== 'undefined' ? process.env?.SENTRY_DSN : undefined);
          const sentry = { configured: !!sentryDsn };

          // Return appropriate HTTP status based on health
          const httpStatus =
            healthResponse.status === 'healthy' ? 200 : healthResponse.status === 'degraded' ? 200 : 503;

          return c.json(
            {
              success: healthResponse.status !== 'unhealthy',
              message: 'Agentic Ally deployment successful',
              ...healthResponse,
              sentry,
            },
            httpStatus
          );
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
            const err = normalizeError(error);
            const errorInfo = errorService.aiModel(err.message, {
              step: 'code-review-validate',
              stack: err.stack,
            });
            logErrorInfo(logger, 'error', 'code_review_validation_error', errorInfo);
            return c.json(
              {
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
              },
              500
            );
          }
        },
      }),

      registerApiRoute('/phishing/editor/save', {
        method: 'POST',
        handler: async (c: Context) => {
          const requestStart = Date.now();
          try {
            const body = (await c.req.json()) as PhishingEditorBody | null;
            const { phishingId, language, emailKey, landingKey, email, landing } = body ?? {};

            if (!phishingId || typeof phishingId !== 'string') {
              logger.warn('phishing_editor_save_missing_id');
              return c.json({ success: false, error: 'Missing phishingId' }, 400);
            }

            const normalizedLanguage = validateBCP47LanguageCode(
              typeof language === 'string' ? language : DEFAULT_LANGUAGE
            );
            const baseKeyPrefix = `phishing:${phishingId}`;
            const defaultEmailKey = `${baseKeyPrefix}:email:${normalizedLanguage}`;
            const defaultLandingKey = `${baseKeyPrefix}:landing:${normalizedLanguage}`;

            const effectiveEmailKey =
              typeof emailKey === 'string' && emailKey.startsWith(`${baseKeyPrefix}:email:`)
                ? emailKey
                : defaultEmailKey;

            const effectiveLandingKey =
              typeof landingKey === 'string' && landingKey.startsWith(`${baseKeyPrefix}:landing:`)
                ? landingKey
                : defaultLandingKey;

            const kvService = new KVService(KV_NAMESPACES.PHISHING);
            const saved: string[] = [];
            logger.info('phishing_editor_save_started', {
              phishingId,
              language: normalizedLanguage,
              hasEmail: !!email?.template,
              hasLanding: !!landing?.pages?.length,
            });

            if (email?.template && typeof email.template === 'string') {
              const existingEmail = await kvService.get(effectiveEmailKey);
              if (!existingEmail) {
                logger.warn('phishing_editor_save_email_not_found', { emailKey: effectiveEmailKey });
                return c.json({ success: false, error: 'Email template not found for update' }, 404);
              }
              const processedTemplate = postProcessPhishingEmailHtml({ html: email.template });
              const updatedEmail = {
                ...(existingEmail || {}),
                template: processedTemplate,
                lastModified: Date.now(),
              };
              await kvService.put(effectiveEmailKey, updatedEmail);
              saved.push('email');
              logger.info('phishing_editor_save_email_updated', { emailKey: effectiveEmailKey });
            }

            if (landing?.pages && Array.isArray(landing.pages) && landing.pages.length > 0) {
              const existingLanding = (await kvService.get(effectiveLandingKey)) as KvPhishingLandingRecord | null;
              if (!existingLanding) {
                logger.warn('phishing_editor_save_landing_not_found', { landingKey: effectiveLandingKey });
                return c.json({ success: false, error: 'Landing template not found for update' }, 404);
              }

              const landingPages = landing.pages;
              const updatedPages = landingPages
                .filter((page): page is PhishingEditorLandingPage & { template: string; type: string } =>
                  !!page?.template && !!page?.type
                )
                .map(page => ({
                  ...page,
                  template: postProcessPhishingLandingHtml({
                    html: page.template,
                    title: landing?.name || existingLanding?.name || 'Secure Portal',
                  }),
                  edited: page.edited ?? true,
                  summary: page.summary || 'Updated in UI',
                }));

              if (updatedPages.length > 0) {
                const existingPages = Array.isArray(existingLanding.pages) ? existingLanding.pages : [];
                const mergedPages = existingPages.map(page => {
                  const replacement = updatedPages.find(updated => updated.type === page.type);
                  return replacement || page;
                });
                const appendedPages = updatedPages.filter(
                  updated => !existingPages.some(page => page.type === updated.type)
                );

                const updatedLanding = {
                  ...(existingLanding || {}),
                  pages: [...mergedPages, ...appendedPages],
                  lastModified: Date.now(),
                };
                await kvService.put(effectiveLandingKey, updatedLanding);
                saved.push('landing');
                logger.info('phishing_editor_save_landing_updated', {
                  landingKey: effectiveLandingKey,
                  pageCount: updatedLanding.pages?.length,
                });
              }
            }

            if (saved.length === 0) {
              logger.warn('phishing_editor_save_no_content', { phishingId });
              return c.json({ success: false, error: 'No email or landing content provided' }, 400);
            }

            logger.info('phishing_editor_save_completed', {
              phishingId,
              saved,
              durationMs: Date.now() - requestStart,
            });
            return c.json(
              {
                success: true,
                phishingId,
                language: normalizedLanguage,
                saved,
              },
              200
            );
          } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
              step: 'phishing-editor-save',
              stack: err.stack,
            });
            logErrorInfo(logger, 'error', 'phishing_editor_save_error', errorInfo);
            return c.json(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              500
            );
          }
        },
      }),

      registerApiRoute('/vishing/prompt', {
        method: 'POST',
        handler: vishingPromptHandler,
      }),

      registerApiRoute('/vishing/conversations/summary', {
        method: 'POST',
        handler: vishingConversationsSummaryHandler,
      }),

      registerApiRoute('/smishing/chat', {
        method: 'POST',
        handler: smishingChatHandler,
      }),

      registerApiRoute('/email-ir/analyze', {
        method: 'POST',
        handler: emailIRAnalyzeHandler,
      }),

      registerApiRoute('/phishing/template-fixer', {
        method: 'POST',
        handler: phishingTemplateFixerHandler,
      }),

      registerApiRoute('/deepfake/status/:videoId', {
        method: 'GET',
        handler: deepfakeStatusHandler,
      }),

      registerApiRoute('/autonomous', {
        method: 'POST',
        handler: autonomousHandler,
      }),

      // ─── Batch Autonomous: Fan-out to all users in a group ───
      registerApiRoute('/batch-autonomous', {
        method: 'POST',
        handler: batchAutonomousHandler,
      }),

      // ─── Batch Status ───
      registerApiRoute('/batch-autonomous/:batchId/status', {
        method: 'GET',
        handler: batchAutonomousStatusHandler,
      }),

      // ─── Audit Chain Verification (EU AI Act Art. 12) ───
      registerApiRoute('/audit/verify', {
        method: 'GET',
        handler: auditVerifyHandler,
      }),

      // ─── Customer Service Chat (Separate Agent Swarm) ───
      registerApiRoute('/customer-service/chat', {
        method: 'POST',
        handler: async (c: Context) => {
          const mastra = c.get('mastra');

          // Step 1: Parse and validate request (reuse existing helper)
          let body: ChatRequestBody = {};
          try {
            body = await c.req.json<ChatRequestBody>();
          } catch {
            // ignore JSON parse errors
          }

          const parsedRequest = parseAndValidateRequest(body);
          if (!parsedRequest) {
            return c.json(
              {
                success: false,
                message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.',
              },
              400
            );
          }

          const { prompt, routingContext } = parsedRequest;

          logger.info('CS_CHAT_REQUEST Customer service chat request', { prompt });

          // Step 2: Thread ID (reuse existing helper)
          const threadId = extractAndPrepareThreadId(body);
          const store = requestStorage.getStore();
          if (store) store.threadId = threadId;

          // Step 3: Build CS orchestrator input
          const orchestratorInput = routingContext
            ? `Here is the recent conversation history:\n---\n${routingContext}\n---\n\nCurrent user message: "${prompt}"\n\nBased on this history and the current message, decide which CS agent should handle the request.`
            : prompt;

          // Step 4: Route via CS Orchestrator
          let routeResult;
          try {
            routeResult = await routeToCSAgent(mastra, orchestratorInput);
            logger.info('CS_ROUTING Agent selected', {
              agentName: routeResult.agentName,
              taskContext: routeResult.taskContext,
            });
          } catch (routingError) {
            const err = normalizeError(routingError);
            const errorInfo = errorService.aiModel(err.message, {
              step: 'cs-agent-routing',
              stack: err.stack,
            });
            logErrorInfo(logger, 'error', 'cs_agent_routing_failed', errorInfo);
            return c.json(
              {
                success: false,
                error: 'CS agent routing failed',
                message: routingError instanceof Error ? routingError.message : 'Unknown routing error',
              },
              500
            );
          }

          // Step 5: Get agent instance
          const agent = mastra.getAgent(routeResult.agentName);
          if (!agent) {
            logger.error('cs_agent_not_found', { agentName: routeResult.agentName });
            return c.json(
              {
                success: false,
                error: 'CS agent not found',
                message: `Agent "${routeResult.agentName}" is not available`,
              },
              500
            );
          }

          // Step 6: Build final prompt with CS context
          let finalPrompt = buildFinalPromptWithModelOverride(prompt, body?.modelProvider, body?.model);
          if (routeResult.taskContext) {
            finalPrompt = `[CONTEXT FROM CS ORCHESTRATOR: ${routeResult.taskContext}]\n\n${finalPrompt}`;
          }

          // Step 7: Create agent stream (reuse existing helper)
          let stream;
          try {
            stream = await createAgentStream(agent, finalPrompt, threadId, routeResult.agentName);
          } catch (streamError) {
            const err = normalizeError(streamError);
            const errorInfo = errorService.external(err.message, {
              step: 'cs-stream-creation',
              stack: err.stack,
              agentName: routeResult.agentName,
            });
            logErrorInfo(logger, 'error', 'cs_stream_creation_failed', errorInfo);
            return c.json(
              {
                success: false,
                error: 'Stream creation failed',
                message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
              },
              500
            );
          }

          return stream.toUIMessageStreamResponse({
            sendReasoning: true,
          });
        },
      }),
    ],
  },
});
