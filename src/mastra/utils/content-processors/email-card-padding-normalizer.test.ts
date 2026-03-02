import { describe, expect, it } from 'vitest';
import { normalizeEmailCardContentPadding } from './email-card-padding-normalizer';

describe('email-card-padding-normalizer', () => {
  describe('normalizeEmailCardContentPadding', () => {
    it('returns original when no table/td present', () => {
      const input = '<div><p>No table</p></div>';
      expect(normalizeEmailCardContentPadding(input)).toBe(input);
    });

    it('returns original for empty string', () => {
      expect(normalizeEmailCardContentPadding('')).toBe('');
    });

    it('returns original for null/undefined', () => {
      expect(normalizeEmailCardContentPadding(null as any)).toBe(null);
      expect(normalizeEmailCardContentPadding(undefined as any)).toBe(undefined);
    });

    it('adds padding to card table td with font-family and padding:0', () => {
      const input = `<table style="background:#fff; border-radius:8px;"><tr><td style="font-family:Arial; padding:0;">Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toMatch(/padding:\s*24px/i);
    });

    it('adds padding to td with padding: 0px', () => {
      const input = `<table style="background:#fff; border-radius:8px;"><tr><td style="font-family:Arial; padding:0px;">Text</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toMatch(/padding:\s*24px/i);
    });

    it('adds horizontal padding when td has font-family but no padding', () => {
      const input = `<table><tr><td style="font-family:Arial; line-height:1.5;">Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toMatch(/padding-left:\s*24px/i);
      expect(out).toMatch(/padding-right:\s*24px/i);
    });

    it('respects custom defaultPaddingPx', () => {
      const input = `<table style="background:#fff; border-radius:8px;"><tr><td style="font-family:Arial; padding:0;">X</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 32);
      expect(out).toMatch(/padding:\s*32px/i);
    });

    it('does not override td that already has sufficient padding', () => {
      const input = `<table><tr><td style="font-family:Arial; padding: 24px;">Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toContain('padding: 24px');
    });

    it('handles card table with white background and border-radius', () => {
      const input = `<table style="background-color:#ffffff; border-radius:12px;"><tr><td style="font-size:14px; padding:0;">Card content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toMatch(/padding/i);
    });

    it('preserves non-card tables structure', () => {
      const input = `<table style="width:100%;"><tr><td>Simple</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toContain('<td>');
    });
  });
});
