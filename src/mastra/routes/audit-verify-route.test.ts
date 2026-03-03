import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditVerifyHandler } from './audit-verify-route';

const mockVerifyAuditChain = vi.fn();

vi.mock('../services/gdpr-service', () => ({
  verifyAuditChain: (...args: unknown[]) => mockVerifyAuditChain(...args),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    name: (err as Error)?.name ?? 'Error',
    message: (err as Error)?.message ?? 'Unknown error',
    stack: (err as Error)?.stack,
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    internal: vi.fn((msg: string, ctx?: object) => ({ message: msg, ...ctx })),
  },
}));

function createMockContext(companyId: string | undefined, env: Record<string, unknown> = {}) {
  const jsonFn = vi.fn();
  return {
    req: {
      header: (name: string) => (name === 'X-COMPANY-ID' ? companyId : undefined),
    },
    env,
    json: jsonFn,
  } as any;
}

describe('auditVerifyHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validation', () => {
    it('should return 401 when X-COMPANY-ID is missing', async () => {
      const c = createMockContext(undefined);
      await auditVerifyHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Company ID required' },
        401
      );
      expect(mockVerifyAuditChain).not.toHaveBeenCalled();
    });

    it('should return 401 when X-COMPANY-ID is empty string', async () => {
      const c = createMockContext('');
      await auditVerifyHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Company ID required' },
        401
      );
      expect(mockVerifyAuditChain).not.toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should return 200 with verification result when chain is valid', async () => {
      mockVerifyAuditChain.mockResolvedValue({
        valid: true,
        totalRows: 10,
        verifiedRows: 10,
        firstBrokenAt: null,
        brokenRowId: null,
        concurrentWrites: 0,
      });

      const c = createMockContext('company-abc', { agentic_ally_memory: {} });
      await auditVerifyHandler(c);

      expect(mockVerifyAuditChain).toHaveBeenCalledWith({ agentic_ally_memory: {} }, 'company-abc');
      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          valid: true,
          totalRows: 10,
          verifiedRows: 10,
          firstBrokenAt: null,
          brokenRowId: null,
          concurrentWrites: 0,
        },
        200
      );
    });

    it('should return 200 with valid: false when chain is broken', async () => {
      mockVerifyAuditChain.mockResolvedValue({
        valid: false,
        totalRows: 5,
        verifiedRows: 3,
        firstBrokenAt: 3,
        brokenRowId: 'row-uuid-123',
        concurrentWrites: 0,
      });

      const c = createMockContext('company-xyz');
      await auditVerifyHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          valid: false,
          totalRows: 5,
          verifiedRows: 3,
          firstBrokenAt: 3,
          brokenRowId: 'row-uuid-123',
          concurrentWrites: 0,
        },
        200
      );
    });
  });

  describe('error handling', () => {
    it('should return 500 when verifyAuditChain throws', async () => {
      mockVerifyAuditChain.mockRejectedValue(new Error('D1 connection failed'));

      const c = createMockContext('company-err');
      await auditVerifyHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Verification failed' },
        500
      );
    });
  });
});
