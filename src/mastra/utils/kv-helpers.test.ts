import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadInboxWithFallback } from './kv-helpers';
import { getLogger } from './core/logger';
import { withRetry } from './core/resilience-utils';
import { LANGUAGE } from '../constants';

// Mock modules
vi.mock('./core/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('./core/resilience-utils', () => ({
  withRetry: vi.fn((operation) => operation()),
}));

describe('kv-helpers', () => {
  let mockKvService: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock KV service
    mockKvService = {
      get: vi.fn(),
    };

    // Setup mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    vi.mocked(getLogger).mockReturnValue(mockLogger as any);
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
      expect(mockLogger.info).toHaveBeenCalledWith('Loading base inbox from KV', {
        microlearningId,
        department,
        sourceLanguage,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Found base inbox in KV', {
        key: `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`,
      });
    });

    it('should return null when primary inbox not found and no fallback', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = LANGUAGE.DEFAULT_SOURCE; // 'en-gb'

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockKvService.get).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Base inbox not found in KV', {
        primaryKey: `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`,
        fallbackKey: undefined,
      });
    });

    // ==================== FALLBACK LOADING ====================
    it('should load fallback inbox when primary not found', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'fr-fr';
      const fallbackInboxData = { emails: ['fallback@example.com'], language: 'en-gb' };

      vi.mocked(mockKvService.get)
        .mockResolvedValueOnce(null) // Primary returns null
        .mockResolvedValueOnce(fallbackInboxData); // Fallback returns data

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual(fallbackInboxData);
      expect(mockKvService.get).toHaveBeenCalledTimes(2);

      // Verify fallback was tried
      const secondCall = vi.mocked(mockKvService.get).mock.calls[1];
      expect(secondCall[0]).toContain(`${LANGUAGE.DEFAULT_SOURCE}`);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Found fallback inbox in ${LANGUAGE.DEFAULT_SOURCE}`,
        expect.any(Object)
      );
    });

    it('should return null when both primary and fallback not found', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'de-de';

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockKvService.get).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith('Base inbox not found in KV', {
        primaryKey: `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`,
        fallbackKey: `ml:${microlearningId}:inbox:${department}:${LANGUAGE.DEFAULT_SOURCE}`,
      });
    });

    it('should not try fallback when sourceLanguage equals DEFAULT_SOURCE', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = LANGUAGE.DEFAULT_SOURCE;

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      // Should only call get once (no fallback attempt)
      expect(mockKvService.get).toHaveBeenCalledTimes(1);

      // Verify fallback key is undefined
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Base inbox not found in KV',
        expect.objectContaining({ fallbackKey: undefined })
      );
    });

    // ==================== ERROR HANDLING ====================
    it('should catch error from kvService.get and return null', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const error = new Error('KV service connection failed');

      vi.mocked(mockKvService.get).mockRejectedValue(error);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KV load failed for inbox',
        expect.objectContaining({ error: 'KV service connection failed' })
      );
    });

    it('should handle non-Error exceptions gracefully', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';

      vi.mocked(mockKvService.get).mockRejectedValue('String error');

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KV load failed for inbox',
        expect.objectContaining({ error: 'String error' })
      );
    });

    it('should handle object error exceptions gracefully', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const objectError = { code: 'KV_ERROR', message: 'Internal error' };

      vi.mocked(mockKvService.get).mockRejectedValue(objectError);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KV load failed for inbox',
        expect.any(Object)
      );
    });

    it('should log error stack when available', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const error = new Error('Detailed error');
      error.stack = 'Error: Detailed error\n  at function (file.ts:10:15)';

      vi.mocked(mockKvService.get).mockRejectedValue(error);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'KV load failed for inbox',
        expect.objectContaining({ stack: error.stack })
      );
    });

    // ==================== WITHRETRY INTEGRATION ====================
    it('should use withRetry for primary key load', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const inboxData = { emails: [] };

      vi.mocked(mockKvService.get).mockResolvedValue(inboxData);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      // withRetry should be called for primary load
      expect(vi.mocked(withRetry)).toHaveBeenCalledWith(
        expect.any(Function),
        `KV load inbox primary ml:${microlearningId}:inbox:${department}:${sourceLanguage}`
      );
    });

    it('should use withRetry for fallback key load', async () => {
      const microlearningId = 'phishing-101';
      const department = 'IT';
      const sourceLanguage = 'fr-fr';

      vi.mocked(mockKvService.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ emails: [] });

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      // withRetry should be called twice (primary + fallback)
      expect(vi.mocked(withRetry)).toHaveBeenCalledTimes(2);

      // Second call should be for fallback
      const secondCall = vi.mocked(withRetry).mock.calls[1];
      expect(secondCall[1]).toContain(`KV load inbox fallback`);
      expect(secondCall[1]).toContain(`${LANGUAGE.DEFAULT_SOURCE}`);
    });

    // ==================== KEY CONSTRUCTION ====================
    it('should construct correct KV keys using KEY_TEMPLATES', async () => {
      const microlearningId = 'security-training-201';
      const department = 'Finance';
      const sourceLanguage = 'es-es';

      vi.mocked(mockKvService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      const expectedPrimaryKey = `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`;
      const expectedFallbackKey = `ml:${microlearningId}:inbox:${department}:${LANGUAGE.DEFAULT_SOURCE}`;

      expect(vi.mocked(mockKvService.get).mock.calls[0][0]).toBe(expectedPrimaryKey);
      expect(vi.mocked(mockKvService.get).mock.calls[1][0]).toBe(expectedFallbackKey);
    });

    // ==================== LOGGING VERIFICATION ====================
    it('should log with correct microlearningId, department, and language', async () => {
      const microlearningId = 'custom-id-123';
      const department = 'HR';
      const sourceLanguage = 'ja-jp';

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Loading base inbox from KV',
        expect.objectContaining({
          microlearningId: 'custom-id-123',
          department: 'HR',
          sourceLanguage: 'ja-jp',
        })
      );
    });

    it('should log fallback attempt with both primary and fallback keys', async () => {
      const microlearningId = 'test-id';
      const department = 'Sales';
      const sourceLanguage = 'it-it';

      vi.mocked(mockKvService.get).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Primary inbox not found, trying fallback to ${LANGUAGE.DEFAULT_SOURCE}`,
        expect.objectContaining({
          primaryKey: expect.stringContaining(`${sourceLanguage}`),
          fallbackKey: expect.stringContaining(`${LANGUAGE.DEFAULT_SOURCE}`),
        })
      );
    });

    // ==================== EDGE CASES ====================
    it('should handle empty microlearningId', async () => {
      const microlearningId = '';
      const department = 'IT';
      const sourceLanguage = 'en-us';

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toBeNull();
      expect(mockKvService.get).toHaveBeenCalledWith(
        expect.stringContaining('ml::inbox:')
      );
    });

    it('should handle empty department', async () => {
      const microlearningId = 'test-id';
      const department = '';
      const sourceLanguage = 'en-us';

      vi.mocked(mockKvService.get).mockResolvedValue(null);

      await loadInboxWithFallback(mockKvService, microlearningId, department, sourceLanguage);

      expect(mockKvService.get).toHaveBeenCalledWith(
        expect.stringContaining(':inbox::')
      );
    });

    it('should handle special characters in microlearningId', async () => {
      const microlearningId = 'test-id_with.special@chars';
      const department = 'IT';
      const sourceLanguage = 'en-us';
      const inboxData = { id: 'test' };

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
    });

    it('should handle various language codes', async () => {
      const testCases = [
        'en-gb',
        'en-us',
        'fr-fr',
        'de-de',
        'zh-cn',
        'ja-jp',
        'ar-sa',
        'pt-br',
        'es-es',
      ];

      for (const sourceLanguage of testCases) {
        vi.clearAllMocks();
        vi.mocked(mockKvService.get).mockResolvedValue(null);

        await loadInboxWithFallback(
          mockKvService,
          'test-id',
          'IT',
          sourceLanguage
        );

        expect(mockKvService.get).toHaveBeenCalledWith(
          expect.stringContaining(sourceLanguage)
        );
      }
    });

    it('should handle very long microlearningId', async () => {
      const microlearningId = 'x'.repeat(500);
      const department = 'IT';
      const sourceLanguage = 'en-us';

      vi.mocked(mockKvService.get).mockResolvedValue({ data: 'test' });

      const result = await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        sourceLanguage
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockKvService.get).toHaveBeenCalledWith(
        `ml:${microlearningId}:inbox:${department}:${sourceLanguage}`
      );
    });

    it('should handle inbox data with complex structure', async () => {
      const complexData = {
        metadata: {
          created: '2025-01-08',
          version: 1,
          language: 'en-us',
        },
        emails: [
          {
            id: 'email-1',
            subject: 'Phishing Test',
            sender: 'attacker@evil.com',
            body: 'Click here for free money!',
            isPhishing: true,
          },
          {
            id: 'email-2',
            subject: 'Meeting Reminder',
            sender: 'boss@company.com',
            body: 'Don\'t forget the meeting at 3pm',
            isPhishing: false,
          },
        ],
        stats: {
          totalEmails: 2,
          phishingCount: 1,
        },
      };

      vi.mocked(mockKvService.get).mockResolvedValue(complexData);

      const result = await loadInboxWithFallback(
        mockKvService,
        'test-id',
        'IT',
        'en-us'
      );

      expect(result).toEqual(complexData);
      expect(result.emails).toHaveLength(2);
      expect(result.stats.phishingCount).toBe(1);
    });

    it('should handle inbox data with null values', async () => {
      const dataWithNulls = {
        emails: null,
        metadata: null,
      };

      vi.mocked(mockKvService.get).mockResolvedValue(dataWithNulls);

      const result = await loadInboxWithFallback(
        mockKvService,
        'test-id',
        'IT',
        'en-us'
      );

      expect(result).toEqual(dataWithNulls);
      expect(result.emails).toBeNull();
    });

    it('should distinguish between null data and falsy but non-null data', async () => {
      const falsyData = 0; // Falsy but not null/undefined

      vi.mocked(mockKvService.get).mockResolvedValue(falsyData);

      const result = await loadInboxWithFallback(
        mockKvService,
        'test-id',
        'IT',
        'en-us'
      );

      expect(result).toBe(falsyData);
      expect(mockKvService.get).toHaveBeenCalledTimes(1); // No fallback attempt
    });

    it('should handle empty string inbox data', async () => {
      vi.mocked(mockKvService.get).mockResolvedValue('');

      const result = await loadInboxWithFallback(
        mockKvService,
        'test-id',
        'IT',
        'en-us'
      );

      expect(result).toBe('');
      expect(mockKvService.get).toHaveBeenCalledTimes(1);
    });

    it('should handle case sensitivity in language codes', async () => {
      const microlearningId = 'test-id';
      const department = 'IT';

      // Test with uppercase language code (unusual but should work)
      vi.mocked(mockKvService.get).mockResolvedValue(null);

      await loadInboxWithFallback(
        mockKvService,
        microlearningId,
        department,
        'EN-US'
      );

      expect(mockKvService.get).toHaveBeenCalledWith(
        expect.stringContaining('EN-US')
      );
    });

    it('should handle rapid successive calls', async () => {
      vi.mocked(mockKvService.get).mockResolvedValue({ data: 'test' });

      const calls = [
        loadInboxWithFallback(mockKvService, 'id-1', 'IT', 'en-us'),
        loadInboxWithFallback(mockKvService, 'id-2', 'HR', 'fr-fr'),
        loadInboxWithFallback(mockKvService, 'id-3', 'Sales', 'de-de'),
      ];

      const results = await Promise.all(calls);

      expect(results).toHaveLength(3);
      expect(mockKvService.get).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result).toEqual({ data: 'test' });
      });
    });
  });
});
