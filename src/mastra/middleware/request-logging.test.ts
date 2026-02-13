import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestLoggingMiddleware } from './request-logging';

// Use vi.hoisted to create mock logger before vi.mock
const { mockLoggerInstance } = vi.hoisted(() => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { mockLoggerInstance: mockLogger };
});

// Mock logger - returns the same instance
vi.mock('../utils/core/logger', () => ({
  getLogger: () => mockLoggerInstance,
}));

describe('requestLoggingMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let nextCalled: boolean;

  beforeEach(() => {
    nextCalled = false;

    // Clear logger mocks
    mockLoggerInstance.debug.mockClear();
    mockLoggerInstance.info.mockClear();
    mockLoggerInstance.warn.mockClear();
    mockLoggerInstance.error.mockClear();

    mockNext = vi.fn(async () => {
      nextCalled = true;
    });

    mockContext = {
      req: {
        path: '/chat',
        method: 'POST',
        header: vi.fn(),
      },
      res: {
        status: 200,
        headers: new Headers(),
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
    };

    // Setup default header return
    mockContext.req.header.mockReturnValue('Mozilla/5.0');
  });

  describe('middleware function', () => {
    it('should exist', () => {
      expect(requestLoggingMiddleware).toBeDefined();
    });

    it('should be async function', async () => {
      expect(requestLoggingMiddleware.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      await requestLoggingMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getLogLevel function', () => {
    it('should return info for 2xx status codes', async () => {
      // This is tested indirectly through logging behavior
      mockContext.res.status = 200;
      await requestLoggingMiddleware(mockContext, mockNext);

      const calls = mockLoggerInstance.info.mock.calls.length + mockLoggerInstance.debug.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
    });

    it('should return info for 201 Created', async () => {
      mockContext.res.status = 201;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    it('should return info for 204 No Content', async () => {
      mockContext.res.status = 204;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    it('should return warn for 4xx status codes', async () => {
      mockContext.res.status = 400;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });

    it('should return warn for 404 Not Found', async () => {
      mockContext.res.status = 404;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });

    it('should return error for 5xx status codes', async () => {
      mockContext.res.status = 500;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    it('should return error for 503 Service Unavailable', async () => {
      mockContext.res.status = 503;
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe('timing calculation', () => {
    it('should capture startTime', async () => {
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should calculate duration from startTime to completion', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('durationMs');
      expect(typeof logCall[1].durationMs).toBe('number');
      expect(logCall[1].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should log duration in milliseconds', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].durationMs).toBeLessThan(1000);
    });

    it('should include duration field as string in log', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('duration');
      expect(typeof logCall[1].duration).toBe('string');
      expect(logCall[1].duration).toMatch(/\d+ms/);
    });
  });

  describe('request extraction', () => {
    it('should extract HTTP method', async () => {
      mockContext.req.method = 'POST';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('POST');
    });

    it('should extract path', async () => {
      mockContext.req.path = '/chat';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].path).toBe('/chat');
    });

    it('should extract user-agent header', async () => {
      mockContext.req.header.mockReturnValue('Mozilla/5.0');
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('userAgent');
    });

    it('should use unknown for missing user-agent', async () => {
      mockContext.req.header.mockReturnValue(undefined);
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].userAgent).toBe('unknown');
    });
  });

  describe('status code logging', () => {
    it('should log status code in response', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].status).toBe(200);
    });

    it('should log 404 status', async () => {
      mockContext.res.status = 404;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.warn.mock.calls[0];
      expect(logCall[1].status).toBe(404);
    });

    it('should log 500 status', async () => {
      mockContext.res.status = 500;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.error.mock.calls[0];
      expect(logCall[1].status).toBe(500);
    });
  });

  describe('health check path special handling', () => {
    it('should identify /health path', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      // Should call debug for successful health checks
      expect(mockLoggerInstance.debug).toHaveBeenCalled();
    });

    it('should use debug level for successful health checks', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('Health check', expect.any(Object));
    });

    it('should exclude userAgent from health check logs', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).not.toHaveProperty('userAgent');
    });

    it('should not reduce verbosity for failed health checks', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 500;

      await requestLoggingMiddleware(mockContext, mockNext);

      // Should use error level, not debug
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    it('should not log userAgent for successful health check', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 200;
      mockContext.req.header.mockReturnValue('Mozilla/5.0');

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).not.toHaveProperty('userAgent');
    });

    it('should include userAgent for non-health check paths', async () => {
      mockContext.req.path = '/chat';
      mockContext.res.status = 200;
      mockContext.req.header.mockReturnValue('Mozilla/5.0');

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0];
      expect(logCall[1]).toHaveProperty('userAgent');
    });
  });

  describe('request flow', () => {
    it('should call next middleware', async () => {
      await requestLoggingMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log after next completes', async () => {
      let loggedBeforeNextReturned = false;

      mockNext.mockImplementation(async () => {
        loggedBeforeNextReturned =
          mockLoggerInstance.info.mock.calls.length > 0 || mockLoggerInstance.debug.mock.calls.length > 0;
      });

      await requestLoggingMiddleware(mockContext, mockNext);

      expect(loggedBeforeNextReturned).toBe(false);
    });

    it('should return void', async () => {
      const result = await requestLoggingMiddleware(mockContext, mockNext);

      expect(result).toBeUndefined();
    });
  });

  describe('different HTTP methods', () => {
    it('should log GET requests', async () => {
      mockContext.req.method = 'GET';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('GET');
    });

    it('should log POST requests', async () => {
      mockContext.req.method = 'POST';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('POST');
    });

    it('should log PUT requests', async () => {
      mockContext.req.method = 'PUT';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('PUT');
    });

    it('should log DELETE requests', async () => {
      mockContext.req.method = 'DELETE';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('DELETE');
    });

    it('should log PATCH requests', async () => {
      mockContext.req.method = 'PATCH';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].method).toBe('PATCH');
    });
  });

  describe('error handling', () => {
    it('should catch unhandled errors from next', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await expect(requestLoggingMiddleware(mockContext, mockNext)).rejects.toThrow();
    });

    it('should log unhandled errors', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      try {
        await requestLoggingMiddleware(mockContext, mockNext);
      } catch {
        // Expected to throw
      }

      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    it('should log error with method and path', async () => {
      mockContext.req.method = 'POST';
      mockContext.req.path = '/chat';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      try {
        await requestLoggingMiddleware(mockContext, mockNext);
      } catch {
        // Expected to throw
      }

      const errorCall = mockLoggerInstance.error.mock.calls.find((call: any) => call[0].includes('failed'));
      expect(errorCall[1].method).toBe('POST');
      expect(errorCall[1].path).toBe('/chat');
    });

    it('should rethrow errors to let them propagate', async () => {
      const error = new Error('Test error');
      mockNext.mockRejectedValueOnce(error);

      await expect(requestLoggingMiddleware(mockContext, mockNext)).rejects.toThrow('Test error');
    });
  });

  describe('log data structure', () => {
    it('should include method in log data', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('method');
    });

    it('should include path in log data', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('path');
    });

    it('should include status in log data', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('status');
    });

    it('should include duration in log data', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('duration');
    });

    it('should include durationMs in log data', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1]).toHaveProperty('durationMs');
    });
  });

  describe('log message', () => {
    it('should log Request completed for successful requests', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const infoCall = mockLoggerInstance.info.mock.calls[0];
      expect(infoCall[0]).toBe('Request completed');
    });

    it('should log Health check for /health path', async () => {
      mockContext.req.path = '/health';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const debugCall = mockLoggerInstance.debug.mock.calls[0];
      expect(debugCall[0]).toBe('Health check');
    });

    it('should log Request failed for errors', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      try {
        await requestLoggingMiddleware(mockContext, mockNext);
      } catch {
        // Expected
      }

      const errorCall = mockLoggerInstance.error.mock.calls.find((call: any) => call[0].includes('failed'));
      expect(errorCall[0]).toContain('failed');
    });
  });

  describe('edge cases', () => {
    it('should handle very fast requests (< 1ms)', async () => {
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle requests with no user-agent', async () => {
      mockContext.req.header.mockReturnValue(undefined);
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0];
      expect(logCall[1].userAgent).toBe('unknown');
    });

    it('should handle root path /', async () => {
      mockContext.req.path = '/';
      mockContext.res.status = 200;

      await requestLoggingMiddleware(mockContext, mockNext);

      const logCall = mockLoggerInstance.info.mock.calls[0] || mockLoggerInstance.debug.mock.calls[0];
      expect(logCall[1].path).toBe('/');
    });

    it('should handle all 2xx status codes as info', async () => {
      const codes = [200, 201, 202, 204, 206];

      for (const code of codes) {
        mockContext.res.status = code;
        mockLoggerInstance.info.mockClear();
        mockLoggerInstance.debug.mockClear();

        await requestLoggingMiddleware(mockContext, mockNext);

        const loggedAsInfo = mockLoggerInstance.info.mock.calls.length > 0;
        const loggedAsDebug = mockLoggerInstance.debug.mock.calls.length > 0;
        expect(loggedAsInfo || loggedAsDebug).toBe(true);
      }
    });
  });
});
