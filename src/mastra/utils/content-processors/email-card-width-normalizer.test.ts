import { describe, it, expect } from 'vitest';
import { normalizeEmailCardWidth } from './email-card-width-normalizer';

describe('email-card-width-normalizer', () => {
  describe('normalizeEmailCardWidth', () => {
    it('returns original when no max-width in html', () => {
      const html = '<table><tr><td>Content</td></tr></table>';
      expect(normalizeEmailCardWidth(html)).toBe(html);
    });

    it('returns original when no 420px in html', () => {
      const html = '<table style="max-width: 600px; background: #fff;">Content</table>';
      expect(normalizeEmailCardWidth(html)).toBe(html);
    });

    it('returns original for empty string', () => {
      expect(normalizeEmailCardWidth('')).toBe('');
    });

    it('returns original for null/undefined', () => {
      expect(normalizeEmailCardWidth(null as any)).toBe(null);
      expect(normalizeEmailCardWidth(undefined as any)).toBe(undefined);
    });

    it('widens card table from 420px to 560px when has white bg and border-radius', () => {
      const html = `<table style="max-width: 420px; background: #fff; border-radius: 8px;"><tr><td>Card content</td></tr></table>`;
      const result = normalizeEmailCardWidth(html);
      expect(result).toContain('max-width: 560px');
      expect(result).not.toContain('max-width: 420px');
    });

    it('widens when has background and box-shadow (alternative to border-radius)', () => {
      const html = `<table style="max-width: 420px; background: white; box-shadow: 0 2px 4px;"><tr><td>Card</td></tr></table>`;
      const result = normalizeEmailCardWidth(html);
      expect(result).toContain('max-width: 560px');
    });

    it('does not widen table without card-like styles', () => {
      const html = `<table style="max-width: 420px;"><tr><td>Plain table</td></tr></table>`;
      const result = normalizeEmailCardWidth(html);
      expect(result).toContain('max-width: 420px');
    });

    it('does not widen table with background but no border-radius or box-shadow', () => {
      const html = `<table style="max-width: 420px; background: #fff;"><tr><td>No radius</td></tr></table>`;
      const result = normalizeEmailCardWidth(html);
      expect(result).toContain('max-width: 420px');
    });

    it('handles double-quoted style', () => {
      const html = `<table style="max-width: 420px; background: #fff; border-radius: 8px;"><tr><td>X</td></tr></table>`;
      const result = normalizeEmailCardWidth(html);
      expect(result).toContain('560px');
    });
  });
});
