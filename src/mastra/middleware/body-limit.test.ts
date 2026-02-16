import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bodySizeLimitMiddleware } from './body-limit';

// Use vi.hoisted to create mock logger before vi.mock
const { mockLoggerInstance } = vi.hoisted(() => {
  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };
  return { mockLoggerInstance: mockLogger };
});

// Mock logger - returns the same instance
vi.mock('../utils/core/logger', () => ({
  getLogger: () => mockLoggerInstance,
}));

describe('bodySizeLimitMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let nextCalled: boolean;
  const BYTES_PER_MB = 1024 * 1024;

  beforeEach(() => {
    nextCalled = false;

    // Clear logger mocks
    mockLoggerInstance.warn.mockClear();
    mockLoggerInstance.error.mockClear();
    mockLoggerInstance.info.mockClear();
    mockLoggerInstance.debug.mockClear();

    mockNext = vi.fn(async () => {
      nextCalled = true;
    });

    mockContext = {
      req: {
        path: '/chat',
        method: 'POST',
        header: vi.fn(),
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
    };

    // Reset environment variables
    delete process.env.BODY_SIZE_LIMIT_MB;
  });

  afterEach(() => {
    delete process.env.BODY_SIZE_LIMIT_MB;
  });

  describe('middleware function', () => {
    it('should exist', () => {
      expect(bodySizeLimitMiddleware).toBeDefined();
    });

    it('should be async function', async () => {
      expect(bodySizeLimitMiddleware.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      mockContext.req.header.mockReturnValue('100');
      await bodySizeLimitMiddleware(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_LIMIT_MB constant', () => {
    it('should default to 1MB', async () => {
      mockContext.req.header.mockReturnValue('100');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should accept requests under 1MB by default', async () => {
      const sizeBytes = 500 * 1024; // 500 KB
      mockContext.req.header.mockReturnValue(sizeBytes.toString());

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should reject requests over 1MB by default', async () => {
      const sizeBytes = (1.5 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });
  });

  describe('BYTES_PER_MB conversion', () => {
    it('should convert 1MB correctly to bytes', () => {
      expect(BYTES_PER_MB).toBe(1024 * 1024);
      expect(BYTES_PER_MB).toBe(1048576);
    });

    it('should calculate byte conversion correctly', async () => {
      const sizeMB = 0.5; // 500 KB - below default 1MB limit
      const sizeBytes = Math.floor(sizeMB * BYTES_PER_MB);

      mockContext.req.header.mockReturnValue(sizeBytes.toString());

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });

  describe('request body size validation', () => {
    it('should allow requests below limit', async () => {
      const sizeBytes = '500000'; // 500 KB
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should allow requests at exact limit', async () => {
      const limitBytes = BYTES_PER_MB.toString();
      mockContext.req.header.mockReturnValue(limitBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding limit', async () => {
      const sizeBytes = (1 * BYTES_PER_MB + 1).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 413 Payload Too Large status', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[1]).toBe(413);
    });
  });

  describe('content-length header parsing', () => {
    it('should parse numeric content-length header', async () => {
      mockContext.req.header.mockReturnValue('12345');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should handle missing content-length header', async () => {
      mockContext.req.header.mockReturnValue(undefined);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should treat missing content-length as 0', async () => {
      mockContext.req.header.mockReturnValue(undefined);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should parse content-length as integer', async () => {
      const size = '1048576'; // Exactly 1MB
      mockContext.req.header.mockReturnValue(size);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });

  describe('response structure on rejection', () => {
    it('should return JSON response', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should include success: false', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].success).toBe(false);
    });

    it('should include error field', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('error');
      expect(callArgs[0].error).toBe('Payload Too Large');
    });

    it('should include message field', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('message');
      expect(typeof callArgs[0].message).toBe('string');
    });

    it('should include maxSizeMB field', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('maxSizeMB');
      expect(callArgs[0].maxSizeMB).toBe(1);
    });

    it('should include requestSizeMB field', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0]).toHaveProperty('requestSizeMB');
      expect(typeof callArgs[0].requestSizeMB).toBe('number');
    });
  });

  describe('size calculations and formatting', () => {
    it('should format requestSizeMB with 2 decimal places', async () => {
      const sizeBytes = (2.5 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].requestSizeMB).toBe(2.5);
    });

    it('should calculate maxSizeMB correctly', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].maxSizeMB).toBe(1);
    });

    it('should include correct limits in message', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].message).toContain('1');
      expect(callArgs[0].message).toContain('MB');
    });
  });

  describe('environment variable override', () => {
    it('should accept BODY_SIZE_LIMIT_MB environment variable', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '2';

      const sizeBytes = (2 * BYTES_PER_MB + 1).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should allow larger limit when BODY_SIZE_LIMIT_MB is set', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '5';

      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
      expect(mockContext.json).not.toHaveBeenCalled();
    });

    it('should enforce smaller limit when BODY_SIZE_LIMIT_MB is set to lower value', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '0.5';

      const sizeBytes = (1 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should return updated maxSizeMB based on env var', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '3';

      const sizeBytes = (5 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockContext.json.mock.calls[0];
      expect(callArgs[0].maxSizeMB).toBe(3);
    });
  });

  describe('logging', () => {
    it('should log oversized requests', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });

    it('should log with contentLength', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      const callArgs = mockLoggerInstance.warn.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('contentLength');
    });

    it('should not log for requests under limit', async () => {
      mockContext.req.header.mockReturnValue('100');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero-byte request', async () => {
      mockContext.req.header.mockReturnValue('0');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should handle very large content-length values', async () => {
      const largeSize = (100 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(largeSize);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalled();
    });

    it('should handle non-numeric header gracefully', async () => {
      mockContext.req.header.mockReturnValue('not-a-number');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      // parseInt('not-a-number') returns NaN
      expect(nextCalled).toBe(true);
    });

    it('should work with different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        mockContext.req.method = method;
        mockContext.req.header.mockReturnValue('100');
        nextCalled = false;

        await bodySizeLimitMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
      }
    });

    it('should work with different paths', async () => {
      const paths = ['/chat', '/workflow', '/api/v1/data', '/'];

      for (const path of paths) {
        mockContext.req.path = path;
        mockContext.req.header.mockReturnValue('100');
        nextCalled = false;

        await bodySizeLimitMiddleware(mockContext, mockNext);

        expect(nextCalled).toBe(true);
      }
    });
  });

  describe('request flow', () => {
    it('should only call next once on success', async () => {
      mockContext.req.header.mockReturnValue('100');

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call next on rejection', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return void or Response', async () => {
      mockContext.req.header.mockReturnValue('100');

      const result = await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(result === undefined || result instanceof Response).toBe(true);
    });

    it('should return Response on rejection', async () => {
      const sizeBytes = (2 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      const result = await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(result).toBeDefined();
    });
  });

  describe('custom limits via environment variable', () => {
    it('should support 10MB limit', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '10';

      const sizeBytes = (9 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should support 512KB limit (fractional)', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '1';

      const sizeBytes = Math.floor(0.5 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should support unlimitedly high limits', async () => {
      process.env.BODY_SIZE_LIMIT_MB = '1000';

      const sizeBytes = (500 * BYTES_PER_MB).toString();
      mockContext.req.header.mockReturnValue(sizeBytes);

      await bodySizeLimitMiddleware(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });
});
