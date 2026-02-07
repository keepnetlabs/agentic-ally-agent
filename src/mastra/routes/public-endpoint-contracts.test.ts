import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { smishingChatHandler } from './smishing-chat-route';
import { vishingPromptHandler } from './vishing-prompt-route';
import { emailIRAnalyzeHandler } from './email-ir-route';
import { smishingChatRequestSchema } from './smishing-chat-route.schemas';
import { vishingPromptRequestSchema } from './vishing-prompt-route.schemas';
import { fetchEmailInputSchema } from '../tools/email-ir/fetch-email';

function createMockContext(requestBody: unknown) {
  const jsonMock = vi.fn();
  return {
    req: {
      json: vi.fn().mockResolvedValue(requestBody),
    },
    json: jsonMock,
    _getJsonCall: () => jsonMock.mock.calls[0] as [unknown, number | undefined],
  } as any;
}

const smishingInitResponseSchema = z.object({
  success: z.literal(true),
  microlearningId: z.string().min(1),
  language: z.string().min(1),
  prompt: z.string().min(1),
  firstMessage: z.string().min(1),
  isFinished: z.literal(false),
});

const smishingReplyResponseSchema = z.object({
  success: z.literal(true),
  microlearningId: z.string().min(1),
  language: z.string().min(1),
  reply: z.string().min(1),
  isFinished: z.boolean(),
});

const vishingSuccessResponseSchema = z.object({
  success: z.literal(true),
  microlearningId: z.string().min(1),
  language: z.string().min(1),
  prompt: z.string().min(1),
  firstMessage: z.string().min(1),
  agentId: z.string().min(1),
  wsUrl: z.string().url(),
  signedUrl: z.string().optional(),
});

const emailIrSuccessResponseSchema = z.object({
  success: z.literal(true),
  report: z.unknown(),
  runId: z.string().min(1),
});

const genericErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
});

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../model-providers', () => ({
  getModelWithOverride: vi.fn(() => ({ provider: 'openai', model: 'gpt-4o-mini' })),
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('./scene4-route-helpers', () => ({
  loadScene4RouteData: vi.fn(),
}));

vi.mock('./chat-provider-compat', () => ({
  resolveEffectiveProvider: vi.fn(() => 'openai'),
  shouldMapAssistantHistoryAsUser: vi.fn(() => false),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    internal: vi.fn((message: string, meta: Record<string, unknown>) => ({ message, ...meta })),
    validation: vi.fn((message: string, meta: Record<string, unknown>) => ({ message, ...meta })),
  },
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    message: err instanceof Error ? err.message : String(err),
    code: 'UNKNOWN',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../workflows/email-ir-workflow', () => ({
  emailIRWorkflow: {
    createRunAsync: vi.fn().mockResolvedValue({
      runId: 'run-contract-1',
      start: vi.fn().mockResolvedValue({
        status: 'completed',
        steps: {
          'email-ir-reporting-step': {
            status: 'success',
            output: { verdict: 'suspicious' },
          },
        },
      }),
    }),
  },
}));

