import { Context, Next } from 'hono';
import { requestStorage } from '../utils/core/request-storage';
import { randomUUID } from 'crypto';

/**
 * Middleware to initialize AsyncLocalStorage for request-scoped data.
 * Captures custom auth token, Cloudflare env bindings, and wraps the request execution in the storage context.
 * Generates a unique correlation ID for request tracking across all logs.
 */
export const contextStorage = async (c: Context, next: Next) => {
    // Use custom header for specific agent authentication
    const token = c.req.header('X-AGENTIC-ALLY-TOKEN');
    // Company scope header (used for product backend + policy fetch)
    const companyId = c.req.header('X-COMPANY-ID');

    // Get Cloudflare env bindings (KV, D1, Service Bindings, etc.)
    const env = c.env;

    // Generate unique correlation ID for request tracking
    // Check if correlation ID is provided in header (for distributed tracing)
    const correlationId = c.req.header('X-Correlation-ID') || randomUUID();

    // Wrap the next handlers in the AsyncLocalStorage run context
    return requestStorage.run({ correlationId, token, env, companyId }, async () => {
        await next();
    });
};
