import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './product-service';
import { requestStorage } from '../utils/core/request-storage';
import '../../../src/__tests__/setup';

// Mock fetch globally
global.fetch = vi.fn();

/**
 * Test Suite: ProductService
 * Tests for product backend communication service
 * Covers: JWT parsing, requestStorage integration, HTTP requests, whitelabeling config
 */

describe('ProductService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // API_KEY defaults to 'apikey' in constants, or use env var if set
    process.env.PRODUCT_API_KEY = process.env.PRODUCT_API_KEY || 'apikey';
  });

  // Helper function to create a valid JWT token
  const createMockJWT = (payload: any): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
    const signature = 'mock-signature';
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  };

  // ──────────────────────────────────────────────────────────────
  // Constructor
  // ──────────────────────────────────────────────────────────────
  describe('Constructor', () => {
    it('should initialize with JWT token parameter', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });

    it('should initialize without token and use requestStorage', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token });
      const service = new ProductService();

      expect(service).toBeDefined();
    });

    it('should handle missing token gracefully', () => {
      requestStorage.enterWith({});
      const service = new ProductService();

      expect(service).toBeDefined();
    });

    it('should build baseUrl from JWT idp field', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await service.request('/some-endpoint');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test-idp.com/api/some-endpoint');
    });

    it('should prefer baseApiUrl from requestStorage over JWT idp', async () => {
      const payload = { idp: 'https://jwt-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token, baseApiUrl: 'https://override-api.com' });
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://override-api.com/api/test');
    });

    it('should use companyId from requestStorage if available', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token, companyId: 'storage-company-456' });
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('storage-company-456');
    });

    it('should fallback to companyId from JWT if not in requestStorage', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token });
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('jwt-company-123');
    });

    it('should set empty baseUrl when token has no idp and no baseApiUrl', async () => {
      const payload = { user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      // baseUrl is '' so the URL is just '/test' prepended by empty string
      expect(fetchCall[0]).toBe('/test');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // JWT Token Parsing
  // ──────────────────────────────────────────────────────────────
  describe('JWT Token Parsing', () => {
    it('should extract idp from valid JWT token', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/verify');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test-idp.com/api/verify');
    });

    it('should extract companyId from JWT token', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'my-company' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/verify');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('my-company');
    });

    it('should handle JWT token without idp field', async () => {
      const payload = { user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/verify');
      const fetchCall = (global.fetch as any).mock.calls[0];
      // baseUrl should be empty since idp is missing
      expect(fetchCall[0]).toBe('/verify');
    });

    it('should handle invalid JWT format gracefully', () => {
      const invalidToken = 'invalid-token-format';
      const service = new ProductService(invalidToken);

      expect(service).toBeDefined();
    });

    it('should handle JWT with only header (no payload part)', () => {
      // Single segment token - no dot separator for payload
      const service = new ProductService('singleSegmentToken');

      expect(service).toBeDefined();
    });

    it('should handle JWT with payload that decodes to invalid JSON', () => {
      // Payload "eA" decodes to "x", JSON.parse("x") throws
      const malformedToken = 'eyJhbGciOiJIUzI1NiJ9.eA.mockSig';
      const service = new ProductService(malformedToken);

      expect(service).toBeDefined();
    });

    it('should handle JWT token with padding requirements', async () => {
      // JWT payload that requires base64 padding
      const payload = { idp: 'https://test.com', user_company_resourceid: 'company' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/verify');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test.com/api/verify');
    });

    it('should handle JWT with empty payload object', () => {
      const token = createMockJWT({});
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });

    it('should handle JWT with extra fields and still extract idp', async () => {
      const payload = {
        idp: 'https://extra-fields.com',
        user_company_resourceid: 'c-999',
        iss: 'some-issuer',
        sub: 'some-subject',
        aud: 'some-audience',
        exp: 9999999999,
      };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/verify');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://extra-fields.com/api/verify');
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('c-999');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // getHeaders (tested indirectly through request)
  // ──────────────────────────────────────────────────────────────
  describe('Headers', () => {
    it('should include Content-Type header', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
    });

    it('should include Authorization header with Bearer token', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should include x-ir-api-key header when API key is configured', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-api-key']).toBe('apikey');
    });

    it('should include x-ir-company-id header when companyId exists', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('company-123');
    });

    it('should omit Authorization header when no token is provided', async () => {
      requestStorage.enterWith({});
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBeUndefined();
    });

    it('should omit x-ir-company-id header when no companyId exists', async () => {
      const payload = { idp: 'https://test-idp.com' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Request Method
  // ──────────────────────────────────────────────────────────────
  describe('Request Method', () => {
    it('should make GET request to endpoint', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = { data: { test: 'value' } };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.request('/test-endpoint');

      expect(global.fetch).toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test-idp.com/api/test-endpoint');
      expect(fetchCall[1].method).toBe('GET');
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${token}`);
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('company-123');
      expect(result).toEqual(mockResponse);
    });

    it('should default method to GET when not specified', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test-endpoint');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('GET');
    });

    it('should make POST request with body', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const requestBody = { key: 'value' };
      const mockResponse = { success: true };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.request('/test-endpoint', 'POST', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-idp.com/api/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make PUT request with body', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const requestBody = { updated: true };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await service.request('/resource/1', 'PUT', requestBody);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('PUT');
      expect(fetchCall[1].body).toBe(JSON.stringify(requestBody));
    });

    it('should make DELETE request without body', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      await service.request('/resource/1', 'DELETE');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('DELETE');
      expect(fetchCall[1].body).toBeUndefined();
    });

    it('should not set body when body parameter is undefined', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test-endpoint', 'GET');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].body).toBeUndefined();
    });

    it('should return null when request fails (non-ok response)', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.request('/test-endpoint');

      expect(result).toBeNull();
    });

    it('should return null on 401 Unauthorized response', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await service.request('/test-endpoint');

      expect(result).toBeNull();
    });

    it('should return null on 403 Forbidden response', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
      });

      const result = await service.request('/test-endpoint');

      expect(result).toBeNull();
    });

    it('should return null when fetch throws error', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await service.request('/test-endpoint');

      expect(result).toBeNull();
    });

    it('should retry on 5xx and succeed when API recovers', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);
      const mockResponse = { data: { recovered: true } };

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

      const result = await service.request('/test-endpoint');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 status and succeed on second attempt', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      const result = await service.request('/test-endpoint');

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return null when all retry attempts are exhausted on 5xx', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      // withRetry defaults to 3 attempts
      (global.fetch as any)
        .mockResolvedValue({ ok: false, status: 502, text: async () => 'Bad Gateway' });

      const result = await service.request('/test-endpoint');

      // After all retries exhausted, error is caught and returns null
      expect(result).toBeNull();
    });

    it('should not retry on 4xx client errors', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 422,
      });

      const result = await service.request('/test-endpoint');

      // 4xx does not throw inside withRetry (only >= 500 throws), so no retry
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should include API key in headers when configured', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test-endpoint');

      const fetchCall = (global.fetch as any).mock.calls[0];
      // API key should be included (defaults to 'apikey' from constants)
      expect(fetchCall[1].headers['x-ir-api-key']).toBe('apikey');
    });

    it('should handle missing API key gracefully', async () => {
      delete process.env.PRODUCT_API_KEY;
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test-endpoint');

      // Should still work, just without API key header
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return parsed JSON from successful response', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const complexResponse = {
        data: { items: [1, 2, 3], nested: { key: 'value' } },
        meta: { total: 3 },
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => complexResponse,
      });

      const result = await service.request('/complex');

      expect(result).toEqual(complexResponse);
    });

    it('should handle non-Error thrown by fetch (e.g. string)', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockRejectedValue('string error');

      const result = await service.request('/test-endpoint');

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // getWhitelabelingConfig
  // ──────────────────────────────────────────────────────────────
  describe('getWhitelabelingConfig', () => {
    it('should fetch and parse whitelabeling configuration', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = {
        data: {
          mainLogoUrl: 'https://example.com/logo.png',
          minimizedMenuLogoUrl: 'https://example.com/mini-logo.png',
          brandName: 'Test Brand',
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getWhitelabelingConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-idp.com/api/whitelabeling',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual({
        mainLogoUrl: 'https://example.com/logo.png',
        minimizedMenuLogoUrl: 'https://example.com/mini-logo.png',
        brandName: 'Test Brand',
      });
    });

    it('should return null when response has no data field', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should return null when response is null (request failed)', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      // request() returns null on non-ok
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should return null when request fails with 500', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should handle optional whitelabeling fields', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = {
        data: {
          mainLogoUrl: 'https://example.com/logo.png',
          // Other fields missing
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toEqual({
        mainLogoUrl: 'https://example.com/logo.png',
        minimizedMenuLogoUrl: undefined,
        brandName: undefined,
      });
    });

    it('should return null when response data is explicitly null', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should return null when request throws a network error', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should only extract mainLogoUrl, minimizedMenuLogoUrl, and brandName', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = {
        data: {
          mainLogoUrl: 'https://example.com/logo.png',
          minimizedMenuLogoUrl: 'https://example.com/mini.png',
          brandName: 'MyBrand',
          extraField: 'should-not-appear',
          anotherField: 123,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toEqual({
        mainLogoUrl: 'https://example.com/logo.png',
        minimizedMenuLogoUrl: 'https://example.com/mini.png',
        brandName: 'MyBrand',
      });
      // Verify extra fields are NOT included
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('anotherField');
    });

    it('should return config with all fields undefined when data has none of the expected fields', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = {
        data: {
          unknownField: 'some-value',
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toEqual({
        mainLogoUrl: undefined,
        minimizedMenuLogoUrl: undefined,
        brandName: undefined,
      });
    });
  });

  // ──────────────────────────────────────────────────────────────
  // RequestStorage Integration
  // ──────────────────────────────────────────────────────────────
  describe('RequestStorage Integration', () => {
    it('should get token from requestStorage when not provided', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token });
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should get companyId from requestStorage when available', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token, companyId: 'storage-company-456' });
      const service = new ProductService();

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['x-ir-company-id']).toBe('storage-company-456');
    });

    it('should handle requestStorage errors gracefully', () => {
      // When requestStorage.getStore() returns undefined, service should still initialize
      const service = new ProductService();

      expect(service).toBeDefined();
      // Service should initialize without token when requestStorage is empty
    });

    it('should handle getCompanyIdFromRequestStorage throwing', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      let callCount = 0;
      const getStoreSpy = vi.spyOn(requestStorage, 'getStore').mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('AsyncLocalStorage unavailable');
        }
        return { baseApiUrl: undefined };
      });

      try {
        const service = new ProductService(token);
        expect(service).toBeDefined();
      } finally {
        getStoreSpy.mockRestore();
      }
    });

    it('should handle getTokenFromRequestStorage throwing', () => {
      let callCount = 0;
      const getStoreSpy = vi.spyOn(requestStorage, 'getStore').mockImplementation(() => {
        callCount++;
        // First call is from getRequestContext() in constructor - let it succeed
        if (callCount === 1) {
          return { baseApiUrl: undefined };
        }
        // Second call is from getTokenFromRequestStorage() - throw
        // Subsequent calls (from logger.enrichContext during error handling) - return undefined
        if (callCount === 2) {
          throw new Error('Storage error');
        }
        return undefined as any;
      });

      try {
        // No explicit token, so it tries requestStorage which throws
        const service = new ProductService();
        expect(service).toBeDefined();
      } finally {
        getStoreSpy.mockRestore();
      }
    });

    it('should use baseApiUrl from requestStorage for baseUrl', async () => {
      const payload = { idp: 'https://jwt-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ baseApiUrl: 'https://platform-api.example.com' });
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await service.request('/endpoint');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://platform-api.example.com/api/endpoint');
    });

    it('should prefer token parameter over requestStorage token', async () => {
      const storagePayload = { idp: 'https://storage-idp.com', user_company_resourceid: 'storage-co' };
      const storageToken = createMockJWT(storagePayload);

      const paramPayload = { idp: 'https://param-idp.com', user_company_resourceid: 'param-co' };
      const paramToken = createMockJWT(paramPayload);

      requestStorage.enterWith({ token: storageToken });
      const service = new ProductService(paramToken);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test');

      const fetchCall = (global.fetch as any).mock.calls[0];
      // Should use the param token, not the storage token
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${paramToken}`);
      expect(fetchCall[0]).toBe('https://param-idp.com/api/test');
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Edge Cases
  // ──────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle empty string token parameter', () => {
      // Empty string is falsy, so should fall through to requestStorage
      requestStorage.enterWith({});
      const service = new ProductService('');

      expect(service).toBeDefined();
    });

    it('should handle endpoint with query parameters', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await service.request('/search?q=test&limit=10');

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('https://test-idp.com/api/search?q=test&limit=10');
    });

    it('should serialize body with nested objects correctly', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const nestedBody = {
        level1: {
          level2: {
            level3: 'deep-value',
          },
          array: [1, 2, 3],
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await service.request('/test', 'POST', nestedBody);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].body).toBe(JSON.stringify(nestedBody));
    });

    it('should handle response.json() throwing (malformed JSON body)', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Unexpected token'); },
      });

      const result = await service.request('/test-endpoint');

      // json() throw is caught by the outer try-catch, returns null
      expect(result).toBeNull();
    });

    it('should handle multiple sequential requests', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ first: true }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ second: true }) });

      const result1 = await service.request('/first');
      const result2 = await service.request('/second');

      expect(result1).toEqual({ first: true });
      expect(result2).toEqual({ second: true });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
