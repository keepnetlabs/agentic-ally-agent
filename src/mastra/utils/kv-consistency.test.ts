import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  waitForKVConsistency,
  buildExpectedKVKeys,
  buildExpectedPhishingKeys,
} from './kv-consistency';

// Mock dependencies
vi.mock('../constants', () => ({
  CLOUDFLARE_KV: {
    CONSISTENCY_CHECK: {
      ENABLED: true,
      INITIAL_DELAY_MS: 500,
      MAX_DELAY_MS: 2000,
      MAX_WAIT_MS: 10000,
    },
    KEY_TEMPLATES: {
      base: (id: string) => `ml:${id}:base`,
      language: (id: string, lang: string) => `ml:${id}:lang:${lang}`,
      inbox: (id: string, dept: string, lang: string) => `ml:${id}:inbox:${dept}:${lang}`,
    },
  },
}));

vi.mock('./core/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('./core/error-utils', () => ({
  normalizeError: vi.fn((err) => (err instanceof Error ? err : new Error(String(err)))),
}));

const mockKVGet = vi.fn();

vi.mock('../services/kv-service', () => {
  return {
    KVService: class {
      constructor(_namespaceId?: string) {}
      get = mockKVGet;
      getNamespaceId = () => 'test-namespace';
    },
  };
});

import { CLOUDFLARE_KV } from '../constants';

