/**
 * Middleware Barrel Exports
 * Clean imports: import { contextStorage, rateLimitMiddleware } from './middleware';
 */

// Security & Auth
export { errorHandlerMiddleware } from './error-handler';
export { authTokenMiddleware } from './auth-token';

// Core middleware
export { contextStorage } from './context-storage';
export { requestLoggingMiddleware } from './request-logging';
export { securityHeadersMiddleware } from './security-headers';
export { bodySizeLimitMiddleware } from './body-limit';
export { rateLimitMiddleware, createEndpointRateLimiter, RATE_LIMIT_TIERS } from './rate-limit';

// OpenAPI controls
export { disablePlayground, disableSwagger } from './openapi';

