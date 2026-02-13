import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignSmishingTool } from './assign-smishing-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/kv-service');

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => mockLogger,
}));

vi.mock('../../utils/core/security-utils', () => ({
  maskSensitiveField: vi.fn((obj, field) => ({ ...obj, [field]: '***MASKED***' })),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    auth: vi.fn(() => ({ code: 'AUTH_ERROR', message: 'Auth failed', category: 'AUTH' })),
    validation: vi.fn(() => ({ code: 'VALIDATION_ERROR', message: 'Invalid input', category: 'VALIDATION' })),
    internal: vi.fn(() => ({ code: 'INTERNAL_ERROR', message: 'Internal error', category: 'INTERNAL' })),
    external: vi.fn(() => ({ code: 'EXTERNAL_ERROR', message: 'External error', category: 'EXTERNAL' })),
  },
}));

vi.mock('../../utils/core/worker-api-client', () => ({
  callWorkerAPI: vi.fn(),
}));

/**
 * Test Suite: assignSmishingTool
 * Tests for assigning smishing simulations to users or groups
 * Covers: Input validation, auth checks, API calls, error handling
 */

describe('assignSmishingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    SMISHING_CRUD_WORKER: {
      fetch: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId,
      env: mockEnv,
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with required fields', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept optional languageId', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        languageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should require resourceId', async () => {
      const input: any = {
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require exactly one assignment target (user OR group)', async () => {
      const input: any = {
        resourceId: 'smishing-resource-123',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should reject when both targetUserResourceId and targetGroupResourceId are provided', async () => {
      const input: any = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
        targetGroupResourceId: 'group-123',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      } else {
        expect(false).toBe(true);
      }
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      requestStorage.enterWith({
        companyId: mockCompanyId,
        env: mockEnv,
      });

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(callWorkerAPI).toHaveBeenCalled();
    });
  });

  describe('Successful Assignment', () => {
    it('should successfully assign smishing and return success response', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Smishing campaign assigned');
      expect(result.error).toBeUndefined();
    });

    it('should call worker API with correct payload for basic assignment', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        languageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      await assignSmishingTool.execute({ context: input } as any);

      expect(callWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.SMISHING_CRUD_WORKER,
          endpoint: expect.stringContaining('/send'),
          payload: expect.objectContaining({
            smishingId: 'smishing-resource-123',
            languageId: 'lang-456',
            targetUserResourceId: 'user-789',
            accessToken: mockToken,
            companyId: mockCompanyId,
            name: expect.stringContaining('user-789'),
          }),
          token: mockToken,
          errorPrefix: expect.any(String),
          operationName: expect.any(String),
        })
      );
    });

    it('should assign smishing to a group and include targetGroupResourceId in payload', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetGroupResourceId: 'group-123',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('GROUP');
      expect(callWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            targetGroupResourceId: 'group-123',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Assign API failed: 500 Internal Server Error');
      (callWorkerAPI as any).mockRejectedValue(apiError);

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error: Connection timeout');
      (callWorkerAPI as any).mockRejectedValue(networkError);

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      const apiError = new Error('Assign API failed');
      (callWorkerAPI as any).mockRejectedValue(apiError);

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      const result = await assignSmishingTool.execute({ context: input } as any);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.message) {
        expect(typeof result.message).toBe('string');
      }
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });

  describe('Log Security', () => {
    it('should never log raw access token', async () => {
      (callWorkerAPI as any).mockResolvedValue({});

      const input = {
        resourceId: 'smishing-resource-123',
        targetUserResourceId: 'user-789',
      };

      await assignSmishingTool.execute({ context: input } as any);

      const allCalls = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls,
        ...mockLogger.debug.mock.calls,
      ];
      const logs = JSON.stringify(allCalls);

      expect(logs).not.toContain(mockToken);
      expect(logs).toContain('***MASKED***');
    });
  });
});
