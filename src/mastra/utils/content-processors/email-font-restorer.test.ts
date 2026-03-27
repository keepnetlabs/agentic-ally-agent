import { describe, it, expect } from 'vitest';
import { restoreLostFontFamilies } from './email-font-restorer';

describe('restoreLostFontFamilies', () => {
  it('returns unchanged html when no fonts in original', () => {
    const original = `<td id="abc" style="color: red;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: blue;">Content</td>`;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    expect(html).toBe(aiOutput);
    expect(restoredCount).toBe(0);
  });

  it('restores font-family when AI changed it', () => {
    const original = `<td id="abc" style="font-family: Georgia, serif; color: #333;">Content</td>`;
    const aiOutput = `<td id="abc" style="font-family: Arial, sans-serif; color: #333;">Content</td>`;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    expect(html).toContain('font-family: Georgia, serif');
    expect(html).not.toContain('Arial, sans-serif');
    expect(html).toContain('color: #333');
    expect(restoredCount).toBe(1);
  });

  it('restores font-family when AI removed it entirely', () => {
    const original = `<td id="abc" style="font-family: Verdana, sans-serif; color: #333;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: #333;">Content</td>`;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    expect(html).toContain('font-family: Verdana, sans-serif');
    expect(html).toContain('color: #333');
    expect(restoredCount).toBe(1);
  });

  it('does NOT override when AI kept the same font', () => {
    const original = `<td id="abc" style="font-family: Georgia, serif;">Content</td>`;
    const aiOutput = `<td id="abc" style="font-family: Georgia, serif;">Content</td>`;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    expect(html).toContain('font-family: Georgia, serif');
    expect(restoredCount).toBe(0);
  });

  it('does NOT add font-family to elements that never had one', () => {
    const original = `
      <td id="has-font" style="font-family: Georgia, serif;">With font</td>
      <td id="no-font" style="color: #333;">No font</td>
    `;
    const aiOutput = `
      <td id="has-font" style="font-family: Georgia, serif;">With font</td>
      <td id="no-font" style="color: blue;">No font</td>
    `;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    // The no-font element should remain without font-family
    expect(html).toContain('id="no-font" style="color: blue;"');
    expect(restoredCount).toBe(0);
  });

  it('handles multiple elements with different fonts', () => {
    const original = `
      <td id="el1" style="font-family: Georgia, serif;">El 1</td>
      <td id="el2" style="font-family: Courier New, monospace;">El 2</td>
    `;
    const aiOutput = `
      <td id="el1" style="font-family: Arial, sans-serif;">El 1</td>
      <td id="el2" style="font-family: Helvetica, sans-serif;">El 2</td>
    `;

    const { html, restoredCount } = restoreLostFontFamilies(original, aiOutput);
    expect(html).toContain('font-family: Georgia, serif');
    expect(html).toContain('font-family: Courier New, monospace');
    expect(html).not.toContain('Arial, sans-serif');
    expect(html).not.toContain('Helvetica, sans-serif');
    expect(restoredCount).toBe(2);
  });

  it('returns correct restoredCount', () => {
    const original = `
      <td id="a" style="font-family: Georgia, serif;">A</td>
      <td id="b" style="font-family: Verdana, sans-serif;">B</td>
      <td id="c" style="font-family: Tahoma, sans-serif;">C</td>
    `;
    const aiOutput = `
      <td id="a" style="font-family: Arial, sans-serif;">A</td>
      <td id="b" style="font-family: Verdana, sans-serif;">B</td>
      <td id="c" style="color: #333;">C</td>
    `;

    const { restoredCount } = restoreLostFontFamilies(original, aiOutput);
    // a: changed (restored), b: same (not restored), c: removed (restored)
    expect(restoredCount).toBe(2);
  });
});
