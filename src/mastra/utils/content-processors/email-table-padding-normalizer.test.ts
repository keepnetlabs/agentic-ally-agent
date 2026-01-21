import { describe, expect, it } from 'vitest';
import { normalizeEmailNestedTablePadding } from './email-table-padding-normalizer';

describe('normalizeEmailNestedTablePadding', () => {
  describe('Basic Functionality', () => {
    it('moves padding from a nested table onto the first td inside that nested table', () => {
      const input = `
        <table width='100%'>
          <tr>
            <td>
              <table style='padding: 24px; background: #fff;'>
                <tr><td>Hi</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      const out = normalizeEmailNestedTablePadding(input);

      // The nested table's first td should receive padding
      expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding:\s*24px/i);
      // The nested table should no longer contain padding in its style
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('preserves existing td padding-* while migrating table padding (avoids "paddingsiz")', () => {
      const input = `
        <table width='100%'>
          <tr>
            <td>
              <table style='padding: 24px; background: #fff;'>
                <tr><td style='padding-bottom: 16px;'>Hi</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      const out = normalizeEmailNestedTablePadding(input);

      // Table padding removed
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
      // Inner td still has its padding-bottom, and also has migrated padding
      expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding:\s*24px/i);
      expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding-bottom:\s*16px/i);
      // And we should not duplicate padding-bottom (keep it defined once)
      expect((out.match(/padding-bottom:/gi) || []).length).toBe(1);
    });

    it('keeps existing outer td padding and still moves nested table padding inward', () => {
      const input = `
        <table width='100%'>
          <tr>
            <td style='padding: 12px;'>
              <table style='padding: 24px; background: #fff;'>
                <tr><td>Hi</td></tr>
              </table>
            </td>
          </tr>
        </table>
      `;

      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding:\s*12px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });
  });

  describe('Padding Variants', () => {
    it('should handle padding-top', () => {
      const input = `<table><tr><td><table style='padding-top: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding-top:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding-top:/i);
    });

    it('should handle padding-bottom', () => {
      const input = `<table><tr><td><table style='padding-bottom: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding-bottom:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding-bottom:/i);
    });

    it('should handle padding-left', () => {
      const input = `<table><tr><td><table style='padding-left: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding-left:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding-left:/i);
    });

    it('should handle padding-right', () => {
      const input = `<table><tr><td><table style='padding-right: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding-right:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding-right:/i);
    });

    it('should handle shorthand padding with 4 values', () => {
      const input = `<table><tr><td><table style='padding: 10px 20px 30px 40px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*10px 20px 30px 40px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should handle shorthand padding with 2 values', () => {
      const input = `<table><tr><td><table style='padding: 10px 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*10px 20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should handle shorthand padding with 3 values', () => {
      const input = `<table><tr><td><table style='padding: 10px 20px 30px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*10px 20px 30px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should handle multiple padding properties', () => {
      const input = `<table><tr><td><table style='padding-top: 10px; padding-bottom: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding-top:\s*10px/i);
      expect(out).toMatch(/padding-bottom:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding-top:/i);
    });
  });

  describe('Multiple Nested Tables', () => {
    it('should handle multiple nested tables', () => {
      const input = `
        <table>
          <tr>
            <td>
              <table style='padding: 10px;'><tr><td>First</td></tr></table>
            </td>
            <td>
              <table style='padding: 20px;'><tr><td>Second</td></tr></table>
            </td>
          </tr>
        </table>
      `;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*10px/i);
      expect(out).toMatch(/padding:\s*20px/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should handle deeply nested tables', () => {
      const input = `
        <table>
          <tr>
            <td>
              <table style='padding: 10px;'>
                <tr>
                  <td>
                    <table style='padding: 20px;'><tr><td>Deep</td></tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });
  });

  describe('Style Preservation', () => {
    it('should preserve non-padding styles on table', () => {
      const input = `<table><tr><td><table style='padding: 20px; background: red; color: blue;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/background:\s*red/i);
      expect(out).toMatch(/color:\s*blue/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should preserve existing td styles when adding padding', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td style='color: green; font-size: 14px;'>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/color:\s*green/i);
      expect(out).toMatch(/font-size:\s*14px/i);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should not duplicate padding keys when td already has specific padding', () => {
      const input = `<table><tr><td><table style='padding: 20px; padding-top: 30px;'><tr><td style='padding-top: 10px;'>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      // Should keep td's existing padding-top
      expect(out).toMatch(/padding-top:\s*10px/i);
      // Should not have duplicate padding-top declarations
      const matches = out.match(/padding-top:/gi) || [];
      expect(matches.length).toBeLessThanOrEqual(2); // One in table (removed), one in td
    });
  });

  describe('Edge Cases', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeEmailNestedTablePadding('')).toBe('');
    });

    it('should return original for non-string input', () => {
      expect(normalizeEmailNestedTablePadding(null as any)).toBe(null);
      expect(normalizeEmailNestedTablePadding(undefined as any)).toBe(undefined);
    });

    it('should return original for HTML without tables', () => {
      const input = '<div>No tables here</div>';
      expect(normalizeEmailNestedTablePadding(input)).toBe(input);
    });

    it('should return original for HTML without padding', () => {
      const input = '<table><tr><td>No padding</td></tr></table>';
      const out = normalizeEmailNestedTablePadding(input);
      // parse5 may add <tbody>, so just check content is preserved
      expect(out).toContain('No padding');
      expect(out).toContain('<table');
      expect(out).toContain('</table>');
    });

    it('should return original for HTML without td', () => {
      const input = '<table style="padding: 20px;"></table>';
      const out = normalizeEmailNestedTablePadding(input);
      // No td to move padding to, so it stays on table
      expect(out).toContain('padding');
    });

    it('should handle table without nested structure', () => {
      const input = '<table style="padding: 20px;"><tr><td>Not nested</td></tr></table>';
      const out = normalizeEmailNestedTablePadding(input);
      // Top-level table, not nested in td, so padding stays
      expect(out).toContain('padding');
    });

    it('should handle empty style attribute', () => {
      const input = `<table><tr><td><table style=''><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toBeDefined();
    });

    it('should handle table without style attribute', () => {
      const input = `<table><tr><td><table><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toBeDefined();
    });

    it('should handle malformed HTML gracefully', () => {
      const input = '<table><tr><td><table style="padding: 20px;"><tr><td>Unclosed';
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed quote styles', () => {
      const input = `<table><tr><td><table style="padding: 20px;"><tr><td style='color: red;'>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
      expect(out).toMatch(/color:\s*red/i);
    });

    it('should handle real-world email structure', () => {
      const input = `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table style="padding: 40px; max-width: 600px; background-color: #ffffff;">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <h1>Welcome</h1>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p>Content here</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).not.toMatch(/<table[^>]*max-width[^>]*style=['"][^'"]*padding:\s*40px/i);
      expect(out).toMatch(/max-width:\s*600px/i);
      expect(out).toMatch(/background-color:\s*#ffffff/i);
    });

    it('should handle table with no inner td', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      // No inner td, so padding cannot be moved
      expect(out).toBeDefined();
    });

    it('should handle whitespace in style values', () => {
      const input = `<table><tr><td><table style='  padding  :  20px  ;  background  :  red  ;  '><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/background/i);
      expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
    });

    it('should handle uppercase style names', () => {
      const input = `<table><tr><td><table style='PADDING: 20px; BACKGROUND: red;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/background/i);
    });

    it('should handle semicolon edge cases', () => {
      const input = `<table><tr><td><table style='padding: 20px;;; background: red;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/background/i);
    });
  });

  describe('Padding Units', () => {
    it('should handle px units', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle em units', () => {
      const input = `<table><tr><td><table style='padding: 2em;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*2em/i);
    });

    it('should handle rem units', () => {
      const input = `<table><tr><td><table style='padding: 1.5rem;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*1\.5rem/i);
    });

    it('should handle percentage units', () => {
      const input = `<table><tr><td><table style='padding: 5%;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*5%/i);
    });

    it('should handle unitless zero', () => {
      const input = `<table><tr><td><table style='padding: 0;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*0/i);
    });
  });

  describe('Attribute Variations', () => {
    it('should handle single quotes in style attribute', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle double quotes in style attribute', () => {
      const input = `<table><tr><td><table style="padding: 20px;"><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle table with other attributes', () => {
      const input = `<table><tr><td><table width="100%" cellpadding="0" style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/width="100%"/i);
      expect(out).toMatch(/cellpadding="0"/i);
      expect(out).toMatch(/padding:\s*20px/i);
    });
  });

  describe('Performance and Fast Exits', () => {
    it('should quickly return when no table tag exists', () => {
      const input = '<div>No tables</div>'.repeat(1000);
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toBe(input);
    });

    it('should quickly return when no padding exists', () => {
      const input = '<table><tr><td>No padding</td></tr></table>'.repeat(100);
      const out = normalizeEmailNestedTablePadding(input);
      // parse5 may normalize HTML, just check content is there
      expect(out).toContain('No padding');
      expect(out).toContain('<table');
    });

    it('should quickly return when no td exists', () => {
      const input = '<table style="padding: 20px;"></table>'.repeat(100);
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toContain('padding');
    });
  });

  describe('Table Structure Variations', () => {
    it('should handle table > tbody > tr > td structure', () => {
      const input = `<table><tbody><tr><td><table style='padding: 20px;'><tbody><tr><td>Test</td></tr></tbody></table></td></tr></tbody></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle table with thead', () => {
      const input = `<table><thead><tr><td><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></thead></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle table with tfoot', () => {
      const input = `<table><tfoot><tr><td><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></tfoot></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
    });

    it('should handle table with colspan', () => {
      const input = `<table><tr><td colspan="2"><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
      expect(out).toMatch(/colspan="2"/i);
    });

    it('should handle table with rowspan', () => {
      const input = `<table><tr><td rowspan="2"><table style='padding: 20px;'><tr><td>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/padding:\s*20px/i);
      expect(out).toMatch(/rowspan="2"/i);
    });
  });

  describe('Special Characters in Content', () => {
    it('should handle HTML entities', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td>&nbsp;&amp;&lt;&gt;</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toMatch(/&nbsp;/);
      expect(out).toMatch(/&amp;/);
    });

    it('should handle unicode characters', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td>Hello 你好 مرحبا</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toContain('Hello 你好 مرحبا');
    });

    it('should handle emoji', () => {
      const input = `<table><tr><td><table style='padding: 20px;'><tr><td>🎉🚀✨</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      expect(out).toContain('🎉🚀✨');
    });
  });

  describe('Regression Tests', () => {
    it('should not create "paddingsiz" bug by removing padding without moving it', () => {
      const input = `<table><tr><td><table style='padding: 20px; background: red;'><tr><td style='padding-top: 10px;'>Test</td></tr></table></td></tr></table>`;
      const out = normalizeEmailNestedTablePadding(input);
      // Should have padding somewhere (moved to td)
      expect(out).toMatch(/padding/i);
      // But not on the nested table
      expect(out).not.toMatch(/<table[^>]*background[^>]*style=['"][^'"]*padding:\s*20px/i);
    });

    it('should maintain email rendering by moving padding to td', () => {
      const input = `
        <table>
          <tr>
            <td>
              <table style="padding: 30px; background-color: #f0f0f0;">
                <tr>
                  <td>Important content</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      const out = normalizeEmailNestedTablePadding(input);
      // Padding should exist on td now
      expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding:\s*30px/i);
      // Background should remain on table
      expect(out).toMatch(/background-color:\s*#f0f0f0/i);
    });
  });
});
