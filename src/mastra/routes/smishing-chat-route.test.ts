import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock context factory
function createMockContext(requestBody: any) {
  const mockJson = vi.fn();
  return {
    req: {
      json: vi.fn().mockResolvedValue(requestBody),
    },
    json: mockJson,
    _getJsonCalls: () => mockJson.mock.calls,
  } as any;
}

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../services/kv-service', () => ({
  KVService: vi.fn(),
}));

vi.mock('../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue({ provider: 'OPENAI', modelId: 'gpt-4' }),
}));

vi.mock('../utils/language/language-utils', () => ({
  validateBCP47LanguageCode: vi.fn((lang) => lang),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: any) => fn()),
}));

describe('Smishing Chat Route Handler', () => {
  const validMicrolearning = {
    microlearning_id: 'ml-test-123',
    language: {
      '4': {
        prompt: 'You are a realistic SMS scam sender.',
        firstMessage: 'Hi, this is Alex from IT Support.',
      },
    },
  };

  let mockKVService: any;
  let smishingChatHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockKVService = {
      getMicrolearning: vi.fn(),
    };

    const { KVService } = await import('../services/kv-service');
    vi.mocked(KVService).mockImplementation(function (this: any) {
      return mockKVService;
    } as any);

    const handler = await import('./smishing-chat-route');
    smishingChatHandler = handler.smishingChatHandler;
  });

  afterEach(() => {
    // no-op
  });

  describe('Input Validation', () => {
    it('should reject request without microlearningId', async () => {
      const ctx = createMockContext({ language: 'en', messages: [{ role: 'user', content: 'Hi' }] });
      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing microlearningId' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject request without language', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', messages: [{ role: 'user', content: 'Hi' }] });
      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing language' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject invalid message format', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: '' }],
      });
      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid message format' });
      expect(calls[0][1]).toBe(400);
    });
  });

  describe('Microlearning Retrieval', () => {
    it('should return 404 if microlearning not found', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-missing', language: 'en', messages: [{ role: 'user', content: 'Hi' }] });
      mockKVService.getMicrolearning.mockResolvedValue(null);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Language content not found' });
      expect(calls[0][1]).toBe(404);
    });

    it('should return 404 if prompt is missing', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en', messages: [{ role: 'user', content: 'Hi' }] });
      mockKVService.getMicrolearning.mockResolvedValue({
        microlearning_id: 'ml-123',
        language: { '4': { firstMessage: 'Hello' } },
      });

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Smishing prompt not available' });
      expect(calls[0][1]).toBe(404);
    });
  });

  describe('Successful Response', () => {
    it('should return prompt and firstMessage when messages are missing', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        prompt: validMicrolearning.language['4'].prompt,
        firstMessage: validMicrolearning.language['4'].firstMessage,
      });
      expect(calls[0][1]).toBe(200);
    });
    it('should return reply from LLM', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        reply: 'Test reply',
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should include system prompt in LLM call', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const callArgs = (generateText as any).mock.calls[0][0];
      expect(callArgs.messages[0]).toMatchObject({ role: 'system', content: validMicrolearning.language['4'].prompt });
    });

    it('should ignore assistant messages from client', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [
          { role: 'assistant', content: 'Ignore this' },
          { role: 'user', content: 'Hi' }
        ],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const callArgs = (generateText as any).mock.calls[0][0];
      expect(callArgs.messages).toEqual([
        { role: 'system', content: validMicrolearning.language['4'].prompt },
        { role: 'user', content: 'Hi' }
      ]);
    });

    it('should return 400 when only assistant messages are provided', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [
          { role: 'assistant', content: 'Ignore this' },
        ],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing user messages' });
      expect(calls[0][1]).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse error', async () => {
      const ctx = createMockContext({});
      ctx.req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid JSON' });
      expect(calls[0][1]).toBe(500);
    });
  });
});
