import { Context, Next, type ExecutionContext } from 'hono';
import * as Sentry from '@sentry/cloudflare';
import { getLogger } from '../utils/core/logger';
import { ERROR_CODES } from '../constants';

const logger = getLogger('ErrorHandler');

const getSentryOptions = () => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        return undefined;
    }

    return {
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT ?? 'production',
        release: process.env.SENTRY_RELEASE,
        tracesSampleRate: 0,
    };
};

const getExecutionContext = (c: Context): ExecutionContext | undefined => {
    try {
        return c.executionCtx;
    } catch {
        return undefined;
    }
};

/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled exceptions and returns a safe error response.
 * Prevents stack trace leakage in production for security.
 * Should be the FIRST middleware in the chain.
 */
export const errorHandlerMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
    const sentryOptions = getSentryOptions();
    try {
        await next();
        return;
    } catch (error) {
        const errorCode = (error as { code?: string })?.code ?? ERROR_CODES.INTERNAL_UNEXPECTED;
        const respond = () =>
            c.json(
                {
                    error: 'Internal Server Error',
                    errorCode,
                    message: 'An unexpected error occurred. Please try again later.',
                    path: c.req.path,
                },
                500
            );

        if (!sentryOptions) {
            // Log full error details for debugging
            logger.error('❌ Unhandled error', {
                path: c.req.path,
                method: c.req.method,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            return respond();
        }

        const executionCtx = getExecutionContext(c);
        return Sentry.wrapRequestHandler(
            {
                options: sentryOptions,
                request: c.req.raw,
                context: executionCtx as ExecutionContext,
                captureErrors: false,
            },
            async () => {
                Sentry.withScope(scope => {
                    scope.setTag('path', c.req.path);
                    scope.setTag('method', c.req.method);
                    scope.setLevel('error');
                    Sentry.captureException(error);
                });

                // Log full error details for debugging
                logger.error('❌ Unhandled error', {
                    path: c.req.path,
                    method: c.req.method,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                });

                return respond();
            }
        );
    }
};

