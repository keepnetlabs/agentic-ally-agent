import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authTokenMiddleware } from './auth-token';

const { mockTokenCache } = vi.hoisted(() => ({
  mockTokenCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../utils/core/token-cache', () => ({
  tokenCache: mockTokenCache,
}));

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => mockLogger,
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    name: (err as Error)?.name ?? 'Error',
    message: (err as Error)?.message ?? 'Unknown error',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    auth: vi.fn((msg: string, ctx?: object) => ({ message: msg, ...ctx })),
  },
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: () => Promise<Response>) => fn()),
}));

vi.mock('../utils/core/url-validator', () => ({
  validateBaseApiUrl: vi.fn((url: string) => url),
}));

function createMockContext(path: string, headers: Record<string, string> = {}) {
  const jsonFn = vi.fn();
  return {
    req: {
      path,
      method: 'POST',
      header: (name: string) => headers[name],
    },
    json: jsonFn,
    env: {},
  } as any;
}

describe('authTokenMiddleware', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('skip paths', () => {
    it('should call next() for /health', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/health', {});
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
    });

    it('should call next() for /__refresh', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/__refresh', {});
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
    });

    it('should call next() for /autonomous (public unauthenticated)', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/autonomous', {});
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
    });

    it('should log when public unauthenticated endpoint is accessed', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/smishing/chat', {});
      await authTokenMiddleware(c, next);
      expect(mockLogger.info).toHaveBeenCalledWith('Public unauthenticated endpoint access', {
        path: '/smishing/chat',
        method: 'POST',
      });
    });
  });

  describe('missing token', () => {
    it('should return 401 when X-AGENTIC-ALLY-TOKEN is missing', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', {});
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Unauthorized',
          message: 'X-AGENTIC-ALLY-TOKEN header is required',
        },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should use x-forwarded-for when cf-connecting-ip is absent', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'x-forwarded-for': '10.0.0.5',
      });
      await authTokenMiddleware(c, next);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '❌ Unauthorized: missing token',
        expect.objectContaining({ ip: '10.0.0.5' })
      );
    });
  });

  describe('invalid token format', () => {
    it('should return 401 when token is too short (< 32 chars)', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', { 'X-AGENTIC-ALLY-TOKEN': 'short' });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Unauthorized', message: 'Invalid token format' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token has invalid characters', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32) + '!@#',
      });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Unauthorized', message: 'Invalid token format' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should log invalid format reason when token has invalid chars (not too short)', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32) + '!@#',
      });
      await authTokenMiddleware(c, next);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '❌ Unauthorized: invalid token format',
        expect.objectContaining({ reason: 'invalid characters or format' })
      );
    });

    it('should log too short reason when token is under 32 chars', async () => {
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'short',
      });
      await authTokenMiddleware(c, next);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '❌ Unauthorized: invalid token format',
        expect.objectContaining({ reason: expect.stringContaining('too short') })
      );
    });
  });

  describe('cached token', () => {
    it('should call next() when token is cached as valid', async () => {
      mockTokenCache.get.mockReturnValue(true);
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return 401 when token is cached as invalid', async () => {
      mockTokenCache.get.mockReturnValue(false);
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Unauthorized', message: 'Token invalid (cached)' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('backend validation', () => {
    it('should call next() when backend returns 200', async () => {
      mockTokenCache.get.mockReturnValue(null);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      });
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockTokenCache.set).toHaveBeenCalledWith('a'.repeat(32), true);
      expect(c.json).not.toHaveBeenCalled();
    });

    it('should return 401 when backend returns 401', async () => {
      mockTokenCache.get.mockReturnValue(null);
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        { error: 'Unauthorized', message: 'Token validation failed' },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when fetch throws', async () => {
      mockTokenCache.get.mockReturnValue(null);
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Unauthorized',
          message: 'Token validation service unavailable',
        },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when auth server returns 5xx (triggers throw in fetch callback)', async () => {
      mockTokenCache.get.mockReturnValue(null);
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });
      const next = vi.fn();
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': 'a'.repeat(32),
      });
      await authTokenMiddleware(c, next);
      expect(c.json).toHaveBeenCalledWith(
        {
          error: 'Unauthorized',
          message: 'Token validation service unavailable',
        },
        401
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('JWT token', () => {
    it('should accept valid JWT format', async () => {
      mockTokenCache.get.mockReturnValue(null);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      });
      const next = vi.fn(async () => {});
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const c = createMockContext('/chat', {
        'X-AGENTIC-ALLY-TOKEN': jwt,
      });
      await authTokenMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
    });
  });
});
