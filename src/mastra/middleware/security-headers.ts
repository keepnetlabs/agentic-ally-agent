/**
 * Security Headers Middleware
 * OWASP-recommended security headers for API responses
 *
 * @see https://owasp.org/www-project-secure-headers/
 */

import { Context, Next } from 'hono';

/**
 * Adds security headers to HTTP responses.
 * Industry standard: OWASP Secure Headers Project.
 */
export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  await next();

  // Prevent MIME type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  c.res.headers.set('X-Frame-Options', 'DENY');

  // Legacy XSS protection (belt-and-suspenders)
  c.res.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - don't leak referrer to external sites
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - restrict browser features
  c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
};

