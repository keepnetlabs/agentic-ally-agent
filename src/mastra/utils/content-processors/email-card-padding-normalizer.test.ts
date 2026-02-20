import { describe, expect, it } from 'vitest';
import { normalizeEmailCardContentPadding } from './email-card-padding-normalizer';

describe('normalizeEmailCardContentPadding', () => {
  // ==================== BASIC FUNCTIONALITY ====================
  describe('Basic Functionality', () => {
    it('adds padding to the primary content td inside a card table when missing/zero', () => {
      const input = `
        <table width='100%' style='max-width:600px; margin:0 auto; border-collapse:separate; background-color:#f3f4f6;'>
          <tr>
            <td style='padding:20px; text-align:center;'>
              <table style='background-color:#ffffff; border-radius:18px; box-shadow:0 4px 16px rgba(0,0,0,0.1); max-width:420px; margin:0 auto;'>
                <tr><td style='text-align:center; padding:0 0 20px 0;'><img src='x' /></td></tr>
                <tr><td style='padding:0; text-align:left; font-family:Arial, sans-serif; font-size:14px; line-height:1.5;'>Hello</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style='padding:10px 0; font-family:Arial, sans-serif; font-size:12px;'>Footer</td>
          </tr>
        </table>
      `;

      const out = normalizeEmailCardContentPadding(input, 24);

      // Content td should receive padding: 24px (or have padding:0 replaced)
      // We check that style contains padding: 24px OR padding-left/right: 24px
      expect(out).toContain('padding: 24px');
      // Footer padding should remain unchanged
      expect(out).toMatch(/<td[^>]*padding:\s*10px 0[^>]*>Footer/i);
    });

    it('should apply padding to multiple consecutive text paragraphs (Outlook Fix)', () => {
      // Simulating the user's report: multiple rows where only padding-top is set
      const input = `
        <table style='background:#ffffff; border-radius:18px;'>
          <tr><td style='padding-top:12px; font-family:Arial; line-height:1.5;'>First Para</td></tr>
          <tr><td style='padding-top:12px; font-family:Arial; line-height:1.5;'>Second Para</td></tr>
          <tr><td style='padding-top:12px; font-family:Arial; line-height:1.5;'>Third Para</td></tr>
        </table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);

      // Should inject padding-left/right: 24px into ALL of them
      // Logic: original padding-top:12px is kept, but padding-left: 24px and padding-right: 24px are appended.

      // Check for presence of padding-left: 24px in all 3 rows
      const matches = out.match(/padding-left:\s*24px/g);
      expect(matches?.length).toBeGreaterThanOrEqual(3);

      // Validate formatting of one of them
      // Expect: style='padding-top:12px; font-family:Arial; line-height:1.5; padding-left: 24px; padding-right: 24px;'
      expect(out).toContain('padding-top:12px');
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');

      // Also verify it didn't just delete the content
      expect(out).toContain('First Para');
      expect(out).toContain('Second Para');
      expect(out).toContain('Third Para');
    });

    it('should fix "padding: 12px 0" shorthand (common failure case)', () => {
      // Add font-family so it counts as "content-like" per heuristic
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding: 12px 0; font-family:Arial;'>Edge Case</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);

      // Original: padding: 12px 0 -> defines horizontal as 0.
      // Fixed: Should either replace it or append padding-left/right overrides.
      // Expect: padding-left: 24px (or similar)
      expect(out).toMatch(/padding-left:\s*24px/);
      expect(out).toMatch(/padding-right:\s*24px/);
    });
  });

  // ==================== PADDING: 0 VARIANTS ====================
  describe('Padding: 0 Variants', () => {
    it('should fix padding:0', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should fix padding: 0 (with space)', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding: 0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should fix padding:0px', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding:0px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should fix padding: 0 0', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding: 0 0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should fix padding: 0 0 0 0', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding: 0 0 0 0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should fix PADDING:0 (uppercase)', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='PADDING:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });
  });

  // ==================== PARTIAL PADDING ISSUES ====================
  describe('Partial Padding Issues', () => {
    it('should add horizontal padding when only padding-top exists', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding-top: 16px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding-top: 16px');
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');
    });

    it('should add horizontal padding when only padding-bottom exists', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding-bottom: 16px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding-bottom: 16px');
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');
    });

    it('should fix "padding: 10px 0 10px 0"', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding: 10px 0 10px 0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');
    });

    it('should fix "padding: 5px 0 10px 0"', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding: 5px 0 10px 0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');
    });

    it('should not override existing padding-left if already set', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding-left: 30px; padding-top: 10px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should not add another padding-left
      const leftMatches = out.match(/padding-left/g);
      expect(leftMatches?.length).toBe(1);
      expect(out).toContain('padding-left: 30px');
    });

    it('should not override existing padding-right if already set', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding-right: 30px; padding-top: 10px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should not add another padding-right
      const rightMatches = out.match(/padding-right/g);
      expect(rightMatches?.length).toBe(1);
      expect(out).toContain('padding-right: 30px');
    });
  });

  // ==================== CARD DETECTION ====================
  describe('Card Detection', () => {
    it('should detect card with background:#ffffff and border-radius', () => {
      const input = `<table style='background:#ffffff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should detect card with background-color:#ffffff and border-radius', () => {
      const input = `<table style='background-color:#ffffff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should detect card with #fff shorthand', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should detect card with background:white', () => {
      const input = `<table style='background:white; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should NOT modify tables without border-radius', () => {
      const input = `<table style='background:#ffffff;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should remain unchanged (or at least not have padding: 24px)
      expect(out).not.toContain('padding: 24px');
    });

    it('should NOT modify tables without white background', () => {
      const input = `<table style='background:#f3f4f6; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should remain unchanged
      expect(out).not.toContain('padding: 24px');
    });

    it('should handle card with mixed case style attributes', () => {
      const input = `<table style='BACKGROUND:#FFFFFF; BORDER-RADIUS:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });
  });

  // ==================== CONTENT-LIKE TD DETECTION ====================
  describe('Content-Like TD Detection', () => {
    it('should detect td with font-family as content-like', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should detect td with line-height as content-like', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; line-height:1.5;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should detect td with font-size as content-like', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-size:14px;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should NOT modify td without content-like attributes', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; text-align:center;'><img src='x' /></td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should not modify this td (it's an image container, not text)
      expect(out).not.toContain('padding: 24px');
    });

    it('should handle td with multiple content indicators', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial; line-height:1.5; font-size:14px;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should handle FONT-FAMILY (uppercase)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; FONT-FAMILY:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });
  });

  // ==================== CUSTOM DEFAULT PADDING ====================
  describe('Custom Default Padding', () => {
    it('should use 24px by default', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input);
      expect(out).toContain('padding: 24px');
    });

    it('should use custom padding value (16px)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 16);
      expect(out).toContain('padding: 16px');
    });

    it('should use custom padding value (32px)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 32);
      expect(out).toContain('padding: 32px');
    });

    it('should use custom padding value (8px)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 8);
      expect(out).toContain('padding: 8px');
    });
  });

  // ==================== MULTIPLE CARDS ====================
  describe('Multiple Cards', () => {
    it('should process multiple cards independently', () => {
      const input = `
        <table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Card 1</td></tr></table>
        <table style='background:#ffffff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Card 2</td></tr></table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Both should be fixed
      const paddingMatches = out.match(/padding: 24px/g);
      expect(paddingMatches?.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle nested cards', () => {
      const input = `
        <table style='background:#fff; border-radius:18px;'>
          <tr><td style='padding:0; font-family:Arial;'>
            Outer Card
            <table style='background:#ffffff; border-radius:12px;'>
              <tr><td style='padding:0; font-family:Arial;'>Inner Card</td></tr>
            </table>
          </td></tr>
        </table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Both cards should be processed
      const paddingMatches = out.match(/padding: 24px/g);
      expect(paddingMatches?.length).toBeGreaterThanOrEqual(2);
    });

    it('should process multiple rows in same card', () => {
      const input = `
        <table style='background:#fff; border-radius:18px;'>
          <tr><td style='padding:0; font-family:Arial;'>Row 1</td></tr>
          <tr><td style='padding:0; font-family:Arial;'>Row 2</td></tr>
          <tr><td style='padding:0; font-family:Arial;'>Row 3</td></tr>
        </table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);
      // All 3 rows should be fixed
      const paddingMatches = out.match(/padding: 24px/g);
      expect(paddingMatches?.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==================== COMPLEX HTML STRUCTURES ====================
  describe('Complex HTML Structures', () => {
    it('should handle deeply nested tables', () => {
      const input = `
        <table width='100%'>
          <tr><td>
            <table style='background:#fff; border-radius:18px;'>
              <tr><td>
                <table>
                  <tr><td style='padding:0; font-family:Arial;'>Deep Content</td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>
        </table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should preserve other table attributes', () => {
      const input = `<table width='600' cellpadding='0' cellspacing='0' border='0' style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // parse5 may convert quotes, so check for either single or double
      expect(out).toMatch(/width=["']600["']/);
      expect(out).toMatch(/cellpadding=["']0["']/);
      expect(out).toMatch(/cellspacing=["']0["']/);
      expect(out).toMatch(/border=["']0["']/);
    });

    it('should preserve other td attributes', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td align='center' valign='top' class='content' style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // parse5 may convert quotes, so check for either single or double
      expect(out).toMatch(/align=["']center["']/);
      expect(out).toMatch(/valign=["']top["']/);
      expect(out).toMatch(/class=["']content["']/);
    });

    it('should handle mixed single and double quotes', () => {
      const input = `<table style="background:#fff; border-radius:18px;"><tr><td style="padding:0; font-family:Arial;">Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should handle tables with no style attribute', () => {
      const input = `<table><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should not modify (not a card)
      expect(out).not.toContain('padding: 24px');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle empty HTML', () => {
      const out = normalizeEmailCardContentPadding('', 24);
      expect(out).toBe('');
    });

    it('should handle HTML without tables', () => {
      const input = '<div>No tables here</div>';
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toBe(input);
    });

    it('should handle HTML without td', () => {
      const input = '<table><tr></tr></table>';
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('<table>');
    });

    it('should handle null input', () => {
      // @ts-ignore - Testing runtime behavior
      const out = normalizeEmailCardContentPadding(null, 24);
      expect(out).toBe(null);
    });

    it('should handle undefined input', () => {
      // @ts-ignore - Testing runtime behavior
      const out = normalizeEmailCardContentPadding(undefined, 24);
      expect(out).toBe(undefined);
    });

    it('should handle non-string input', () => {
      // @ts-ignore - Testing runtime behavior
      const out = normalizeEmailCardContentPadding(123, 24);
      expect(out).toBe(123);
    });

    it('should handle very long HTML', () => {
      const longTable =
        '<table style="background:#fff; border-radius:18px;"><tr><td style="padding:0; font-family:Arial;">'.repeat(
          100
        ) +
        'Content' +
        '</td></tr></table>'.repeat(100);
      const out = normalizeEmailCardContentPadding(longTable, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should handle special characters in content', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content with <>&"'</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
      expect(out).toContain('Content with');
    });

    it('should handle unicode characters', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>您好世界 🌍</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
      expect(out).toContain('您好世界');
    });

    it('should handle td with no style attribute', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td>No style</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should not crash, but may not modify (no content-like indicators)
      expect(out).toContain('No style');
    });

    it('should handle empty style attribute', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style=''>Empty</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('Empty');
    });
  });

  // ==================== STYLE PRESERVATION ====================
  describe('Style Preservation', () => {
    it('should preserve other CSS properties', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial; color:#333; font-size:14px; line-height:1.5;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('color:#333');
      expect(out).toContain('font-size:14px');
      expect(out).toContain('line-height:1.5');
      expect(out).toContain('font-family:Arial');
    });

    it('should preserve style ordering (appends new properties)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='color:#333; font-family:Arial; padding:0;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // New padding should come after existing properties
      const tdMatch = out.match(/<td[^>]*style=['"]([^'"]*)['"]/);
      expect(tdMatch).not.toBeNull();
      if (tdMatch) {
        const styleValue = tdMatch[1];
        const colorIndex = styleValue.indexOf('color:#333');
        const paddingIndex = styleValue.indexOf('padding: 24px');
        expect(colorIndex).toBeLessThan(paddingIndex);
      }
    });

    it('should handle semicolon at end of style', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should have semicolons properly placed
      expect(out).toMatch(/padding: 24px;/);
    });

    it('should handle missing semicolon at end of style', () => {
      const input = `<table style='background:#fff; border-radius:18px'><tr><td style='padding:0; font-family:Arial'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });
  });

  // ==================== PERFORMANCE & FAST EXITS ====================
  describe('Performance & Fast Exits', () => {
    it('should fast exit for HTML without <table', () => {
      const input = '<div>No tables</div>';
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toBe(input);
    });

    it('should fast exit for HTML without <td', () => {
      const input = '<table><tr></tr></table>';
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('<table>');
    });

    it('should handle multiple fast exits efficiently', () => {
      const inputs = ['', '<div>test</div>', '<table></table>', '<p>paragraph</p>'];
      inputs.forEach(input => {
        const out = normalizeEmailCardContentPadding(input, 24);
        expect(out).toBeDefined();
      });
    });
  });

  // ==================== REGRESSION TESTS ====================
  describe('Regression Tests', () => {
    it('should not add padding to image-only tds', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding:0; text-align:center;'><img src='logo.png' /></td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // Should NOT add padding (no font-family/line-height/font-size)
      expect(out).not.toContain('padding: 24px');
    });

    it('should handle "padding: 20px" (non-zero, should not override)', () => {
      const input = `<table style='background:#fff; border-radius:18px;'><tr><td style='padding: 20px; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      // horizontal component is already 20px — no override should be injected
      expect(out).not.toContain('padding-left: 24px');
      expect(out).not.toContain('padding-right: 24px');
      expect(out).toContain('padding: 20px');
    });

    it('should fix the exact Outlook bug case', () => {
      const input = `
        <table style='background:#ffffff; border-radius:18px;'>
          <tr><td style='padding: 12px 0; font-family:Arial, sans-serif; font-size:14px; line-height:1.5;'>
            This text has no horizontal padding in Outlook.
          </td></tr>
        </table>
      `;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 12px 0');
      expect(out).toContain('padding-left: 24px');
      expect(out).toContain('padding-right: 24px');
      expect(out).toContain('This text has no horizontal padding in Outlook');
    });

    it('should handle cards with box-shadow', () => {
      const input = `<table style='background:#fff; border-radius:18px; box-shadow:0 4px 16px rgba(0,0,0,0.1);'><tr><td style='padding:0; font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
      expect(out).toContain('box-shadow');
    });
  });

  // ==================== WHITESPACE HANDLING ====================
  describe('Whitespace Handling', () => {
    it('should handle tabs in style', () => {
      const input = `<table style='background:#fff;\tborder-radius:18px;'><tr><td style='padding:0;\tfont-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should handle newlines in style', () => {
      const input = `<table style='background:#fff;
        border-radius:18px;'><tr><td style='padding:0;
        font-family:Arial;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });

    it('should handle extra spaces in style', () => {
      const input = `<table style='  background:#fff  ;  border-radius:18px  ;'><tr><td style='  padding:0  ;  font-family:Arial  ;'>Content</td></tr></table>`;
      const out = normalizeEmailCardContentPadding(input, 24);
      expect(out).toContain('padding: 24px');
    });
  });
});
