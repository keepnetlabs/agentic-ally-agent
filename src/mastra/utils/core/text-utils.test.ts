/**
 * Unit tests for text-utils
 * Covers truncateText
 */
import { describe, it, expect } from 'vitest';
import { truncateText } from './text-utils';

describe('text-utils', () => {
  describe('truncateText', () => {
    it('should return text unchanged when under maxChars', () => {
      const input = 'Short text';
      expect(truncateText(input, 100)).toBe('Short text');
    });

    it('should truncate when exceeding maxChars', () => {
      const input = 'A'.repeat(150);
      const result = truncateText(input, 100);
      expect(result.length).toBeLessThanOrEqual(150);
      expect(result).toContain('[TRUNCATED:');
      expect(result).toContain('exceeded 100 characters');
    });

    it('should use custom label in truncation notice', () => {
      const input = 'X'.repeat(50);
      const result = truncateText(input, 20, 'policy');
      expect(result).toContain('[TRUNCATED: policy exceeded 20 characters]');
    });

    it('should trim leading/trailing whitespace', () => {
      const input = '  trimmed  ';
      expect(truncateText(input, 100)).toBe('trimmed');
    });

    it('should preserve beginning of text when truncating', () => {
      const input = 'Important start ' + 'x'.repeat(100);
      const result = truncateText(input, 30);
      expect(result.startsWith('Important start')).toBe(true);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 0)).toBe('');
    });

    it('should handle exact maxChars boundary', () => {
      const input = 'A'.repeat(50);
      expect(truncateText(input, 50)).toBe(input);
    });
  });
});
