import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gdprAuditMiddleware } from './gdpr-audit';

const mockLogDataAccess = vi.fn().mockResolvedValue(undefined);
const mockGetRequestContext = vi.fn();

vi.mock('../services/gdpr-service', () => ({
  logDataAccess: (...args: unknown[]) => mockLogDataAccess(...args),
}));

vi.mock('../utils/core/request-storage', () => ({
  getRequestContext: () => mockGetRequestContext(),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

function createMockContext(path: string, method: string, status = 200) {
  return {
    req: { path, method },
    res: { status },
    env: {},
  } as any;
}

describe('gdprAuditMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockReturnValue({ companyId: 'company-123' });
  });

  describe('non-personal-data paths', () => {
    it('should call next() without auditing for /health', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/health', 'GET');
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).not.toHaveBeenCalled();
    });

    it('should call next() without auditing for /audit/verify', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/audit/verify', 'GET');
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).not.toHaveBeenCalled();
    });
  });

  describe('personal-data paths', () => {
    it('should audit /chat POST with initiatedBy user', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/chat', 'POST');
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          companyId: 'company-123',
          action: 'CREATE',
          details: expect.objectContaining({ path: '/chat', method: 'POST' }),
          initiatedBy: 'user',
        })
      );
    });

    it('should audit /api/user GET', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'GET', 200);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          companyId: 'company-123',
          action: 'READ',
          resourceType: 'USER_PII',
          details: expect.objectContaining({ path: '/api/user', method: 'GET', status: 200 }),
          initiatedBy: 'system',
        })
      );
    });

    it('should audit /api/assign POST', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/assign', 'POST', 200);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          companyId: 'company-123',
          action: 'CREATE',
          resourceType: 'CAMPAIGN_DATA',
          details: expect.objectContaining({ path: '/api/assign', method: 'POST', status: 200 }),
        })
      );
    });

    it('should audit /api/upload POST', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/upload', 'POST', 201);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'CREATE',
          resourceType: 'CAMPAIGN_DATA',
        })
      );
    });

    it('should audit /api/target-group GET', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/target-group', 'GET', 200);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).toHaveBeenCalled();
    });
  });

  describe('error responses (4xx/5xx)', () => {
    it('should NOT audit when response status is 400', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'GET', 400);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).not.toHaveBeenCalled();
    });

    it('should NOT audit when response status is 401', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'GET', 401);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).not.toHaveBeenCalled();
    });

    it('should NOT audit when response status is 500', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'POST', 500);
      await gdprAuditMiddleware(c, next);
      expect(next).toHaveBeenCalled();
      expect(mockLogDataAccess).not.toHaveBeenCalled();
    });
  });

  describe('request context', () => {
    it('should use unknown companyId when context has no companyId', async () => {
      mockGetRequestContext.mockReturnValue({});
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'GET', 200);
      await gdprAuditMiddleware(c, next);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ companyId: 'unknown' })
      );
    });
  });

  describe('method to action mapping', () => {
    it('should map OPTIONS to READ (default)', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'OPTIONS', 200);
      await gdprAuditMiddleware(c, next);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'READ' })
      );
    });

    it('should map PUT to UPDATE', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user/123', 'PUT', 200);
      await gdprAuditMiddleware(c, next);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'UPDATE' })
      );
    });

    it('should map DELETE to DELETE', async () => {
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user/123', 'DELETE', 200);
      await gdprAuditMiddleware(c, next);
      expect(mockLogDataAccess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'DELETE' })
      );
    });
  });

  describe('error handling', () => {
    it('should not throw when getRequestContext throws', async () => {
      mockGetRequestContext.mockImplementation(() => {
        throw new Error('Context unavailable');
      });
      const next = vi.fn(async () => {});
      const c = createMockContext('/api/user', 'GET', 200);
      await expect(gdprAuditMiddleware(c, next)).resolves.not.toThrow();
      expect(next).toHaveBeenCalled();
    });
  });
});
