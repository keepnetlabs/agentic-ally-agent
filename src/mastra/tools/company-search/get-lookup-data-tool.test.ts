import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveLookupFilters,
  resolveLicenseModuleIds,
  resolveLookupIds,
} from './get-lookup-data-tool';
import '../../../__tests__/setup';

describe('GetLookupDataTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('resolveLookupFilters', () => {
    it('should skip filters that are already UUIDs', async () => {
      const filters = [
        { fieldName: 'IndustryResourceId', operator: 'Include', value: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      ];
      await resolveLookupFilters(filters, 'token', 'https://api.test.com');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(filters[0].value).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should resolve text names to IDs when lookup succeeds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { resourceId: 'ind-123', name: 'Healthcare', genericCodeTypeId: 2 },
            { resourceId: 'ind-456', name: 'Technology', genericCodeTypeId: 2 },
          ],
        }),
      } as Response);

      const filters = [
        { fieldName: 'IndustryResourceId', operator: '=', value: 'Healthcare' },
      ];
      await resolveLookupFilters(filters, 'token', 'https://api.test.com');

      expect(filters[0].value).toBe('ind-123');
      expect(filters[0].operator).toBe('Include');
    });

    it('should not mutate filters when lookup API fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      } as Response);

      const filters = [
        { fieldName: 'LicenseTypeResourceId', operator: '=', value: 'Enterprise' },
      ];
      await resolveLookupFilters(filters, 'token', 'https://api.test.com');

      expect(filters[0].value).toBe('Enterprise');
    });
  });

  describe('resolveLicenseModuleIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await resolveLicenseModuleIds([], 'token', 'https://api.test.com');
      expect(result).toEqual([]);
    });

    it('should return original IDs when API fails', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await resolveLicenseModuleIds(['mod-1'], 'token', 'https://api.test.com');
      expect(result).toEqual(['mod-1']);
    });

    it('should resolve module IDs to names when API succeeds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            allLicenseModules: [
              { resourceId: 'mod-1', name: 'Email Security' },
              { resourceId: 'mod-2', name: 'Phishing' },
            ],
          },
        }),
      } as Response);

      const result = await resolveLicenseModuleIds(['mod-1', 'mod-2'], 'token', 'https://api.test.com');
      expect(result).toEqual(['Email Security', 'Phishing']);
    });

    it('should keep original ID for unmatched modules', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: { allLicenseModules: [{ resourceId: 'mod-1', name: 'Email Security' }] },
        }),
      } as Response);

      const result = await resolveLicenseModuleIds(['mod-1', 'unknown-mod'], 'token', 'https://api.test.com');
      expect(result).toEqual(['Email Security', 'unknown-mod']);
    });
  });

  describe('resolveLookupIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await resolveLookupIds([], 2, 'token', 'https://api.test.com');
      expect(result).toEqual([]);
    });

    it('should resolve IDs to names when lookup succeeds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { resourceId: 'ind-1', name: 'Healthcare', genericCodeTypeId: 3 },
            { resourceId: 'ind-2', name: 'Technology', genericCodeTypeId: 3 },
          ],
        }),
      } as Response);

      const result = await resolveLookupIds(['ind-1', 'ind-2'], 3, 'token', 'https://api.test.com');
      expect(result).toEqual(['Healthcare', 'Technology']);
    });
  });
});
