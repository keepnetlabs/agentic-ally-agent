import { describe, it, expect } from 'vitest';
import { restoreLostBorders } from './email-border-restorer';

describe('restoreLostBorders', () => {
  it('returns unchanged html when no borders in original', () => {
    const original = `<td id="abc" style="color: red;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: blue;">Content</td>`;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toBe(aiOutput);
    expect(restoredCount).toBe(0);
  });

  it('restores border when AI removed it', () => {
    const original = `<td id="abc" style="border: 1px solid #E5E7EB; color: #333;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: #333;">Content</td>`;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toContain('border: 1px solid #E5E7EB');
    expect(html).toContain('color: #333');
    expect(restoredCount).toBe(1);
  });

  it('restores longhand border properties', () => {
    const original = `<td id="abc" style="border-top-width: 2px; border-top-style: solid; border-top-color: #ccc;">Content</td>`;
    const aiOutput = `<td id="abc" style="color: #333;">Content</td>`;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toContain('border-top-width: 2px');
    expect(html).toContain('border-top-style: solid');
    expect(html).toContain('border-top-color: #ccc');
    expect(restoredCount).toBe(1);
  });

  it('does NOT override when AI kept a border', () => {
    const original = `<td id="abc" style="border: 1px solid #E5E7EB;">Content</td>`;
    const aiOutput = `<td id="abc" style="border: 2px dashed #000;">Content</td>`;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toContain('border: 2px dashed #000');
    expect(html).not.toContain('#E5E7EB');
    expect(restoredCount).toBe(0);
  });

  it('does NOT add borders to elements that never had one', () => {
    const original = `
      <td id="bordered" style="border: 1px solid #ccc;">With border</td>
      <td id="plain" style="color: #333;">No border</td>
    `;
    const aiOutput = `
      <td id="bordered" style="border: 1px solid #ccc;">With border</td>
      <td id="plain" style="color: blue;">No border</td>
    `;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toContain('id="plain" style="color: blue;"');
    expect(restoredCount).toBe(0);
  });

  it('handles elements with style but no border — appends border', () => {
    const original = `<td id="abc" style="border: 1px solid #E5E7EB; padding: 16px;">Content</td>`;
    const aiOutput = `<td id="abc" style="padding: 16px;">Content</td>`;

    const { html, restoredCount } = restoreLostBorders(original, aiOutput);
    expect(html).toContain('padding: 16px');
    expect(html).toContain('border: 1px solid #E5E7EB');
    expect(restoredCount).toBe(1);
  });

  it('returns correct restoredCount', () => {
    const original = `
      <td id="a" style="border: 1px solid #aaa;">A</td>
      <td id="b" style="border: 2px solid #bbb;">B</td>
      <td id="c" style="border: 3px solid #ccc;">C</td>
    `;
    const aiOutput = `
      <td id="a" style="color: red;">A</td>
      <td id="b" style="border: 2px solid #bbb;">B</td>
      <td id="c" style="color: blue;">C</td>
    `;

    const { restoredCount } = restoreLostBorders(original, aiOutput);
    // a: removed (restored), b: kept (not restored), c: removed (restored)
    expect(restoredCount).toBe(2);
  });
});
