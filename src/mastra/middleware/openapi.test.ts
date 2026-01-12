import { describe, it, expect, vi, beforeEach } from 'vitest';
import { disablePlayground, disableSwagger } from './openapi';
import { isDevelopment } from '../utils';

// Mock isDevelopment utility
vi.mock('../utils', () => ({
  isDevelopment: vi.fn(() => false),
}));

describe('openapi middleware', () => {
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
        path: '/allowed-path',
        method: 'GET',
      },
      res: {
        headers: new Headers(),
      },
      json: vi.fn((data, status) => {
        return new Response(JSON.stringify(data), { status });
      }),
      env: {},
    };

    // Reset isDevelopment mock
    vi.mocked(isDevelopment).mockReturnValue(false);
  });

  describe('disablePlayground function', () => {
    it('should exist', () => {
      expect(disablePlayground).toBeDefined();
    });

    it('should be async function', async () => {
      expect(disablePlayground.constructor.name).toBe('AsyncFunction');
    });

    it('should accept Context and Next parameters', async () => {
      await disablePlayground(mockContext, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('disablePlayground - development mode', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(true);
    });

    it('should allow access in development mode', async () => {
      mockContext.req.path = '/workflows';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /workflows in development', async () => {
      mockContext.req.path = '/workflows';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /tools in development', async () => {
      mockContext.req.path = '/tools';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /networks in development', async () => {
      mockContext.req.path = '/networks';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /agents in development', async () => {
      mockContext.req.path = '/agents';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow root / in development', async () => {
      mockContext.req.path = '/';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow any path in development', async () => {
      const paths = ['/chat', '/api/v1/data', '/custom', '/__refresh'];

      for (const path of paths) {
        mockContext.req.path = path;
        nextCalled = false;

        await disablePlayground(mockContext, mockNext);

        expect(nextCalled).toBe(true);
      }
    });
  });

  describe('disablePlayground - production mode', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should block /workflows path in production', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(result instanceof Response).toBe(true);
      expect(nextCalled).toBe(false);
    });

    it('should return 404 for /workflows', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should return 404 response with Not found message', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext) as Response;
      const text = await result.text();

      expect(text).toBe('Not found');
    });

    it('should block /tools path in production', async () => {
      mockContext.req.path = '/tools';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(nextCalled).toBe(false);
    });

    it('should return 404 for /tools', async () => {
      mockContext.req.path = '/tools';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should block /networks path in production', async () => {
      mockContext.req.path = '/networks';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(nextCalled).toBe(false);
    });

    it('should return 404 for /networks', async () => {
      mockContext.req.path = '/networks';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should block /agents path in production', async () => {
      mockContext.req.path = '/agents';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(nextCalled).toBe(false);
    });

    it('should return 404 for /agents', async () => {
      mockContext.req.path = '/agents';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should block root / path in production', async () => {
      mockContext.req.path = '/';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
      expect(nextCalled).toBe(false);
    });

    it('should return 404 for root /', async () => {
      mockContext.req.path = '/';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should allow other paths in production', async () => {
      mockContext.req.path = '/chat';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /api paths in production', async () => {
      mockContext.req.path = '/api/v1/data';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should check path prefix for /workflows', async () => {
      mockContext.req.path = '/workflows/123';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should check path prefix for /tools', async () => {
      mockContext.req.path = '/tools/list';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });
  });

  describe('disableSwagger object', () => {
    it('should exist', () => {
      expect(disableSwagger).toBeDefined();
    });

    it('should have handler property', () => {
      expect(disableSwagger).toHaveProperty('handler');
    });

    it('should have path property', () => {
      expect(disableSwagger).toHaveProperty('path');
    });

    it('should have path equals /swagger-ui', () => {
      expect(disableSwagger.path).toBe('/swagger-ui');
    });

    it('handler should be async function', async () => {
      expect(disableSwagger.handler.constructor.name).toBe('AsyncFunction');
    });

    it('handler should accept Context and Next parameters', async () => {
      const mockNextHandler = vi.fn(async () => { });
      await disableSwagger.handler(mockContext, mockNextHandler);
    });
  });

  describe('disableSwagger - development mode', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(true);
    });

    it('should allow access in development', async () => {
      const mockNextHandler = vi.fn(async () => { });

      await disableSwagger.handler(mockContext, mockNextHandler);

      expect(mockNextHandler).toHaveBeenCalled();
    });

    it('should call next in development', async () => {
      const mockNextHandler = vi.fn(async () => { });

      await disableSwagger.handler(mockContext, mockNextHandler);

      expect(mockNextHandler).toHaveBeenCalled();
    });

    it('should return void in development', async () => {
      const mockNextHandler = vi.fn(async () => { });

      const result = await disableSwagger.handler(mockContext, mockNextHandler);

      expect(result).toBeUndefined();
    });
  });

  describe('disableSwagger - production mode', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should block access in production', async () => {
      const mockNextHandler = vi.fn(async () => { });

      const result = await disableSwagger.handler(mockContext, mockNextHandler);

      expect(result).toBeDefined();
      expect(mockNextHandler).not.toHaveBeenCalled();
    });

    it('should return 404 in production', async () => {
      const mockNextHandler = vi.fn(async () => { });

      const result = await disableSwagger.handler(mockContext, mockNextHandler) as Response;

      expect(result.status).toBe(404);
    });

    it('should return Response in production', async () => {
      const mockNextHandler = vi.fn(async () => { });

      const result = await disableSwagger.handler(mockContext, mockNextHandler);

      expect(result instanceof Response).toBe(true);
    });

    it('should return Not found message', async () => {
      const mockNextHandler = vi.fn(async () => { });

      const result = await disableSwagger.handler(mockContext, mockNextHandler) as Response;
      const text = await result.text();

      expect(text).toBe('Not found');
    });
  });

  describe('playground paths blocking', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should block /workflows start', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should block /workflows with query string', async () => {
      mockContext.req.path = '/workflows?id=123';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should allow /other-path', async () => {
      mockContext.req.path = '/other-path';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /health', async () => {
      mockContext.req.path = '/health';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should allow /chat', async () => {
      mockContext.req.path = '/chat';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });

  describe('isDevelopment utility integration', () => {
    it('should call isDevelopment in disablePlayground', async () => {
      mockContext.req.path = '/chat';
      await disablePlayground(mockContext, mockNext);

      expect(isDevelopment).toHaveBeenCalled();
    });

    it('should call isDevelopment in disableSwagger', async () => {
      vi.mocked(isDevelopment).mockClear();

      const mockNextHandler = vi.fn(async () => { });
      await disableSwagger.handler(mockContext, mockNextHandler);

      expect(isDevelopment).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should handle paths with trailing slash', async () => {
      mockContext.req.path = '/workflows/';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should handle case-sensitive paths', async () => {
      mockContext.req.path = '/Workflows';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should handle /tools as prefix', async () => {
      mockContext.req.path = '/tools/123/details';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should handle /networks as prefix', async () => {
      mockContext.req.path = '/networks/abc/edit';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should handle /agents as prefix', async () => {
      mockContext.req.path = '/agents/xyz/config';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should distinguish /workspace from /workflows', async () => {
      mockContext.req.path = '/workspace';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });

    it('should block exactly / path', async () => {
      mockContext.req.path = '/';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should allow /api when path is /api', async () => {
      mockContext.req.path = '/api';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });

  describe('response properties', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should return Response with 404 status', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.status).toBe(404);
    });

    it('should return Response with status OK false', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext) as Response;

      expect(result.ok).toBe(false);
    });

    it('should have response body Not found', async () => {
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext) as Response;
      const text = await result.text();

      expect(text).toContain('Not found');
    });
  });

  describe('multiple requests', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should handle multiple blocked requests', async () => {
      const paths = ['/workflows', '/tools', '/networks', '/agents'];

      for (const path of paths) {
        mockContext.req.path = path;

        const result = await disablePlayground(mockContext, mockNext);

        expect(result).toBeDefined();
        expect((result as Response).status).toBe(404);
      }
    });

    it('should handle alternating allowed and blocked requests', async () => {
      mockContext.req.path = '/chat';
      nextCalled = false;

      await disablePlayground(mockContext, mockNext);
      expect(nextCalled).toBe(true);

      mockContext.req.path = '/workflows';
      nextCalled = false;

      const result = await disablePlayground(mockContext, mockNext);
      expect(result).toBeDefined();
      expect(nextCalled).toBe(false);
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      vi.mocked(isDevelopment).mockReturnValue(false);
    });

    it('should block GET /workflows', async () => {
      mockContext.req.method = 'GET';
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should block POST /workflows', async () => {
      mockContext.req.method = 'POST';
      mockContext.req.path = '/workflows';

      const result = await disablePlayground(mockContext, mockNext);

      expect(result).toBeDefined();
    });

    it('should allow GET /chat', async () => {
      mockContext.req.method = 'GET';
      mockContext.req.path = '/chat';

      await disablePlayground(mockContext, mockNext);

      expect(nextCalled).toBe(true);
    });
  });
});
