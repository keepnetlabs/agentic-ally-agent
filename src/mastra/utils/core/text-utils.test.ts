import { describe, it, expect } from 'vitest';
import { truncateText } from './text-utils';

describe('text-utils', () => {
  describe('truncateText', () => {
    it('should return original text if within limit', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    it('should truncate and append notice if exceeds limit', () => {
      const longText = 'This is a very long text that needs truncation';
      const result = truncateText(longText, 10);

      expect(result).not.toBe(longText);
      expect(result.length).toBeGreaterThan(10); // Because of the suffix
      expect(result).toContain('[TRUNCATED: text exceeded 10 characters]');
      expect(result.startsWith('This is a')).toBe(true);
    });

    it('should use custom label in suffix', () => {
      const result = truncateText('Content', 3, 'desc');
      expect(result).toContain('[TRUNCATED: desc exceeded 3 characters]');
    });

    it('should handle empty string input', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle whitespace-only input', () => {
      expect(truncateText('   ', 10)).toBe('');
    });

    it('should trim whitespace before checking length', () => {
      expect(truncateText('  Hello  ', 10)).toBe('Hello');
    });

    it('should trim whitespace from long text', () => {
      const result = truncateText('  This is a long text  ', 10);
      expect(result).toContain('[TRUNCATED');
      expect(result.startsWith('This is a')).toBe(true);
    });

    it('should handle text exactly at maxChars boundary', () => {
      const text = 'Exactly10!';
      expect(truncateText(text, 10)).toBe('Exactly10!');
    });

    it('should handle text one character over maxChars', () => {
      const text = 'Exactly10!!';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
      expect(result.startsWith('Exactly10!')).toBe(true);
    });

    it('should use default label when not provided', () => {
      const result = truncateText('Long text here', 5);
      expect(result).toContain('[TRUNCATED: text exceeded 5 characters]');
    });

    it('should handle maxChars of 0', () => {
      const result = truncateText('Any text', 0);
      expect(result).toContain('[TRUNCATED: text exceeded 0 characters]');
      expect(result.startsWith('\n\n')).toBe(true);
    });

    it('should handle maxChars of 1', () => {
      const result = truncateText('Any text', 1);
      expect(result).toContain('[TRUNCATED');
      // First character only
      expect(result.startsWith('A')).toBe(true);
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(10000);
      const result = truncateText(longText, 100);
      expect(result).toContain('[TRUNCATED');
      expect(result.startsWith('A'.repeat(100))).toBe(true);
    });

    it('should handle multi-line text', () => {
      const text = 'Line 1\nLine 2\nLine 3\nLine 4';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
    });

    it('should preserve newlines in non-truncated text', () => {
      const text = 'Line 1\nLine 2';
      expect(truncateText(text, 20)).toBe('Line 1\nLine 2');
    });

    it('should handle text with special characters', () => {
      const text = 'Special!@#$%^&*()';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
      expect(result.startsWith('Special!@#')).toBe(true);
    });

    it('should handle unicode characters', () => {
      const text = '你好世界👋🌍';
      const result = truncateText(text, 4);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle emoji in text', () => {
      const text = '😀😁😂🤣😃😄😅😆';
      const result = truncateText(text, 5);
      expect(result).toContain('[TRUNCATED');
    });

    it('should trim whitespace at truncation point', () => {
      const text = 'Hello     World';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
      // The slice(0, 10) gives "Hello     W", then .trim() removes trailing spaces
      expect(result.startsWith('Hello')).toBe(true);
    });

    it('should handle very large maxChars', () => {
      const text = 'Short';
      expect(truncateText(text, 1000000)).toBe('Short');
    });

    it('should add newlines before truncation notice', () => {
      const result = truncateText('Long text here', 5);
      expect(result).toContain('\n\n[TRUNCATED');
    });

    it('should include exact character count in notice', () => {
      const result = truncateText('Text', 2, 'custom');
      expect(result).toContain('[TRUNCATED: custom exceeded 2 characters]');
    });

    it('should handle text with tabs', () => {
      const text = 'Hello\tWorld\tTest';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle text with carriage returns', () => {
      const text = 'Hello\r\nWorld\r\nTest';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle mixed whitespace', () => {
      const text = '  \t\n  Hello  \t\n  ';
      expect(truncateText(text, 20)).toBe('Hello');
    });

    it('should handle text with only special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = truncateText(text, 10);
      expect(result).toContain('[TRUNCATED');
    });

    it('should preserve beginning of text (most important)', () => {
      const text = 'IMPORTANT: This message contains critical information at the start';
      const result = truncateText(text, 20);
      expect(result.startsWith('IMPORTANT: This mess')).toBe(true);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle consecutive spaces', () => {
      const text = 'Word1     Word2     Word3';
      const result = truncateText(text, 15);
      expect(result).toContain('[TRUNCATED');
    });

    it('should handle different label types', () => {
      expect(truncateText('Long', 2, 'description')).toContain('[TRUNCATED: description exceeded 2 characters]');
      expect(truncateText('Long', 2, 'content')).toContain('[TRUNCATED: content exceeded 2 characters]');
      expect(truncateText('Long', 2, 'prompt')).toContain('[TRUNCATED: prompt exceeded 2 characters]');
    });
  });
});
