import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCompanyDetailTool } from './get-company-detail-tool';
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
  resolveLicenseModuleIds: vi.fn().mockResolvedValue(['Module A', 'Module B']),
}));

describe('GetCompanyDetailTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('tool configuration', () => {
    it('should have correct tool id', () => {
      expect(getCompanyDetailTool.id).toBe('get-company-detail');
    });

    it('should have a description', () => {
      expect(getCompanyDetailTool.description).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('should return company details on successful fetch', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            name: 'Acme Corp',
            industryName: 'Technology',
            countryName: 'Turkey',
            licenseTypeName: 'Enterprise',
            licenseModules: ['mod-1', 'mod-2'],
          },
        }),
      } as Response);

      const result = await getCompanyDetailTool.execute!({ companyResourceId: 'company-123' }, {});
      expect(result.success).toBe(true);
      expect(result.company?.name).toBe('Acme Corp');
      expect(result.company?.industryName).toBe('Technology');
      expect(result.company?.licenseModuleNames).toEqual(['Module A', 'Module B']);
    });

    it('should return error when token is missing', async () => {
      const { getRequestContext } = await import('../../utils/core/request-storage');
      vi.mocked(getRequestContext).mockReturnValueOnce({ token: '', baseApiUrl: '' } as any);

      const result = await getCompanyDetailTool.execute!({ companyResourceId: 'company-123' }, {});
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle API error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as Response);

      const result = await getCompanyDetailTool.execute!({ companyResourceId: 'invalid-id' }, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should call correct API endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { name: 'Test Co', licenseModules: [] } }),
      } as Response);

      await getCompanyDetailTool.execute!({ companyResourceId: 'abc-xyz-123' }, {});
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/companies/abc-xyz-123'),
        expect.any(Object)
      );
    });
  });
});
