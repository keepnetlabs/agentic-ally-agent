import { describe, expect, it } from 'vitest';
import { normalizeEmailNestedTablePadding } from './email-table-padding-normalizer';

describe('normalizeEmailNestedTablePadding', () => {
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


