/**
 * Security Headers Middleware
 * Adds OWASP recommended security headers to all responses
 *
 * Note: These headers do NOT affect API calls from iframes.
 * - X-Frame-Options prevents the page itself from being embedded in an iframe
 * - API fetch/axios calls from an iframe to this API will work normally
 */

import { Context, Next } from 'hono';

/**
 * Adds security headers to HTTP responses
 * Following OWASP secure headers recommendations
 */
export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  await next();

  // Prevent MIME type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent this page from being embedded in an iframe (clickjacking protection)
  // Note: This does NOT prevent API calls FROM an iframe - only prevents
  // this response from being rendered inside an iframe (which doesn't apply to JSON APIs)
  c.res.headers.set('X-Frame-Options', 'DENY');

  // Legacy XSS protection (modern browsers have built-in protection)
  c.res.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - don't leak referrer to external sites
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - disable unnecessary browser features
  c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

