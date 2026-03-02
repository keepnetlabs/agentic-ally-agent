import { describe, it, expect } from 'vitest';
import { normalizeLandingLogoCentering } from './logo-centering-normalizer';

describe('logo-centering-normalizer', () => {
  describe('normalizeLandingLogoCentering', () => {
    it('returns original when no icon-like divs', () => {
      const html = '<div style="width: 100%;">Content</div>';
      expect(normalizeLandingLogoCentering(html)).toBe(html);
    });

    it('returns original for empty string', () => {
      expect(normalizeLandingLogoCentering('')).toBe('');
    });

    it('returns original for null/undefined', () => {
      expect(normalizeLandingLogoCentering(null as any)).toBe(null);
      expect(normalizeLandingLogoCentering(undefined as any)).toBe(undefined);
    });

    it('wraps icon-like div with centered container', () => {
      const html = `<div style="width: 64px; height: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const result = normalizeLandingLogoCentering(html);
      expect(result).toContain('display: flex; justify-content: center');
      expect(result).toContain('margin-bottom: 24px');
      expect(result).toContain('✓');
    });

    it('handles icon div with border-radius in px', () => {
      const html = `<div style="border-radius: 50px; width: 96px; display: flex;">Icon</div>`;
      const result = normalizeLandingLogoCentering(html);
      expect(result).toContain('justify-content: center');
    });

    it('does not wrap div without all icon-like properties', () => {
      const html = `<div style="width: 64px; border-radius: 999px;">No flex</div>`;
      const result = normalizeLandingLogoCentering(html);
      expect(result).not.toContain('justify-content: center');
    });

    it('handles multiple icon divs', () => {
      const html = `<div style="width: 64px; border-radius: 999px; display: flex;">A</div><div style="width: 64px; border-radius: 999px; display: flex;">B</div>`;
      const result = normalizeLandingLogoCentering(html);
      const wrapCount = (result.match(/justify-content: center/g) || []).length;
      expect(wrapCount).toBe(2);
    });
  });
});
