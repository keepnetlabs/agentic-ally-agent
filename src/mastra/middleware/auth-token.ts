import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';

const logger = getLogger('AuthToken');

/**
 * Paths that don't require authentication token
 * - /health: Health check endpoint for monitoring
 * - /__refresh: Mastra hot reload (development)
 * - /api/telemetry: Mastra internal telemetry
 */
const SKIP_AUTH_PATHS = [
    '/health',
    '/__refresh',
    '/api/telemetry',
] as const;

/**
 * Token Authentication Middleware
 * 
 * Requires X-AGENTIC-ALLY-TOKEN header for all requests except internal endpoints.
 * This prevents unauthorized access to AI endpoints and protects token usage.
 * 
 * Future: Add token validation against KV/DB for more security.
 */
export const authTokenMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
    // Skip internal/system endpoints
    if (SKIP_AUTH_PATHS.includes(c.req.path as typeof SKIP_AUTH_PATHS[number])) {
        await next();
        return;
    }

    const token = c.req.header('X-AGENTIC-ALLY-TOKEN');

    if (!token) {
        logger.warn('Unauthorized request - missing token', {
            path: c.req.path,
            method: c.req.method,
            ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
        });

        return c.json(
            {
                error: 'Unauthorized',
                message: 'X-AGENTIC-ALLY-TOKEN header is required',
            },
            401
        );
    }

    // Token exists - allow request to proceed
    // Future: Validate token against allowed list in KV/DB
    await next();
};

