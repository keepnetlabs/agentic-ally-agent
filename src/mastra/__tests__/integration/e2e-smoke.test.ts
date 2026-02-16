/**
 * E2E Smoke Tests — Adım adım kritik endpoint'lerin çalıştığını doğrular
 *
 * Adım 1: /health — Uygulama ayakta mı?
 * Adım 2: /chat — Chat endpoint yanıt veriyor mu? (mock'lı)
 * Adım 3: /autonomous — Autonomous endpoint yanıt veriyor mu? (mock'lı)
 *
 * Not: Gerçek HTTP sunucusu başlatılmaz; handler'lar mock context ile çağrılır.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies BEFORE importing index
vi.mock('@mastra/core/mastra', () => ({
  Mastra: class {
    getAgents = () => [];
    getWorkflows = () => [];
  },
}));

vi.mock('@mastra/loggers', () => ({
  PinoLogger: class {
    info = vi.fn();
    error = vi.fn();
    warn = vi.fn();
    debug = vi.fn();
  },
}));

vi.mock('@mastra/core/server', () => ({
  registerApiRoute: vi.fn(),
}));

vi.mock('../../utils/chat-request-helpers', () => ({
  parseAndValidateRequest: vi.fn(),
  extractArtifactIdsFromRoutingContext: vi.fn().mockReturnValue({}),
}));

vi.mock('../../utils/chat-orchestration-helpers', () => ({
  extractAndPrepareThreadId: vi.fn().mockReturnValue('thread-smoke-1'),
  buildFinalPromptWithModelOverride: vi.fn((p: string) => p),
  routeToAgent: vi.fn(),
  createAgentStream: vi.fn(),
}));

const mockKvGet = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const mockKvPut = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('../../services', () => ({
  ExampleRepo: { getInstance: vi.fn() },
  executeAutonomousGeneration: vi.fn(),
  performHealthCheck: vi.fn(),
  KVService: class MockKVService {
    get = mockKvGet;
    put = mockKvPut;
  },
}));

vi.mock('../../utils/core', () => ({
  validateEnvironmentOrThrow: vi.fn(),
}));

vi.mock('../../deployer', () => ({
  getDeployer: vi.fn(),
}));

vi.mock('../../tools', () => ({
  codeReviewCheckTool: { execute: vi.fn() },
}));

vi.mock('../../workflows', () => ({
  createMicrolearningWorkflow: {},
  addLanguageWorkflow: {},
  addMultipleLanguagesWorkflow: {},
  updateMicrolearningWorkflow: {},
}));

vi.mock('../../agents', () => ({
  microlearningAgent: {},
  orchestratorAgent: {},
  phishingEmailAgent: {},
  smishingSmsAgent: {},
  policySummaryAgent: {},
  userInfoAgent: {},
  vishingCallAgent: {},
}));

const handlers: Record<string, (c: unknown) => Promise<unknown>> = {};

describe('E2E Smoke Tests', () => {
  beforeAll(async () => {
    await import('../../index');

    const { registerApiRoute } = await import('@mastra/core/server');
    for (const call of vi.mocked(registerApiRoute).mock.calls) {
      const [path, config] = call as unknown as [string, { handler: (c: unknown) => Promise<unknown> }];
      if (path && config?.handler) handlers[path] = config.handler;
    }
  }, 90000);

  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue(null);
    mockKvPut.mockResolvedValue(true);
    // performHealthCheck mock'u her testte yeniden ayarlanacak
  });

  describe('Adım 1: /health', () => {
    it('returns 200 and healthy status when all checks pass', { timeout: 60000 }, async () => {
      const { performHealthCheck } = await import('../../services');
      vi.mocked(performHealthCheck).mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: '0h 0m',
        uptimeMs: 0,
        checks: { agents: true, workflows: true, kv: { status: 'healthy' } },
      } as any);

      const handler = handlers['/health'];
      if (!handler) throw new Error('Route /health not registered');

      const json = vi.fn();
      const ctx = {
        get: vi.fn((key: string) => {
          if (key === 'mastra') return { getAgents: () => [], getWorkflows: () => [] };
          return undefined;
        }),
        env: {},
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.status).toBe('healthy');
      expect(body.message).toContain('deployment successful');
      expect(body.sentry).toEqual({ configured: false });
    });

    it('returns 503 when health check is unhealthy', { timeout: 60000 }, async () => {
      const { performHealthCheck } = await import('../../services');
      vi.mocked(performHealthCheck).mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: '0h 0m',
        uptimeMs: 0,
        checks: { agents: true, workflows: true, kv: { status: 'unhealthy', error: 'KV down' } },
      } as any);

      const handler = handlers['/health'];
      if (!handler) throw new Error('Route /health not registered');

      const json = vi.fn();
      const ctx = {
        get: vi.fn((key: string) => {
          if (key === 'mastra') return { getAgents: () => [], getWorkflows: () => [] };
          return undefined;
        }),
        env: {},
        json,
      } as any;

      await handler(ctx);

      const [body, status] = json.mock.calls[0];
      expect(status).toBe(503);
      expect(body.sentry).toEqual({ configured: false });
    });

    it('includes sentry.configured: true when SENTRY_DSN is set', { timeout: 60000 }, async () => {
      const { performHealthCheck } = await import('../../services');
      vi.mocked(performHealthCheck).mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: '0h 0m',
        uptimeMs: 0,
        checks: { agents: true, workflows: true, kv: { status: 'healthy' } },
      } as any);

      const handler = handlers['/health'];
      if (!handler) throw new Error('Route /health not registered');

      const json = vi.fn();
      const ctx = {
        get: vi.fn((key: string) => {
          if (key === 'mastra') return { getAgents: () => [], getWorkflows: () => [] };
          return undefined;
        }),
        env: { SENTRY_DSN: 'https://key@sentry.io/project' },
        json,
      } as any;

      await handler(ctx);

      const [body] = json.mock.calls[0];
      expect(body.sentry).toEqual({ configured: true });
    });
  });

  describe('Adım 2: /chat', () => {
    it('returns 400 when prompt is missing', { timeout: 60000 }, async () => {
      const { parseAndValidateRequest } = await import('../../utils/chat-request-helpers');
      vi.mocked(parseAndValidateRequest).mockReturnValue(null);

      const handler = handlers['/chat'];
      if (!handler) throw new Error('Route /chat not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({}) },
        get: vi.fn(() => ({ getAgent: () => ({}) })),
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Missing prompt') }),
        400
      );
    });

    it('returns stream when valid prompt is sent', { timeout: 60000 }, async () => {
      const { parseAndValidateRequest } = await import('../../utils/chat-request-helpers');
      const { routeToAgent, createAgentStream } = await import('../../utils/chat-orchestration-helpers');

      vi.mocked(parseAndValidateRequest).mockReturnValue({ prompt: 'Create phishing', routingContext: '' });
      vi.mocked(routeToAgent).mockResolvedValue({
        agentName: 'phishingEmailAgent',
        taskContext: 'Phishing scenario',
      } as any);
      vi.mocked(createAgentStream).mockResolvedValue({
        toUIMessageStreamResponse: () => new Response('stream-ok', { status: 200 }),
      } as any);

      const handler = handlers['/chat'];
      if (!handler) throw new Error('Route /chat not registered');

      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ prompt: 'Create phishing' }) },
        get: vi.fn((key: string) => {
          if (key === 'mastra') return { getAgent: () => ({ generate: vi.fn() }) };
          return undefined;
        }),
      } as any;

      const result = (await handler(ctx)) as Response;

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(200);
    });
  });

  describe('Adım 3: /autonomous', () => {
    it('returns 400 when token is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/autonomous'];
      if (!handler) throw new Error('Route /autonomous not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ actions: ['phishing'], targetGroupResourceId: 'g1' }) },
        env: {},
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Missing token' }),
        400
      );
    });

    it('returns processing when waitUntil is available', { timeout: 60000 }, async () => {
      const { executeAutonomousGeneration } = await import('../../services');
      vi.mocked(executeAutonomousGeneration).mockResolvedValue({
        success: true,
        actions: ['smishing'],
      } as any);

      const handler = handlers['/autonomous'];
      if (!handler) throw new Error('Route /autonomous not registered');

      const json = vi.fn();
      const waitUntil = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            token: 'token-123',
            actions: ['smishing'],
            targetGroupResourceId: 'group-1',
          }),
        },
        env: {},
        executionCtx: { waitUntil },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [payload, status] = json.mock.calls[0];
      expect(status).toBe(200);
      expect(payload).toMatchObject({
        success: true,
        status: 'processing',
        actions: ['smishing'],
      });
    });

    it('returns completed on inline fallback', { timeout: 60000 }, async () => {
      const { executeAutonomousGeneration } = await import('../../services');
      vi.mocked(executeAutonomousGeneration).mockResolvedValue({
        success: true,
        status: 'completed',
        actions: ['training'],
        message: 'Completed',
        trainingResult: { success: true },
      } as any);

      const handler = handlers['/autonomous'];
      if (!handler) throw new Error('Route /autonomous not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            token: 'token-123',
            actions: ['training'],
            targetUserResourceId: 'user-42',
          }),
        },
        env: {},
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [payload, status] = json.mock.calls[0];
      expect(status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.status).toBe('completed');
    });
  });

  describe('Adım 4: /phishing/editor/save', () => {
    it('returns 400 when phishingId is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/phishing/editor/save'];
      if (!handler) throw new Error('Route /phishing/editor/save not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({}) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Missing');
    });

    it('returns 400 when no email or landing content provided', { timeout: 60000 }, async () => {
      const handler = handlers['/phishing/editor/save'];
      if (!handler) throw new Error('Route /phishing/editor/save not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            phishingId: 'phish-123',
            language: 'en-gb',
          }),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('No email or landing');
    });

    it('returns 200 when email template is saved successfully', { timeout: 60000 }, async () => {
      mockKvGet.mockResolvedValueOnce({ template: '<p>old</p>', lastModified: 0 });

      const handler = handlers['/phishing/editor/save'];
      if (!handler) throw new Error('Route /phishing/editor/save not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            phishingId: 'phish-123',
            language: 'en-gb',
            email: { template: '<p>Updated content</p>' },
          }),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.saved).toContain('email');
    });
  });

  describe('Adım 4b: /code-review-validate', () => {
    it('returns 200 when code review succeeds', { timeout: 60000 }, async () => {
      const { codeReviewCheckTool } = await import('../../tools');
      vi.mocked(codeReviewCheckTool.execute).mockResolvedValue({
        success: true,
        data: {
          isCorrect: true,
          severity: 'correct',
          feedback: 'Good fix',
          explanation: 'The fix properly addresses the vulnerability',
          points: 25,
          hint: '',
        },
      } as any);

      const handler = handlers['/code-review-validate'];
      if (!handler) throw new Error('Route /code-review-validate not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            issueType: 'XSS',
            originalCode: 'document.write(userInput)',
            fixedCode: 'element.textContent = userInput',
            language: 'javascript',
          }),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.isCorrect).toBe(true);
    });

    it('returns 400 when code review indicates incorrect fix', { timeout: 60000 }, async () => {
      const { codeReviewCheckTool } = await import('../../tools');
      vi.mocked(codeReviewCheckTool.execute).mockResolvedValue({
        success: false,
        data: {
          isCorrect: false,
          severity: 'incorrect',
          feedback: 'Fix does not address the issue',
          explanation: 'The vulnerability remains',
          points: 0,
          hint: 'Consider using textContent instead',
        },
      } as any);

      const handler = handlers['/code-review-validate'];
      if (!handler) throw new Error('Route /code-review-validate not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            issueType: 'XSS',
            originalCode: 'document.write(x)',
            fixedCode: 'document.write(x)',
            language: 'javascript',
          }),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe('Adım 5: /vishing/prompt', () => {
    it('returns 400 when microlearningId is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/vishing/prompt'];
      if (!handler) throw new Error('Route /vishing/prompt not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ language: 'en' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('microlearningId');
    });

    it('returns 400 when language is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/vishing/prompt'];
      if (!handler) throw new Error('Route /vishing/prompt not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ microlearningId: 'ml-123' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('language');
    });
  });

  describe('Adım 6: /vishing/conversations/summary', () => {
    it('returns 400 when accessToken is too short', { timeout: 60000 }, async () => {
      const handler = handlers['/vishing/conversations/summary'];
      if (!handler) throw new Error('Route /vishing/conversations/summary not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            accessToken: 'short',
            messages: [{ role: 'user', text: 'Hello' }],
          }),
          header: vi.fn(),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when messages array is empty', { timeout: 60000 }, async () => {
      const handler = handlers['/vishing/conversations/summary'];
      if (!handler) throw new Error('Route /vishing/conversations/summary not registered');

      const json = vi.fn();
      const ctx = {
        req: {
          json: vi.fn().mockResolvedValue({
            accessToken: 'a'.repeat(32),
            messages: [],
          }),
          header: vi.fn(),
        },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe('Adım 7: /smishing/chat', () => {
    it('returns 400 when microlearningId is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/smishing/chat'];
      if (!handler) throw new Error('Route /smishing/chat not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ language: 'en' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('microlearningId');
    });

    it('returns 400 when language is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/smishing/chat'];
      if (!handler) throw new Error('Route /smishing/chat not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ microlearningId: 'ml-123' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('language');
    });
  });

  describe('Adım 8: /email-ir/analyze', () => {
    it('returns 400 when id is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/email-ir/analyze'];
      if (!handler) throw new Error('Route /email-ir/analyze not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ accessToken: 'token' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid');
    });

    it('returns 400 when accessToken is missing', { timeout: 60000 }, async () => {
      const handler = handlers['/email-ir/analyze'];
      if (!handler) throw new Error('Route /email-ir/analyze not registered');

      const json = vi.fn();
      const ctx = {
        req: { json: vi.fn().mockResolvedValue({ id: 'email-123' }) },
        json,
      } as any;

      await handler(ctx);

      expect(json).toHaveBeenCalledTimes(1);
      const [body, status] = json.mock.calls[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid');
    });
  });
});
