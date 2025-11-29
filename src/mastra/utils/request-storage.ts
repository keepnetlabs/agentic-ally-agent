import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  token?: string;
  user?: any; // İleride user objesi de ekleyebiliriz
}

// Global storage instance for Request Isolation
export const requestStorage = new AsyncLocalStorage<RequestContext>();

