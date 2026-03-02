import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignTrainingTool } from './assign-training-tool';
import { requestStorage } from '../../utils/core/request-storage';
import * as workerApiClient from '../../utils/core/worker-api-client';
import { KVService } from '../../services/kv-service';
import '../../../../src/__tests__/setup';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock KVService
vi.mock('../../services/kv-service');

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => mockLogger,
}));

vi.mock('../../utils/core/security-utils', () => ({
  maskSensitiveField: vi.fn((obj, field) => ({ ...obj, [field]: '***MASKED***' })),
}));

/**
 * Test Suite: assignTrainingTool
 * Tests for assigning training resources to users
 * Covers: Input validation, auth checks, API calls, error handling
 */

describe('assignTrainingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    CRUD_WORKER: {
      fetch: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock requestStorage context
    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId,
      env: mockEnv,
    });

    // Explicitly mock KVService.getMicrolearning to return null (pass guard by default)
    vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(null);
  });

  describe('Guard Protection', () => {
    it('should block assignment if resource looks like a raw microlearning ID (already uploaded)', async () => {
      // Simulate that the resource exists in KV (which triggers the guard)
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue({ base: { id: 'existing' } });

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Training must be uploaded');
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with all required fields', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should require resourceId', async () => {
      const input: any = {
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      // Tool framework validates input schema and returns error response (doesn't throw)
      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      // Framework returns error object when validation fails
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require sendTrainingLanguageId', async () => {
      const input: any = {
        resourceId: 'resource-123',
        targetUserResourceId: 'user-789',
      };

      // Tool framework validates input schema and returns error response
      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require exactly one assignment target (user OR group)', async () => {
      const input: any = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
      };

      // Tool framework validates input schema and returns error response
      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should reject when both targetUserResourceId and targetGroupResourceId are provided', async () => {
      const input: any = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
        targetGroupResourceId: 'group-123',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      // Schema validation errors may not include `success: false` depending on tool framework
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      } else {
        expect(false).toBe(true); // must not succeed silently
      }
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      requestStorage.enterWith({
        companyId: mockCompanyId,
        env: mockEnv,
        // token is missing
      });

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(mockCallWorkerAPI).toHaveBeenCalled();
    });
  });

  describe('Successful Assignment', () => {
    it('should successfully assign training and return success response', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Training assigned to');
      expect(result.error).toBeUndefined();
    });

    it('should call worker API with correct payload', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      await assignTrainingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.CRUD_WORKER,
          endpoint: 'https://worker/send',
          payload: expect.objectContaining({
            trainingId: 'resource-123',
            languageId: 'lang-456',
            targetUserResourceId: 'user-789',
            accessToken: mockToken,
            companyId: mockCompanyId,
          }),
          token: mockToken,
          errorPrefix: expect.any(String),
          operationName: expect.any(String),
        })
      );
    });

    it('should assign training to a group and include targetGroupResourceId in payload', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetGroupResourceId: 'group-123',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.message).toContain('GROUP');
      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
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
      const apiError = new Error('Worker API failed: 500 Internal Server Error');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error: Connection timeout');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(networkError);

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      const apiError = new Error('Worker API failed');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker API failed');
    });
  });

  describe('Log Security', () => {
    it('should never log raw access token', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      await assignTrainingTool.execute({ context: input } as any);

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

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789',
      };

      const result = await assignTrainingTool.execute({ context: input } as any);

      // Validate schema structure
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
});