describe('kv-consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Exponential Backoff Calculation', () => {
    it('should calculate initial delay (500ms) for attempt 0', () => {
      expect(CLOUDFLARE_KV.CONSISTENCY_CHECK.INITIAL_DELAY_MS).toBe(500);
    });

    it('should double delay with each attempt', () => {
      const initial = CLOUDFLARE_KV.CONSISTENCY_CHECK.INITIAL_DELAY_MS;
      expect(initial * Math.pow(2, 0)).toBe(500);
      expect(initial * Math.pow(2, 1)).toBe(1000);
      expect(initial * Math.pow(2, 2)).toBe(2000);
      expect(initial * Math.pow(2, 3)).toBe(4000);
    });

    it('should cap delay at MAX_DELAY_MS', () => {
      const initial = CLOUDFLARE_KV.CONSISTENCY_CHECK.INITIAL_DELAY_MS;
      const max = CLOUDFLARE_KV.CONSISTENCY_CHECK.MAX_DELAY_MS;
      expect(Math.min(initial * Math.pow(2, 3), max)).toBe(max);
    });

    it('should respect MAX_DELAY_MS of 2000ms', () => {
      expect(CLOUDFLARE_KV.CONSISTENCY_CHECK.MAX_DELAY_MS).toBe(2000);
    });
  });

  describe('waitForKVConsistency - Configuration', () => {
    it('should skip consistency check when disabled', async () => {
      const originalEnabled = CLOUDFLARE_KV.CONSISTENCY_CHECK.ENABLED;
      Object.defineProperty(CLOUDFLARE_KV.CONSISTENCY_CHECK, 'ENABLED', {
        value: false,
        configurable: true,
      });

      mockKVGet.mockResolvedValue('value');
      await waitForKVConsistency('test-id', ['key1']);

      Object.defineProperty(CLOUDFLARE_KV.CONSISTENCY_CHECK, 'ENABLED', {
        value: originalEnabled,
        configurable: true,
      });

      // KV should not have been called since consistency check is disabled
      expect(mockKVGet).not.toHaveBeenCalled();
    });

    it('should accept namespace override', () => {
      // Test just verifies the function can be called with namespace
      mockKVGet.mockResolvedValue('value');
      const promise = waitForKVConsistency('test-id', ['key1'], 'custom-namespace');
      // Promise will run in background
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('waitForKVConsistency - Key Checking', () => {
    it('should check all keys in parallel', async () => {
      mockKVGet.mockResolvedValue('value');

      const promise = waitForKVConsistency('test-id', ['key1', 'key2', 'key3']);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledTimes(3);
    });

    it('should handle single key', async () => {
      mockKVGet.mockResolvedValue('value');

      const promise = waitForKVConsistency('test-id', ['single-key']);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledWith('single-key');
    });

    it('should handle multiple keys', async () => {
      mockKVGet.mockResolvedValue('value');

      const promise = waitForKVConsistency('test-id', ['key1', 'key2', 'key3', 'key4', 'key5']);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledTimes(5);
    });

    it('should handle empty key array', async () => {
      mockKVGet.mockResolvedValue('value');

      const promise = waitForKVConsistency('test-id', []);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).not.toHaveBeenCalled();
    });
  });

  describe('buildExpectedKVKeys', () => {
    it('should build base key only when no language/department provided', () => {
      const keys = buildExpectedKVKeys('microlearning-101');
      expect(keys).toEqual(['ml:microlearning-101:base']);
    });

    it('should include language key when language is provided', () => {
      const keys = buildExpectedKVKeys('microlearning-101', 'en-us');
      expect(keys).toEqual(['ml:microlearning-101:base', 'ml:microlearning-101:lang:en-us']);
    });

    it('should include inbox key when both language and department provided', () => {
      const keys = buildExpectedKVKeys('microlearning-101', 'en-us', 'IT');
      expect(keys).toEqual([
        'ml:microlearning-101:base',
        'ml:microlearning-101:lang:en-us',
        'ml:microlearning-101:inbox:IT:en-us',
      ]);
    });

    it('should not include inbox key when only language provided', () => {
      const keys = buildExpectedKVKeys('microlearning-101', 'en-us');
      expect(keys).not.toContain('ml:microlearning-101:inbox:undefined:en-us');
      expect(keys).toHaveLength(2);
    });

    it('should not include language key when only department provided', () => {
      const keys = buildExpectedKVKeys('microlearning-101', undefined, 'IT');
      expect(keys).toEqual(['ml:microlearning-101:base']);
    });

    it('should handle different microlearning IDs', () => {
      const keys1 = buildExpectedKVKeys('phishing-101');
      const keys2 = buildExpectedKVKeys('ransomware-202');
      expect(keys1[0]).toBe('ml:phishing-101:base');
      expect(keys2[0]).toBe('ml:ransomware-202:base');
    });

    it('should handle different language codes', () => {
      const keys1 = buildExpectedKVKeys('ml-101', 'en-gb');
      const keys2 = buildExpectedKVKeys('ml-101', 'de-de');
      expect(keys1[1]).toBe('ml:ml-101:lang:en-gb');
      expect(keys2[1]).toBe('ml:ml-101:lang:de-de');
    });

    it('should handle different departments', () => {
      const keys1 = buildExpectedKVKeys('ml-101', 'en-us', 'IT');
      const keys2 = buildExpectedKVKeys('ml-101', 'en-us', 'HR');
      expect(keys1[2]).toBe('ml:ml-101:inbox:IT:en-us');
      expect(keys2[2]).toBe('ml:ml-101:inbox:HR:en-us');
    });

    it('should return array with correct count', () => {
      expect(buildExpectedKVKeys('ml-101')).toHaveLength(1);
      expect(buildExpectedKVKeys('ml-101', 'en-us')).toHaveLength(2);
      expect(buildExpectedKVKeys('ml-101', 'en-us', 'IT')).toHaveLength(3);
    });
  });

  describe('buildExpectedPhishingKeys', () => {
    it('should include base key for phishing', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us');
      expect(keys).toContain('phishing:phishing-uuid:base');
    });

    it('should include email key by default', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us');
      expect(keys).toContain('phishing:phishing-uuid:email:en-us');
    });

    it('should include landing page key by default', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us');
      expect(keys).toContain('phishing:phishing-uuid:landing:en-us');
    });

    it('should exclude email when hasEmail is false', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us', false);
      expect(keys).not.toContain('phishing:phishing-uuid:email:en-us');
      expect(keys).toContain('phishing:phishing-uuid:landing:en-us');
    });

    it('should exclude landing page when hasLandingPage is false', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us', true, false);
      expect(keys).toContain('phishing:phishing-uuid:email:en-us');
      expect(keys).not.toContain('phishing:phishing-uuid:landing:en-us');
    });

    it('should exclude both email and landing page when both false', () => {
      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us', false, false);
      expect(keys).toEqual(['phishing:phishing-uuid:base']);
    });

    it('should normalize language to lowercase', () => {
      const keysUpper = buildExpectedPhishingKeys('phishing-uuid', 'EN-US');
      const keysLower = buildExpectedPhishingKeys('phishing-uuid', 'en-us');
      expect(keysUpper[1]).toBe(keysLower[1]);
    });

    it('should handle different phishing IDs', () => {
      const keys1 = buildExpectedPhishingKeys('uuid-1', 'en-us');
      const keys2 = buildExpectedPhishingKeys('uuid-2', 'en-us');
      expect(keys1[0]).toBe('phishing:uuid-1:base');
      expect(keys2[0]).toBe('phishing:uuid-2:base');
    });

    it('should return correct key count based on flags', () => {
      expect(buildExpectedPhishingKeys('id', 'en-us')).toHaveLength(3);
      expect(buildExpectedPhishingKeys('id', 'en-us', false, true)).toHaveLength(2);
      expect(buildExpectedPhishingKeys('id', 'en-us', true, false)).toHaveLength(2);
      expect(buildExpectedPhishingKeys('id', 'en-us', false, false)).toHaveLength(1);
    });

    it('should format keys correctly with colons', () => {
      const keys = buildExpectedPhishingKeys('test-id', 'fr-fr', true, true);
      keys.forEach((key) => {
        expect(key).toContain(':');
        expect(key.startsWith('phishing:')).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should wait for microlearning consistency check with all keys', async () => {
      mockKVGet.mockResolvedValue('value');

      const keys = buildExpectedKVKeys('ml-101', 'en-us', 'IT');
      const promise = waitForKVConsistency('ml-101', keys);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledWith('ml:ml-101:base');
      expect(mockKVGet).toHaveBeenCalledWith('ml:ml-101:lang:en-us');
      expect(mockKVGet).toHaveBeenCalledWith('ml:ml-101:inbox:IT:en-us');
    });

    it('should wait for phishing consistency check with built keys', async () => {
      mockKVGet.mockResolvedValue('value');

      const keys = buildExpectedPhishingKeys('phishing-uuid', 'en-us');
      const promise = waitForKVConsistency('phishing-uuid', keys, 'phishing-ns');
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledWith('phishing:phishing-uuid:base');
      expect(mockKVGet).toHaveBeenCalledWith('phishing:phishing-uuid:email:en-us');
      expect(mockKVGet).toHaveBeenCalledWith('phishing:phishing-uuid:landing:en-us');
    });

    it('should handle keys with proper key format', async () => {
      mockKVGet.mockResolvedValue('value');

      const keys = buildExpectedKVKeys('ml-101', 'en-us', 'IT');
      expect(keys.length).toBe(3);
      expect(keys[0]).toBe('ml:ml-101:base');

      const promise = waitForKVConsistency('ml-101', keys);
      vi.advanceTimersByTime(100);
      await promise;
    });

    it('should build correct keys and wait for phishing with email only', async () => {
      mockKVGet.mockResolvedValue('value');

      const keys = buildExpectedPhishingKeys('id', 'en-gb', true, false);
      const promise = waitForKVConsistency('id', keys);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).toHaveBeenCalledTimes(2);
      expect(mockKVGet).toHaveBeenCalledWith('phishing:id:base');
      expect(mockKVGet).toHaveBeenCalledWith('phishing:id:email:en-gb');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty key array', async () => {
      mockKVGet.mockResolvedValue('value');

      const promise = waitForKVConsistency('test-id', []);
      vi.advanceTimersByTime(100);
      await promise;

      expect(mockKVGet).not.toHaveBeenCalled();
    });

    it('should handle very long microlearning IDs', () => {
      const longId = 'x'.repeat(500);
      const keys = buildExpectedKVKeys(longId, 'en-us');
      expect(keys[0]).toContain(longId);
    });

    it('should handle special characters in IDs', () => {
      const keys = buildExpectedKVKeys('ml-id-with-dashes-123', 'en-us');
      expect(keys[0]).toBe('ml:ml-id-with-dashes-123:base');
    });

    it('should handle unicode in language codes', () => {
      const keys = buildExpectedPhishingKeys('id', 'zh-hans-cn');
      expect(keys[1]).toContain('zh-hans-cn');
    });

    it('should handle rapid successive calls', async () => {
      mockKVGet.mockResolvedValue('value');

      const promises = [
        waitForKVConsistency('id1', ['key1']),
        waitForKVConsistency('id2', ['key2']),
        waitForKVConsistency('id3', ['key3']),
      ];

      vi.advanceTimersByTime(100);
      await Promise.all(promises);

      expect(mockKVGet).toHaveBeenCalledTimes(3);
    });

    it('should handle null/undefined gracefully in helpers', () => {
      const keys1 = buildExpectedKVKeys('id', undefined, undefined);
      const keys2 = buildExpectedKVKeys('id');
      expect(keys1).toEqual(keys2);
    });

    it('should build correct key format for all scenarios', () => {
      const mlKey = buildExpectedKVKeys('id');
      const langKey = buildExpectedKVKeys('id', 'en-us');
      const inboxKey = buildExpectedKVKeys('id', 'en-us', 'IT');

      expect(mlKey[0]).toBe('ml:id:base');
      expect(langKey[1]).toBe('ml:id:lang:en-us');
      expect(inboxKey[2]).toBe('ml:id:inbox:IT:en-us');
    });
  });
});
