/**
 * Request Logging Middleware
 * Logs every HTTP request with timing, status, and correlation ID
 *
 * Provides observability for:
 * - Request/response timing (performance monitoring)
 * - Error tracking (status codes)
 * - Request tracing (correlation ID from contextStorage)
 */

import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';

const logger = getLogger('RequestLog');

/**
 * Log levels based on status code
 */
function getLogLevel(status: number): 'info' | 'warn' | 'error' {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    return 'info';
}

/**
 * Middleware to log all HTTP requests with timing information
 * Should be placed early in the middleware chain (after contextStorage)
 */
export const requestLoggingMiddleware = async (c: Context, next: Next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Skip verbose logging for health checks (optional)
    const isHealthCheck = path === '/health';

    try {
        await next();

        const duration = Date.now() - startTime;
        const status = c.res.status;
        const logLevel = getLogLevel(status);

        // Log based on status code
        const logData = {
            method,
            path,
            status,
            duration: `${duration}ms`,
            durationMs: duration,
            ...(isHealthCheck ? {} : { userAgent }), // Skip userAgent for health checks
        };

        if (isHealthCheck && status < 400) {
            // Debug level for successful health checks (reduce noise)
            logger.debug('Health check', logData);
        } else {
            logger[logLevel]('Request completed', logData);
        }
    } catch (error) {
        // Log unhandled errors (should rarely happen if error handler is in place)
        const duration = Date.now() - startTime;
        logger.error('Request failed with unhandled error', {
            method,
            path,
            duration: `${duration}ms`,
            durationMs: duration,
            error: error instanceof Error ? error.message : String(error),
        });

        // Re-throw to let error propagate to error handler
        throw error;
    }
};

