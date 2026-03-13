import { describe, it, expect } from 'vitest';
import { normalizeEmailHrSpacing } from './email-hr-spacing-normalizer';

describe('normalizeEmailHrSpacing', () => {
  // ============================================
  // Pattern 1a: Zero-padding separators (GrapeJS)
  // ============================================

  describe('zero-padding separators (padding: 0)', () => {
    it('adds spacer table + margin-bottom to zero-padding separator after </table>', () => {
      const input = [
        '</table>',
        '<table style="width: 100%;"><tbody><tr>',
        '<td style="border-top: 0.5px solid #707070; padding: 0; line-height: 0; font-size: 0; padding-top: 0; padding-bottom: 0;"></td>',
        '</tr></tbody></table>',
      ].join('');
      const result = normalizeEmailHrSpacing(input);
      // Spacer table injected before separator
      expect(result).toContain('height: 36px;');
      // margin-bottom on separator table
      expect(result).toMatch(/<table style="width: 100%; margin-bottom: 36px;"/);
    });

    it('handles padding: 0 without longhand overrides', () => {
      const input = '</table><table><tbody><tr><td style="border-top: 1px solid #ccc; padding: 0;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('height: 36px;');
      expect(result).toContain('margin-bottom: 36px');
    });

    it('handles explicit longhand padding-top: 0 + padding-bottom: 0', () => {
      const input = '</table><table style="width:100%;"><tbody><tr><td style="border-top: 1px solid #000; padding-top: 0; padding-bottom: 0;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('height: 36px;');
      expect(result).toContain('margin-bottom: 36px');
    });

    it('adds margin-bottom to first zero-padding separator (not preceded by </table>)', () => {
      const input = '<table style="width:100%;"><tbody><tr><td style="border-top: 0.5px solid #707070; padding: 0;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      // No spacer (first separator)
      expect(result).not.toContain('height: 36px;');
      expect(result).toContain('margin-bottom: 36px');
    });
  });

  // ============================================
  // Pattern 1b: Asymmetric-padding separators
  // ============================================

  describe('asymmetric-padding separators (padding: 0 0 Npx 0)', () => {
    it('adds spacer + margin-bottom equal to bottom padding', () => {
      const input = '</table><table style="width: 100%;"><tbody><tr><td style="padding: 0 0 36px 0; border-top: 0.5px solid #707070;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('height: 36px;');
      expect(result).toContain('margin-bottom: 36px');
    });

    it('uses actual bottom value (24px)', () => {
      const input = '</table><table style="width: 100%;"><tbody><tr><td style="padding: 0 0 24px 0; border-top: 1px solid #ccc;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('height: 24px;');
      expect(result).toContain('margin-bottom: 24px');
    });
  });

  // ============================================
  // Realistic GrapeJS footer structure
  // ============================================

  describe('realistic GrapeJS structures', () => {
    it('handles full footer with zero-padding separators', () => {
      const input = [
        '<td style="padding-bottom: 36px;">',
        // First separator — NOT preceded by </table> → margin-bottom only
        '<table id="iz92a"><tbody><tr>',
        '<td id="ifk4k" style="border-top: 0.5px solid #707070; padding: 0; padding-top: 0; padding-bottom: 0;"></td>',
        '</tr></tbody></table>',
        // Content
        '<table id="irmrj"><tbody><tr><td>Beautifully obvious tools</td></tr></tbody></table>',
        // Second separator — preceded by </table> → spacer + margin-bottom
        '<table id="ixpa5"><tbody><tr>',
        '<td id="ixjy9" style="border-top: 0.5px solid #707070; padding: 0; padding-top: 0; padding-bottom: 0;"></td>',
        '</tr></tbody></table>',
        '</td>',
      ].join('');

      const result = normalizeEmailHrSpacing(input);

      // First separator table: margin-bottom only (no spacer before it)
      expect(result).toMatch(/id="iz92a" style="margin-bottom: 36px;"><tbody>/);

      // Second separator: spacer table injected before it + margin-bottom
      expect(result).toMatch(/height: 36px;.*id="ixpa5"/s);
      expect(result).toMatch(/id="ixpa5" style="margin-bottom: 36px;"><tbody>/);
    });

    it('handles footer with asymmetric-padding separators', () => {
      const input = [
        '<td style="padding-bottom: 36px;">',
        '<table id="irny9" style="width:100%;"><tbody><tr>',
        '<td style="padding: 0 0 36px 0; border-top: 0.5px solid #707070;"></td>',
        '</tr></tbody></table>',
        '<table id="irmrj"><tbody><tr><td>Content</td></tr></tbody></table>',
        '<table id="irt8k" style="width:100%;"><tbody><tr>',
        '<td style="padding: 0 0 36px 0; border-top: 0.5px solid #707070;"></td>',
        '</tr></tbody></table>',
        '</td>',
      ].join('');

      const result = normalizeEmailHrSpacing(input);
      // First separator: margin-bottom only
      expect(result).toMatch(/id="irny9" style="width:100%; margin-bottom: 36px;"><tbody>/);
      // Second separator: spacer + margin-bottom
      expect(result).toMatch(/id="irt8k" style="width:100%; margin-bottom: 36px;"><tbody>/);
    });
  });

  // ============================================
  // Pattern 2: Real <hr> elements
  // ============================================

  describe('real <hr> elements', () => {
    it('adds margin-top to <hr> after </table>', () => {
      const input = '</table><hr style="border: none; border-top: 0.5px solid #707070; margin: 0 0 36px 0;">';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('margin: 36px 0 36px 0');
    });

    it('does NOT modify first <hr>', () => {
      const input = '<td><hr style="margin: 0 0 36px 0;"></td>';
      expect(normalizeEmailHrSpacing(input)).toBe(input);
    });
  });

  // ============================================
  // Edge cases
  // ============================================

  describe('edge cases', () => {
    it('returns empty/falsy input unchanged', () => {
      expect(normalizeEmailHrSpacing('')).toBe('');
      expect(normalizeEmailHrSpacing(null as any)).toBe(null);
    });

    it('returns html without separators unchanged', () => {
      expect(normalizeEmailHrSpacing('<p>Hello</p>')).toBe('<p>Hello</p>');
    });

    it('does NOT modify td without border-top', () => {
      const input = '</table><table><tbody><tr><td style="padding: 0 0 36px 0;">Content</td></tr></tbody></table>';
      expect(normalizeEmailHrSpacing(input)).not.toContain('margin-bottom');
    });

    it('skips separator table that already has margin-bottom', () => {
      const input = '</table><table style="margin-bottom: 24px;"><tbody><tr><td style="border-top: 1px solid #ccc; padding: 0;"></td></tr></tbody></table>';
      expect(normalizeEmailHrSpacing(input)).toBe(input);
    });

    it('handles whitespace between </table> and separator', () => {
      const input = '</table>\n  <table><tbody><tr><td style="border-top: 1px solid #ccc; padding: 0;"></td></tr></tbody></table>';
      const result = normalizeEmailHrSpacing(input);
      expect(result).toContain('height: 36px;');
      expect(result).toContain('margin-bottom: 36px');
    });
  });

  // ============================================
  // Real production HTML (user-reported)
  // ============================================

  describe('real production WeTransfer footer HTML', () => {
    it('adds spacer + margins to separator with verbose GrapeJS attrs', () => {
      const input = [
        '</table>',
        '<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" id="ig993" ',
        'style="box-sizing: border-box; text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse;">',
        '<tbody style="box-sizing: border-box;">',
        '<tr style="box-sizing: border-box;">',
        '<td id="imgro" style="box-sizing: border-box; text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; ',
        'padding: 0 0 36px 0; border-top: 0.5px solid #707070; padding-top: 0; padding-right: 0; padding-bottom: 0; padding-left: 0;">',
        '</td></tr></tbody></table>',
      ].join('');

      const result = normalizeEmailHrSpacing(input);
      // Spacer table injected
      expect(result).toContain('height: 36px;');
      // margin-bottom on separator
      expect(result).toContain('margin-bottom: 36px');
    });

    it('handles full production footer with both separators', () => {
      const input = [
        '<td id="i7kxr" style="padding-bottom: 36px;">',
        '<table width="100%" id="ix02h" style="box-sizing: border-box; border-collapse: collapse;">',
        '<tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;">',
        '<td id="ipi6k" style="box-sizing: border-box; padding: 0 0 36px 0; border-top: 0.5px solid #707070; padding-top: 0; padding-bottom: 0; padding-left: 0;"></td>',
        '</tr></tbody></table>',
        '<table id="irmrj" style="box-sizing: border-box; border-collapse: collapse;">',
        '<tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;">',
        '<td style="box-sizing: border-box; font-size: 14px;">Beautifully obvious tools</td>',
        '</tr></tbody></table>',
        '<table width="100%" id="ig993" style="box-sizing: border-box; border-collapse: collapse;">',
        '<tbody style="box-sizing: border-box;"><tr style="box-sizing: border-box;">',
        '<td id="imgro" style="box-sizing: border-box; padding: 0 0 36px 0; border-top: 0.5px solid #707070; padding-top: 0; padding-bottom: 0; padding-left: 0;"></td>',
        '</tr></tbody></table>',
        '</td>',
      ].join('');

      const result = normalizeEmailHrSpacing(input);

      // First separator (ix02h): margin-bottom only, no spacer
      expect(result).toMatch(/id="ix02h" style="box-sizing: border-box; border-collapse: collapse; margin-bottom: 36px;"/);
      expect(result).not.toMatch(/height: 36px.*id="ix02h"/s);

      // Second separator (ig993): spacer before it + margin-bottom
      expect(result).toMatch(/height: 36px.*id="ig993"/s);
      expect(result).toMatch(/id="ig993" style="box-sizing: border-box; border-collapse: collapse; margin-bottom: 36px;"/);
    });
  });
});
