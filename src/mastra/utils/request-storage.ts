import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  token?: string;
  user?: any; // İleride user objesi de ekleyebiliriz
  env?: any;  // Cloudflare bindings (KV, D1, Service Bindings, etc.)
}

// Global storage instance for Request Isolation
export const requestStorage = new AsyncLocalStorage<RequestContext>();