describe('Public Endpoint Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_AGENT_ID = 'agent_contract_123';
  });

  describe('Request Schemas', () => {
    it('smishing chat request contract accepts valid payload', () => {
      const result = smishingChatRequestSchema.safeParse({
        microlearningId: 'ml-123',
        language: 'en-gb',
        messages: [{ role: 'user', content: 'hello' }],
      });
      expect(result.success).toBe(true);
    });

    it('smishing chat request contract rejects invalid payload', () => {
      const result = smishingChatRequestSchema.safeParse({
        microlearningId: '',
        language: 'e',
        messages: [{ role: 'user', content: '' }],
      });
      expect(result.success).toBe(false);
    });

    it('vishing prompt request contract accepts valid payload', () => {
      const result = vishingPromptRequestSchema.safeParse({
        microlearningId: 'ml-456',
        language: 'en',
      });
      expect(result.success).toBe(true);
    });

    it('email IR analyze request contract rejects invalid payload', () => {
      const result = fetchEmailInputSchema.safeParse({
        id: '',
        accessToken: '',
        apiBaseUrl: 'ftp://invalid.example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Response Schemas', () => {
    it('smishing init response matches contract snapshot', async () => {
      const { loadScene4RouteData } = await import('./scene4-route-helpers');
      vi.mocked(loadScene4RouteData).mockResolvedValue({
        hasLanguageContent: true,
        normalizedLanguage: 'en-gb',
        prompt: 'You are a smishing simulator',
        firstMessage: 'Hi this is Alex from IT',
      } as any);

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en-gb',
      });

      await smishingChatHandler(ctx);
      const [payload, status] = ctx._getJsonCall();

      expect(status).toBe(200);
      expect(smishingInitResponseSchema.safeParse(payload).success).toBe(true);
      expect(payload).toMatchInlineSnapshot(`
        {
          "firstMessage": "Hi this is Alex from IT",
          "isFinished": false,
          "language": "en-gb",
          "microlearningId": "ml-123",
          "prompt": "You are a smishing simulator",
          "success": true,
        }
      `);
    });

    it('smishing chat reply response matches contract', async () => {
      const { generateText } = await import('ai');
      const { loadScene4RouteData } = await import('./scene4-route-helpers');

      vi.mocked(loadScene4RouteData).mockResolvedValue({
        hasLanguageContent: true,
        normalizedLanguage: 'en-gb',
        prompt: 'You are a smishing simulator',
        firstMessage: 'hi',
      } as any);
      vi.mocked(generateText).mockResolvedValue({
        text: '{"reply":"This is a simulation debrief.","isFinished":true}',
      } as any);

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en-gb',
        messages: [{ role: 'user', content: 'ok' }],
      });

      await smishingChatHandler(ctx);
      const [payload, status] = ctx._getJsonCall();

      expect(status).toBe(200);
      expect(smishingReplyResponseSchema.safeParse(payload).success).toBe(true);
    });

    it('vishing prompt response matches contract snapshot', async () => {
      const { loadScene4RouteData } = await import('./scene4-route-helpers');
      vi.mocked(loadScene4RouteData).mockResolvedValue({
        hasLanguageContent: true,
        normalizedLanguage: 'en',
        prompt: 'You are a vishing simulator',
        firstMessage: 'Hello from support',
      } as any);

      const ctx = createMockContext({
        microlearningId: 'ml-456',
        language: 'en',
      });

      await vishingPromptHandler(ctx);
      const [payload, status] = ctx._getJsonCall();

      expect(status).toBe(200);
      expect(vishingSuccessResponseSchema.safeParse(payload).success).toBe(true);
      expect(payload).toMatchInlineSnapshot(`
        {
          "agentId": "agent_contract_123",
          "firstMessage": "Hello from support",
          "language": "en",
          "microlearningId": "ml-456",
          "prompt": "You are a vishing simulator",
          "signedUrl": undefined,
          "success": true,
          "wsUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_contract_123",
        }
      `);
    });

    it('email IR analyze response matches contract', async () => {
      const ctx = createMockContext({
        id: 'email-123',
        accessToken: 'x'.repeat(32),
        apiBaseUrl: 'https://api.example.com',
      });

      await emailIRAnalyzeHandler(ctx);
      const [payload, status] = ctx._getJsonCall();

      expect(status).toBeUndefined();
      expect(emailIrSuccessResponseSchema.safeParse(payload).success).toBe(true);
    });

    it('returns generic error contract on required field failure', async () => {
      const ctx = createMockContext({
        language: 'en',
      });

      await smishingChatHandler(ctx);
      const [payload, status] = ctx._getJsonCall();

      expect(status).toBe(400);
      expect(genericErrorResponseSchema.safeParse(payload).success).toBe(true);
    });
  });
});
