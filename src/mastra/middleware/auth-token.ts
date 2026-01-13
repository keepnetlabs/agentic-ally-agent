import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';
import { API_ENDPOINTS } from '../constants';

const logger = getLogger('AuthToken');

/**
 * Token validation configuration
 * - MIN_LENGTH: Minimum token length (standard API key length)
 * - PATTERN: Allow alphanumeric, hyphens, underscores (safe characters)
 * - Rejects: placeholder tokens like 'test', 'apikey', empty strings
 */
const JWT_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;

const TOKEN_CONFIG = {
    MIN_LENGTH: 32,
    // Alphanumeric + hyphen/underscore only (no spaces, special chars)
    SIMPLE_PATTERN: /^[a-zA-Z0-9_-]{32,}$/,
    JWT_PATTERN: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
} as const;

const isValidJwtToken = (token: string): boolean => {
    if (!TOKEN_CONFIG.JWT_PATTERN.test(token)) {
        return false;
    }

    const segments = token.split('.');
    if (segments.length !== 3) {
        return false;
    }

    return segments.every(segment => JWT_SEGMENT_PATTERN.test(segment));
};

/**
 * Paths that don't require authentication token
 * - /health: Health check endpoint for monitoring
 * - /__refresh: Mastra hot reload (development)
 * - /api/telemetry: Mastra internal telemetry
 */
const SKIP_AUTH_PATHS = [
    '/health',
    '/__refresh',
    '/__hot-reload-status',
    '/api/telemetry',
    '/autonomous',
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
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';

    // 1. Check if token exists
    if (!token) {
        logger.warn('❌ Unauthorized: missing token', {
            path: c.req.path,
            method: c.req.method,
            ip: clientIp,
        });

        return c.json(
            {
                error: 'Unauthorized',
                message: 'X-AGENTIC-ALLY-TOKEN header is required',
            },
            401
        );
    }

    // 2. Validate token format (min length + alphanumeric OR JWT)
    const tokenTrimmed = token.trim();
    const isSimpleToken = TOKEN_CONFIG.SIMPLE_PATTERN.test(tokenTrimmed);
    const isJwtToken = isValidJwtToken(tokenTrimmed);
    const isTooShort = tokenTrimmed.length < TOKEN_CONFIG.MIN_LENGTH;

    if ((!isSimpleToken && !isJwtToken) || (isTooShort && !isJwtToken)) {
        logger.warn('❌ Unauthorized: invalid token format', {
            path: c.req.path,
            method: c.req.method,
            ip: clientIp,
            tokenLength: tokenTrimmed.length,
            reason: isTooShort && !isJwtToken
                ? `too short (${tokenTrimmed.length} < ${TOKEN_CONFIG.MIN_LENGTH})`
                : 'invalid characters or format',
        });

        return c.json(
            {
                error: 'Unauthorized',
                message: 'Invalid token format',
            },
            401
        );
    }

    // Token is valid - allow request to proceed
    // Future: Add JWT verification or KV allowlist check here
    logger.debug('✅ Token validated locally', {
        path: c.req.path,
        method: c.req.method,
        ip: clientIp,
    });

    // Validate with backend
    try {
        const baseApiUrl = c.req.header('X-BASE-API-URL') || API_ENDPOINTS.DEFAULT_BASE_API_URL;
        const validationUrl = `${baseApiUrl}/auth/validate`;
        logger.info('Validation URL', { url: validationUrl });
        const response = await fetch(validationUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const responseText = await response.text();
        logger.info('Auth Validation Response', {
            status: response.status,
            body: responseText
        });

        if (!response.ok) {
            logger.warn('❌ Unauthorized: backend validation failed', {
                path: c.req.path,
                method: c.req.method,
                ip: clientIp,
                status: response.status
            });
            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Token validation failed',
                },
                401
            );
        }

    } catch (error) {
        logger.error('Auth validation error', { error });
        // Fail open or closed? Usually closed for security, but let's see. 
        // For now, let's fail closed as it's an auth check.
        return c.json(
            {
                error: 'Unauthorized',
                message: 'Token validation service unavailable',
            },
            401
        );
    }

    await next();
};


