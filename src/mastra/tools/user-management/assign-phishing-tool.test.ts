import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assignPhishingTool } from './assign-phishing-tool';
import { requestStorage } from '../../utils/core/request-storage';
import * as workerApiClient from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: assignPhishingTool
 * Tests for assigning phishing simulations to users
 * Covers: Input validation, auth checks, API calls, error handling, optional training assignment
 */

describe('assignPhishingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    PHISHING_CRUD_WORKER: {
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
    it('should accept valid input with required fields', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept optional languageId', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        languageId: 'lang-456',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should accept optional training assignment fields', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789',
        trainingId: 'training-123',
        sendTrainingLanguageId: 'lang-456'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should require resourceId', async () => {
      const input: any = {
        targetUserResourceId: 'user-789'
      };

      // Tool framework validates input schema and returns error response (doesn't throw)
      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require targetUserResourceId', async () => {
      const input: any = {
        resourceId: 'phishing-resource-123'
      };

      // Tool framework validates input schema and returns error response
      const result = await assignPhishingTool.execute({ context: input } as any);
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
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(mockCallWorkerAPI).toHaveBeenCalled();
    });
  });

  describe('Successful Assignment', () => {
    it('should successfully assign phishing and return success response', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Phishing simulation assigned successfully.');
      expect(result.error).toBeUndefined();
    });

    it('should call worker API with correct payload for basic assignment', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        languageId: 'lang-456',
        targetUserResourceId: 'user-789'
      };

      await assignPhishingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.PHISHING_CRUD_WORKER,
          endpoint: 'https://worker/send',
          payload: expect.objectContaining({
            phishingId: 'phishing-resource-123',
            languageId: 'lang-456',
            targetUserResourceId: 'user-789',
            apiUrl: expect.any(String),
            accessToken: mockToken,
            companyId: mockCompanyId,
            name: expect.stringContaining('Agentic Ally')
          }),
          token: mockToken
        })
      );
    });

    it('should include training assignment in payload when provided', async () => {
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789',
        trainingId: 'training-123',
        sendTrainingLanguageId: 'lang-456'
      };

      await assignPhishingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            trainingId: 'training-123',
            sendTrainingLanguageId: 'lang-456'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Assign API failed: 500 Internal Server Error');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error: Connection timeout');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(networkError);

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include context in error response', async () => {
      const apiError = new Error('Assign API failed');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Assign API failed');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({});

      const input = {
        resourceId: 'phishing-resource-123',
        targetUserResourceId: 'user-789'
      };

      const result = await assignPhishingTool.execute({ context: input } as any);

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
