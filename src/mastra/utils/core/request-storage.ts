import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId?: string; // Unique request ID for tracing
  token?: string;
  companyId?: string;
  user?: Record<string, unknown>; // İleride user objesi de ekleyebiliriz
  env?: Record<string, unknown>; // Cloudflare bindings (KV, D1, Service Bindings, etc.)
  baseApiUrl?: string; // Platform API URL for upload/assign operations
  threadId?: string; // Chat/autonomous session ID — used as batchResourceId in assign payloads
  /** Reserved for toolEventBus internal storage — do not access directly */
  __toolEventBus?: Map<string, unknown>;
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
  env?: Record<string, unknown>;
  correlationId?: string;
  baseApiUrl?: string;
  threadId?: string;
} {
  const store = requestStorage.getStore();
  return {
    token: store?.token as string | undefined,
    companyId: store?.companyId as string | undefined,
    env: store?.env as Record<string, unknown> | undefined,
    correlationId: store?.correlationId as string | undefined,
    baseApiUrl: store?.baseApiUrl as string | undefined,
    threadId: store?.threadId as string | undefined,
  };
}
