import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId?: string; // Unique request ID for tracing
  token?: string;
  companyId?: string;
  user?: any; // İleride user objesi de ekleyebiliriz
  env?: any;  // Cloudflare bindings (KV, D1, Service Bindings, etc.)
}

// Global storage instance for Request Isolation
export const requestStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Gets request context (token, companyId, env) from AsyncLocalStorage
 * Convenience helper to reduce code duplication across tools
 * 
 * @returns Object containing token, companyId, and env from request storage
 * 
 * @example
 * ```typescript
 * const { token, companyId, env } = getRequestContext();
 * if (!token) {
 *   return { success: false, error: 'Token missing' };
 * }
 * ```
 */
export function getRequestContext(): {
  token?: string;
  companyId?: string;
  env?: any;
  correlationId?: string;
} {
  const store = requestStorage.getStore();
  return {
    token: store?.token,
    companyId: store?.companyId,
    env: store?.env,
    correlationId: store?.correlationId,
  };
}

