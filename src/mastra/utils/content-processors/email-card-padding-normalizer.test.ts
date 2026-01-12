import { describe, expect, it } from 'vitest';
import { normalizeEmailCardContentPadding } from './email-card-padding-normalizer';

describe('normalizeEmailCardContentPadding', () => {
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
