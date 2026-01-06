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
});


