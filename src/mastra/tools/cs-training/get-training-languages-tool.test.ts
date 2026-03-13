import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrainingLanguagesTool } from './get-training-languages-tool';
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

describe('GetTrainingLanguagesTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('tool configuration', () => {
    it('should have correct tool id', () => {
      expect(getTrainingLanguagesTool.id).toBe('get-training-languages');
    });

    it('should have a description', () => {
      expect(getTrainingLanguagesTool.description).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('should return error when token is missing', async () => {
      const { getRequestContext } = await import('../../utils/core/request-storage');
      vi.mocked(getRequestContext).mockReturnValueOnce({ token: '', baseApiUrl: '' } as any);

      const result = await getTrainingLanguagesTool.execute!({}, {});
      expect(result.success).toBe(false);
    });

    it('should handle API error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const result = await getTrainingLanguagesTool.execute!({}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should return languages on successful fetch and cache on second call', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { name: 'English', code: 'EN-US', nativeLanguageName: 'English' },
            { name: 'Turkish', code: 'TR', nativeLanguageName: 'Türkçe' },
          ],
        }),
      } as Response);

      const first = await getTrainingLanguagesTool.execute!({}, {});
      expect(first.success).toBe(true);
      expect(first.languages).toHaveLength(2);
      expect(first.languages![0].code).toBe('EN-US');
      expect(first.totalCount).toBe(2);

      const second = await getTrainingLanguagesTool.execute!({}, {});
      expect(second.success).toBe(true);
      expect(second.message).toContain('cached');
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(1);
    });
  });
});
