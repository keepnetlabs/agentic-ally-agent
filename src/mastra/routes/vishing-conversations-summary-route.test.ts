/**
 * Unit tests for POST /vishing/conversations/summary handler
 *
 * Covers: validation, auth (cached/uncached/fetch-error), success,
 *         tool failures, edge cases, response shape, and header usage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vishingConversationsSummaryHandler } from './vishing-conversations-summary-route';

// ============================================
// VALID FIXTURES
// ============================================

const validMessages = [
  { role: 'user' as const, text: 'Hello', timestamp: 0 },
  { role: 'agent' as const, text: 'Hi, this is IT support.', timestamp: 1 },
];

const VALID_TOKEN = 'a'.repeat(32);

const mockSummaryResult = {
  summary: {
    outcome: 'refused',
    disclosedInfo: [],
    timeline: [
      { speaker: 'agent', text: 'Hi, this is IT support.', timestamp: 1 },
    ],
  },
  nextSteps: [{ title: 'Verify', description: 'Always verify callers' }],
  statusCard: { variant: 'success', title: 'No Data Disclosed', description: 'Well done' },
};

// ============================================
// MOCKS
// ============================================

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue(mockLogger),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    message: err instanceof Error ? err.message : 'Unknown error',
    code: 'UNKNOWN',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    validation: vi.fn((message: string, context?: object) => ({ message, ...context })),
    internal: vi.fn((message: string, context?: object) => ({ message, ...context })),
  },
}));

vi.mock('../utils/core/token-cache', () => ({
  tokenCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(),
}));

vi.mock('../tools/vishing-call/vishing-conversations-summary-tool', () => ({
  generateVishingConversationsSummary: vi.fn(),
}));

// ============================================
// HELPERS
// ============================================

function createMockContext(
  requestBody: unknown,
  headerOverrides?: Record<string, string>,
) {
  const jsonFn = vi.fn();
  return {
    req: {
      json: vi.fn().mockResolvedValue(requestBody),
      header: vi.fn((key: string) => {
        if (headerOverrides && key in headerOverrides) return headerOverrides[key];
        return '';
      }),
    },
    json: jsonFn,
    /** Convenience accessor */
    _calls: () => jsonFn.mock.calls,
  } as any;
}

// ============================================
// TESTS
// ============================================

