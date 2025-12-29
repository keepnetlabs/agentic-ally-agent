/**
 * Body Size Limit Middleware
 * Prevents DoS attacks by rejecting oversized request payloads
 *
 * Default limit: 1MB (sufficient for most API requests)
 * Configurable via BODY_SIZE_LIMIT_MB environment variable
 */

import { Context, Next } from 'hono';
import { getLogger } from '../utils/core/logger';

const logger = getLogger('BodyLimit');

// Default 1MB limit (in bytes)
const DEFAULT_LIMIT_MB = 1;
const BYTES_PER_MB = 1024 * 1024;

/**
 * Get the configured body size limit in bytes
 */
function getBodySizeLimit(): number {
  const limitMB = parseInt(process.env.BODY_SIZE_LIMIT_MB || String(DEFAULT_LIMIT_MB), 10);
  return limitMB * BYTES_PER_MB;
}

/**
 * Middleware to limit request body size
 * Returns 413 Payload Too Large if Content-Length exceeds limit
 */
export const bodySizeLimitMiddleware = async (c: Context, next: Next) => {
  const contentLength = parseInt(c.req.header('content-length') || '0', 10);
  const maxSize = getBodySizeLimit();

  if (contentLength > maxSize) {
    const maxSizeMB = maxSize / BYTES_PER_MB;
    const requestSizeMB = (contentLength / BYTES_PER_MB).toFixed(2);

    logger.warn('Request body too large', {
      contentLength,
      maxSize,
      requestSizeMB,
      maxSizeMB,
      path: c.req.path,
      method: c.req.method,
    });

    return c.json(
      {
        success: false,
        error: 'Payload Too Large',
        message: `Request body exceeds maximum allowed size of ${maxSizeMB}MB`,
        maxSizeMB,
        requestSizeMB: parseFloat(requestSizeMB),
      },
      413
    );
  }

  await next();
};

