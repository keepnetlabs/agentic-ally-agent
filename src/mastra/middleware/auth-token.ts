import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';
import { API_ENDPOINTS, TOKEN_CACHE_INVALID_TTL_MS } from '../constants';
import { tokenCache } from '../utils/core/token-cache';
import { SKIP_AUTH_PATHS, isPublicUnauthenticatedPath } from './public-endpoint-policy';

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
 * Token Authentication Middleware
 * 
 * Requires X-AGENTIC-ALLY-TOKEN header for all requests except internal endpoints.
 * This prevents unauthorized access to AI endpoints and protects token usage.
 * 
 * Includes in-memory caching to reduce latency on frequent validation calls.
 */
export const authTokenMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
    // Skip internal/system endpoints
    if (SKIP_AUTH_PATHS.includes(c.req.path as typeof SKIP_AUTH_PATHS[number])) {
        if (isPublicUnauthenticatedPath(c.req.path)) {
            logger.info('Public unauthenticated endpoint access', {
                path: c.req.path,
                method: c.req.method,
            });
        }
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

    // Token is valid format - allow request to proceed
    // Future: Add JWT verification or KV allowlist check here
    logger.debug('✅ Token validated locally (format)', {
        path: c.req.path,
        method: c.req.method,
        ip: clientIp,
    });

    // 3. Check Cache
    const cachedIsValid = tokenCache.get(token);

    if (cachedIsValid !== null) {
        if (cachedIsValid) {
            // Recalculate estimated age for logging (optional, or skip logging age)
            logger.info('✅ Token validated via cache', {
                path: c.req.path,
                ip: clientIp,
            });
            await next();
            return;
        } else {
            logger.warn('❌ Unauthorized: invalid token (cached)', {
                path: c.req.path,
                ip: clientIp,
            });
            return c.json({ error: 'Unauthorized', message: 'Token invalid (cached)' }, 401);
        }
    }

    // 4. Validate with backend (if not cached or expired)
    try {
        const baseApiUrl = c.req.header('X-BASE-API-URL') || API_ENDPOINTS.DEFAULT_AUTH_URL;
        const validationUrl = `${baseApiUrl}/auth/validate`;
        logger.info('Validation URL', { url: validationUrl });
        const response = await fetch(validationUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const responseText = await response.text();
        logger.debug('Auth Validation Response', {
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

            // Cache invalid result for a shorter time (e.g. 1 min) to prevent DoS on auth server
            tokenCache.set(token, false, TOKEN_CACHE_INVALID_TTL_MS);

            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Token validation failed',
                },
                401
            );
        }

        // Cache successful result
        tokenCache.set(token, true);

        logger.debug('Token cached', { ttl: '15m' });

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


