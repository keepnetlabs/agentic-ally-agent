import { Context, Next } from 'hono';
import { requestStorage } from '../utils/request-storage';

/**
 * Middleware to initialize AsyncLocalStorage for request-scoped data.
 * Captures custom auth token, Cloudflare env bindings, and wraps the request execution in the storage context.
 */
export const contextStorage = async (c: Context, next: Next) => {
    // Use custom header for specific agent authentication
    const token = c.req.header('X-AGENTIC-ALLY-TOKEN');

    // Get Cloudflare env bindings (KV, D1, Service Bindings, etc.)
    const env = c.env;

    // Wrap the next handlers in the AsyncLocalStorage run context
    return requestStorage.run({ token, env }, async () => {
        await next();
    });
};
