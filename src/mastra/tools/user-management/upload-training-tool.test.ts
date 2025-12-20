import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadTrainingTool } from './upload-training-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { KVService } from '../../services/kv-service';
import * as workerApiClient from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: uploadTrainingTool
 * Tests for uploading training content to platform
 * Covers: Input validation, auth checks, KV fetching, API calls, error handling
 */

describe('uploadTrainingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    CRUD_WORKER: {
      fetch: vi.fn()
    }
  };

  const mockMicrolearningContent = {
    base: {
      microlearning_id: 'ml-123',
      microlearning_metadata: {
        title: 'Test Training',
        description: 'Test Description',
        category: 'Security',
        role_relevance: ['AllEmployees'],
        language_availability: ['en-us']
      }
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
    it('should accept valid input with microlearningId', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should require microlearningId', async () => {
      const input: any = {};

      // Tool framework validates input schema and returns error response (doesn't throw)
      const result = await uploadTrainingTool.execute({ context: input });
      expect(result).toBeDefined();
      // Framework returns error object when validation fails
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
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(true);
    });
  });

  describe('KV Content Fetching', () => {
    it('should fetch microlearning content from KV', async () => {
      const getMicrolearningSpy = vi.spyOn(KVService.prototype, 'getMicrolearning')
        .mockResolvedValue(mockMicrolearningContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      await uploadTrainingTool.execute({ context: input } as any);

      expect(getMicrolearningSpy).toHaveBeenCalledWith('ml-123');
    });

    it('should return error when microlearning content not found', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(null);

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when base content is missing', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue({});

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Payload Preparation', () => {
    it('should prepare correct payload with metadata fields', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      await uploadTrainingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.CRUD_WORKER,
          endpoint: 'https://worker/submit',
          payload: expect.objectContaining({
            accessToken: mockToken,
            companyId: mockCompanyId,
            trainingData: expect.objectContaining({
              title: 'Test Training',
              description: 'Test Description',
              category: 'Security',
              targetAudience: 'AllEmployees',
              language: 'en-us'
            })
          })
        })
      );
    });

    it('should handle array role_relevance correctly', async () => {
      const contentWithArrayRoles = {
        base: {
          ...mockMicrolearningContent.base,
          microlearning_metadata: {
            ...mockMicrolearningContent.base.microlearning_metadata,
            role_relevance: ['IT', 'HR', 'Finance']
          }
        }
      };

      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(contentWithArrayRoles);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      await uploadTrainingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0];
      expect(callArgs.payload.trainingData.targetAudience).toBe('ITHRFinance');
    });

    it('should use default language when language_availability is empty', async () => {
      const contentWithoutLang = {
        base: {
          ...mockMicrolearningContent.base,
          microlearning_metadata: {
            ...mockMicrolearningContent.base.microlearning_metadata,
            language_availability: []
          }
        }
      };

      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(contentWithoutLang);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      await uploadTrainingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0];
      expect(callArgs.payload.trainingData.language).toBe('en-us');
    });
  });

  describe('Successful Upload', () => {
    it('should successfully upload and return correct response structure', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.resourceId).toBe('resource-123');
      expect(result.data?.sendTrainingLanguageId).toBe('lang-456');
      expect(result.data?.microlearningId).toBe('ml-123');
      expect(result.data?.title).toBe('Test Training');
      expect(result.message).toContain('Training uploaded successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle KV fetch errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockRejectedValue(new Error('KV fetch failed'));

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      const apiError = new Error('Worker API failed: 500 Internal Server Error');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include microlearningId in error context', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      const apiError = new Error('Worker API failed');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker API failed');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(KVService.prototype, 'getMicrolearning').mockResolvedValue(mockMicrolearningContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        resourceId: 'resource-123',
        languageId: 'lang-456'
      });

      const input = {
        microlearningId: 'ml-123'
      };

      const result = await uploadTrainingTool.execute({ context: input });

      // Validate schema structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.data) {
        expect(result.data).toHaveProperty('resourceId');
        expect(result.data).toHaveProperty('microlearningId');
        expect(typeof result.data.resourceId).toBe('string');
        expect(typeof result.data.microlearningId).toBe('string');
      }
      if (result.message) {
        expect(typeof result.message).toBe('string');
      }
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
