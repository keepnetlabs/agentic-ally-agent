import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  rateLimitMiddleware,
  RATE_LIMIT_TIERS,
  getClientIdentifier,
  createEndpointRateLimiter,
  skipHealthCheck,
  cleanupExpiredEntries,
} from './rate-limit';

describe('Rate Limiting Middleware', () => {
  describe('getClientIdentifier', () => {
    it('should prioritize cf-connecting-ip', () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'cf-connecting-ip') return '1.2.3.4';
            if (name === 'x-forwarded-for') return '5.6.7.8';
            return undefined;
          },
        },
      } as any;

      const identifier = getClientIdentifier(mockContext);
      expect(identifier).toBe('1.2.3.4');
    });

    it('should fall back to x-forwarded-for', () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === 'x-forwarded-for') return '5.6.7.8, 9.10.11.12';
            return undefined;
          },
        },
      } as any;

      const identifier = getClientIdentifier(mockContext);
      expect(identifier).toBe('5.6.7.8'); // First IP in the list
    });

    it('should return unknown when no IP headers present', () => {
      const mockContext = {
        req: {
          header: () => undefined,
        },
      } as any;

      const identifier = getClientIdentifier(mockContext);
      expect(identifier).toBe('unknown');
    });

    it('should fall back to x-real-ip when cf and x-forwarded-for absent', () => {
      const mockContext = {
        req: {
          header: (name: string) => (name === 'x-real-ip' ? '10.0.0.1' : undefined),
        },
      } as any;

      const identifier = getClientIdentifier(mockContext);
      expect(identifier).toBe('10.0.0.1');
    });
  });

  describe('rateLimitMiddleware', () => {
    beforeEach(() => {
      // Clear rate limit store between tests
      vi.clearAllTimers();
    });

    it('should allow requests within limit', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 5,
        windowMs: 60000,
      });

      const mockContext = {
        req: {
          header: () => '1.2.3.4',
          path: '/test',
          method: 'POST',
        },
        res: {
          headers: new Map(),
        },
      } as any;

      const next = vi.fn();

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        await middleware(mockContext, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(mockContext.res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(mockContext.res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should block requests exceeding limit', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 3,
        windowMs: 60000,
      });

      const mockContext = {
        req: {
          header: () => '1.2.3.5',
          path: '/test',
          method: 'POST',
        },
        res: {
          headers: new Map(),
        },
        json: vi.fn((body, status) => ({ body, status })),
      } as any;

      const next = vi.fn();

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        await middleware(mockContext, next);
      }

      // 4th request should be blocked
      await middleware(mockContext, next);

      expect(next).toHaveBeenCalledTimes(3);
      expect(mockContext.json).toHaveBeenCalled();
      expect(mockContext.res.headers.get('Retry-After')).toBeDefined();
    });

    it('should add standard rate limit headers', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 10,
        windowMs: 60000,
      });

      const mockContext = {
        req: {
          header: () => '1.2.3.6',
          path: '/test',
          method: 'GET',
        },
        res: {
          headers: new Map(),
        },
      } as any;

      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.res.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(mockContext.res.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(mockContext.res.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should skip rate limiting when skip function returns true', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 1,
        windowMs: 60000,
        skip: c => c.req.path === '/health',
      });

      const mockContext = {
        req: {
          header: () => '1.2.3.7',
          path: '/health',
          method: 'GET',
        },
        res: {
          headers: new Map(),
        },
      } as any;

      const next = vi.fn();

      // Make multiple requests to /health (should all pass)
      for (let i = 0; i < 10; i++) {
        await middleware(mockContext, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
    });

    it('should use custom identifier function', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 2,
        windowMs: 60000,
        identifier: () => 'custom-user-id',
      });

      const mockContext = {
        req: {
          header: () => undefined,
          path: '/test',
          method: 'POST',
        },
        res: {
          headers: new Map(),
        },
        json: vi.fn((body, status) => ({ body, status })),
      } as any;

      const next = vi.fn();

      // Make 2 requests (within limit)
      await middleware(mockContext, next);
      await middleware(mockContext, next);

      // 3rd should be blocked
      await middleware(mockContext, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(mockContext.json).toHaveBeenCalled();
    });
  });

  describe('RATE_LIMIT_TIERS', () => {
    it('should have correct default config', () => {
      expect(RATE_LIMIT_TIERS.DEFAULT.maxRequests).toBe(100);
      expect(RATE_LIMIT_TIERS.DEFAULT.windowMs).toBe(60 * 1000);
    });

    it('should have chat-specific config', () => {
      expect(RATE_LIMIT_TIERS.CHAT.maxRequests).toBe(50);
      expect(RATE_LIMIT_TIERS.CHAT.windowMs).toBe(60 * 1000);
    });

    it('should have health-specific config', () => {
      expect(RATE_LIMIT_TIERS.HEALTH.maxRequests).toBe(300);
      expect(RATE_LIMIT_TIERS.HEALTH.windowMs).toBe(60 * 1000);
    });

    it('should have public unauthenticated endpoint config', () => {
      expect(RATE_LIMIT_TIERS.PUBLIC_UNAUTH.maxRequests).toBe(180);
      expect(RATE_LIMIT_TIERS.PUBLIC_UNAUTH.windowMs).toBe(60 * 1000);
    });
  });

  describe('createEndpointRateLimiter', () => {
    it('should create middleware with CHAT tier config', async () => {
      const middleware = createEndpointRateLimiter('CHAT');
      const mockContext = {
        req: { header: () => '1.2.3.8', path: '/chat', method: 'POST' },
        res: { headers: new Map() },
      } as any;
      const next = vi.fn();

      await middleware(mockContext, next);

      expect(next).toHaveBeenCalled();
      expect(mockContext.res.headers.get('X-RateLimit-Limit')).toBe('50');
    });

    it('should create middleware with HEALTH tier config', async () => {
      const middleware = createEndpointRateLimiter('HEALTH');
      const mockContext = {
        req: { header: () => '1.2.3.9', path: '/health', method: 'GET' },
        res: { headers: new Map() },
      } as any;
      const next = vi.fn();

      await middleware(mockContext, next);

      expect(mockContext.res.headers.get('X-RateLimit-Limit')).toBe('300');
    });
  });

  describe('skipHealthCheck', () => {
    it('should return true for /health path', () => {
      const c = { req: { path: '/health' } } as any;
      expect(skipHealthCheck(c)).toBe(true);
    });

    it('should return false for non-health path', () => {
      const c = { req: { path: '/chat' } } as any;
      expect(skipHealthCheck(c)).toBe(false);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should not throw when called', () => {
      expect(() => cleanupExpiredEntries()).not.toThrow();
    });

    it('should remove expired entries when time has passed', async () => {
      vi.useFakeTimers();
      const middleware = rateLimitMiddleware({
        maxRequests: 5,
        windowMs: 1000,
      });

      const mockContext = {
        req: { header: () => 'cleanup-test-ip', path: '/test', method: 'POST' },
        res: { headers: new Map() },
      } as any;
      const next = vi.fn();

      await middleware(mockContext, next);
      expect(next).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2000);

      cleanupExpiredEntries();

      await middleware(mockContext, next);
      expect(next).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should trigger periodic cleanup when store size reaches CLEANUP_FREQUENCY multiple', async () => {
      vi.useFakeTimers();
      const middleware = rateLimitMiddleware({
        maxRequests: 5,
        windowMs: 60000,
        identifier: (c: any) => c.req.header('x-test-id') || 'unknown',
      });

      const next = vi.fn();

      // Create 100 distinct entries to reach CLEANUP_FREQUENCY (100)
      for (let i = 0; i < 100; i++) {
        const mockContext = {
          req: {
            header: (name: string) => (name === 'x-test-id' ? `id-${i}` : undefined),
            path: '/test',
            method: 'POST',
          },
          res: { headers: new Map() },
        } as any;
        await middleware(mockContext, next);
      }
      expect(next).toHaveBeenCalledTimes(100);

      // Advance time so all entries expire
      vi.advanceTimersByTime(65000);

      // 101st request triggers cleanup (size % 100 === 0), then processes
      const mockContext101 = {
        req: {
          header: (name: string) => (name === 'x-test-id' ? 'id-100' : undefined),
          path: '/test',
          method: 'POST',
        },
        res: { headers: new Map() },
      } as any;
      await middleware(mockContext101, next);

      expect(next).toHaveBeenCalledTimes(101);
      vi.useRealTimers();
    });
  });

  describe('rate limit warning when remaining low', () => {
    it('should allow requests when remaining drops below 10', async () => {
      const middleware = rateLimitMiddleware({
        maxRequests: 12,
        windowMs: 60000,
      });

      const mockContext = {
        req: { header: () => '1.2.3.10', path: '/api', method: 'GET' },
        res: { headers: new Map() },
      } as any;
      const next = vi.fn();

      for (let i = 0; i < 5; i++) {
        await middleware(mockContext, next);
      }

      expect(next).toHaveBeenCalledTimes(5);
      expect(mockContext.res.headers.get('X-RateLimit-Remaining')).toBe('7');
    });
  });
});
