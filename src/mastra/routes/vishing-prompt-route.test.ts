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

// Mock modules
vi.mock('../services/kv-service', () => ({
  KVService: vi.fn(),
}));

vi.mock('../utils/language/language-utils', () => ({
  validateBCP47LanguageCode: vi.fn(lang => lang),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

/**
 * Test suite for Vishing Prompt Route Handler
 * Tests the /vishing-prompt endpoint for retrieving voice call simulation data
 */
describe('Vishing Prompt Route Handler', () => {
  const validMicrolearning = {
    microlearning_id: 'ml-test-123',
    language: {
      '4': {
        prompt: 'You are a realistic voice-call scam caller.',
        firstMessage: 'Hello, this is John from IT Support.',
      },
    },
  };

  let mockKVService: any;
  let originalFetch: any;
  let vishingPromptHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup env vars BEFORE importing the module
    process.env.ELEVENLABS_API_KEY = 'test-key';
    process.env.ELEVENLABS_AGENT_ID = 'test-agent';

    // Setup KVService mock
    mockKVService = {
      getMicrolearning: vi.fn(),
    };

    const { KVService } = await import('../services/kv-service');
    // Mock the constructor to return the mockKVService instance
    vi.mocked(KVService).mockImplementation(function (this: any) {
      return mockKVService;
    } as any);

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    // Dynamically import handler after env vars are set
    vi.resetModules(); // Clear module cache
    const handler = await import('./vishing-prompt-route');
    vishingPromptHandler = handler.vishingPromptHandler;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
  });

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should reject request without microlearningId', async () => {
      const ctx = createMockContext({ language: 'en' });
      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing microlearningId' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject request with non-string microlearningId', async () => {
      const ctx = createMockContext({ microlearningId: 123, language: 'en' });
      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing microlearningId' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject request without language', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123' });
      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing language' });
      expect(calls[0][1]).toBe(400);
    });

    it('should reject request with non-string language', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 123 });
      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Missing language' });
      expect(calls[0][1]).toBe(400);
    });

    it('should accept valid request', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: true });
      expect(calls[0][1]).toBe(200);
    });
  });

  // ==================== MICROLEARNING RETRIEVAL TESTS ====================
  describe('Microlearning Retrieval', () => {
    it('should return 404 if microlearning not found', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-missing', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(null);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Language content not found' });
      expect(calls[0][1]).toBe(404);
    });

    it('should return 404 if language property is missing', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue({ microlearning_id: 'ml-123' });

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Language content not found' });
      expect(calls[0][1]).toBe(404);
    });
  });

  // ==================== SCENE 4 VALIDATION TESTS ====================
  describe('Scene 4 Validation', () => {
    it('should return 404 if scene 4 is missing', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue({
        microlearning_id: 'ml-123',
        language: {},
      });

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Vishing prompt not available' });
      expect(calls[0][1]).toBe(404);
    });

    it('should return 404 if prompt is missing', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue({
        microlearning_id: 'ml-123',
        language: { '4': { firstMessage: 'Hello' } },
      });

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Vishing prompt not available' });
      expect(calls[0][1]).toBe(404);
    });

    it('should return 404 if firstMessage is missing', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue({
        microlearning_id: 'ml-123',
        language: { '4': { prompt: 'Test prompt' } },
      });

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Vishing prompt not available' });
      expect(calls[0][1]).toBe(404);
    });

    it('should succeed with valid scene 4', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        prompt: validMicrolearning.language['4'].prompt,
        firstMessage: validMicrolearning.language['4'].firstMessage,
      });
    });
  });

  // ==================== ELEVENLABS INTEGRATION TESTS ====================
  describe('ElevenLabs Integration', () => {
    it('should use custom agent ID from environment', async () => {
      process.env.ELEVENLABS_AGENT_ID = 'custom-id';
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].agentId).toBe('custom-id');
      expect(calls[0][0].wsUrl).toContain('custom-id');
    });

    it('should use default agent ID when not in environment', async () => {
      delete process.env.ELEVENLABS_AGENT_ID;
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].agentId).toBe('agent_0901kfr9djtqfg988bypdyah40mm');
    });

    it('should fetch signed URL when API key is present', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key';
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://signed-url' }),
      } as any);

      await vishingPromptHandler(ctx);

      expect(global.fetch).toHaveBeenCalled();
      const calls = ctx._getJsonCalls();
      expect(calls[0][0].signedUrl).toBe('wss://signed-url');
    });

    it('should handle signed_url field variant', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signed_url: 'wss://variant-url' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].signedUrl).toBe('wss://variant-url');
    });

    it('should not fetch signed URL when API key is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      // Re-import handler without API key
      vi.resetModules();
      const handler = await import('./vishing-prompt-route');
      const handlerWithoutKey = handler.vishingPromptHandler;

      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);

      await handlerWithoutKey(ctx);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch failure gracefully', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].success).toBe(true);
      expect(calls[0][0].signedUrl).toBeUndefined();
    });

    it('should handle fetch exception gracefully', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].success).toBe(true);
      expect(calls[0][0].signedUrl).toBeUndefined();
    });
  });

  // ==================== RESPONSE FORMAT TESTS ====================
  describe('Response Format', () => {
    it('should return all required fields on success', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({
        success: true,
        microlearningId: expect.any(String),
        language: expect.any(String),
        prompt: expect.any(String),
        firstMessage: expect.any(String),
        agentId: expect.any(String),
        wsUrl: expect.any(String),
      });
      expect(calls[0][1]).toBe(200);
    });

    it('should return normalized language', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'EN' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].language).toBe('en');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle JSON parse error', async () => {
      const ctx = createMockContext({});
      ctx.req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Invalid JSON' });
      expect(calls[0][1]).toBe(500);
    });

    it('should handle KVService error', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockRejectedValue(new Error('KV failed'));

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'KV failed' });
      expect(calls[0][1]).toBe(500);
    });

    it('should handle unknown error type', async () => {
      const ctx = createMockContext({ microlearningId: 'ml-123', language: 'en' });
      mockKVService.getMicrolearning.mockRejectedValue('String error');

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0]).toMatchObject({ success: false, error: 'Unknown error' });
      expect(calls[0][1]).toBe(500);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle empty request body', async () => {
      const ctx = createMockContext({});
      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].success).toBe(false);
      expect(calls[0][1]).toBe(400);
    });

    it('should handle very long microlearning ID', async () => {
      const longId = 'ml-' + 'x'.repeat(1000);
      const ctx = createMockContext({ microlearningId: longId, language: 'en' });
      mockKVService.getMicrolearning.mockResolvedValue(validMicrolearning);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'wss://test' }),
      } as any);

      await vishingPromptHandler(ctx);

      const calls = ctx._getJsonCalls();
      expect(calls[0][0].success).toBe(true);
      expect(calls[0][0].microlearningId).toBe(longId);
    });
  });
});
