import { describe, it, expect } from 'vitest';
import { normalizeEmailButtonDivs, normalizeEmailButtonRowPadding } from './email-button-normalizer';

describe('normalizeEmailButtonDivs', () => {
  it('unwraps div around CTA link and adds display:block; text-align:center when missing', () => {
    const html = `<div style="text-align:center"><a href="{PHISHINGURL}">Verify</a></div>`;
    const result = normalizeEmailButtonDivs(html);
    expect(result).toContain('href="{PHISHINGURL}"');
    expect(result).not.toContain('<div');
    expect(result).toContain('display:block');
    expect(result).toContain('text-align:center');
  });

  it('leaves link unchanged when already has display and text-align', () => {
    const html = `<div><a href="{PHISHINGURL}" style="display:block; text-align:center">Click</a></div>`;
    const result = normalizeEmailButtonDivs(html);
    expect(result).toContain('<a href="{PHISHINGURL}" style="display:block; text-align:center">Click</a>');
  });

  it('prepends styles to existing style attribute', () => {
    const html = `<div><a href="{PHISHINGURL}" style="color:blue">Link</a></div>`;
    const result = normalizeEmailButtonDivs(html);
    expect(result).toMatch(/display:block.*text-align:center/);
    expect(result).toContain('color:blue');
  });

  it('handles button element', () => {
    const html = `<div><button href="{PHISHINGURL}">Submit</button></div>`;
    const result = normalizeEmailButtonDivs(html);
    expect(result).toContain('button');
  });

  it('returns input unchanged when no CTA div pattern', () => {
    const html = '<div>Regular content</div>';
    expect(normalizeEmailButtonDivs(html)).toBe(html);
  });
});

describe('normalizeEmailButtonRowPadding', () => {
  it('appends padding-top: 0 to td containing only CTA link', () => {
    const html = `<td style="padding: 20px 0;"><a href="{PHISHINGURL}">Verify</a></td>`;
    const result = normalizeEmailButtonRowPadding(html);
    expect(result).toContain('padding-top: 0');
  });

  it('returns input unchanged when td has no style', () => {
    const html = `<td><a href="{PHISHINGURL}">Link</a></td>`;
    const result = normalizeEmailButtonRowPadding(html);
    expect(result).toBe(html);
  });

  it('handles button element', () => {
    const html = `<td style="padding: 10px;"><button href="{PHISHINGURL}">Click</button></td>`;
    const result = normalizeEmailButtonRowPadding(html);
    expect(result).toContain('padding-top: 0');
  });
});
