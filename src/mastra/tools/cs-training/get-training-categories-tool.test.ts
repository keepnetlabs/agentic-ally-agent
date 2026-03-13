import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTrainingCategoriesTool } from './get-training-categories-tool';
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

describe('GetTrainingCategoriesTool', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  describe('tool configuration', () => {
    it('should have correct tool id', () => {
      expect(getTrainingCategoriesTool.id).toBe('get-training-categories');
    });

    it('should have a description', () => {
      expect(getTrainingCategoriesTool.description).toBeTruthy();
    });
  });

  describe('execute', () => {
    it('should return error when token is missing', async () => {
      const { getRequestContext } = await import('../../utils/core/request-storage');
      vi.mocked(getRequestContext).mockReturnValueOnce({ token: '', baseApiUrl: '' } as any);

      const result = await getTrainingCategoriesTool.execute!({}, {});
      expect(result.success).toBe(false);
    });

    it('should handle API error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as Response);

      const result = await getTrainingCategoriesTool.execute!({}, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
    });

    it('should return categories on successful fetch and cache on second call', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { name: 'EmailSecurity', displayName: 'Email Security' },
            { name: 'GDPR', displayName: 'GDPR' },
          ],
        }),
      } as Response);

      const first = await getTrainingCategoriesTool.execute!({}, {});
      expect(first.success).toBe(true);
      expect(first.categories).toHaveLength(2);
      expect(first.categories![0].name).toBe('EmailSecurity');
      expect(first.totalCount).toBe(2);

      const second = await getTrainingCategoriesTool.execute!({}, {});
      expect(second.success).toBe(true);
      expect(second.message).toContain('cached');
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(1);
    });
  });
});
