import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadInboxWithFallback } from './kv-helpers';
import { LANGUAGE, CLOUDFLARE_KV } from '../constants';

// Mock dependencies
vi.mock('./core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('./core/resilience-utils', () => ({
  withRetry: vi.fn((fn) => fn()), // Pass-through mock
}));

describe('KV Helpers', () => {
  let mockKVService: any;

  beforeEach(() => {
    mockKVService = {
      get: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('loadInboxWithFallback', () => {
    const microlearningId = 'ml-001';
    const department = 'IT';
    const sourceLanguage = 'tr-tr';

    it('should load inbox from primary key when available', async () => {
      const inboxData = { items: ['email1', 'email2'] };
      mockKVService.get.mockResolvedValue(inboxData);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual(inboxData);
      expect(mockKVService.get).toHaveBeenCalledTimes(1);
    });

    it('should fallback to default language when primary not found', async () => {
      const fallbackData = { items: ['fallback-email'] };
      mockKVService.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fallbackData);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual(fallbackData);
      expect(mockKVService.get).toHaveBeenCalledTimes(2);
    });

    it('should return null when both primary and fallback not found', async () => {
      mockKVService.get.mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockKVService.get).toHaveBeenCalledTimes(2);
    });

    it('should not try fallback if primary language is already default', async () => {
      mockKVService.get.mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        LANGUAGE.DEFAULT_SOURCE
      );

      expect(result).toBeNull();
      expect(mockKVService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle KV service errors gracefully', async () => {
      mockKVService.get.mockRejectedValue(new Error('KV service error'));

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockKVService.get).toHaveBeenCalled();
    });

    it('should handle empty inbox data', async () => {
      const emptyData = { items: [] };
      mockKVService.get.mockResolvedValue(emptyData);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual(emptyData);
    });

    it('should work with different microlearning IDs', async () => {
      const data = { items: ['test'] };
      mockKVService.get.mockResolvedValue(data);

      const result = await loadInboxWithFallback(
        mockKVService,
        'ml-different',
        department,
        sourceLanguage
      );

      expect(result).toEqual(data);
    });

    it('should work with different departments', async () => {
      const data = { items: ['test'] };
      mockKVService.get.mockResolvedValue(data);

      const result = await loadInboxWithFallback(
        mockKVService,
        microlearningId,
        'Sales',
        sourceLanguage
      );

      expect(result).toEqual(data);
    });
  });
});
