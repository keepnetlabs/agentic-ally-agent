// Test setup and utilities
import { beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
beforeEach(() => {
  process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
  process.env.CLOUDFLARE_KV_TOKEN = 'test-kv-token';
  process.env.CLOUDFLARE_API_KEY = 'test-api-key';
  process.env.CLOUDFLARE_D1_DATABASE_ID = 'test-d1-db-id';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.CLOUDFLARE_AI_GATEWAY_ID = 'test-gateway-id';
  process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'test-gateway-auth';
});

afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockFetchResponse = (data: any, ok = true, status = 200) => {
  return {
    ok,
    status,
    text: async () => JSON.stringify(data),
    json: async () => data,
    headers: new Headers(),
  } as Response;
};

export const mockFetch = (responses: Map<string, any>) => {
  return vi.fn(async (url: string, _options?: any) => {
    const response = responses.get(url) || responses.get('default');
    if (!response) {
      return createMockFetchResponse({ error: 'Not mocked' }, false, 404);
    }
    return response;
  });
};
