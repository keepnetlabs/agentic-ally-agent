import { describe, expect, it } from 'vitest';
import { normalizeEmailCentering } from './email-centering-normalizer';

describe('normalizeEmailCentering', () => {
  it('adds align=center to a td that wraps the main table (Outlook-safe)', () => {
    const input = `
      <html>
        <body>
          <table width='100%'>
            <tr>
              <td>
                <table style='max-width: 600px; border-collapse: separate;'>
                  <tr><td style='text-align:left;'>Hello</td></tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const out = normalizeEmailCentering(input);
    // Outer wrapper td should be centered, but inner text alignment should remain untouched
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
    expect(out).toMatch(/text-align:\s*left/i);
  });

  it('is a no-op for non-html input', () => {
    expect(normalizeEmailCentering('')).toBe('');
    expect(normalizeEmailCentering('hello')).toBe('hello');
  });

  it('should handle empty string input', () => {
    expect(normalizeEmailCentering('')).toBe('');
  });

  it('should handle null input gracefully', () => {
    expect(normalizeEmailCentering(null as any)).toBe(null);
  });

  it('should handle undefined input gracefully', () => {
    expect(normalizeEmailCentering(undefined as any)).toBe(undefined);
  });

  it('should handle non-string input gracefully', () => {
    expect(normalizeEmailCentering(123 as any)).toBe(123);
  });

  it('should return unchanged HTML without table tags', () => {
    const input = '<div>No tables here</div>';
    expect(normalizeEmailCentering(input)).toBe(input);
  });

  it('should return unchanged HTML without td tags', () => {
    const input = '<table><tr>No td here</tr></table>';
    expect(normalizeEmailCentering(input)).toBe(input);
  });

  it('should add align=center to wrapper td with max-width:600px (no space)', () => {
    const input = '<table><tr><td><table style="max-width:600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should add align=center to wrapper td with width=600', () => {
    const input = '<table><tr><td><table width="600"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should not add duplicate align=center if already present', () => {
    const input = '<table><tr><td align="center"><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    const matches = out.match(/align=['"]center['"]/gi);
    expect(matches?.length).toBeLessThanOrEqual(2); // One on td, one on table
  });

  it('should add margin: 0 auto to main container table', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/margin:\s*0\s*auto/i);
  });

  it('should add align=center to main container table', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<table[^>]*align=['"]center['"]/i);
  });

  it('should only center the first main container table', () => {
    const input = `
      <table><tr><td>
        <table style="max-width: 600px;"><tr><td>First</td></tr></table>
      </td></tr></table>
      <table><tr><td>
        <table style="max-width: 600px;"><tr><td>Second</td></tr></table>
      </td></tr></table>
    `;
    const out = normalizeEmailCentering(input);
    const tableMatches = out.match(/<table[^>]*style=['"][^'"]*max-width:\s*600px[^'"]*['"][^>]*>/gi);
    expect(tableMatches).toBeDefined();
    // Only first should have align=center
    const firstTable = out.match(/<table[^>]*style=['"][^'"]*max-width:\s*600px[^'"]*['"][^>]*>/i)?.[0];
    expect(firstTable).toMatch(/align=['"]center['"]/i);
  });

  it('should preserve existing styles when adding margin', () => {
    const input = '<table><tr><td><table style="max-width: 600px; background: red;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/background:\s*red/i);
    expect(out).toMatch(/margin:\s*0\s*auto/i);
  });

  it('should handle table with width=600 without quotes', () => {
    const input = '<table><tr><td><table width=600><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should handle table with width="600" with quotes', () => {
    const input = '<table><tr><td><table width="600"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should handle nested tables correctly', () => {
    const input = `
      <table width="100%">
        <tr>
          <td>
            <table style="max-width: 600px;">
              <tr>
                <td>
                  <table>
                    <tr><td>Nested content</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should handle whitespace before table tag', () => {
    const input = '<table><tr><td>  \n  <table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should preserve case of existing attributes', () => {
    const input = '<table><tr><td CLASS="test"><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toContain('CLASS="test"');
  });

  it('should handle multiple attributes on td', () => {
    const input = '<table><tr><td class="wrapper" id="main"><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*class="wrapper"[^>]*align=['"]center['"]/i);
    expect(out).toContain('id="main"');
  });

  it('should handle multiple attributes on table', () => {
    const input = '<table><tr><td><table class="main" style="max-width: 600px;" border="0"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toContain('class="main"');
    expect(out).toContain('border="0"');
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should handle style attribute with trailing semicolon', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/margin:\s*0\s*auto/i);
  });

  it('should handle style attribute without trailing semicolon', () => {
    const input = '<table><tr><td><table style="max-width: 600px"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/margin:\s*0\s*auto/i);
  });

  it('should not add margin if already present', () => {
    const input = '<table><tr><td><table style="max-width: 600px; margin: 0 auto;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    const marginMatches = out.match(/margin:\s*0\s*auto/gi);
    expect(marginMatches?.length).toBe(1);
  });

  it('should handle case-insensitive td tags', () => {
    const input = '<table><tr><TD><table style="max-width: 600px;"><tr><td>Content</td></tr></table></TD></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should handle complex email template', () => {
    const input = `
      <!DOCTYPE html>
      <html>
        <head><title>Email</title></head>
        <body style="margin: 0; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table style="max-width: 600px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 20px;">
                      <h1>Hello World</h1>
                      <p>Content here</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
    expect(out).toMatch(/margin:\s*0\s*auto/i);
  });

  it('should preserve email structure integrity', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td style="text-align: left;">Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toContain('text-align: left');
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should handle single quotes in attributes', () => {
    const input = "<table><tr><td><table style='max-width: 600px;'><tr><td>Content</td></tr></table></td></tr></table>";
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should handle mixed quotes in attributes', () => {
    const input = '<table><tr><td class="wrapper"><table style=\'max-width: 600px;\'><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should handle tables without max-width or width=600', () => {
    const input = '<table><tr><td><table style="width: 100%;"><tr><td>Content</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    // Should still add align=center to wrapper td
    expect(out).toMatch(/<td[^>]*align=['"]center['"]/i);
  });

  it('should not modify table content', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td>Important content that should not change</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toContain('Important content that should not change');
  });

  it('should handle empty table', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should handle table with only whitespace', () => {
    const input = '<table><tr><td>   <table style="max-width: 600px;">   </table>   </td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
  });

  it('should preserve HTML entities', () => {
    const input = '<table><tr><td><table style="max-width: 600px;"><tr><td>&nbsp;&amp;&lt;&gt;</td></tr></table></td></tr></table>';
    const out = normalizeEmailCentering(input);
    expect(out).toContain('&nbsp;');
    expect(out).toContain('&amp;');
    expect(out).toContain('&lt;');
    expect(out).toContain('&gt;');
  });

  it('should handle very long HTML content', () => {
    const longContent = '<p>' + 'A'.repeat(10000) + '</p>';
    const input = `<table><tr><td><table style="max-width: 600px;"><tr><td>${longContent}</td></tr></table></td></tr></table>`;
    const out = normalizeEmailCentering(input);
    expect(out).toMatch(/align=['"]center['"]/i);
    expect(out).toContain('A'.repeat(10000));
  });
});


