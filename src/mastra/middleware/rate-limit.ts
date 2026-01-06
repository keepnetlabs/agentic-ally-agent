import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { TIME_UNITS, RATE_LIMIT_CONFIG } from '../constants';

const logger = getLogger('RateLimit');

/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Features:
 * - Sliding window counter algorithm
 * - IP-based identification
 * - Configurable limits per endpoint
 * - Standard rate limit headers (X-RateLimit-*)
 * - Production-ready error handling
 */

// ============================================
// CONFIGURATION
// ============================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Key prefix for storage */
  keyPrefix?: string;
  /** Custom identifier function (default: IP address) */
  identifier?: (c: Context) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (c: Context) => boolean;
  /** Custom error message */
  message?: string;
}

/** Default configuration */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: TIME_UNITS.MILLISECONDS_PER_MINUTE, // 1 minute
  keyPrefix: 'ratelimit:',
  message: 'Too many requests, please try again later.',
};

/** Endpoint-specific limits */
export const RATE_LIMIT_TIERS = {
  // Chat endpoint: More generous (complex operations)
  CHAT: {
    maxRequests: 50,
    windowMs: TIME_UNITS.MILLISECONDS_PER_MINUTE, // 50 requests per minute
  },
  // Health check: Very generous
  HEALTH: {
    maxRequests: 300,
    windowMs: TIME_UNITS.MILLISECONDS_PER_MINUTE, // 300 requests per minute
  },
  // Default: Conservative
  DEFAULT: {
    maxRequests: 100,
    windowMs: TIME_UNITS.MILLISECONDS_PER_MINUTE, // 100 requests per minute
  },
} as const;

// ============================================
// UTILITIES
// ============================================

/**
 * Get client identifier (IP address with fallbacks)
 */
function getClientIdentifier(c: Context): string {
  // Priority order: Cloudflare IP > X-Forwarded-For > X-Real-IP > fallback
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

/**
 * Sliding window counter using in-memory cache
 * (Workers have no persistent state, so we use context storage)
 *
 * For production: Should use KV or Durable Objects for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (per-worker instance)
// Note: Each Cloudflare Worker instance has its own memory
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 * Note: In Cloudflare Workers, we can't use setInterval in global scope
 * Cleanup happens on-demand during rate limit checks
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Don't use setInterval in global scope (Cloudflare Workers restriction)
// Cleanup will happen on-demand during rate limit checks

/**
 * Check rate limit and increment counter
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  // Periodic cleanup to avoid performance impact
  // Cloudflare Workers can't use setInterval in global scope
  if (rateLimitStore.size > 0 && rateLimitStore.size % RATE_LIMIT_CONFIG.CLEANUP_FREQUENCY === 0) {
    cleanupExpiredEntries();
  }

  const key = `${config.keyPrefix}${identifier}`;
  const now = Date.now();
  const jitter = Math.random() * RATE_LIMIT_CONFIG.JITTER_VARIANCE_MS;
  const resetTime = now + config.windowMs + jitter;

  // Get or create entry
  let entry = rateLimitStore.get(key);

  // If entry doesn't exist or window expired, create new
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      current: 1,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000); // seconds

    return {
      allowed: false,
      current: entry.count,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    allowed: true,
    current: entry.count,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Rate limiting middleware factory
 *
 * @example
 * ```typescript
 * // Apply to all routes
 * server: {
 *   middleware: [rateLimitMiddleware()]
 * }
 *
 * // Custom config
 * server: {
 *   middleware: [rateLimitMiddleware({ maxRequests: 50, windowMs: 60000 })]
 * }
 * ```
 */
export function rateLimitMiddleware(customConfig?: Partial<RateLimitConfig>) {
  const config: RateLimitConfig = { ...DEFAULT_CONFIG, ...customConfig };

  return async (c: Context, next: Function) => {
    // Skip rate limiting if condition met
    if (config.skip?.(c)) {
      return next();
    }

    // Get identifier
    const identifier = config.identifier?.(c) ?? getClientIdentifier(c);

    // Check rate limit
    const result = checkRateLimit(identifier, config);

    // Add rate limit headers (standard headers used by GitHub, Stripe, etc.)
    c.res.headers.set('X-RateLimit-Limit', result.limit.toString());
    c.res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    c.res.headers.set('X-RateLimit-Reset', result.resetTime.toString());

    // If rate limit exceeded
    if (!result.allowed) {
      c.res.headers.set('Retry-After', (result.retryAfter as number).toString());

      // Log rate limit violation
      logger.warn('Rate limit exceeded', {
        identifier,
        current: result.current,
        limit: result.limit,
        path: c.req.path,
        method: c.req.method,
      });

      return c.json(
        {
          error: 'Rate limit exceeded',
          message: config.message,
          retryAfter: result.retryAfter,
          limit: result.limit,
          current: result.current,
        },
        429 // HTTP 429 Too Many Requests
      );
    }

    // Log for monitoring (can be sent to analytics)
    if (result.remaining < 10) {
      logger.info('Rate limit warning', {
        identifier,
        remaining: result.remaining,
        path: c.req.path,
      });
    }

    await next();
  };
}

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(endpoint: keyof typeof RATE_LIMIT_TIERS) {
  const config = RATE_LIMIT_TIERS[endpoint];
  return rateLimitMiddleware(config);
}

/**
 * Rate limit bypass for health checks
 */
export const skipHealthCheck = (c: Context) => {
  return c.req.path === '/health';
};

// ============================================
// EXPORTS
// ============================================

export { getClientIdentifier, cleanupExpiredEntries };
