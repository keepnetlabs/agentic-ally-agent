import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { registerApiRoute } from '@mastra/core/server';
import { microlearningAgent } from './agents/microlearning-agent';
import { AgentRouter } from './services/agent-router';
import { orchestratorAgent } from './agents/orchestrator-agent';
import { phishingEmailAgent } from './agents/phishing-email-agent';
import { userInfoAgent } from './agents/user-info-agent';
import { disablePlayground, disableSwagger } from './middleware/openapi';
import { contextStorage } from './middleware/context-storage';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { createMicrolearningWorkflow } from './workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from './workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from './workflows/add-multiple-languages-workflow';
import { updateMicrolearningWorkflow } from './workflows/update-microlearning-workflow';
import { getDeployer } from './deployer';
import { ExampleRepo } from './services/example-repo';
import { D1Store } from '@mastra/cloudflare-d1';
import { codeReviewCheckTool } from './tools/code-review-check-tool';
import { maskPII, unmaskPII } from './utils/parsers/pii-masking-utils';
import { executeAutonomousGeneration } from './services/autonomous-service';

const logger = new PinoLogger({
  name: 'Mastra',
  level: 'info',
});

// Middleware to inject D1 database into ExampleRepo
const injectD1Database = async (c: any, next: any) => {
  // Check if we have D1 database in the environment (binding name from wrangler)
  if (c.env && c.env.agentic_ally_embeddings_cache) {
    const repo = ExampleRepo.getInstance();
    repo.setDatabase(c.env.agentic_ally_embeddings_cache);
    console.log('📦 D1 database injected into ExampleRepo (production)');
  } else if (process.env.NODE_ENV === 'development') {
    // Local development - D1 bindings not available in mastra dev
    // Suppressed: console.log('🔧 Local development mode - D1 cache disabled');
  } else {
    console.warn('⚠️ D1 database not available in environment');
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
    orchestrator: orchestratorAgent
  },
  logger,
  deployer: getDeployer(),
  storage: new D1Store({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!, // Cloudflare Account ID
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!, // D1 Database ID
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!, // Cloudflare API Token
    tablePrefix: "dev_", // Optional: isolate tables per environment
  }),
  server: {
    middleware: [
      contextStorage,
      rateLimitMiddleware({
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        skip: (c) => c.req.path === '/health', // Skip health checks from rate limiting
      }),
      injectD1Database,
      disablePlayground,
      disableSwagger
    ],
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        handler: async (c) => {
          const mastra = c.get('mastra');

          let prompt: string | undefined;
          let routingContext: string = ''; // Context for orchestrator
          let body: any = {};
          try {
            body = await c.req.json();

            // Prefer explicit fields if provided
            prompt = body?.prompt || body?.text || body?.input;

            // Extract latest prompt AND build context history
            if (Array.isArray(body?.messages)) {
              // Get last 10 messages for better context awareness
              const recentMessages = body.messages.slice(-10);

              // Build routing context string
              routingContext = recentMessages.map((m: any) => {
                const role = m.role === 'user' ? 'User' : 'Assistant';
                let content = '';

                // Case 1: Simple string
                if (typeof m.content === 'string') {
                  content = m.content;
                }
                // Case 2: Array (e.g. multi-modal)
                else if (Array.isArray(m.content)) {
                  content = m.content.map((c: any) => {
                    if (c?.type === 'text') return c.text;
                    if (c?.type === 'image') return '[Image]';
                    return '';
                  }).join(' ');
                }
                // Case 3: Vercel AI SDK "parts" structure
                else if (Array.isArray(m.parts)) {
                  content = m.parts.map((p: any) => {
                    if (p?.type === 'text') return p.text;
                    return '';
                  }).join(' ');
                }
                // Case 4: Tool Invocations (Assistant called a tool)
                else if (m.toolInvocations || m.function_call || m.tool_calls) {
                  content = '[Tool Execution Result]';
                  // Try to dig into tool result if possible, but for routing, knowing it was a tool is enough
                }
                // Case 5: Object fallback (try to find text field)
                else if (typeof m.content === 'object') {
                  content = m.content?.text || JSON.stringify(m.content);
                }

                // Final Fallback
                if (!content || content === '[]' || content === '{}') {
                  // If content is empty but there are tool calls, it's valid
                  if (m.toolInvocations) content = '[Tool Call]';
                  else content = '[Empty Message]';
                }

                return `${role}: ${content}`;
              }).join('\n');

              // If prompt wasn't explicitly set, try to get it from the last message
              if (!prompt) {
                const userMessages = body.messages.filter((m: any) => m?.role === 'user');
                const lastUserMessage = userMessages[userMessages.length - 1];
                if (lastUserMessage) {
                  if (typeof lastUserMessage?.content === 'string') {
                    prompt = lastUserMessage.content;
                  } else if (Array.isArray(lastUserMessage?.parts)) {
                    const textParts = lastUserMessage.parts
                      .filter((p: any) => p?.type === 'text' && typeof p?.text === 'string')
                      .map((p: any) => p.text);
                    if (textParts.length > 0) {
                      prompt = textParts.join('\n');
                    }
                  }
                }
              }
            }
          } catch (_err) {
            // ignore JSON parse errors
          }

          if (!prompt) {
            return c.json({ success: false, message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.' }, 400);
          }

          // 🔒 Zero PII: Mask personally identifiable information ONLY for orchestrator routing
          // Agent will receive ORIGINAL prompt so tools can work with real names
          const { maskedText: maskedRoutingContext, mapping: piiMapping } = maskPII(routingContext);

          console.log('🔒 PII Masking applied:', Object.keys(piiMapping).length, 'identifiers masked for orchestrator');

          // If we have routing context, use MASKED version for orchestrator
          // CRITICAL: Always include the current user message so orchestrator can see it
          const maskedPrompt = maskPII(prompt).maskedText;
          const orchestratorInput = maskedRoutingContext ?
            `Here is the recent conversation history:\n---\n${maskedRoutingContext}\n---\n\nCurrent user message: "${maskedPrompt}"\n\nBased on this history and the current message, decide which agent should handle the request.` :
            maskedPrompt; // Use masked prompt if no context
          console.log('🔍 Orchestrator input:', orchestratorInput);
          // Extract or generate thread ID for memory continuity
          let threadId = body?.conversationId || body?.threadId || body?.sessionId;
          if (!threadId) {
            // Generate a thread ID from user agent or IP for session continuity
            const userAgent = c.req.header('user-agent') || '';
            const forwarded = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown';
            threadId = `${forwarded}-${userAgent}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || 'default';
          }
          console.log('🔍 Thread ID:', threadId);

          // Extract model provider and model from request body
          const modelProvider = body?.modelProvider;
          const model = body?.model;
          if (modelProvider || model) {
            console.log('🔧 Model override received:', { modelProvider, model });
          }

          // Build prompt with model override as system instruction
          // Use ORIGINAL prompt for agent (so tools can work with real names)
          let finalPrompt = prompt;
          if (modelProvider || model) {
            const modelInstruction = modelProvider && model
              ? `[Use this model: ${modelProvider} - ${model}]\n\n`
              : modelProvider
                ? `[Use this model provider: ${modelProvider}]\n\n`
                : '';
            finalPrompt = modelInstruction + prompt;
          }

          // Standardized Agent Routing
          // Using the Router Service pattern to decouple routing logic from the handler
          const router = new AgentRouter(mastra);
          // Pass the FULL CONTEXT to the router, not just the last prompt
          const routeResult = await router.route(orchestratorInput);


          const agent = mastra.getAgent(routeResult.agentName);

          // Inject Task Context if provided by Orchestrator
          // Unmask PII in taskContext so agent receives real names for tool calls
          if (routeResult.taskContext) {
            const unmaskedTaskContext = unmaskPII(routeResult.taskContext, piiMapping);
            finalPrompt = `[CONTEXT FROM ORCHESTRATOR: ${unmaskedTaskContext}]\n\n${finalPrompt}`;
            console.log('🔗 Context Injected (unmasked):', unmaskedTaskContext);
          }

          const stream = await agent.stream(finalPrompt, {
            format: 'aisdk',
            memory: {
              thread: threadId,
              resource: 'agentic-ally-user'
            },
          });

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

          return c.json({
            success: true,
            message: 'Agentic Ally deployment successful',
            timestamp: new Date().toISOString(),
            status: 'healthy',
            agents: Object.keys(agents).length > 0 ? Object.keys(agents) : [],
            workflows: Object.keys(workflows).length > 0 ? Object.keys(workflows) : [],
          });
        },
      }),

      registerApiRoute('/code-review-validate', {
        method: 'POST',
        handler: async (c: any) => {
          try {
            const body = await c.req.json();

            const result = await (codeReviewCheckTool.execute as any)(body);

            if (result.success) {
              return c.json(result, 200);
            } else {
              return c.json(result, 400);
            }
          } catch (error) {
            console.error('Code review validation error:', error);
            return c.json({
              success: false,
              data: {
                isCorrect: false,
                severity: 'incorrect',
                feedback: 'Error validating code',
                explanation: error instanceof Error ? error.message : 'Unknown error occurred',
                points: 0,
              },
              error: error instanceof Error ? error.message : 'Unknown error',
            }, 500);
          }
        },
      }),

      registerApiRoute('/autonomous', {
        method: 'POST',
        handler: async (c: any) => {
          try {
            const body = await c.req.json();
            const { token, firstName, lastName, actions } = body;

            // Validation
            if (!token) {
              return c.json({ success: false, error: 'Missing token' }, 400);
            }
            if (!firstName) {
              return c.json({ success: false, error: 'Missing firstName' }, 400);
            }
            if (!actions || !Array.isArray(actions) || actions.length === 0) {
              return c.json({ success: false, error: 'Missing or invalid actions array' }, 400);
            }
            if (!actions.every((a: string) => a === 'training' || a === 'phishing')) {
              return c.json({ success: false, error: 'Actions must be "training" and/or "phishing"' }, 400);
            }

            console.log('🤖 Autonomous request:', { firstName, lastName, actions });

            // Execute autonomous generation (user analysis + content generation)
            const result = await executeAutonomousGeneration({
              token,
              firstName,
              lastName,
              actions: actions as ('training' | 'phishing')[],
            });

            if (!result.success) {
              return c.json(result, 400);
            }

            return c.json(result, 200);

          } catch (error) {
            console.error('❌ Autonomous endpoint error:', error);
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
