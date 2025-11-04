import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { registerApiRoute } from '@mastra/core/server';
import { agenticAlly } from './agents/agentic-ally';
import { disablePlayground, disableSwagger } from './middleware/openapi';
import { createMicrolearningWorkflow } from './workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from './workflows/add-language-workflow';
import { getDeployer } from './deployer';
import { ExampleRepo } from './services/example-repo';
import { D1Store } from '@mastra/cloudflare-d1';
import { LibSQLStore } from '@mastra/libsql';
import { codeReviewCheckTool } from './tools/code-review-check-tool';
const logger = new PinoLogger({
  name: 'Mastra',
  level: 'info',
});
/*
new D1Store({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!, // Cloudflare Account ID
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!, // D1 Database ID
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!, // Cloudflare API Token
    tablePrefix: "prod_", // Optional: isolate tables per environment
  })
    */
/*
new LibSQLStore({
    url: process.env.MASTRA_MEMORY_URL!,
    authToken: process.env.MASTRA_MEMORY_TOKEN,
  }),*/
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
    addLanguageWorkflow
  },
  agents: { agenticAlly },
  logger,
  deployer: getDeployer(),
  storage: new D1Store({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!, // Cloudflare Account ID
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!, // D1 Database ID
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!, // Cloudflare API Token
    tablePrefix: "dev_", // Optional: isolate tables per environment
  }),
  server: {
    middleware: [injectD1Database, disablePlayground, disableSwagger],
    apiRoutes: [
      registerApiRoute('/chat', {
        method: 'POST',
        handler: async (c) => {
          const mastra = c.get('mastra');
          const agent = mastra.getAgent('agenticAlly');

          let prompt: string | undefined;
          let body: any = {};
          try {
            body = await c.req.json();

            // Prefer explicit fields if provided
            prompt = body?.prompt || body?.text || body?.input;

            //TODO(emre): Remove this fallback once we have a proper way to get the prompt from the request
            // Fallback: extract latest user text from AISDK-style messages array
            if (!prompt && Array.isArray(body?.messages)) {
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
          } catch (_err) {
            // ignore JSON parse errors; prompt will remain undefined
          }

          if (!prompt) {
            return c.json({ success: false, message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.' }, 400);
          }

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
          let finalPrompt = prompt;
          if (modelProvider || model) {
            const modelInstruction = modelProvider && model
              ? `[Use this model: ${modelProvider} - ${model}]\n\n`
              : modelProvider
              ? `[Use this model provider: ${modelProvider}]\n\n`
              : '';
            finalPrompt = modelInstruction + prompt;
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
    ],
  },
});