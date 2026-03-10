import { describe, it, expect } from 'vitest';
import {
  normalizeEmailButtonDivs,
  normalizeEmailButtonRowPadding,
  normalizeEmailButtonOnlyRowAlignment,
  normalizeEmailCtaWrapperAlignment,
} from './email-button-normalizer';

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

  it('unwraps real-url button-like anchor inside div', () => {
    const html = `<div><a href="https://example.com" class="btn" style="display:inline-block; padding:12px 20px; background-color:#000;">Verify</a></div>`;
    const result = normalizeEmailButtonDivs(html);
    expect(result).not.toContain('<div');
    expect(result).toContain('display:inline-block');
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

describe('normalizeEmailButtonOnlyRowAlignment', () => {
  it('adds td-level centering when td contains only a CTA link', () => {
    const html = `<td><a href="{PHISHINGURL}" style="display:inline-block;">Verify</a></td>`;
    const result = normalizeEmailButtonOnlyRowAlignment(html);
    expect(result).toMatch(/<td[^>]*align="center"/i);
    expect(result).toMatch(/text-align:\s*center/i);
  });

  it('does not override full-width CTA semantics', () => {
    const html = `<td><a href="{PHISHINGURL}" style="display:block; width:100%; text-align:center;">Verify</a></td>`;
    const result = normalizeEmailButtonOnlyRowAlignment(html);
    expect(result).toBe(html);
  });

  it('still centers inline-block CTA even if anchor text-align is already center', () => {
    const html = `<td><a href="{PHISHINGURL}" style="display:inline-block; text-align:center;">Verify</a></td>`;
    const result = normalizeEmailButtonOnlyRowAlignment(html);
    expect(result).toMatch(/<td[^>]*align="center"/i);
    expect(result).toMatch(/text-align:\s*center/i);
  });

  it('preserves existing td style while appending centering', () => {
    const html = `<td style="padding: 12px 0;"><a href="{PHISHINGURL}">Verify</a></td>`;
    const result = normalizeEmailButtonOnlyRowAlignment(html);
    expect(result).toContain('padding: 12px 0; text-align: center');
  });

  it('returns input unchanged when td is not CTA-only', () => {
    const html = `<td>Hello <a href="{PHISHINGURL}">Verify</a></td>`;
    expect(normalizeEmailButtonOnlyRowAlignment(html)).toBe(html);
  });
});

describe('normalizeEmailCtaWrapperAlignment', () => {
  it('adds explicit text-align center to nested CTA wrapper with real URL', () => {
    const html = `<div><a href="https://example.com" class="btn" style="display:inline-block; padding:12px 20px; background-color:#000;">Verify</a><div>Footer text</div></div>`;
    const result = normalizeEmailCtaWrapperAlignment(html);
    expect(result).toMatch(/<div[^>]*text-align:\s*center/i);
  });

  it('returns input unchanged for non-cta wrappers', () => {
    const html = `<div><a href="https://example.com">Regular link</a><div>Footer text</div></div>`;
    expect(normalizeEmailCtaWrapperAlignment(html)).toBe(html);
  });
});
