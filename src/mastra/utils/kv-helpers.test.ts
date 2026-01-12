import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadInboxWithFallback } from './kv-helpers';
import { getLogger } from './core/logger';
import { withRetry } from './core/resilience-utils';
import { LANGUAGE } from '../constants';

// Mock modules
vi.mock('./core/logger', () => {
  const mock = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    getLogger: vi.fn(() => mock),
  };
});

vi.mock('./core/resilience-utils', () => ({
  withRetry: vi.fn((operation) => operation()),
}));

describe('kv-helpers', () => {
  let mockKvService: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mock logger instance from the factory
    mockLogger = vi.mocked(getLogger)('KVHelpers');

    // Setup mock KV service
    mockKvService = {
      get: vi.fn(),
    };
  });

  describe('loadInboxWithFallback', () => {
    // ==================== SUCCESSFUL LOADING ====================
    it('should load primary inbox successfully', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const inboxData = { emails: ['test@example.com'], subject: 'Phishing Test' };

      vi.mocked(mockKvService.get).mockResolvedValue(inboxData);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual(inboxData);
      expect(mockKvService.get).toHaveBeenCalledWith(
        `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Loading base inbox from KV', expect.any(Object));
    });

    it('should return null when primary inbox not found and no fallback', async () => {
      vi.mocked(mockKvService.get).mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService,
        'phishing-101',
        'IT',
        LANGUAGE.DEFAULT_SOURCE
      );

      expect(result).toBeNull();
      expect(mockKvService.get).toHaveBeenCalledTimes(1);
    });

    // ==================== FALLBACK LOADING ====================
    it('should load fallback inbox when primary not found', async () => {
      const fallbackInboxData = { emails: ['fallback@example.com'], language: 'en-gb' };

      vi.mocked(mockKvService.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fallbackInboxData);

      const result = await loadInboxWithFallback(
        mockKvService,
        'phishing-101',
        'IT',
        'fr-fr'
      );

      expect(result).toEqual(fallbackInboxData);
      expect(mockKvService.get).toHaveBeenCalledTimes(2);

      // Verify fallback was tried
      const secondCall = vi.mocked(mockKvService.get).mock.calls[1];
      expect(secondCall).toBeDefined();
      if (secondCall) {
        expect(secondCall[0]).toContain(`${LANGUAGE.DEFAULT_SOURCE}`);
      }
    });

    // ==================== ERROR HANDLING ====================
    it('should catch error from kvService.get and return null', async () => {
      const error = new Error('KV service connection failed');
      vi.mocked(mockKvService.get).mockRejectedValue(error);

      const result = await loadInboxWithFallback(mockKvService, 'id', 'IT', 'en-us');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KV load failed for inbox',
        expect.objectContaining({ error: 'KV service connection failed' })
      );
    });

    // ==================== WITHRETRY INTEGRATION ====================
    it('should use withRetry for primary key load', async () => {
      vi.mocked(mockKvService.get).mockResolvedValue({ emails: [] });

      await loadInboxWithFallback(mockKvService, 'id', 'IT', 'en-us');

      expect(vi.mocked(withRetry)).toHaveBeenCalledWith(
        expect.any(Function),
        expect.stringContaining('primary')
      );
    });

    it('should handle falsy but non-null data according to current logic', async () => {
      const falsyData = 0;
      vi.mocked(mockKvService.get).mockResolvedValue(falsyData);

      const result = await loadInboxWithFallback(mockKvService, 'id', 'IT', 'en-us');
      expect(result).toBeNull();
    });
  });
});
