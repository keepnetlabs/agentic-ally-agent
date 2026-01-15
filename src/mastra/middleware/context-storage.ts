import { Context, Next } from 'hono';
import { requestStorage } from '../utils/core/request-storage';
import { validateBaseApiUrl } from '../utils/core/url-validator';
import { randomUUID } from 'crypto';

/**
 * Middleware to initialize AsyncLocalStorage for request-scoped data.
 * Captures custom auth token, Cloudflare env bindings, and wraps the request execution in the storage context.
 * Generates a unique correlation ID for request tracking across all logs.
 *
 * Also validates the X-BASE-API-URL header against allowed list (https://dash.keepnetlabs.com, https://test-api.devkeepnet.com)
 * Invalid or missing URLs fall back to test environment default.
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

    // Get base API URL from header with validation
    // URL is provided via X-BASE-API-URL header by client
    // Validates against allowed list and falls back to default if invalid
    let baseApiUrl = validateBaseApiUrl(c.req.header('X-BASE-API-URL'));
    if (baseApiUrl.includes('dash.keepnetlabs.com')) {
        baseApiUrl = baseApiUrl.replace('dash.keepnetlabs.com', 'api.keepnetlabs.com')
    }
    if (baseApiUrl.includes('test-ui.devkeepnet.com')) {
        baseApiUrl = baseApiUrl.replace('test-ui.devkeepnet.com', 'test-api.devkeepnet.com')
    }
    // Wrap the next handlers in the AsyncLocalStorage run context
    return requestStorage.run({ correlationId, token, env, companyId, baseApiUrl }, async () => {
        await next();
    });
};
