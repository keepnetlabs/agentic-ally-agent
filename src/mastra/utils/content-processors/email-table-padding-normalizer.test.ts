import { describe, expect, it } from 'vitest';
import { normalizeEmailNestedTablePadding } from './email-table-padding-normalizer';

describe('normalizeEmailNestedTablePadding', () => {
  it('moves padding from a nested table onto the containing td', () => {
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

    // The containing td should receive padding
    expect(out).toMatch(/<td[^>]*style=['"][^'"]*padding:\s*24px/i);
    // The nested table should no longer contain padding in its style
    expect(out).not.toMatch(/<table[^>]*style=['"][^'"]*padding:/i);
  });

  it('does not override td padding if already present', () => {
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
  });
});


