import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadSmishingTool } from './upload-smishing-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { KVService } from '../../services/kv-service';
import * as workerApiClient from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: uploadSmishingTool
 * Tests for uploading smishing content to platform
 * Covers: Input validation, auth checks, KV fetching, API calls, error handling, resource ID mapping
 */

describe('uploadSmishingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    SMISHING_CRUD_WORKER: {
      fetch: vi.fn()
    }
  };

  const mockSmishingContent = {
    base: {
      smishing_id: 'smishing-123',
      name: 'Test Smishing Campaign',
      description: 'Test Description',
      topic: 'Security',
      difficulty: 'medium',
      method: 'data-submission',
      language_availability: ['en-gb']
    },
    sms: {
      messages: ['Test message 1', 'Test message 2'],
    },
    landing: {
      url: 'https://example.com',
      content: 'Landing page content'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(requestStorage, 'getStore').mockReturnValue({
      token: mockToken,
      companyId: mockCompanyId,
      env: mockEnv
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with smishingId', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        scenarioResourceId: 'scenario-123',
        scenarioId: 2,
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should require smishingId', async () => {
      const input: any = {};

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Authentication', () => {
    it('should return error when token is missing', async () => {
      vi.spyOn(requestStorage, 'getStore').mockReturnValue({
        companyId: mockCompanyId,
        env: mockEnv
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('KV Content Fetching', () => {
    it('should fetch smishing content from KV with smishing namespace', async () => {
      const getSmishingSpy = vi.spyOn(KVService.prototype, 'getSmishing')
        .mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      await uploadSmishingTool.execute({ context: input } as any);

      expect(getSmishingSpy).toHaveBeenCalledWith('smishing-123');
    });

    it('should return error when smishing content not found', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(null);

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when base content is missing', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue({});

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Payload Preparation', () => {
    it('should prepare correct payload with base metadata fields', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      await uploadSmishingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.SMISHING_CRUD_WORKER,
          endpoint: 'https://worker/submit',
          payload: expect.objectContaining({
            accessToken: mockToken,
            companyId: mockCompanyId,
            smishingData: expect.objectContaining({
              name: 'Test Smishing Campaign',
              description: 'Test Description',
              topic: 'Security',
              difficulty: 'medium',
              method: 'data-submission',
              language: 'en-gb',
              sms: expect.objectContaining({
                messages: expect.any(Array),
              }),
              landingPage: expect.objectContaining({
                url: 'https://example.com'
              })
            })
          })
        })
      );
    });

    it('should use default language when language_availability is empty', async () => {
      const contentWithoutLang = {
        ...mockSmishingContent,
        base: {
          ...mockSmishingContent.base,
          language_availability: []
        }
      };

      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(contentWithoutLang);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      await uploadSmishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0] as any;
      expect(callArgs.payload.smishingData.language).toBe('en-gb');
    });

    it('should handle missing sms content gracefully', async () => {
      const contentWithoutSms = {
        ...mockSmishingContent,
        sms: undefined
      };

      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(contentWithoutSms);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      await uploadSmishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0] as any;
      expect(callArgs.payload.smishingData.sms).toBeUndefined();
    });

    it('should handle missing landing content gracefully', async () => {
      const contentWithoutLanding = {
        ...mockSmishingContent,
        landing: undefined
      };

      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(contentWithoutLanding);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      await uploadSmishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0] as any;
      expect(callArgs.payload.smishingData.landingPage).toBeUndefined();
    });
  });

  describe('Resource ID Mapping', () => {
    it('should prefer scenarioResourceId over templateResourceId for assignment', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        scenarioResourceId: 'scenario-123',
        scenarioId: 2,
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data?.resourceId).toBe('scenario-123');
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.scenarioResourceId).toBe('scenario-123');
    });

    it('should fallback to templateResourceId when scenarioResourceId is missing', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data?.resourceId).toBe('template-123');
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.scenarioResourceId).toBeNull();
    });
  });

  describe('Successful Upload', () => {
    it('should successfully upload and return correct response structure', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        landingPageResourceId: 'landing-123',
        landingPageId: 3,
        scenarioResourceId: 'scenario-123',
        scenarioId: 2,
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.resourceId).toBe('scenario-123');
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.templateId).toBe(1);
      expect(result.data?.landingPageResourceId).toBe('landing-123');
      expect(result.data?.landingPageId).toBe(3);
      expect(result.data?.scenarioResourceId).toBe('scenario-123');
      expect(result.data?.scenarioId).toBe(2);
      expect(result.data?.smishingId).toBe('smishing-123');
      expect(result.data?.title).toBe('Test Smishing Campaign');
      expect(result.message).toContain('Ready to assign');
      expect(result.message).toContain('smishingId=smishing-123');
      expect(result.message).toContain('resourceId=scenario-123');
      expect(result.message).toContain('scenarioName=Test Smishing Campaign');
    });
  });

  describe('Error Handling', () => {
    it('should handle KV fetch errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockRejectedValue(new Error('KV fetch failed'));

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      const apiError = new Error('Worker API failed: 500 Internal Server Error');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include smishingId in error context', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      const apiError = new Error('Worker API failed');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker API failed');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(KVService.prototype, 'getSmishing').mockResolvedValue(mockSmishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        smishingId: 'smishing-123'
      };

      const result = await uploadSmishingTool.execute({ context: input } as any);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.data) {
        expect(result.data).toHaveProperty('resourceId');
        expect(result.data).toHaveProperty('smishingId');
        expect(typeof result.data.resourceId).toBe('string');
        expect(typeof result.data.smishingId).toBe('string');
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
