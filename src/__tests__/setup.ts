// Test setup and utilities
import { beforeEach, afterEach, vi } from 'vitest';

// Set environment variables BEFORE module imports (module load time)
process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
process.env.CLOUDFLARE_KV_TOKEN = 'test-kv-token';
process.env.CLOUDFLARE_API_KEY = 'test-api-key';
process.env.CLOUDFLARE_D1_DATABASE_ID = 'test-d1-db-id';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.CLOUDFLARE_AI_GATEWAY_ID = 'test-gateway-id';
process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'test-gateway-auth';

// Reset environment variables before each test (for tests that modify them)
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

// Global fetch mock to prevent real network requests during tests
global.fetch = vi.fn(async () => {
  return createMockFetchResponse({ success: true, result: [] });
});

export const mockFetch = (responses: Map<string, any>) => {
  return vi.fn(async (url: string, _options?: any) => {
    const response = responses.get(url) || responses.get('default');
    if (!response) {
      // Fallback to the default global mock behavior
      return createMockFetchResponse({ success: true, result: [] });
    }
    return response;
  });
};