describe('vishingConversationsSummaryHandler', () => {
  let tokenCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let generateVishingConversationsSummary: ReturnType<typeof vi.fn>;
  let withRetry: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const tcMod = await import('../utils/core/token-cache');
    tokenCache = tcMod.tokenCache as unknown as typeof tokenCache;

    const toolMod = await import('../tools/vishing-call/vishing-conversations-summary-tool');
    generateVishingConversationsSummary = toolMod.generateVishingConversationsSummary as any;

    const resMod = await import('../utils/core/resilience-utils');
    withRetry = resMod.withRetry as any;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ==================== INPUT VALIDATION ====================

  describe('Input Validation', () => {
    it('returns 400 when request body is null (becomes empty object)', async () => {
      const ctx = createMockContext(null);

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid request format');
      expect(body.details).toBeDefined();
    });

    it('returns 400 when request body is empty object', async () => {
      const ctx = createMockContext({});

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid request format');
    });

    it('returns 400 when accessToken is missing', async () => {
      const ctx = createMockContext({ messages: validMessages });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when accessToken is too short (< 32 chars)', async () => {
      const ctx = createMockContext({
        accessToken: 'short',
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid request');
    });

    it('returns 400 when accessToken exceeds max length (> 4096 chars)', async () => {
      const ctx = createMockContext({
        accessToken: 'x'.repeat(4097),
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when messages array is empty', async () => {
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when messages is not an array', async () => {
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: 'not-an-array',
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when messages contain only empty-text items (filtered out)', async () => {
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [
          { role: 'user', text: '', timestamp: 0 },
          { role: 'agent', text: '   ', timestamp: 1 },
        ],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 when message role is invalid', async () => {
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [{ role: 'invalid', text: 'hello', timestamp: 0 }],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('returns 400 details including Zod formatted errors', async () => {
      const ctx = createMockContext({
        accessToken: 'short',
        messages: [],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.details).toBeDefined();
      expect(body.details._errors).toBeDefined();
    });
  });

  // ==================== AUTH: CACHED TOKEN ====================

  describe('Auth — cached token', () => {
    it('returns 401 when token is cached as invalid (false)', async () => {
      tokenCache.get.mockReturnValue(false);
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('expired');
      // Should NOT call withRetry when cache has a definitive answer
      expect(withRetry).not.toHaveBeenCalled();
    });

    it('skips fetch validation when token is cached as valid (true)', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
      expect(withRetry).not.toHaveBeenCalled();
    });
  });

  // ==================== AUTH: FETCH VALIDATION (cache miss) ====================

  describe('Auth — fetch validation (cache miss)', () => {
    beforeEach(() => {
      tokenCache.get.mockReturnValue(null);
    });

    it('returns 200 when auth validate returns ok and caches valid token', async () => {
      withRetry.mockResolvedValue({ ok: true } as Response);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(tokenCache.set).toHaveBeenCalledWith(VALID_TOKEN, true);
      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('returns 401 and caches invalid token with TTL when auth returns not-ok', async () => {
      withRetry.mockResolvedValue({ ok: false } as Response);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(tokenCache.set).toHaveBeenCalledWith(VALID_TOKEN, false, expect.any(Number));
      const [body, status] = ctx._calls()[0];
      expect(status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when withRetry throws (network error)', async () => {
      withRetry.mockRejectedValue(new Error('Network error'));

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when auth validate returns 5xx (retry callback throws)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });
      vi.stubGlobal('fetch', mockFetch);

      withRetry.mockImplementation(async (fn: any) => fn());

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('passes through to success when auth validate returns ok (non-5xx)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.stubGlobal('fetch', mockFetch);

      withRetry.mockImplementation(async (fn: any) => fn());
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/validate'),
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: `Bearer ${VALID_TOKEN}` },
        }),
      );
    });
  });

  // ==================== AUTH: X-BASE-API-URL HEADER ====================

  describe('Auth — X-BASE-API-URL header', () => {
    beforeEach(() => {
      tokenCache.get.mockReturnValue(null);
    });

    it('uses X-BASE-API-URL header for auth validate when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      withRetry.mockImplementation(async (fn: any) => fn());
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext(
        { accessToken: VALID_TOKEN, messages: validMessages },
        { 'X-BASE-API-URL': 'https://custom-api.example.com' },
      );

      await vishingConversationsSummaryHandler(ctx);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-api.example.com/auth/validate',
        expect.any(Object),
      );
    });

    it('falls back to DEFAULT_AUTH_URL when X-BASE-API-URL header is empty', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      withRetry.mockImplementation(async (fn: any) => fn());
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext(
        { accessToken: VALID_TOKEN, messages: validMessages },
      );

      await vishingConversationsSummaryHandler(ctx);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/validate'),
        expect.any(Object),
      );
      // Should NOT contain "undefined" in the URL
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('undefined');
    });
  });

  // ==================== SUCCESS CASES ====================

  describe('Success responses', () => {
    beforeEach(() => {
      tokenCache.get.mockReturnValue(true);
    });

    it('returns 200 with correct shape on success', async () => {
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(ctx.json).toHaveBeenCalledTimes(1);
      const [body, status] = ctx._calls()[0];
      expect(status ?? 200).toBe(200);
      expect(body).toEqual({
        success: true,
        summary: mockSummaryResult.summary,
        disclosedInformation: mockSummaryResult.summary.disclosedInfo,
        nextSteps: mockSummaryResult.nextSteps,
        statusCard: mockSummaryResult.statusCard,
      });
    });

    it('passes messages array to generateVishingConversationsSummary', async () => {
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(generateVishingConversationsSummary).toHaveBeenCalledTimes(1);
      expect(generateVishingConversationsSummary).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', text: 'Hello' }),
          expect.objectContaining({ role: 'agent', text: 'Hi, this is IT support.' }),
        ]),
      );
    });

    it('returns disclosedInformation from summary.disclosedInfo', async () => {
      const resultWithDisclosures = {
        ...mockSummaryResult,
        summary: {
          ...mockSummaryResult.summary,
          outcome: 'data_disclosed',
          disclosedInfo: ['Password', 'Employee ID'],
        },
      };
      generateVishingConversationsSummary.mockResolvedValue(resultWithDisclosures);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.disclosedInformation).toEqual(['Password', 'Employee ID']);
    });

    it('handles empty nextSteps array', async () => {
      const resultNoSteps = {
        ...mockSummaryResult,
        nextSteps: [],
      };
      generateVishingConversationsSummary.mockResolvedValue(resultNoSteps);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
      expect(body.nextSteps).toEqual([]);
    });

    it('accepts messages using "message" field instead of "text" (schema transform)', async () => {
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [
          { role: 'user', message: 'Hello via message field', timestamp: 0 },
          { role: 'agent', text: 'Response', timestamp: 1 },
        ],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });
  });

  // ==================== ERROR CASES ====================

  describe('Error handling', () => {
    it('returns 500 when c.req.json() throws (malformed JSON)', async () => {
      const ctx = createMockContext({});
      ctx.req.json = vi.fn().mockRejectedValue(new Error('Invalid JSON body'));

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid JSON body');
    });

    it('returns 500 when generateVishingConversationsSummary throws', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockRejectedValue(new Error('LLM timeout'));

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('LLM timeout');
    });

    it('returns 500 with "Unknown error" when non-Error is thrown', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockRejectedValue('string-error');

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unknown error');
    });

    it('calls errorService.internal on unhandled error', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockRejectedValue(new Error('boom'));

      const { errorService } = await import('../services/error-service');

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(errorService.internal).toHaveBeenCalledWith(
        'boom',
        expect.objectContaining({
          route: '/vishing/conversations/summary',
          event: 'error',
          durationMs: expect.any(Number),
        }),
      );
    });

    it('calls errorService.validation on invalid input', async () => {
      const { errorService } = await import('../services/error-service');

      const ctx = createMockContext({ accessToken: 'short', messages: [] });

      await vishingConversationsSummaryHandler(ctx);

      expect(errorService.validation).toHaveBeenCalledWith(
        'Invalid request format',
        expect.objectContaining({ route: '/vishing/conversations/summary' }),
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    it('handles a single valid message', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [{ role: 'user', text: 'Hello', timestamp: 0 }],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('filters out messages with empty text before validation', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      // Mix of valid and empty messages — empty ones filtered by preprocess
      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [
          { role: 'user', text: '', timestamp: 0 },
          { role: 'user', text: 'Valid message', timestamp: 1 },
          { role: 'agent', text: '  ', timestamp: 2 },
          { role: 'agent', text: 'Also valid', timestamp: 3 },
        ],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
      // Tool should only receive the non-empty messages
      const passedMessages = generateVishingConversationsSummary.mock.calls[0][0];
      expect(passedMessages).toHaveLength(2);
    });

    it('handles accessToken at exact min boundary (32 chars)', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: 'x'.repeat(32),
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('handles accessToken at exact max boundary (4096 chars)', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: 'x'.repeat(4096),
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('handles many messages (near max 500)', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const manyMessages = Array.from({ length: 500 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent',
        text: `Message ${i}`,
        timestamp: i,
      }));

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: manyMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('returns 400 when messages exceed max (501)', async () => {
      const tooManyMessages = Array.from({ length: 501 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'agent',
        text: `Message ${i}`,
        timestamp: i,
      }));

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: tooManyMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('handles messages without optional timestamp', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: [
          { role: 'user', text: 'No timestamp' },
          { role: 'agent', text: 'Also no timestamp' },
        ],
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
    });

    it('trims whitespace from accessToken via schema', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: '  ' + VALID_TOKEN + '  ',
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      expect(body.success).toBe(true);
      // Token cache should be called with trimmed value
      expect(tokenCache.get).toHaveBeenCalledWith(VALID_TOKEN);
    });
  });

  // ==================== LOGGING ====================

  describe('Logging', () => {
    it('logs success with outcome and nextStepsCount', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'vishing_conversations_summary_success',
        expect.objectContaining({
          route: '/vishing/conversations/summary',
          durationMs: expect.any(Number),
          outcome: 'refused',
          nextStepsCount: 1,
        }),
      );
    });

    it('logs request with messageCount', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'vishing_conversations_summary_request',
        expect.objectContaining({
          route: '/vishing/conversations/summary',
          messageCount: 2,
        }),
      );
    });

    it('logs error via logErrorInfo on unhandled exception', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockRejectedValue(new Error('fail'));

      const { logErrorInfo } = await import('../utils/core/error-utils');

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      expect(logErrorInfo).toHaveBeenCalledWith(
        expect.anything(),
        'error',
        'vishing_conversations_summary_error',
        expect.any(Object),
      );
    });

    it('logs validation warning via logErrorInfo on invalid input', async () => {
      const { logErrorInfo } = await import('../utils/core/error-utils');

      const ctx = createMockContext({ accessToken: 'short' });

      await vishingConversationsSummaryHandler(ctx);

      expect(logErrorInfo).toHaveBeenCalledWith(
        expect.anything(),
        'warn',
        'vishing_conversations_summary_invalid_input',
        expect.any(Object),
      );
    });
  });

  // ==================== RESPONSE SHAPE ====================

  describe('Response shape contract', () => {
    it('success response has exactly the expected keys', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockResolvedValue(mockSummaryResult);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body] = ctx._calls()[0];
      const keys = Object.keys(body).sort();
      expect(keys).toEqual(
        ['disclosedInformation', 'nextSteps', 'statusCard', 'success', 'summary'].sort(),
      );
    });

    it('error 400 response has success, error, and details', async () => {
      const ctx = createMockContext({ accessToken: 'x', messages: [] });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(400);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('details');
    });

    it('error 401 response has error and message', async () => {
      tokenCache.get.mockReturnValue(false);

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(401);
      expect(body).toHaveProperty('error', 'Unauthorized');
      expect(body).toHaveProperty('message');
    });

    it('error 500 response has success and error', async () => {
      tokenCache.get.mockReturnValue(true);
      generateVishingConversationsSummary.mockRejectedValue(new Error('kaboom'));

      const ctx = createMockContext({
        accessToken: VALID_TOKEN,
        messages: validMessages,
      });

      await vishingConversationsSummaryHandler(ctx);

      const [body, status] = ctx._calls()[0];
      expect(status).toBe(500);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error', 'kaboom');
    });
  });
});
