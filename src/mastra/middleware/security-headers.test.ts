import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityHeadersMiddleware } from './security-headers';

describe('securityHeadersMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let nextCalled: boolean;

  beforeEach(() => {
    nextCalled = false;

    mockNext = vi.fn(async () => {
      nextCalled = true;
    });

    mockContext = {
      req: {
        path: '/chat',
        method: 'POST',
      },
      res: {
        headers: new Map<string, string>(),
        status: 200,
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
    };

    // Add mock set method for headers
    mockContext.res.headers.set = vi.fn((key: string, value: string) => {
      mockContext.res.headers[key] = value;
    });
  });

  describe('middleware function', () => {
    it('should exist', () => {
      expect(securityHeadersMiddleware).toBeDefined();
    });

    it('should be async function', async () => {
      expect(securityHeadersMiddleware.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('request flow', () => {
    it('should call next middleware', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should call next before adding headers', async () => {
      let headersSetBeforeNext = false;

      mockNext.mockImplementation(() => {
        // Check if headers are already set when next is called
        headersSetBeforeNext = mockContext.res.headers.set.mock.calls.length > 0;
      });

      await securityHeadersMiddleware(mockContext, mockNext);

      // Headers should be added after next() completes
      expect(headersSetBeforeNext).toBe(false);
    });

    it('should add headers after next execution', async () => {
      mockNext.mockImplementation(() => {
        expect(mockContext.res.headers.set).not.toHaveBeenCalled();
      });

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });
  });

  describe('X-Content-Type-Options header', () => {
    it('should set X-Content-Type-Options header', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });

    it('should have value nosniff', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const contentTypeCall = calls.find((c: any) => c[0] === 'X-Content-Type-Options');
      expect(contentTypeCall[1]).toBe('nosniff');
    });

    it('should prevent MIME type sniffing', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const contentTypeCall = calls.find((c: any) => c[0] === 'X-Content-Type-Options');
      expect(contentTypeCall).toBeDefined();
    });
  });

  describe('X-Frame-Options header', () => {
    it('should set X-Frame-Options header', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
    });

    it('should have value DENY', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const frameCall = calls.find((c: any) => c[0] === 'X-Frame-Options');
      expect(frameCall[1]).toBe('DENY');
    });

    it('should prevent iframe embedding', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const frameCall = calls.find((c: any) => c[0] === 'X-Frame-Options');
      expect(frameCall).toBeDefined();
    });
  });

  describe('X-XSS-Protection header', () => {
    it('should set X-XSS-Protection header', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should have value 1; mode=block', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const xssCall = calls.find((c: any) => c[0] === 'X-XSS-Protection');
      expect(xssCall[1]).toBe('1; mode=block');
    });

    it('should provide legacy XSS protection', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const xssCall = calls.find((c: any) => c[0] === 'X-XSS-Protection');
      expect(xssCall).toBeDefined();
    });
  });

  describe('Referrer-Policy header', () => {
    it('should set Referrer-Policy header', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should have value strict-origin-when-cross-origin', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const refererCall = calls.find((c: any) => c[0] === 'Referrer-Policy');
      expect(refererCall[1]).toBe('strict-origin-when-cross-origin');
    });

    it('should prevent referrer leakage', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const refererCall = calls.find((c: any) => c[0] === 'Referrer-Policy');
      expect(refererCall).toBeDefined();
    });
  });

  describe('Permissions-Policy header', () => {
    it('should set Permissions-Policy header', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );
    });

    it('should disable geolocation', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const permCall = calls.find((c: any) => c[0] === 'Permissions-Policy');
      expect(permCall[1]).toContain('geolocation=()');
    });

    it('should disable microphone', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const permCall = calls.find((c: any) => c[0] === 'Permissions-Policy');
      expect(permCall[1]).toContain('microphone=()');
    });

    it('should disable camera', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const permCall = calls.find((c: any) => c[0] === 'Permissions-Policy');
      expect(permCall[1]).toContain('camera=()');
    });

    it('should have all three permissions disabled', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const permCall = calls.find((c: any) => c[0] === 'Permissions-Policy');
      const value = permCall[1];
      expect(value).toBe('geolocation=(), microphone=(), camera=()');
    });
  });

  describe('all headers together', () => {
    it('should set all 5 security headers', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      expect(calls.length).toBe(5);
    });

    it('should include X-Content-Type-Options', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const headerNames = mockContext.res.headers.set.mock.calls.map((c: any) => c[0]);
      expect(headerNames).toContain('X-Content-Type-Options');
    });

    it('should include X-Frame-Options', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const headerNames = mockContext.res.headers.set.mock.calls.map((c: any) => c[0]);
      expect(headerNames).toContain('X-Frame-Options');
    });

    it('should include X-XSS-Protection', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const headerNames = mockContext.res.headers.set.mock.calls.map((c: any) => c[0]);
      expect(headerNames).toContain('X-XSS-Protection');
    });

    it('should include Referrer-Policy', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const headerNames = mockContext.res.headers.set.mock.calls.map((c: any) => c[0]);
      expect(headerNames).toContain('Referrer-Policy');
    });

    it('should include Permissions-Policy', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const headerNames = mockContext.res.headers.set.mock.calls.map((c: any) => c[0]);
      expect(headerNames).toContain('Permissions-Policy');
    });
  });

  describe('OWASP recommendations', () => {
    it('should follow OWASP secure headers guidelines', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const headerMap = new Map(calls);

      // OWASP recommends these headers
      expect(headerMap.has('X-Content-Type-Options')).toBe(true);
      expect(headerMap.has('X-Frame-Options')).toBe(true);
      expect(headerMap.has('Referrer-Policy')).toBe(true);
    });

    it('should include clickjacking protection', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
    });

    it('should prevent MIME type sniffing attacks', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });
  });

  describe('iframe behavior', () => {
    it('should note that X-Frame-Options prevents page embedding, not API calls', () => {
      // This test documents the behavior explained in the source file
      // X-Frame-Options: DENY prevents the response from being rendered in an iframe
      // but does NOT prevent API calls from an iframe (those are allowed by CORS)
      expect(true).toBe(true);
    });

    it('should set X-Frame-Options to DENY (prevents embedding)', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
    });

    it('should not prevent fetch/axios from iframe (handled by CORS)', async () => {
      // X-Frame-Options only controls if THIS RESPONSE can be embedded in an iframe
      // CORS headers control whether fetch requests work from different origins
      // This middleware only sets X-Frame-Options
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const callHeaders = calls.map((c: any) => c[0]);

      // This middleware doesn't set CORS headers (that's a separate concern)
      expect(callHeaders).not.toContain('Access-Control-Allow-Origin');
    });
  });

  describe('different request types', () => {
    it('should add headers to JSON responses', async () => {
      mockContext.res.type = 'application/json';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to HTML responses', async () => {
      mockContext.res.type = 'text/html';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to all response types', async () => {
      const types = ['application/json', 'text/html', 'text/plain', 'image/png'];

      for (const type of types) {
        mockContext.res.type = type;
        mockContext.res.headers.set.mockClear();

        await securityHeadersMiddleware(mockContext, mockNext);

        expect(mockContext.res.headers.set).toHaveBeenCalled();
      }
    });
  });

  describe('different HTTP methods', () => {
    it('should add headers to GET requests', async () => {
      mockContext.req.method = 'GET';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to POST requests', async () => {
      mockContext.req.method = 'POST';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to all HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      for (const method of methods) {
        mockContext.req.method = method;
        mockContext.res.headers.set.mockClear();

        await securityHeadersMiddleware(mockContext, mockNext);

        expect(mockContext.res.headers.set).toHaveBeenCalled();
      }
    });
  });

  describe('different paths', () => {
    it('should add headers to /chat path', async () => {
      mockContext.req.path = '/chat';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to /api path', async () => {
      mockContext.req.path = '/api';

      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should add headers to all paths', async () => {
      const paths = ['/', '/chat', '/api/v1/data', '/deeply/nested/path'];

      for (const path of paths) {
        mockContext.req.path = path;
        mockContext.res.headers.set.mockClear();

        await securityHeadersMiddleware(mockContext, mockNext);

        expect(mockContext.res.headers.set).toHaveBeenCalled();
      }
    });
  });

  describe('header value types', () => {
    it('should set headers with string values', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      for (const call of calls) {
        expect(typeof call[0]).toBe('string');
        expect(typeof call[1]).toBe('string');
      }
    });

    it('should use correct header value format', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const headerMap = new Map(calls);

      // Check format of each header value
      expect(headerMap.get('X-Content-Type-Options')).toMatch(/^[a-z]+$/);
      expect(headerMap.get('X-Frame-Options')).toMatch(/^[A-Z]+$/);
      expect(headerMap.get('X-XSS-Protection')).toMatch(/^[\d;= \w\-]+$/);
      expect(headerMap.get('Referrer-Policy')).toMatch(/^[a-z\-]+$/);
    });
  });

  describe('response headers application', () => {
    it('should apply headers to response object', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);

      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });

    it('should apply headers after next execution completes', async () => {
      mockNext.mockImplementation(async () => {
        // Wait a tick
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await securityHeadersMiddleware(mockContext, mockNext);

      // Verify headers were set after next completed
      expect(mockContext.res.headers.set).toHaveBeenCalled();
    });
  });

  describe('multiple calls', () => {
    it('should add headers on every call', async () => {
      await securityHeadersMiddleware(mockContext, mockNext);
      const firstCallCount = mockContext.res.headers.set.mock.calls.length;

      mockContext.res.headers.set.mockClear();

      await securityHeadersMiddleware(mockContext, mockNext);
      const secondCallCount = mockContext.res.headers.set.mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount);
      expect(secondCallCount).toBe(5);
    });
  });

  describe('header precedence', () => {
    it('should overwrite existing X-Content-Type-Options', async () => {
      mockContext.res.headers['X-Content-Type-Options'] = 'old-value';

      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const call = calls.find((c: any) => c[0] === 'X-Content-Type-Options');
      expect(call[1]).toBe('nosniff');
    });

    it('should overwrite existing X-Frame-Options', async () => {
      mockContext.res.headers['X-Frame-Options'] = 'SAMEORIGIN';

      await securityHeadersMiddleware(mockContext, mockNext);

      const calls = mockContext.res.headers.set.mock.calls;
      const call = calls.find((c: any) => c[0] === 'X-Frame-Options');
      expect(call[1]).toBe('DENY');
    });
  });

  describe('request flow return', () => {
    it('should return void', async () => {
      const result = await securityHeadersMiddleware(mockContext, mockNext);

      expect(result).toBeUndefined();
    });

    it('should not return response', async () => {
      const result = await securityHeadersMiddleware(mockContext, mockNext);

      expect(result).toBeUndefined();
    });
  });
});
