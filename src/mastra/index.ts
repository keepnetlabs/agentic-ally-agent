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
import { RATE_LIMIT_CONFIG } from './constants';

// Silence AI SDK warnings (e.g., unsupported presencePenalty/frequencyPenalty for some models)
(globalThis as { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;
import { getDeployer } from './deployer';
import { isPublicUnauthenticatedPath } from './middleware/public-endpoint-policy';

// Route handlers (extracted from inline handlers)
import { chatHandler } from './routes/chat-route';
import { csChatHandler } from './routes/cs-chat-route';
import { healthHandler } from './routes/health-route';
import { codeReviewValidateHandler } from './routes/code-review-route';
import { phishingEditorSaveHandler } from './routes/phishing-editor-save-route';
import { smishingEditorSaveHandler } from './routes/smishing-editor-save-route';
import { vishingPromptHandler } from './routes/vishing-prompt-route';
import { vishingConversationsSummaryHandler } from './routes/vishing-conversations-summary-route';
import { smishingChatHandler } from './routes/smishing-chat-route';
import { emailIRAnalyzeHandler } from './routes/email-ir-route';
import { deepfakeStatusHandler } from './routes/deepfake-status-route';
import { auditVerifyHandler } from './routes/audit-verify-route';
import { phishingTemplateFixerHandler } from './routes/phishing-template-fixer-route';
import { batchAutonomousHandler, batchAutonomousStatusHandler } from './routes/batch-autonomous-route';
import { autonomousHandler } from './routes/autonomous-route';

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
  phishingLandingPageClassifierAgent,
  emailRewriterAgent,
  emailClassifierAgent,
  companySearchAgent,
  trainingStatsAgent,
  csOrchestratorAgent,
  reportAgent,
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
import { ExampleRepo } from './services';
import { validateEnvironmentOrThrow } from './utils/core';
import { resolveLogLevel, STRUCTURED_LOG_FORMATTERS } from './utils/core/logger';
import type { CloudflareEnv } from './types';

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
    phishingLandingPageClassifier: phishingLandingPageClassifierAgent,
    emailRewriter: emailRewriterAgent,
    emailClassifier: emailClassifierAgent,
    orchestrator: orchestratorAgent,
    // Customer Service Agent Swarm
    companySearchAssistant: companySearchAgent,
    trainingStatsAssistant: trainingStatsAgent,
    csOrchestrator: csOrchestratorAgent,
    // Report Generation
    reportAgent,
  },
  logger,
  deployer: getDeployer(),
  bundler: {
    externals: ['pnpapi', 'cloudflare:workers', 'cloudflare:sockets', 'typescript'],
  },
  // D1 REST API mode
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  storage: new D1Store({
    id: 'agentic-ally-d1-store',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    apiToken: process.env.CLOUDFLARE_KV_TOKEN!,
    tablePrefix: 'dev_',
  }),
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  server: {
    /**
     * MIDDLEWARE EXECUTION ORDER (array index = execution order)
     * ==========================================================
     *
     * ORDER MATTERS! Each middleware depends on previous ones.
     *
     *  1. errorHandlerMiddleware
     *     - Wraps entire chain; catches unhandled errors → 500 JSON (no stack leak)
     *
     *  2. authTokenMiddleware
     *     - Validates X-AGENTIC-ALLY-TOKEN header (skips SKIP_AUTH_PATHS)
     *     - Rejects: 401 if token missing/invalid
     *
     *  3. contextStorage
     *     - Initializes request context, correlation ID, c.get('mastra')
     *     - Dependency: None (but placed after auth so context has companyId)
     *
     *  4. requestLoggingMiddleware
     *     - Logs method, path, status, duration (ms) with correlationId
     *     - Dependency: contextStorage
     *
     *  5. securityHeadersMiddleware
     *     - OWASP headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, etc.
     *
     *  6. bodySizeLimitMiddleware
     *     - Rejects requests > 1 MB with 413 (before rate limiter counts them)
     *
     *  7. rateLimitMiddleware (PUBLIC_UNAUTH tier — 180/min)
     *     - Only applies to public unauthenticated paths; skipped otherwise
     *
     *  8. rateLimitMiddleware (global — 100/min)
     *     - Applies to all paths except /health
     *
     *  9. injectD1Database
     *     - Injects Cloudflare D1 binding into ExampleRepo singleton
     *     - Dependency: contextStorage
     *
     * 10. gdprAuditMiddleware (Art. 30)
     *     - Fire-and-forget audit log for personal data endpoints
     *     - Dependency: contextStorage, D1
     *
     * 11. disablePlayground & disableSwagger
     *     - Blocks /swagger-ui in production
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
        handler: chatHandler,
      }),

      registerApiRoute('/health', {
        method: 'GET',
        handler: healthHandler,
      }),

      registerApiRoute('/code-review-validate', {
        method: 'POST',
        handler: codeReviewValidateHandler,
      }),

      registerApiRoute('/phishing/editor/save', {
        method: 'POST',
        handler: phishingEditorSaveHandler,
      }),

      registerApiRoute('/smishing/editor/save', {
        method: 'POST',
        handler: smishingEditorSaveHandler,
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
        handler: csChatHandler,
      }),
    ],
  },
});
