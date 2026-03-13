import { describe, expect, it } from 'vitest';
import { normalizeEmailLocalBoxes } from './email-local-box-normalizer';

describe('normalizeEmailLocalBoxes', () => {
  it('moves local logo background ownership from outer td to inner fixed-width box', () => {
    const input = `
      <table width="600">
        <tr>
          <td align="center" bgcolor="#E0E0E0" style="background-color:#E0E0E0; border-radius:4px; padding:0;">
            <table width="200" style="width:200px;">
              <tr>
                <td style="padding:0;"><img src="logo.png" width="200" alt="logo"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    expect(out).toMatch(/<td[^>]*style="[^"]*padding:\s*0;?[^"]*"[^>]*bgcolor="?#?E0E0E0"?/i);
    expect(out).toMatch(/<td[^>]*style="[^"]*background-color:\s*#E0E0E0/i);
    expect(out).not.toMatch(/<td[^>]*align="center"[^>]*bgcolor="#E0E0E0"/i);
  });

  it('moves row background to an existing local-width wrapper when one already exists', () => {
    const input = `
      <table width="600">
        <tr>
          <td align="center" bgcolor="#E0E0E0" style="background-color:#E0E0E0; border-radius:4px; padding:0;">
            <div style="text-align:center; width:180px; margin:0 auto;">
              <img src="logo.png" width="180" alt="logo" style="display:block; width:180px; max-width:180px;">
            </div>
          </td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    expect(out).toMatch(/<div[^>]*style="[^"]*width:\s*180px[^"]*background-color:\s*#E0E0E0/i);
    expect(out).toMatch(/<div[^>]*style="[^"]*border-radius:\s*4px/i);
    expect(out).not.toMatch(/<td[^>]*align="center"[^>]*bgcolor="#E0E0E0"[^>]*style="[^"]*background-color:\s*#E0E0E0/i);
  });

  it('does not synthesize a local box when the row only contains an image', () => {
    const input = `
      <table width="600">
        <tr>
          <td align="center" bgcolor="#E0E0E0" style="background-color:#E0E0E0; border-radius:4px; padding:0;">
            <img src="logo.png" width="180" alt="logo">
          </td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    expect(out).not.toMatch(/<div[^>]*style="[^"]*background-color:\s*#E0E0E0/i);
    expect(out).toMatch(/<td[^>]*bgcolor="#E0E0E0"[^>]*style="[^"]*background-color:\s*#E0E0E0/i);
  });

  it('converts numeric td margin spacing into email-safe padding', () => {
    const input = `
      <table width="600">
        <tr>
          <td style="margin-bottom: 30px; padding: 0;"><img src="logo.png" width="200" alt="logo"></td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    expect(out).toMatch(/padding-bottom:\s*30px/i);
    expect(out).not.toMatch(/margin-bottom:\s*30px/i);
  });

  it('converts auto margin spacing to padding on td (auto centering does not work on td in email)', () => {
    const input = `
      <table width="600">
        <tr>
          <td style="margin: 0 auto 30px; padding: 0;"><img src="logo.png" width="200" alt="logo"></td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    // margin should be removed — td elements cannot use margin centering in email clients
    expect(out).not.toMatch(/margin:\s*0\s*auto\s*30px/i);
    // bottom spacing (30px) should be converted to padding
    expect(out).toMatch(/padding-bottom:\s*30px/i);
  });

  it('migrates table margin-top to parent td padding', () => {
    const input = `
      <table width="600">
        <tr>
          <td align="center" style="padding: 0;">
            <table width="600" style="width: 600px; margin-top: 16px;">
              <tr>
                <td align="center" style="text-align: center;">
                  <img src="icon.png" height="32">
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const out = normalizeEmailLocalBoxes(input);

    // margin-top should be removed from inner <table>
    expect(out).not.toMatch(/<table[^>]*margin-top:\s*16px/i);
    // padding-top: 16px should appear on the parent <td>
    expect(out).toMatch(/padding-top:\s*16px/i);
  });

  it('is a no-op for non-html input', () => {
    expect(normalizeEmailLocalBoxes('')).toBe('');
    expect(normalizeEmailLocalBoxes(null as any)).toBe(null);
    expect(normalizeEmailLocalBoxes(undefined as any)).toBe(undefined);
    expect(normalizeEmailLocalBoxes(123 as any)).toBe(123);
  });
});
