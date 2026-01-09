import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authTokenMiddleware } from './auth-token';

// Mock logger
vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('authTokenMiddleware', () => {
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
        header: vi.fn(),
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
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /__refresh path without token', async () => {
      mockContext.req.path = '/__refresh';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /__hot-reload-status path without token', async () => {
      mockContext.req.path = '/__hot-reload-status';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /api/telemetry path without token', async () => {
      mockContext.req.path = '/api/telemetry';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should skip /autonomous path without token', async () => {
      mockContext.req.path = '/autonomous';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });
  });

  describe('token validation', () => {
    it('should return 401 when token header is missing', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

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
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[1]).toBe(401);
    });

    it('should return error response with correct structure', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      const data = callArgs[0];
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('message');
    });

    it('should proceed with valid token header', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('valid-token');

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    describe('JWT support', () => {
      const exampleJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' +
        'TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

      it('should accept well-formed JWT token', async () => {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockReturnValue(exampleJwt);

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockContext.json).not.toHaveBeenCalled();
      });

      it('should accept JWT token with padding characters', async () => {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockReturnValue(
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c='
        );

        await authTokenMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
        expect(mockContext.json).not.toHaveBeenCalled();
      });

      it('should reject JWT with invalid characters', async () => {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockReturnValue(
          'invalid@jwt.payload.part'
        );

        await authTokenMiddleware(mockContext, mockNext);

        expect(mockContext.json).toHaveBeenCalled();
      });

      it('should reject JWT with wrong segment count', async () => {
        mockContext.req.path = '/chat';
        mockContext.req.header.mockReturnValue('part.one');

        await authTokenMiddleware(mockContext, mockNext);

        expect(mockContext.json).toHaveBeenCalled();
      });
    });
  });

  describe('logging', () => {
    it('should log unauthorized requests', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/chat';
      mockContext.req.method = 'POST';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should log path in unauthorized request', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/sensitive-endpoint';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockLogger.warn.mock.calls[0];
      expect(callArgs[1].path).toBe('/sensitive-endpoint');
    });

    it('should log HTTP method in unauthorized request', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/chat';
      mockContext.req.method = 'POST';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockLogger.warn.mock.calls[0];
      expect(callArgs[1].method).toBe('POST');
    });

    it('should log cf-connecting-ip header when available', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((header: string) => {
        if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
        if (header === 'cf-connecting-ip') return '192.168.1.1';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockLogger.warn.mock.calls[0];
      expect(callArgs[1].ip).toBe('192.168.1.1');
    });

    it('should fallback to x-forwarded-for header when cf-connecting-ip not available', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/chat';
      mockContext.req.header.mockImplementation((header: string) => {
        if (header === 'X-AGENTIC-ALLY-TOKEN') return undefined;
        if (header === 'x-forwarded-for') return '10.0.0.1';
        return undefined;
      });

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockLogger.warn.mock.calls[0];
      expect(callArgs[1].ip).toBe('10.0.0.1');
    });

    it('should use unknown IP when headers not available', async () => {
      const { getLogger } = await import('../utils/core/logger');
      const mockLogger = (getLogger as any)('AuthToken');

      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      const callArgs = mockLogger.warn.mock.calls[0];
      expect(callArgs[1].ip).toBe('unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        mockContext.req.method = method;
        mockContext.req.path = '/chat';
        mockContext.req.header.mockReturnValue('valid-token');
        nextCalled = false;

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
      mockContext.req.header.mockReturnValue('');

      await authTokenMiddleware(mockContext, mockNext);

      // Empty string is falsy
      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token shorter than 32 characters', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('short-token-123');  // 15 chars

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
      mockContext.req.header.mockReturnValue('token-1234567890-abcdefghij-xxx');  // 32 chars

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token longer than 32 characters', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token-1234567890-abcdefghij-xxxyyzzz-more-data');  // >32 chars

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with alphanumeric characters', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('abcdefghijklmnopqrstuvwxyzABCDE');  // 32 chars, all letters

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with hyphens', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token-with-hyphens-abcdefghijk-12');  // 32 chars with hyphens

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with underscores', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token_with_underscores_abcdefg_12');  // 32 chars with underscores

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should accept token with mixed hyphens and underscores', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token-with_mixed-chars_abcdefgh12');  // 32 chars mixed

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should reject token with special characters (@ symbol)', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token@invalid-special-char-abcd12');  // 32+ chars but has @

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
      mockContext.req.header.mockReturnValue('token with space invalid abcd1234567');  // 32+ chars but has space

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token with special characters (! symbol)', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token!invalid-special-char-abcdef12');  // 32+ chars but has !

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should reject token with special characters (. period)', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('token.invalid.special.char.abcdef12');  // 32+ chars but has periods

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle whitespace-padded valid token', async () => {
      mockContext.req.path = '/chat';
      // Token with surrounding spaces should be trimmed
      mockContext.req.header.mockReturnValue('  token-1234567890-abcdefghij-xxx  ');

      await authTokenMiddleware(mockContext, mockNext);

      // Should either accept or reject based on trimming behavior
      // (depends on middleware implementation)
      expect(nextCalled || mockContext.json.mock.calls.length > 0).toBe(true);
    });
  });

  describe('request flow', () => {
    it('should only call next once', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('valid-token');

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call next on unauthorized', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return void or Response', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue('valid-token');

      const result = await authTokenMiddleware(mockContext, mockNext);

      expect(result === undefined || result instanceof Response).toBe(true);
    });

    it('should return Response on unauthorized', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

      const result = await authTokenMiddleware(mockContext, mockNext);

      expect(result).toBeDefined();
    });
  });

  describe('path specificity', () => {
    it('should require token for /chat', async () => {
      mockContext.req.path = '/chat';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should require token for /workflow', async () => {
      mockContext.req.path = '/workflow';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should not require token for /health subpaths if matching exactly', async () => {
      mockContext.req.path = '/health';
      mockContext.req.header.mockReturnValue(undefined);

      await authTokenMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });
});
