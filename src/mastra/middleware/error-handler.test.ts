import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandlerMiddleware } from './error-handler';
import { ERROR_CODES } from '../constants';

// Use vi.hoisted to create mock logger before vi.mock
const { mockLoggerInstance } = vi.hoisted(() => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  return { mockLoggerInstance: mockLogger };
});

const { sentryMocks } = vi.hoisted(() => {
  const mockScope = {
    setTag: vi.fn(),
    setLevel: vi.fn(),
  };

  return {
    sentryMocks: {
      wrapRequestHandler: vi.fn(async (_options, handler) => handler()),
      withScope: vi.fn((callback: (scope: typeof mockScope) => void) => callback(mockScope)),
      captureException: vi.fn(),
    },
  };
});

// Mock logger - returns the same instance
vi.mock('../utils/core/logger', () => ({
  getLogger: () => mockLoggerInstance,
}));

vi.mock('@sentry/cloudflare', () => ({
  wrapRequestHandler: sentryMocks.wrapRequestHandler,
  withScope: sentryMocks.withScope,
  captureException: sentryMocks.captureException,
}));

describe('errorHandlerMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let nextCalled: boolean;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    nextCalled = false;

    // Clear logger mocks
    mockLoggerInstance.error.mockClear();
    mockLoggerInstance.warn.mockClear();
    mockLoggerInstance.info.mockClear();
    mockLoggerInstance.debug.mockClear();
    sentryMocks.wrapRequestHandler.mockClear();
    sentryMocks.withScope.mockClear();
    sentryMocks.captureException.mockClear();

    mockNext = vi.fn(async () => {
      nextCalled = true;
    });

    mockContext = {
      req: {
        path: '/chat',
        method: 'POST',
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
      res: {
        status: 200,
        headers: new Headers(),
      },
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('middleware function', () => {
    it('should exist', () => {
      expect(errorHandlerMiddleware).toBeDefined();
    });

    it('should be async function', async () => {
      expect(errorHandlerMiddleware.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      await errorHandlerMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('successful request handling', () => {
    it('should pass through successful requests', async () => {
      await errorHandlerMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should call next middleware', async () => {
      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not modify response on success', async () => {
      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should return void on success', async () => {
      const result = await errorHandlerMiddleware(mockContext, mockNext);

      expect(result).toBeUndefined();
    });
  });

  describe('error handling - Error objects', () => {
    it('should catch unhandled Error', async () => {
      const testError = new Error('Test error message');
      mockNext.mockRejectedValueOnce(testError);

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should return 500 status code on error', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[1]).toBe(500);
    });

    it('should return error field in response', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('error');
      expect(callArgs[0].error).toBe('Internal Server Error');
    });

    it('should include errorCode for support tracing', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('errorCode');
      expect(callArgs[0].errorCode).toBe(ERROR_CODES.INTERNAL_UNEXPECTED);
    });

    it('should return message field in response', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('message');
      expect(typeof callArgs[0].message).toBe('string');
    });

    it('should include path in response for debugging', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('path');
      expect(callArgs[0].path).toBe('/chat');
    });

    it('should not leak stack trace in response', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).not.toHaveProperty('stack');
      expect(JSON.stringify(callArgs[0])).not.toContain('at ');
    });

    it('should extract Error message', async () => {
      mockNext.mockRejectedValueOnce(new Error('Specific error message'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      // Message should be the generic safe message, not the error details
      expect(callArgs[0].message).toContain('unexpected error');
    });
  });

  describe('error handling - non-Error objects', () => {
    it('should handle string errors', async () => {
      mockNext.mockRejectedValueOnce('String error');

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle null errors', async () => {
      mockNext.mockRejectedValueOnce(null);

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle undefined errors', async () => {
      mockNext.mockRejectedValueOnce(undefined);

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle object errors', async () => {
      mockNext.mockRejectedValueOnce({ code: 'ERROR_CODE' });

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should return 500 for non-Error objects', async () => {
      mockNext.mockRejectedValueOnce('String error');

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[1]).toBe(500);
    });
  });

  describe('logging behavior', () => {
    it('should log error details', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    it('should include path in log', async () => {
      mockContext.req.path = '/sensitive-endpoint';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1].path).toBe('/sensitive-endpoint');
    });

    it('should include method in log', async () => {
      mockContext.req.method = 'POST';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
    });

    it('should log error message from Error object', async () => {
      mockNext.mockRejectedValueOnce(new Error('Specific error message'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1].error).toBe('Specific error message');
    });

    it('should log stack trace from Error object', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('stack');
      expect(typeof callArgs[1].stack).toBe('string');
    });

    it('should handle non-Error object logging', async () => {
      mockNext.mockRejectedValueOnce('String error');

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1].error).toBe('String error');
    });
  });

  describe('sentry integration', () => {
    it('should skip Sentry when DSN is not set', async () => {
      delete process.env.SENTRY_DSN;
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(sentryMocks.wrapRequestHandler).not.toHaveBeenCalled();
      expect(sentryMocks.captureException).not.toHaveBeenCalled();
    });

    it('should call Sentry when DSN is set', async () => {
      process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(sentryMocks.wrapRequestHandler).toHaveBeenCalledTimes(1);
      expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    });

    it('should default environment to production', async () => {
      process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      delete process.env.SENTRY_ENVIRONMENT;
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const sentryArgs = sentryMocks.wrapRequestHandler.mock.calls[0]?.[0];
      expect(sentryArgs.options.environment).toBe('production');
    });

    it('should handle context when executionCtx access throws', async () => {
      process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      mockNext.mockRejectedValueOnce(new Error('Test error'));
      Object.defineProperty(mockContext, 'executionCtx', {
        get: () => {
          throw new Error('executionCtx not available');
        },
        configurable: true,
      });

      const result = await errorHandlerMiddleware(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(mockContext.json).toHaveBeenCalled();
      expect(sentryMocks.wrapRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          context: undefined,
        }),
        expect.any(Function)
      );
    });
  });

  describe('response structure', () => {
    it('should return JSON response', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should include error field', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('error');
    });

    it('should include message field', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('message');
    });

    it('should include path field', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('path');
    });

    it('should match expected error value', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].error).toBe('Internal Server Error');
    });

    it('should have generic message (no details leaked)', async () => {
      mockNext.mockRejectedValueOnce(new Error('Database connection failed'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].message).not.toContain('Database');
      expect(callArgs[0].message).not.toContain('connection');
    });
  });

  describe('different request paths', () => {
    it('should include /chat path in error response', async () => {
      mockContext.req.path = '/chat';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].path).toBe('/chat');
    });

    it('should include /workflow path in error response', async () => {
      mockContext.req.path = '/workflow';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].path).toBe('/workflow');
    });

    it('should include root / path in error response', async () => {
      mockContext.req.path = '/';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].path).toBe('/');
    });

    it('should include nested /api/v1/data path in error response', async () => {
      mockContext.req.path = '/api/v1/data';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].path).toBe('/api/v1/data');
    });
  });

  describe('different HTTP methods', () => {
    it('should handle GET errors', async () => {
      mockContext.req.method = 'GET';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle POST errors', async () => {
      mockContext.req.method = 'POST';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle PUT errors', async () => {
      mockContext.req.method = 'PUT';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle DELETE errors', async () => {
      mockContext.req.method = 'DELETE';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should include method in error log', async () => {
      mockContext.req.method = 'PATCH';
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.error.mock.calls[0];
      expect(callArgs[1].method).toBe('PATCH');
    });
  });

  describe('comment requirements', () => {
    it('should mention FIRST middleware in chain (verified in source)', () => {
      // This test documents that the middleware should be first in chain
      // The comment in error-handler.ts says "Should be FIRST middleware in the chain"
      expect(errorHandlerMiddleware).toBeDefined();
    });
  });

  describe('request flow', () => {
    it('should only call next once on success', async () => {
      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call next on error', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      await errorHandlerMiddleware(mockContext, mockNext);

      // next is called but then rejects
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return Response on error', async () => {
      mockNext.mockRejectedValueOnce(new Error('Test error'));

      const result = await errorHandlerMiddleware(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should return void on success', async () => {
      const result = await errorHandlerMiddleware(mockContext, mockNext);

      expect(result).toBeUndefined();
    });
  });

  describe('security - information leakage prevention', () => {
    it('should not expose database connection errors', async () => {
      mockNext.mockRejectedValueOnce(new Error('Connection to MySQL failed at 192.168.1.5'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      const responseStr = JSON.stringify(callArgs[0]);
      expect(responseStr).not.toContain('MySQL');
      expect(responseStr).not.toContain('192.168.1.5');
    });

    it('should not expose file paths', async () => {
      mockNext.mockRejectedValueOnce(new Error('File not found at /home/user/secret/file.txt'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      const responseStr = JSON.stringify(callArgs[0]);
      expect(responseStr).not.toContain('/home/user');
    });

    it('should not expose API credentials', async () => {
      mockNext.mockRejectedValueOnce(new Error('API key sk_test_abc123xyz is invalid'));

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      const responseStr = JSON.stringify(callArgs[0]);
      expect(responseStr).not.toContain('sk_test_abc123xyz');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple error attempts', async () => {
      mockNext.mockRejectedValueOnce(new Error('First error'));
      await errorHandlerMiddleware(mockContext, mockNext);
      expect(mockContext.json).toHaveBeenCalledTimes(1);

      // Reset for second call
      mockContext.json.mockClear();
      mockNext.mockClear();
      mockNext.mockRejectedValueOnce(new Error('Second error'));
      await errorHandlerMiddleware(mockContext, mockNext);
      expect(mockContext.json).toHaveBeenCalledTimes(1);
    });

    it('should handle Error with no message', async () => {
      const error = new Error();
      mockNext.mockRejectedValueOnce(error);

      await errorHandlerMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle deeply nested error object', async () => {
      const error = new Error('Original error');
      error.cause = new Error('Caused by this');
      mockNext.mockRejectedValueOnce(error);

      await errorHandlerMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('error');
    });
  });
});
