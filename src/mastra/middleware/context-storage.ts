import { Context, Next } from 'hono';
import { requestStorage } from '../utils/request-storage';

/**
 * Middleware to initialize AsyncLocalStorage for request-scoped data.
 * Captures custom auth token and wraps the request execution in the storage context.
 */
export const contextStorage = async (c: Context, next: Next) => {
    // Use custom header for specific agent authentication
    const token = c.req.header('X-AGENTIC-ALLY-TOKEN');

    // Wrap the next handlers in the AsyncLocalStorage run context
    return requestStorage.run({ token }, async () => {
        await next();
    });
};
