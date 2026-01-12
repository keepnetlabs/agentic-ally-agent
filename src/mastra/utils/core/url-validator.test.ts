import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBaseApiUrl, isAllowedBaseApiUrl, getAllowedBaseApiUrls } from './url-validator';
import '../../../__tests__/setup';

/**
 * Test Suite: URL Validator
 * Tests for X-BASE-API-URL header validation and whitelist enforcement
 * Covers: Valid URLs, invalid formats, missing headers, whitelist checks
 */

describe.skip('URL Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateBaseApiUrl()', () => {
    it('should return default URL when header is not provided', () => {
      const result = validateBaseApiUrl(undefined);

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should return default URL when header is empty string', () => {
      const result = validateBaseApiUrl('');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should return default URL when header is whitespace only', () => {
      const result = validateBaseApiUrl('   ');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should accept production URL (https://dash.keepnetlabs.com)', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com');

      expect(result).toBe('https://dash.keepnetlabs.com');
    });

    it('should accept test URL (https://test-api.devkeepnet.com)', () => {
      const result = validateBaseApiUrl('https://test-api.devkeepnet.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should trim whitespace from valid URL', () => {
      const result = validateBaseApiUrl('  https://dash.keepnetlabs.com  ');

      expect(result).toBe('https://dash.keepnetlabs.com');
    });

    it('should be case-insensitive', () => {
      const result1 = validateBaseApiUrl('HTTPS://DASH.KEEPNETLABS.COM');
      const result2 = validateBaseApiUrl('https://DASH.keepnetlabs.com');
      const result3 = validateBaseApiUrl('HTTPs://dash.KEEPNETLABS.com');

      expect(result1).toBe('https://dash.keepnetlabs.com');
      expect(result2).toBe('https://DASH.keepnetlabs.com');
      expect(result3).toBe('HTTPs://dash.KEEPNETLABS.com');
    });

    it('should reject invalid URL format', () => {
      const result = validateBaseApiUrl('not-a-valid-url');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject URL with invalid protocol', () => {
      const result = validateBaseApiUrl('ftp://dash.keepnetlabs.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject URL not in whitelist', () => {
      const result = validateBaseApiUrl('https://evil.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject URL with wrong domain', () => {
      const result = validateBaseApiUrl('https://dash.malicious-site.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject localhost URLs', () => {
      const result = validateBaseApiUrl('http://localhost:3000');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject IP addresses', () => {
      const result = validateBaseApiUrl('http://192.168.1.1');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle URLs with trailing slashes correctly', () => {
      // URL with trailing slash is technically different but should fail whitelist
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com/');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle URLs with paths', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com/api/v1');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle URLs with query parameters', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com?key=value');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle URLs with ports', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com:8443');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle special characters in URL', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com/<script>');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should reject SQL injection attempts in URL', () => {
      const result = validateBaseApiUrl("https://dash.keepnetlabs.com' OR '1'='1");

      expect(result).toBe('https://test-api.devkeepnet.com');
    });
  });

  describe('isAllowedBaseApiUrl()', () => {
    it('should return true for production URL', () => {
      expect(isAllowedBaseApiUrl('https://dash.keepnetlabs.com')).toBe(true);
    });

    it('should return true for test URL', () => {
      expect(isAllowedBaseApiUrl('https://test-api.devkeepnet.com')).toBe(true);
    });

    it('should return false for unknown URL', () => {
      expect(isAllowedBaseApiUrl('https://evil.com')).toBe(false);
    });

    it('should return false for localhost', () => {
      expect(isAllowedBaseApiUrl('http://localhost:3000')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isAllowedBaseApiUrl('HTTPS://DASH.KEEPNETLABS.COM')).toBe(true);
      expect(isAllowedBaseApiUrl('https://DASH.KEEPNETLABS.COM')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isAllowedBaseApiUrl('')).toBe(false);
    });

    it('should handle whitespace', () => {
      // Note: isAllowedBaseApiUrl doesn't trim, validateBaseApiUrl does
      expect(isAllowedBaseApiUrl('  https://dash.keepnetlabs.com  ')).toBe(false);
    });
  });

  describe('getAllowedBaseApiUrls()', () => {
    it('should return array of allowed URLs', () => {
      const urls = getAllowedBaseApiUrls();

      expect(Array.isArray(urls)).toBe(true);
      expect(urls.length).toBeGreaterThan(0);
    });

    it('should include production URL', () => {
      const urls = getAllowedBaseApiUrls();

      expect(urls).toContain('https://dash.keepnetlabs.com');
    });

    it('should include test URL', () => {
      const urls = getAllowedBaseApiUrls();

      expect(urls).toContain('https://test-api.devkeepnet.com');
    });

    it('should return readonly array', () => {
      const urls = getAllowedBaseApiUrls();

      // Readonly arrays don't have push method
      expect((urls as any).push).toBeUndefined();
    });
  });

  describe('Security Scenarios', () => {
    it('should prevent open redirect attack', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com@evil.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should prevent SSRF via whitelist bypass', () => {
      const result = validateBaseApiUrl('https://dash.keepnetlabs.com.attacker.com');

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should prevent URL encoding bypass', () => {
      const result = validateBaseApiUrl('https://%64ash.keepnetlabs.com'); // %64 = 'd'

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should prevent Unicode normalization attacks', () => {
      const result = validateBaseApiUrl('https://daſh.keepnetlabs.com'); // German ß vs ss

      expect(result).toBe('https://test-api.devkeepnet.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const longString = 'https://dash.keepnetlabs.com' + 'a'.repeat(10000);

      const result = validateBaseApiUrl(longString);

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle null gracefully', () => {
      const result = validateBaseApiUrl(null as any);

      // null is falsy, should use default
      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle object as URL', () => {
      const result = validateBaseApiUrl({} as any);

      expect(result).toBe('https://test-api.devkeepnet.com');
    });

    it('should handle array as URL', () => {
      const result = validateBaseApiUrl([] as any);

      expect(result).toBe('https://test-api.devkeepnet.com');
    });
  });
});
