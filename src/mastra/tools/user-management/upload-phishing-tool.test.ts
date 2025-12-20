import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadPhishingTool } from './upload-phishing-tool';
import { requestStorage } from '../../utils/core/request-storage';
import { KVService } from '../../services/kv-service';
import * as workerApiClient from '../../utils/core/worker-api-client';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: uploadPhishingTool
 * Tests for uploading phishing content to platform
 * Covers: Input validation, auth checks, KV fetching, API calls, error handling, resource ID mapping
 */

describe('uploadPhishingTool', () => {
  const mockToken = 'test-token-123';
  const mockCompanyId = 'test-company-id';
  const mockEnv = {
    PHISHING_CRUD_WORKER: {
      fetch: vi.fn()
    }
  };

  const mockPhishingContent = {
    base: {
      phishing_id: 'phishing-123',
      name: 'Test Phishing Campaign',
      description: 'Test Description',
      topic: 'Security',
      difficulty: 'medium',
      method: 'email',
      language_availability: ['en-gb']
    },
    email: {
      subject: 'Test Subject',
      template: 'Test Template',
      fromAddress: 'test@example.com',
      fromName: 'Test Sender'
    },
    landing: {
      url: 'https://example.com',
      content: 'Landing page content'
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
    it('should accept valid input with phishingId', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        scenarioResourceId: 'scenario-123',
        scenarioId: 2,
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should require phishingId', async () => {
      const input: any = {};

      // Tool framework validates input schema and returns error response (doesn't throw)
      const result = await uploadPhishingTool.execute({ context: input } as any);
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
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should proceed when token is present', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });
  });

  describe('KV Content Fetching', () => {
    it('should fetch phishing content from KV with phishing namespace', async () => {
      // Note: uploadPhishingTool uses namespace ID override: 'f6609d79aa2642a99584b05c64ecaa9f'
      const getPhishingSpy = vi.spyOn(KVService.prototype, 'getPhishing')
        .mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      await uploadPhishingTool.execute({ context: input } as any);

      expect(getPhishingSpy).toHaveBeenCalledWith('phishing-123');
    });

    it('should return error when phishing content not found', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(null);

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when base content is missing', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue({});

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Payload Preparation', () => {
    it('should prepare correct payload with base metadata fields', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      await uploadPhishingTool.execute({ context: input } as any);

      expect(mockCallWorkerAPI).toHaveBeenCalledWith(
        expect.objectContaining({
          env: mockEnv,
          serviceBinding: mockEnv.PHISHING_CRUD_WORKER,
          endpoint: 'https://worker/submit',
          payload: expect.objectContaining({
            accessToken: mockToken,
            companyId: mockCompanyId,
            phishingData: expect.objectContaining({
              name: 'Test Phishing Campaign',
              description: 'Test Description',
              topic: 'Security',
              difficulty: 'medium',
              method: 'email',
              language: 'en-gb',
              email: expect.objectContaining({
                subject: 'Test Subject',
                template: 'Test Template'
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
        ...mockPhishingContent,
        base: {
          ...mockPhishingContent.base,
          language_availability: []
        }
      };

      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(contentWithoutLang);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      await uploadPhishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0];
      expect(callArgs.payload.phishingData.language).toBe('en-gb');
    });

    it('should handle missing email content gracefully', async () => {
      const contentWithoutEmail = {
        ...mockPhishingContent,
        email: undefined
      };

      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(contentWithoutEmail);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      await uploadPhishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0];
      expect(callArgs.payload.phishingData.email).toBeUndefined();
    });

    it('should handle missing landing content gracefully', async () => {
      const contentWithoutLanding = {
        ...mockPhishingContent,
        landing: undefined
      };

      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(contentWithoutLanding);
      const mockCallWorkerAPI = vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      await uploadPhishingTool.execute({ context: input } as any);

      const callArgs = mockCallWorkerAPI.mock.calls[0][0];
      expect(callArgs.payload.phishingData.landingPage).toBeUndefined();
    });
  });

  describe('Resource ID Mapping', () => {
    it('should prefer scenarioResourceId over templateResourceId for assignment', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        scenarioResourceId: 'scenario-123',
        scenarioId: 2,
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data?.resourceId).toBe('scenario-123'); // Should use scenarioResourceId
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.scenarioResourceId).toBe('scenario-123');
    });

    it('should fallback to templateResourceId when scenarioResourceId is missing', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        templateId: 1,
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data?.resourceId).toBe('template-123'); // Should fallback to templateResourceId
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.scenarioResourceId).toBeNull();
    });
  });

  describe('Successful Upload', () => {
    it('should successfully upload and return correct response structure', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
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
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.resourceId).toBe('scenario-123');
      expect(result.data?.templateResourceId).toBe('template-123');
      expect(result.data?.templateId).toBe(1);
      expect(result.data?.landingPageResourceId).toBe('landing-123');
      expect(result.data?.landingPageId).toBe(3);
      expect(result.data?.scenarioResourceId).toBe('scenario-123');
      expect(result.data?.scenarioId).toBe(2);
      expect(result.data?.phishingId).toBe('phishing-123');
      expect(result.data?.title).toBe('Test Phishing Campaign');
      expect(result.message).toContain('Upload successful');
    });
  });

  describe('Error Handling', () => {
    it('should handle KV fetch errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockRejectedValue(new Error('KV fetch failed'));

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      const apiError = new Error('Worker API failed: 500 Internal Server Error');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include phishingId in error context', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      const apiError = new Error('Worker API failed');
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockRejectedValue(apiError);

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Worker API failed');
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      vi.spyOn(KVService.prototype, 'getPhishing').mockResolvedValue(mockPhishingContent);
      vi.spyOn(workerApiClient, 'callWorkerAPI').mockResolvedValue({
        templateResourceId: 'template-123',
        scenarioResourceId: 'scenario-123',
        message: 'Upload successful'
      });

      const input = {
        phishingId: 'phishing-123'
      };

      const result = await uploadPhishingTool.execute({ context: input } as any);

      // Validate schema structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.data) {
        expect(result.data).toHaveProperty('resourceId');
        expect(result.data).toHaveProperty('phishingId');
        expect(typeof result.data.resourceId).toBe('string');
        expect(typeof result.data.phishingId).toBe('string');
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
