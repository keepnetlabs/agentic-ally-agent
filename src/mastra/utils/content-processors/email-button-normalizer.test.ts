import { describe, it, expect } from 'vitest';
import {
  normalizeEmailButtonDivs,
  normalizeEmailButtonRowPadding,
  normalizeEmailButtonOnlyRowAlignment,
  normalizeEmailLeadingCtaBlockAlignment,
  normalizeEmailNestedCtaTableAlignment,
  normalizeEmailCtaWrapperAlignment,
  normalizeEmailButtonMarginToTdPadding,
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

  it('preserves asymmetric row spacing', () => {
    const html = `<td style="padding-top: 24px; padding-bottom: 12px;"><a href="{PHISHINGURL}">Verify</a></td>`;
    const result = normalizeEmailButtonRowPadding(html);
    expect(result).toBe(html);
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

describe('normalizeEmailLeadingCtaBlockAlignment', () => {
  it('centers a leading CTA table when helper text follows in the same td', () => {
    const html =
      '<td style="padding: 24px;"><table role="presentation" width="auto"><tr><td><a href="{PHISHINGURL}" style="display:inline-block; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td></tr></table><div style="font-size:12px;">Helper text</div></td>';

    const result = normalizeEmailLeadingCtaBlockAlignment(html);

    expect(result).toContain('<table align="center"');
    expect(result).toContain('Helper text');
  });

  it('wraps a direct leading CTA in a centered div when helper text follows', () => {
    const html =
      '<td><a href="{PHISHINGURL}" style="display:inline-block; padding:12px 24px; background-color:#000; color:#fff;">Verify</a><p>Helper text</p></td>';

    const result = normalizeEmailLeadingCtaBlockAlignment(html);

    expect(result).toContain('<div style="text-align: center;"><a href="{PHISHINGURL}"');
    expect(result).toContain('<p>Helper text</p>');
  });

  it('centers a leading CTA block even when comments precede it', () => {
    const html =
      '<td><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"></v:roundrect><![endif]--><table role="presentation" width="auto"><tr><td><a href="{PHISHINGURL}" style="display:inline-block; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td></tr></table><div>Helper text</div></td>';

    const result = normalizeEmailLeadingCtaBlockAlignment(html);

    expect(result).toContain('<!--[if mso]><v:roundrect');
    expect(result).toContain('<table align="center"');
  });

  it('centers a leading image CTA with helper text below', () => {
    const html =
      '<td><a href="{PHISHINGURL}"><img src="cta.png" alt="CTA image" width="220"></a><p>Helper text</p></td>';

    const result = normalizeEmailLeadingCtaBlockAlignment(html);

    expect(result).toContain('<div style="text-align: center;"><a href="{PHISHINGURL}"><img');
    expect(result).toContain('<p>Helper text</p>');
  });

  it('leaves non-leading CTA content unchanged', () => {
    const html =
      '<td><p>Intro text</p><table role="presentation" width="auto"><tr><td><a href="{PHISHINGURL}" style="display:inline-block; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td></tr></table><p>Helper text</p></td>';

    expect(normalizeEmailLeadingCtaBlockAlignment(html)).toBe(html);
  });
});

describe('normalizeEmailNestedCtaTableAlignment', () => {
  it('centers a CTA table nested inside neutral wrapper divs when helper text follows', () => {
    const html =
      '<div style="box-sizing: border-box;"><div id="wrap"><table border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px;"><tr><td bgcolor="#000000"><a href="{PHISHINGURL}" style="display:inline-block; padding:12px 20px; background-color:#000000; color:#fff;">Verify</a></td></tr></table><div><br><span>Helper text</span></div></div></div>';

    const result = normalizeEmailNestedCtaTableAlignment(html);

    expect(result).toContain('<table align="center"');
    expect(result).toContain('Helper text');
  });

  it('does not force align on full-width CTA tables', () => {
    const html =
      '<div><table width="100%"><tr><td><a href="{PHISHINGURL}" style="display:block; width:100%; padding:12px 20px; background-color:#000000; color:#fff;">Verify</a></td></tr></table><div>Helper text</div></div>';

    expect(normalizeEmailNestedCtaTableAlignment(html)).toBe(html);
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

describe('normalizeEmailButtonMarginToTdPadding', () => {
  it('moves CTA margin to td padding when the td side is empty', () => {
    const html =
      '<td style="text-align:center;"><a href="{PHISHINGURL}" style="display:inline-block; margin-top: 20px; margin-bottom: 24px; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td>';

    const result = normalizeEmailButtonMarginToTdPadding(html);

    expect(result).toContain('padding-top: 20px');
    expect(result).toContain('padding-bottom: 24px');
    expect(result).not.toContain('margin-top: 20px');
    expect(result).not.toContain('margin-bottom: 24px');
  });

  it('does not overwrite td bottom padding or remove the anchor margin when spacing already exists', () => {
    const html =
      '<td style="padding-bottom: 32px; text-align:center;"><a href="{PHISHINGURL}" style="display:inline-block; margin-bottom: 20px; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td>';

    const result = normalizeEmailButtonMarginToTdPadding(html);

    expect(result).toContain('padding-bottom: 32px');
    expect(result).toContain('margin-bottom: 20px');
  });

  it('does not migrate margin into an already padded shorthand td', () => {
    const html =
      '<td style="padding: 16px 0 28px;"><a href="{PHISHINGURL}" style="display:inline-block; margin-bottom: 20px; padding:12px 24px; background-color:#000; color:#fff;">Verify</a></td>';

    const result = normalizeEmailButtonMarginToTdPadding(html);

    expect(result).toBe(html);
  });
});
