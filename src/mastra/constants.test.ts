/**
 * Unit tests for constants module
 * Covers KEY_TEMPLATES and RETRY.getBackoffDelay
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLOUDFLARE_KV, RETRY, TRANSLATION_CONFIG, LANGUAGE } from './constants';

describe('constants', () => {
  describe('CLOUDFLARE_KV.KEY_TEMPLATES', () => {
    it('should generate base key for microlearning', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.base('ml-123')).toBe('ml:ml-123:base');
    });

    it('should generate language key', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.language('ml-456', 'en-gb')).toBe('ml:ml-456:lang:en-gb');
    });

    it('should generate inbox key with department and language', () => {
      expect(CLOUDFLARE_KV.KEY_TEMPLATES.inbox('ml-789', 'IT', 'tr-tr')).toBe(
        'ml:ml-789:inbox:IT:tr-tr'
      );
    });

    it('should generate health check key with timestamp', () => {
      const before = Date.now();
      const key = CLOUDFLARE_KV.KEY_TEMPLATES.healthCheck();
      const after = Date.now();
      expect(key).toMatch(/^health_check_\d+$/);
      const ts = parseInt(key.replace('health_check_', ''), 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after + 1);
    });
  });

  describe('RETRY.getBackoffDelay', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return value in range [0, cappedDelay] when jitter enabled', () => {
      const delay = RETRY.getBackoffDelay(0);
      const baseDelay = Math.pow(2, 0) * RETRY.BASE_DELAY_MS;
      const cappedDelay = Math.min(baseDelay, RETRY.MAX_DELAY_MS);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(cappedDelay);
    });

    it('should increase base delay exponentially with attempt', () => {
      const delay0 = RETRY.getBackoffDelay(0);
      const delay1 = RETRY.getBackoffDelay(1);
      const delay2 = RETRY.getBackoffDelay(2);

      expect(delay0).toBeLessThanOrEqual(1000);
      expect(delay1).toBeLessThanOrEqual(2000);
      expect(delay2).toBeLessThanOrEqual(4000);
    });

    it('should cap delay at MAX_DELAY_MS', () => {
      const delay = RETRY.getBackoffDelay(20); // 2^20 * 1000 >> MAX_DELAY_MS
      expect(delay).toBeLessThanOrEqual(RETRY.MAX_DELAY_MS);
    });
  });

  describe('TRANSLATION_CONFIG', () => {
    it('should have expected chunk size constants', () => {
      expect(TRANSLATION_CONFIG.MAX_JSON_CHARS).toBeGreaterThan(0);
      expect(TRANSLATION_CONFIG.INITIAL_CHUNK_SIZE).toBeGreaterThan(TRANSLATION_CONFIG.MIN_CHUNK_SIZE);
      expect(TRANSLATION_CONFIG.SIZE_REDUCTION_FACTOR).toBeLessThan(1);
    });
  });

  describe('LANGUAGE', () => {
    it('should have default source and department', () => {
      expect(LANGUAGE.DEFAULT_SOURCE).toBe('en-gb');
      expect(LANGUAGE.DEFAULT_DEPARTMENT).toBe('All');
    });
  });
});
