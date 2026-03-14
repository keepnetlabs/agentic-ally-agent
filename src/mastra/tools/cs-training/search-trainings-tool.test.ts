import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTrainingsTool } from './search-trainings-tool';
import '../../../__tests__/setup';
import { assertToolSuccess } from '../../../__tests__/helpers';

vi.mock(import('../../utils/core/request-storage'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRequestContext: vi.fn(() => ({
      token: 'test-token',
      baseApiUrl: 'https://test-api.devkeepnet.com',
      companyId: 'fallback-company-id',
    })),
  };
});

describe('SearchTrainingsTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('tool configuration', () => {
    it('should have correct tool id', () => {
      expect(searchTrainingsTool.id).toBe('search-trainings');
    });

    it('should have a description', () => {
      expect(searchTrainingsTool.description).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('should return trainings on successful search', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            results: [
              {
                trainingId: 'tr-1',
                trainingName: 'Phishing Awareness',
                category: 'Email Security',
                type: 'SCORM',
              },
            ],
            totalNumberOfRecords: 1,
            totalNumberOfPages: 1,
            pageNumber: 1,
          },
        }),
      } as Response);

      const result = await searchTrainingsTool.execute!({
        companyResourceId: 'test-company-id',
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});
      assertToolSuccess(result);
      expect(result.success).toBe(true);
      expect(result.trainings).toHaveLength(1);
      expect(result.trainings![0].trainingName).toBe('Phishing Awareness');
    });

    it('should use x-ir-company-id header', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { results: [], totalNumberOfRecords: 0, totalNumberOfPages: 0 } }),
      } as Response);

      await searchTrainingsTool.execute!({
        companyResourceId: 'explicit-company',
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['x-ir-company-id']).toBe('explicit-company');
    });

    it('should fall back to request context companyId when no explicit id', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { results: [], totalNumberOfRecords: 0, totalNumberOfPages: 0 } }),
      } as Response);

      await searchTrainingsTool.execute!({
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['x-ir-company-id']).toBe('fallback-company-id');
    });

    it('should return error when token is missing', async () => {
      const { getRequestContext } = await import('../../utils/core/request-storage');
      vi.mocked(getRequestContext).mockReturnValueOnce({ token: '', baseApiUrl: '' } as any);

      const result = await searchTrainingsTool.execute!({
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});
      assertToolSuccess(result);
      expect(result.success).toBe(false);
    });

    it('should handle API error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as Response);

      const result = await searchTrainingsTool.execute!({
        companyResourceId: 'test-company',
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});
      assertToolSuccess(result);
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });

    it('should pass language filter to API', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { results: [], totalNumberOfRecords: 0, totalNumberOfPages: 0 } }),
      } as Response);

      await searchTrainingsTool.execute!({
        companyResourceId: 'test-company',
        languageCodes: ['EN-US', 'TR'],
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        orderBy: 'createTime',
        trainingSearchType: 1,
        trainingType: null,
      }, {});

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      const langFilter = body.filter.FilterGroups[0].FilterItems.find(
        (f: any) => f.FieldName === 'languages'
      );
      expect(langFilter).toBeDefined();
      expect(langFilter.Value).toBe('EN-US,TR');
    });
  });
});
