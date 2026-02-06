import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { INBOX_TEXT_PARAMS } from '../utils/config/llm-generation-params';
import { getModelWithOverride } from '../model-providers';
import { validateBCP47LanguageCode } from '../utils/language/language-utils';

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
  ModelProvider: {
    OPENAI: 'openai',
    WORKERS_AI: 'workers-ai',
    GOOGLE: 'google',
  },
  Model: {
    OPENAI_GPT_4O_MINI: 'gpt-4o-mini',
    WORKERS_AI_GPT_OSS_120B: '@cf/openai/gpt-oss-120b',
  },
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
    vi.mocked(validateBCP47LanguageCode).mockImplementation((lang) => lang);

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

    it('should reject request when microlearningId is not a string', async () => {
      const ctx = createMockContext({ microlearningId: 123, language: 'en', messages: [{ role: 'user', content: 'Hi' }] });
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

    it('should reject request when language is not a string', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 123, messages: [{ role: 'user', content: 'Hi' }] });
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

    it('should reject messages with invalid role', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'tool', content: 'Hi' }],
      });
      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid message format' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject non-object messages in array', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: ['not-an-object'],
      });
      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid message format' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject messages with whitespace content only', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: '   ' }],
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

    it('should return 404 if firstMessage is missing when no messages provided', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue({
        microlearning_id: 'ml-123',
        language: { '4': { prompt: 'Prompt only' } },
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
        isFinished: false,
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should treat non-array messages as missing and return prompt/firstMessage', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: 'not-an-array' as any,
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        prompt: validMicrolearning.language['4'].prompt,
        firstMessage: validMicrolearning.language['4'].firstMessage,
        isFinished: false,
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should return prompt and firstMessage when messages are an empty array', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        prompt: validMicrolearning.language['4'].prompt,
        firstMessage: validMicrolearning.language['4'].firstMessage,
        isFinished: false,
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

    it('should include INBOX_TEXT_PARAMS in LLM call', async () => {
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
      expect(callArgs).toMatchObject(INBOX_TEXT_PARAMS);
    });

    it('should include assistant history as mapped user context in LLM call for default provider', async () => {
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
      expect(callArgs.messages[0]).toEqual({ role: 'system', content: validMicrolearning.language['4'].prompt });
      expect(callArgs.messages[2]).toEqual({ role: 'user', content: 'Previous assistant message (context): Ignore this' });
      expect(callArgs.messages[3]).toEqual({ role: 'user', content: 'Hi' });
      expect(callArgs.messages).toHaveLength(4);
    });

    it('should keep assistant role history for non-workers providers', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        modelProvider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          { role: 'assistant', content: 'Earlier assistant message' },
          { role: 'user', content: 'Hi' }
        ],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const callArgs = (generateText as any).mock.calls[0][0];
      expect(callArgs.messages[2]).toEqual({ role: 'assistant', content: 'Earlier assistant message' });
      expect(callArgs.messages[3]).toEqual({ role: 'user', content: 'Hi' });
    });

    it('should parse structured JSON response and set isFinished', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({
        text: '{"reply":"This is a simulation. Watch urgency and unknown links. Report it.","isFinished":true}'
      });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: 'I think this is fake' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        reply: 'This is a simulation. Watch urgency and unknown links. Report it.',
        isFinished: true,
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should trust model isFinished flag from structured response', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({
        text: '{"reply":"Okay, let us continue the chat.","isFinished":true}'
      });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: 'continue' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        reply: 'Okay, let us continue the chat.',
        isFinished: true,
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should fallback to plain text reply when response is not JSON', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Plain text reply' });

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
        reply: 'Plain text reply',
        isFinished: false,
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should return fallback reply when model output is empty', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: '   ' });

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
        reply: 'Unable to generate smishing reply. Please try again.',
        isFinished: false,
      });
      expect(calls[0][1]).toBe(200);
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

    it('should normalize language to lowercase in response', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });
      vi.mocked(validateBCP47LanguageCode).mockReturnValue('EN-GB' as any);

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'EN-GB',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        language: 'en-gb',
      });
    });

    it('should pass model overrides to getModelWithOverride', async () => {
      const { generateText } = await import('ai');
      (generateText as any).mockResolvedValue({ text: 'Test reply' });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        modelProvider: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await smishingChatHandler(ctx);

      expect(vi.mocked(getModelWithOverride)).toHaveBeenCalledWith('openai', 'gpt-4o-mini');
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

    it('should handle invalid language validation error', async () => {
      vi.mocked(validateBCP47LanguageCode).mockImplementation(() => {
        throw new Error('Invalid language');
      });

      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'xx-yy',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid language' });
      expect(calls[0][1]).toBe(500);
    });

    it('should handle KV retrieval errors', async () => {
      const ctx = createMockContext({
        microlearningId: 'ml-123',
        language: 'en',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      mockKVService.getMicrolearning.mockRejectedValue(new Error('KV down'));

      await smishingChatHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'KV down' });
      expect(calls[0][1]).toBe(500);
    });
  });
});
