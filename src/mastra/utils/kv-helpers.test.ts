import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadInboxWithFallback } from './kv-helpers';

const mockKvGet = vi.fn();

vi.mock('../services/kv-service', () => ({
  KVService: class {
    get = mockKvGet;
  },
}));

vi.mock('./core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('./core/resilience-utils', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../constants', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    CLOUDFLARE_KV: {
      KEY_TEMPLATES: {
        inbox: (mlId: string, dept: string, lang: string) => `ml:${mlId}:inbox:${dept}:${lang}`,
      },
    },
    LANGUAGE: { DEFAULT_SOURCE: 'en-gb' },
  };
});

// Mock error-utils and error-service to avoid side effects
vi.mock('./core/error-utils', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    external: vi.fn(() => ({ code: 'ERR', message: 'err', category: 'EXTERNAL' })),
  },
}));

describe('kv-helpers', () => {
  const mockKvService = { get: mockKvGet };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadInboxWithFallback', () => {
    it('returns data when primary key found', async () => {
      const inboxData = { emails: [] };
      mockKvGet.mockResolvedValue(inboxData);

      const result = await loadInboxWithFallback(
        mockKvService as any,
        'ml-123',
        'IT',
        'en-gb'
      );

      expect(result).toEqual(inboxData);
      expect(mockKvGet).toHaveBeenCalledWith('ml:ml-123:inbox:IT:en-gb');
    });

    it('returns fallback when primary not found and sourceLanguage differs from default', async () => {
      mockKvGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ emails: ['fallback'] });

      const result = await loadInboxWithFallback(
        mockKvService as any,
        'ml-123',
        'IT',
        'de-de'
      );

      expect(result).toEqual({ emails: ['fallback'] });
      expect(mockKvGet).toHaveBeenCalledWith('ml:ml-123:inbox:IT:de-de');
      expect(mockKvGet).toHaveBeenCalledWith('ml:ml-123:inbox:IT:en-gb');
    });

    it('returns null when primary and fallback both not found', async () => {
      mockKvGet.mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService as any,
        'ml-123',
        'IT',
        'de-de'
      );

      expect(result).toBeNull();
    });

    it('returns null when primary not found and sourceLanguage is default (no fallback key)', async () => {
      mockKvGet.mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService as any,
        'ml-123',
        'IT',
        'en-gb'
      );

      expect(result).toBeNull();
      expect(mockKvGet).toHaveBeenCalledTimes(1);
    });

    it('returns null on KV error', async () => {
      mockKvGet.mockRejectedValue(new Error('KV error'));

      const result = await loadInboxWithFallback(
        mockKvService as any,
        'ml-123',
        'IT',
        'en-gb'
      );

      expect(result).toBeNull();
    });
  });
});
