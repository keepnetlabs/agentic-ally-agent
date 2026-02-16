/**
 * Unit tests for POST /vishing/conversations/summary handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vishingConversationsSummaryHandler } from './vishing-conversations-summary-route';

const validMessages = [
  { role: 'user' as const, text: 'Hello', timestamp: 0 },
  { role: 'agent' as const, text: 'Hi, this is IT support.', timestamp: 1 },
];

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    message: err instanceof Error ? err.message : 'Unknown error',
    code: 'UNKNOWN',
  })),
  logErrorInfo: vi.fn(),
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

describe('vishingConversationsSummaryHandler', () => {
  let mockContext: { req: { json: ReturnType<typeof vi.fn>; header: ReturnType<typeof vi.fn> }; json: ReturnType<typeof vi.fn> };
  let tokenCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let generateVishingConversationsSummary: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = {
      req: {
        json: vi.fn(),
        header: vi.fn().mockReturnValue(''),
      },
      json: vi.fn(),
    };

    const tokenCacheModule = await import('../utils/core/token-cache');
    tokenCache = tokenCacheModule.tokenCache as unknown as typeof tokenCache;

    const toolModule = await import('../tools/vishing-call/vishing-conversations-summary-tool');
    generateVishingConversationsSummary = toolModule.generateVishingConversationsSummary;
  });

  it('returns 400 when accessToken is too short', async () => {
    mockContext.req.json.mockResolvedValue({
      accessToken: 'short',
      messages: validMessages,
    });

    await vishingConversationsSummaryHandler(mockContext as any);

    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const [body, status] = mockContext.json.mock.calls[0];
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid request');
  });

  it('returns 400 when messages array is empty', async () => {
    mockContext.req.json.mockResolvedValue({
      accessToken: 'a'.repeat(32),
      messages: [],
    });

    await vishingConversationsSummaryHandler(mockContext as any);

    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const [body, status] = mockContext.json.mock.calls[0];
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 401 when token is invalid (cached false)', async () => {
    tokenCache.get.mockReturnValue(false);
    mockContext.req.json.mockResolvedValue({
      accessToken: 'a'.repeat(32),
      messages: validMessages,
    });

    await vishingConversationsSummaryHandler(mockContext as any);

    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const [body, status] = mockContext.json.mock.calls[0];
    expect(status).toBe(401);
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 200 with summary when token is valid and tool succeeds', async () => {
    tokenCache.get.mockReturnValue(true);
    mockContext.req.json.mockResolvedValue({
      accessToken: 'a'.repeat(32),
      messages: validMessages,
    });

    const mockSummary = {
      summary: {
        outcome: 'refused',
        disclosedInfo: [],
        timeline: [],
      },
      nextSteps: [{ title: 'Verify', description: 'Always verify' }],
      statusCard: { variant: 'success', title: 'No Data Disclosed', description: 'Well done' },
    };
    vi.mocked(generateVishingConversationsSummary).mockResolvedValue(mockSummary);

    await vishingConversationsSummaryHandler(mockContext as any);

    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const [body, status] = mockContext.json.mock.calls[0];
    expect(status ?? 200).toBe(200);
    expect(body.success).toBe(true);
    expect(body.summary).toEqual(mockSummary.summary);
    expect(body.nextSteps).toEqual(mockSummary.nextSteps);
    expect(body.statusCard).toEqual(mockSummary.statusCard);
  });

  it('returns 401 when token validation fails via fetch', async () => {
    tokenCache.get.mockReturnValue(null);
    const { withRetry } = await import('../utils/core/resilience-utils');
    vi.mocked(withRetry).mockResolvedValue({ ok: false } as Response);

    mockContext.req.json.mockResolvedValue({
      accessToken: 'a'.repeat(32),
      messages: validMessages,
    });

    await vishingConversationsSummaryHandler(mockContext as any);

    expect(mockContext.json).toHaveBeenCalledTimes(1);
    const [body, status] = mockContext.json.mock.calls[0];
    expect(status).toBe(401);
    expect(body.error).toContain('Unauthorized');
  });
});
