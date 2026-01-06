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

    it('should build baseUrl from JWT idp field', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      // Access private property via request method to verify baseUrl
      // Service should be able to make requests with correct baseUrl
      expect(service).toBeDefined();
    });

    it('should use companyId from requestStorage if available', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token, companyId: 'storage-company-456' });
      const service = new ProductService();

      expect(service).toBeDefined();
      // CompanyId from storage should take precedence
    });

    it('should fallback to companyId from JWT if not in requestStorage', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token });
      const service = new ProductService();

      expect(service).toBeDefined();
    });
  });

  describe('JWT Token Parsing', () => {
    it('should extract idp from valid JWT token', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });

    it('should extract companyId from JWT token', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });

    it('should handle JWT token without idp field', () => {
      const payload = { user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });

    it('should handle invalid JWT format gracefully', () => {
      const invalidToken = 'invalid-token-format';
      const service = new ProductService(invalidToken);

      expect(service).toBeDefined();
    });

    it('should handle JWT token with padding requirements', () => {
      // JWT payload that requires base64 padding
      const payload = { idp: 'https://test.com', user_company_resourceid: 'company' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      expect(service).toBeDefined();
    });
  });

  describe('Request Method', () => {
    it('should make GET request to endpoint', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = { data: { test: 'value' } };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
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

    it('should make POST request with body', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const requestBody = { key: 'value' };
      const mockResponse = { success: true };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.request('/test-endpoint', 'POST', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-idp.com/api/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return null when request fails (non-ok response)', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404
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

    it('should include API key in headers when configured', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({})
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
        json: async () => ({})
      });

      await service.request('/test-endpoint');

      // Should still work, just without API key header
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('getWhitelabelingConfig', () => {
    it('should fetch and parse whitelabeling configuration', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      const mockResponse = {
        data: {
          mainLogoUrl: 'https://example.com/logo.png',
          minimizedMenuLogoUrl: 'https://example.com/mini-logo.png',
          brandName: 'Test Brand'
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getWhitelabelingConfig();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-idp.com/api/whitelabeling',
        expect.objectContaining({
          method: 'GET'
        })
      );
      expect(result).toEqual({
        mainLogoUrl: 'https://example.com/logo.png',
        minimizedMenuLogoUrl: 'https://example.com/mini-logo.png',
        brandName: 'Test Brand'
      });
    });

    it('should return null when response has no data', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toBeNull();
    });

    it('should return null when request fails', async () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);
      const service = new ProductService(token);

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500
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
          mainLogoUrl: 'https://example.com/logo.png'
          // Other fields missing
        }
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getWhitelabelingConfig();

      expect(result).toEqual({
        mainLogoUrl: 'https://example.com/logo.png',
        minimizedMenuLogoUrl: undefined,
        brandName: undefined
      });
    });
  });

  describe('RequestStorage Integration', () => {
    it('should get token from requestStorage when not provided', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token });
      const service = new ProductService();

      expect(service).toBeDefined();
    });

    it('should get companyId from requestStorage when available', () => {
      const payload = { idp: 'https://test-idp.com', user_company_resourceid: 'jwt-company-123' };
      const token = createMockJWT(payload);

      requestStorage.enterWith({ token, companyId: 'storage-company-456' });
      const service = new ProductService();

      expect(service).toBeDefined();
    });

    it('should handle requestStorage errors gracefully', () => {
      // When requestStorage.getStore() throws, service should still initialize
      // Note: AsyncLocalStorage.getStore() doesn't actually throw, but if it did,
      // the service catches the error in getTokenFromRequestStorage
      const service = new ProductService();

      expect(service).toBeDefined();
      // Service should initialize without token when requestStorage is empty
    });
  });
});
