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
    expect(out).toMatch(/<td[^>]*font-family:[^'"]*[^>]*padding:\s*24px/i);
    // Footer padding should remain unchanged
    expect(out).toMatch(/<td[^>]*padding:\s*10px 0[^>]*>Footer/i);
  });
});


