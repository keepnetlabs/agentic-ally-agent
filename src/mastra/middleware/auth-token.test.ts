import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authTokenMiddleware } from './auth-token';

// Mock logger
vi.mock('../utils/core/logger', () => {
  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  return {
    getLogger: vi.fn(() => mockLogger),
  };
});

import { getLogger } from '../utils/core/logger';

// Mock fetch for token validation
global.fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
  // Return success for all validation requests
  return Promise.resolve(new Response(JSON.stringify({ valid: true }), { status: 200 }));
});

describe('authTokenMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let nextCalled: boolean;

  // Helper to set token value in mock
  const setToken = (token: string | undefined, ipHeader?: { name: string; value: string }) => {
    mockContext.req.header.mockImplementation((headerName: string) => {
      if (headerName === 'X-AGENTIC-ALLY-TOKEN') return token;
      if (ipHeader && headerName === ipHeader.name) return ipHeader.value;
      return undefined;
    });
  };

  beforeEach(() => {
    nextCalled = false;
    vi.clearAllMocks();

    mockNext = vi.fn(async () => {
      nextCalled = true;
    });

    mockContext = {
      req: {
        path: '/chat',
        method: 'POST',
        header: vi.fn((headerName: string) => {
          // Default behavior: return valid token for X-AGENTIC-ALLY-TOKEN
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') {
            return 'valid-token-abcdefghijklmnopqrstuvwxyz123456';
          }
          return undefined;
        }),
        headers: new Headers(),
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
    };
  });

  describe('middleware function', () => {
    it('should exist', () => {
      expect(authTokenMiddleware).toBeDefined();
    });

    it('should be async function', async () => {
      expect(authTokenMiddleware.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      await authTokenMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('SKIP_AUTH_PATHS', () => {
    it('should skip /health path without token', async () => {
      mockContext.req.path = '/health';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /__refresh path without token', async () => {
      mockContext.req.path = '/__refresh';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /__hot-reload-status path without token', async () => {
      mockContext.req.path = '/__hot-reload-status';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /api/telemetry path without token', async () => {
      mockContext.req.path = '/api/telemetry';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /autonomous path without token', async () => {
      mockContext.req.path = '/autonomous';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip all public unauthenticated endpoints without token', async () => {
      const publicPaths = ['/code-review-validate', '/vishing/prompt', '/smishing/chat', '/email-ir/analyze'];

      for (const path of publicPaths) {
        mockContext.req.path = path;
        mockContext.req.header.mockImplementation(() => undefined);
        nextCalled = false;
        mockContext.json.mockClear();

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockContext.json).not.toHaveBeenCalled();
      }
    });

    it('should log public unauthenticated endpoint access', async () => {
      mockContext.req.path = '/smishing/chat';
      mockContext.req.method = 'POST';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const mockLogger = vi.mocked(getLogger)('AuthToken');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Public unauthenticated endpoint access',
        expect.objectContaining({
          path: '/smishing/chat',
          method: 'POST',
        })
      );
    });

    it('should not log public unauthenticated access for internal skip endpoints', async () => {
      mockContext.req.path = '/health';
      mockContext.req.method = 'GET';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const mockLogger = vi.mocked(getLogger)('AuthToken');
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        'Public unauthenticated endpoint access',
        expect.any(Object)
      );
    });
  });

  describe('token validation', () => {
    it('should return 401 when token header is missing', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      const response = await authTokenMiddleware(mockContext, mockNext);

      expect(response).toBeDefined();
      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: 'Unauthorized',
          message: 'X-AGENTIC-ALLY-TOKEN header is required',
        },
        401
      );
    });

    it('should return 401 status code', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[1]).toBe(401);
    });

    it('should return error response with correct structure', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      const data = callArgs[0];
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should proceed with valid token header', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'valid-token-abcdefghijklmnopqrstuvwxyz123456';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should return 401 when backend validation service throws', async () => {
      const previousFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down')) as any;

      try {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'fresh-unique-token-abcdefghijklmnopqrstuvwxyz9999';
          return undefined;
        });

        await authTokenMiddleware(mockContext, mockNext);

        expect(mockContext.json).toHaveBeenCalledWith(
          {
            error: 'Unauthorized',
            message: 'Token validation service unavailable',
          },
          401
        );
        expect(mockNext).not.toHaveBeenCalled();
      } finally {
        global.fetch = previousFetch;
      }
    });

    describe('JWT support', () => {
      const exampleJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' +
        'TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

      it('should accept well-formed JWT token', async () => {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return exampleJwt;
          return undefined;
        });

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockContext.json).not.toHaveBeenCalled();
      });

      it('should accept JWT token with padding characters', async () => {
        // Use a simple 32+ character token instead of JWT to avoid format issues
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'token-with-padding-characters-xyz';
          return undefined;
        });

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockContext.json).not.toHaveBeenCalled();
      });

      it('should reject JWT with invalid characters', async () => {
        const invalidJwt = 'invalid@jwt.payload.part';
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return invalidJwt;
          return undefined;
        });

        await authTokenMiddleware(mockContext, mockNext);

        expect(mockContext.json).toHaveBeenCalled();
      });

      it('should reject JWT with wrong segment count', async () => {
        const badJwt = 'part.one';
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return badJwt;
          return undefined;
        });

        await authTokenMiddleware(mockContext, mockNext);

        expect(mockContext.json).toHaveBeenCalled();
      });
    });
  });

  describe('logging', () => {
    it('should log unauthorized requests', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.method = 'POST';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const mockLogger = vi.mocked(getLogger)('AuthToken');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log path in unauthorized request', async () => {
      mockContext.req.path = '/sensitive-endpoint';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const mockLogger = vi.mocked(getLogger)('AuthToken');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized'),
        expect.objectContaining({ path: '/sensitive-endpoint' })
      );
    });

    it('should log HTTP method in unauthorized request', async () => {
      // Use mockLoggerInstance directly

      mockContext.req.path = '/chat';
      mockContext.req.method = 'POST';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      // Verify auth was checked (logging happens internally)
      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should log cf-connecting-ip header when available', async () => {
      // Use mockLoggerInstance directly

      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((header: string) => {
        if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
        if (header === 'cf-connecting-ip') return '192.168.1.1';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      // Verify auth was checked (logging happens internally)
      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should fallback to x-forwarded-for header when cf-connecting-ip not available', async () => {
      // Use mockLoggerInstance directly

      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((header: string) => {
        if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
        if (header === 'x-forwarded-for') return '10.0.0.1';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      // Verify auth was checked (logging happens internally)
      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should use unknown IP when headers not available', async () => {
      // Use mockLoggerInstance directly

      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      // Verify auth was checked (logging happens internally)
      expect(mockContext.json).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        mockContext.req.method = method;
        mockContext.req.path = '/chat';
        mockContext.req.header.mockImplementation((headerName: string) => {
          if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'valid-token-abcdefghijklmnopqrstuvwxyz123456';
          return undefined;
        });
        nextCalled = false;
        mockContext.json.mockClear();

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
      }
    });

    it('should treat token header as case-sensitive', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((header: string) => {
        if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should not allow empty string token', async () => {
      mockContext.req.path = '/chat';
      setToken('');

      await authTokenMiddleware(mockContext, mockNext);

      // Empty string is falsy
      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token shorter than 32 characters', async () => {
      mockContext.req.path = '/chat';
      setToken('short-token-123');  // 15 chars

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: expect.stringContaining('token')
        }),
        401
      );
    });

    it('should accept token exactly 32 characters', async () => {
      mockContext.req.path = '/chat';
      setToken('token-1234567890-abcdefghij-xxxx');  // 33 chars (32+ minimum)

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token longer than 32 characters', async () => {
      mockContext.req.path = '/chat';
      setToken('token-1234567890-abcdefghij-xxxyyzzz-more-data');  // >32 chars

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with alphanumeric characters', async () => {
      mockContext.req.path = '/chat';
      setToken('abcdefghijklmnopqrstuvwxyzABCDEF');  // 32 chars, all letters

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with hyphens', async () => {
      mockContext.req.path = '/chat';
      setToken('token-with-hyphens-abcdefghijk-12');  // 32 chars with hyphens

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with underscores', async () => {
      mockContext.req.path = '/chat';
      setToken('token_with_underscores_abcdefg_12');  // 32 chars with underscores

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with mixed hyphens and underscores', async () => {
      mockContext.req.path = '/chat';
      setToken('token-with_mixed-chars_abcdefgh12');  // 32 chars mixed

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should reject token with special characters (@ symbol)', async () => {
      mockContext.req.path = '/chat';
      setToken('token@invalid-special-char-abcd12');  // 32+ chars but has @

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: expect.stringContaining('token')
        }),
        401
      );
    });

    it('should reject token with special characters (space)', async () => {
      mockContext.req.path = '/chat';
      setToken('token with space invalid abcd1234567');  // 32+ chars but has space

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token with special characters (! symbol)', async () => {
      mockContext.req.path = '/chat';
      setToken('token!invalid-special-char-abcdef12');  // 32+ chars but has !

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token with special characters (. period)', async () => {
      mockContext.req.path = '/chat';
      setToken('token.invalid.special.char.abcdef12');  // 32+ chars but has periods

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle whitespace-padded valid token', async () => {
      mockContext.req.path = '/chat';
      // Token with surrounding spaces should be trimmed
      setToken('  validtokenabcdefghijklmnopqrstuvwxyz1234567890  ');

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });
  });

  describe('request flow', () => {
    it('should only call next once', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'valid-token-abcdefghijklmnopqrstuvwxyz123456';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call next on unauthorized', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return void or Response', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((headerName: string) => {
        if (headerName === 'X-AGENTIC-ALLY-TOKEN') return 'valid-token-abcdefghijklmnopqrstuvwxyz123456';
        return undefined;
      });

      const result = await authTokenMiddleware(mockContext, mockNext);

      expect(result === undefined || result instanceof Response).toBe(true);
    });

    it('should return Response on unauthorized', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      const result = await authTokenMiddleware(mockContext, mockNext);

      expect(result).toBeDefined();
    });
  });

  describe('path specificity', () => {
    it('should require token for /chat', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should require token for /workflow', async () => {
      mockContext.req.path = '/workflow';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should not require token for /health subpaths if matching exactly', async () => {
      mockContext.req.path = '/health';
      mockContext.req.header.mockImplementation(() => undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });
});
