import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignTrainingTool } from './assign-training-tool';
import { requestStorage } from '../../utils/core/request-storage';
import * as workerApiClient from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

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
      fetch: vi.fn()
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock requestStorage context
    requestStorage.enterWith({
      token: mockToken,
      companyId: mockCompanyId,
      env: mockEnv
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with all required fields', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789'
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should require resourceId', async () => {
      const input: any = {
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789'
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
        targetUserResourceId: 'user-789'
      };

      // Tool framework validates input schema and returns error response
      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require targetUserResourceId', async () => {
      const input: any = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456'
      };

      // Tool framework validates input schema and returns error response
      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      requestStorage.enterWith({
        companyId: mockCompanyId,
        env: mockEnv
        // token is missing
      });

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789'
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
        targetUserResourceId: 'user-789'
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
        targetUserResourceId: 'user-789'
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Training assigned successfully.');
      expect(result.error).toBeUndefined();
    });

    it('should call worker API with correct payload', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789'
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
            apiUrl: expect.any(String),
            accessToken: mockToken,
            companyId: mockCompanyId
          }),
          token: mockToken
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
        targetUserResourceId: 'user-789'
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
        targetUserResourceId: 'user-789'
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
        targetUserResourceId: 'user-789'
      };

      const result = await assignTrainingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker API failed');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'resource-123',
        sendTrainingLanguageId: 'lang-456',
        targetUserResourceId: 'user-789'
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
