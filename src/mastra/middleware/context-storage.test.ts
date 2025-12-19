import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Context } from 'hono';
import { contextStorage } from './context-storage';
import { requestStorage } from '../utils/core/request-storage';
import '../../../src/__tests__/setup';

/**
 * Test Suite: ContextStorage Middleware
 * Tests for AsyncLocalStorage-based request context management
 * Covers: Token extraction, env binding, context propagation
 */

describe('ContextStorage Middleware', () => {
  let mockContext: Context;
  let mockNext: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      req: {
        header: vi.fn()
      },
      env: {
        KV: {},
        D1: {}
      }
    } as unknown as Context;

    mockNext = vi.fn().mockResolvedValue(undefined);
  });

  it('should extract token from X-AGENTIC-ALLY-TOKEN header', async () => {
    const token = 'test-token-123';
    (mockContext.req.header as any).mockReturnValue(token);

    await contextStorage(mockContext, mockNext);

    expect(mockContext.req.header).toHaveBeenCalledWith('X-AGENTIC-ALLY-TOKEN');
  });

  it('should pass env bindings to request storage', async () => {
    const mockEnv = { KV: {}, D1: {}, WORKERS: {} };
    mockContext.env = mockEnv as any;

    await contextStorage(mockContext, mockNext);

    // Verify next was called (context was set up)
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() after setting up context', async () => {
    await contextStorage(mockContext, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle missing token gracefully', async () => {
    (mockContext.req.header as any).mockReturnValue(undefined);

    await expect(
      contextStorage(mockContext, mockNext)
    ).resolves.not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });

  it('should propagate context to requestStorage', async () => {
    const token = 'test-token';
    const mockEnv = { KV: {} };
    (mockContext.req.header as any).mockReturnValue(token);
    mockContext.env = mockEnv as any;

    await contextStorage(mockContext, async () => {
      // Verify context is available within the storage run
      const context = requestStorage.getStore();
      expect(context).toBeDefined();
      expect(context?.token).toBe(token);
      expect(context?.env).toBe(mockEnv);
      expect(context?.correlationId).toBeDefined();
      expect(typeof context?.correlationId).toBe('string');
    });
  });

  it('should generate correlation ID if not provided in header', async () => {
    (mockContext.req.header as any).mockImplementation((header: string) => {
      if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
      if (header === 'X-Correlation-ID') return undefined;
      return undefined;
    });

    await contextStorage(mockContext, async () => {
      const context = requestStorage.getStore();
      expect(context?.correlationId).toBeDefined();
      expect(typeof context?.correlationId).toBe('string');
      expect(context?.correlationId?.length).toBeGreaterThan(0);
    });
  });

  it('should use correlation ID from header if provided', async () => {
    const providedCorrelationId = 'custom-correlation-id-123';
    (mockContext.req.header as any).mockImplementation((header: string) => {
      if (header === 'X-Correlation-ID') return providedCorrelationId;
      return undefined;
    });

    await contextStorage(mockContext, async () => {
      const context = requestStorage.getStore();
      expect(context?.correlationId).toBe(providedCorrelationId);
    });
  });

  it('should isolate context between requests', async () => {
    const token1 = 'token-1';
    const token2 = 'token-2';

    (mockContext.req.header as any).mockReturnValue(token1);
    await contextStorage(mockContext, async () => {
      const context1 = requestStorage.getStore();
      expect(context1?.token).toBe(token1);
    });

    (mockContext.req.header as any).mockReturnValue(token2);
    await contextStorage(mockContext, async () => {
      const context2 = requestStorage.getStore();
      expect(context2?.token).toBe(token2);
    });
  });
});
