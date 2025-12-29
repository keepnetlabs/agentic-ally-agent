import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';

const logger = getLogger('ErrorHandler');

/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled exceptions and returns a safe error response.
 * Prevents stack trace leakage in production for security.
 * Should be the FIRST middleware in the chain.
 */
export const errorHandlerMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
    try {
        await next();
        return;
    } catch (error) {
        // Log full error details for debugging
        logger.error('❌ Unhandled error', {
            path: c.req.path,
            method: c.req.method,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        // Return safe error response - no stack trace leaked
        return c.json(
            {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred. Please try again later.',
                // Include request path for debugging (safe to expose)
                path: c.req.path,
            },
            500
        );
    }
};

