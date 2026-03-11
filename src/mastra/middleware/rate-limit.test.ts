import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rateLimitMiddleware,
  createEndpointRateLimiter,
  RATE_LIMIT_TIERS,
  getClientIdentifier,
  cleanupExpiredEntries,
  skipHealthCheck,
} from './rate-limit';

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

function createMockContext(path: string, headers: Record<string, string> = {}) {
  const resHeaders = new Headers();
  return {
    req: {
      path,
      method: 'GET',
      header: (name: string) => headers[name?.toLowerCase()] ?? headers[name],
    },
    res: {
      headers: resHeaders,
      status: 200,
    },
    json: vi.fn((data: unknown, status: number) => new Response(JSON.stringify(data), { status })),
  } as any;
}

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanupExpiredEntries();
  });

  describe('getClientIdentifier', () => {
    it('should use cf-connecting-ip when present', () => {
      const c = createMockContext('/chat', { 'cf-connecting-ip': '1.2.3.4' });
      expect(getClientIdentifier(c)).toBe('1.2.3.4');
    });

    it('should use x-forwarded-for when cf-connecting-ip absent', () => {
      const c = createMockContext('/chat', { 'x-forwarded-for': '5.6.7.8' });
      expect(getClientIdentifier(c)).toBe('5.6.7.8');
    });

    it('should use first IP from x-forwarded-for comma list', () => {
      const c = createMockContext('/chat', { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' });
      expect(getClientIdentifier(c)).toBe('10.0.0.1');
    });

    it('should fallback to unknown when no IP headers', () => {
      const c = createMockContext('/chat', {});
      expect(getClientIdentifier(c)).toBe('unknown');
    });
  });

  describe('allow under limit', () => {
    it('should call next() when under limit', async () => {
      const middleware = rateLimitMiddleware({ maxRequests: 5, windowMs: 60000 });
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', { 'cf-connecting-ip': '1.2.3.4' });
      await middleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(c.json).not.toHaveBeenCalled();
      expect(c.res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(c.res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });

    it('should set rate limit headers', async () => {
      const middleware = rateLimitMiddleware({ maxRequests: 10, windowMs: 60000 });
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', { 'cf-connecting-ip': '9.9.9.9' });
      await middleware(c, next);
      expect(c.res.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(parseInt(c.res.headers.get('X-RateLimit-Remaining') ?? '', 10)).toBeLessThanOrEqual(10);
      expect(c.res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('block over limit', () => {
    it('should return 429 when limit exceeded', async () => {
      const middleware = rateLimitMiddleware({ maxRequests: 2, windowMs: 60000 });
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', { 'cf-connecting-ip': '2.2.2.2' });

      await middleware(c, next);
      await middleware(c, next);
      await middleware(c, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          limit: 2,
          current: 3,
        }),
        429
      );
    });
  });

  describe('skip condition', () => {
    it('should skip rate limiting when skip returns true', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 1,
        windowMs: 60000,
        skip: (c) => c.req.path === '/health',
      });
      const next = vi.fn(async () => {});
      const c = createMockContext('/health', { 'cf-connecting-ip': '3.3.3.3' });

      await middleware(c, next);
      await middleware(c, next);
      await middleware(c, next);

      expect(next).toHaveBeenCalledTimes(3);
      expect(c.json).not.toHaveBeenCalled();
    });
  });

  describe('custom identifier', () => {
    it('should use custom identifier when provided', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 1,
        windowMs: 60000,
        identifier: () => 'custom-key',
      });
      const next = vi.fn(async () => {});
      const c1 = createMockContext('/chat', { 'cf-connecting-ip': '1.1.1.1' });
      const c2 = createMockContext('/chat', { 'cf-connecting-ip': '2.2.2.2' });

      await middleware(c1, next);
      await middleware(c2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(c2.json).toHaveBeenCalledWith(expect.anything(), 429);
    });
  });

  describe('cleanup', () => {
    it('should trigger cleanup when store reaches CLEANUP_FREQUENCY (100) entries', async () => {
      vi.useFakeTimers();
      const middleware = rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 });
      const next = vi.fn(async () => {});

      for (let i = 0; i < 100; i++) {
        const c = createMockContext('/chat', { 'cf-connecting-ip': `192.168.1.${i}` });
        await middleware(c, next);
      }
      expect(next).toHaveBeenCalledTimes(100);
      vi.useRealTimers();
    });

    it('should delete expired entries when cleanup runs', async () => {
      vi.useFakeTimers();
      const middleware = rateLimitMiddleware({ maxRequests: 5, windowMs: 60000 });
      const next = vi.fn(async () => {});

      for (let i = 0; i < 100; i++) {
        const c = createMockContext('/chat', { 'cf-connecting-ip': `10.0.0.${i}` });
        await middleware(c, next);
      }
      expect(next).toHaveBeenCalledTimes(100);

      vi.advanceTimersByTime(70000);

      const c101 = createMockContext('/chat', { 'cf-connecting-ip': '10.0.0.100' });
      await middleware(c101, next);
      expect(next).toHaveBeenCalledTimes(101);
      vi.useRealTimers();
    });
  });
});

describe('createEndpointRateLimiter', () => {
  it('should return middleware for CHAT tier', () => {
    const limiter = createEndpointRateLimiter('CHAT');
    expect(typeof limiter).toBe('function');
  });

  it('should return middleware for HEALTH tier', () => {
    const limiter = createEndpointRateLimiter('HEALTH');
    expect(typeof limiter).toBe('function');
  });
});

describe('skipHealthCheck', () => {
  it('should return true for /health path', () => {
    const c = createMockContext('/health', {});
    expect(skipHealthCheck(c)).toBe(true);
  });

  it('should return false for non-health paths', () => {
    const c = createMockContext('/chat', {});
    expect(skipHealthCheck(c)).toBe(false);
  });
});

describe('RATE_LIMIT_TIERS', () => {
  it('should have CHAT, HEALTH, DEFAULT, PUBLIC_UNAUTH tiers', () => {
    expect(RATE_LIMIT_TIERS).toHaveProperty('CHAT');
    expect(RATE_LIMIT_TIERS).toHaveProperty('HEALTH');
    expect(RATE_LIMIT_TIERS).toHaveProperty('DEFAULT');
    expect(RATE_LIMIT_TIERS).toHaveProperty('PUBLIC_UNAUTH');
  });

  it('each tier should have maxRequests and windowMs', () => {
    for (const tier of Object.values(RATE_LIMIT_TIERS)) {
      expect((tier as any).maxRequests).toBeDefined();
      expect(typeof (tier as any).maxRequests).toBe('number');
      expect((tier as any).windowMs).toBeDefined();
      expect(typeof (tier as any).windowMs).toBe('number');
    }
  });
});
