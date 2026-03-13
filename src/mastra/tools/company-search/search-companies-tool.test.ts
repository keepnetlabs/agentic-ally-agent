import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCompaniesTool } from './search-companies-tool';
import '../../../__tests__/setup';

vi.mock(import('../../utils/core/request-storage'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getRequestContext: vi.fn(() => ({
      token: 'test-token',
      baseApiUrl: 'https://test-api.devkeepnet.com',
    })),
  };
});

vi.mock('./get-lookup-data-tool', () => ({
  resolveLookupFilters: vi.fn(),
}));

describe('SearchCompaniesTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('tool configuration', () => {
    it('should have correct tool id', () => {
      expect(searchCompaniesTool.id).toBe('search-companies');
    });

    it('should have a description', () => {
      expect(searchCompaniesTool.description).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('should return companies on successful search', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            results: [
              {
                companyName: 'Acme Corp',
                companyResourceId: 'abc-123',
                industryName: 'Technology',
                targetUserCount: 100,
              },
            ],
            totalNumberOfRecords: 1,
            totalNumberOfPages: 1,
            pageNumber: 1,
          },
        }),
      } as Response);

      const result = await searchCompaniesTool.execute!({ pageNumber: 1, pageSize: 10, ascending: false, filterCondition: 'AND', orderBy: 'CreateTime' }, {});
      expect(result.success).toBe(true);
      expect(result.companies).toHaveLength(1);
      expect(result.companies![0].companyName).toBe('Acme Corp');
      expect(result.totalCount).toBe(1);
    });

    it('should return error when token is missing', async () => {
      const { getRequestContext } = await import('../../utils/core/request-storage');
      vi.mocked(getRequestContext).mockReturnValueOnce({ token: '', baseApiUrl: '' } as any);

      const result = await searchCompaniesTool.execute!({ pageNumber: 1, pageSize: 10, ascending: false, filterCondition: 'AND', orderBy: 'CreateTime' }, {});
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle API error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await searchCompaniesTool.execute!({ pageNumber: 1, pageSize: 10, ascending: false, filterCondition: 'AND', orderBy: 'CreateTime' }, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should pass filters to API', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { results: [], totalNumberOfRecords: 0, totalNumberOfPages: 0 } }),
      } as Response);

      await searchCompaniesTool.execute!({
        filters: [{ fieldName: 'CompanyName', operator: '=', value: 'Test' }],
        pageNumber: 1,
        pageSize: 10,
        ascending: false,
        filterCondition: 'AND',
        orderBy: 'CreateTime',
      }, {});

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.filter.FilterGroups[0].FilterItems[0].FieldName).toBe('CompanyName');
    });
  });
});
