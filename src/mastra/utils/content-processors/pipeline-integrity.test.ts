import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './html-sanitizer';
import { normalizeEmailButtonDivs, normalizeEmailButtonOnlyRowAlignment, normalizeEmailCtaWrapperAlignment } from './email-button-normalizer';
import { normalizeEmailMergeTags } from './email-merge-tag-normalizer';
import { postProcessPhishingEmailHtml } from './phishing-html-postprocessors';
import { repairHtml } from '../validation/json-validation-utils';
import { collapseEmptyWrappers } from './email-wrapper-collapser';

/** Abbreviated but structurally representative email HTML from production */
const PRODUCTION_EMAIL_HTML = `<center id="i7wk"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F3F4F6" id="icven"><tbody id="i0na6"><tr id="igkjj"><td align="center" id="il3sv" style="padding: 24px 12px;">
<div id="ixx7h"><div id="incrd"><div id="i1g4z"><div id="ib9sq"><div id="iz2ggp"><div id="i6ki3"><div id="ix2q8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" id="ikff8" class="container" style="max-width: 600px; background: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E5E7EB;">
<tbody id="i5w1l">
<tr id="ifrce"><td align="center" id="ij4xh" bgcolor="#164372" style="padding: 18px 20px; background: #0057B8;">
<img src="https://api.keepnetlabs.com/api/file/Z1wnAaH9FfG0" alt="Mavi" id="ilfys" width="227" class="logo">
</td></tr>
<tr id="iqxia"><td id="inn2q" class="content mso-font" style="padding: 28px 24px;">
<h1 id="i6qqk">{FIRSTNAME}, Cumhuriyet Bayrami</h1>
<p id="i3j8i">Test content with {CURRENT_DATE} and {EMAIL} address.</p>
</td></tr>
<tr id="iqfg7j"><td align="center" id="i5udf6" style="padding: 10px 24px 8px 24px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{PHISHINGURL}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="10%" stroke="f" fillcolor="#00539B">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Siteyi Ziyaret Et</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="{PHISHINGURL}" id="i48wvd" class="btn" style="background: #00539B; color: #ffffff; display: inline-block; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; line-height: 48px; width: 300px; text-align: center;">Siteyi Ziyaret Et</a>
<!--<![endif]-->
</td></tr>
<tr id="iy93nk"><td height="1" id="iko8bc" style="height: 1px; background: #E5E7EB;"></td></tr>
<tr id="iqjq7k"><td id="iewc9i" style="padding: 18px 24px 26px 24px; color: #6B7280; font-size: 12px;">
Bu bilgilendirme {CURRENT_DATE} tarihinde hazırlanmıştır ve {EMAIL} adresine gönderilmiştir.
</td></tr>
</tbody></table>
</div></div></div></div></div></div></div>
</td></tr></tbody></table></center>`;

describe('Pipeline integrity — email HTML preservation', () => {
  const mustContain = [
    { name: 'logo img', pattern: 'img src=' },
    { name: 'h1 heading', pattern: '<h1' },
    { name: 'CTA link', pattern: '{PHISHINGURL}' },
    { name: 'footer text', pattern: 'bilgilendirme' },
    { name: 'VML conditional', pattern: '[if mso]' },
    { name: 'inner table', pattern: 'id="ikff8"' },
    { name: 'GrapesJS wrapper divs', pattern: 'id="ixx7h"' },
  ];

  it('sanitizeHtml preserves all content', () => {
    const result = sanitizeHtml(PRODUCTION_EMAIL_HTML);
    for (const { name, pattern } of mustContain) {
      expect(result, `sanitizeHtml lost: ${name}`).toContain(pattern);
    }
    // Length should be similar (sanitizeHtml only fixes quotes, shouldn't shrink much)
    expect(result.length).toBeGreaterThan(PRODUCTION_EMAIL_HTML.length * 0.9);
  });

  it('repairHtml (parse5) preserves all content', () => {
    const result = repairHtml(PRODUCTION_EMAIL_HTML);
    for (const { name, pattern } of mustContain) {
      expect(result, `repairHtml lost: ${name}`).toContain(pattern);
    }
    expect(result.length).toBeGreaterThan(PRODUCTION_EMAIL_HTML.length * 0.8);
  });

  it('normalizeEmailButtonDivs preserves all content', () => {
    const result = normalizeEmailButtonDivs(PRODUCTION_EMAIL_HTML);
    for (const { name, pattern } of mustContain) {
      expect(result, `buttonDivs lost: ${name}`).toContain(pattern);
    }
  });

  it('normalizeEmailMergeTags preserves all content', () => {
    const { html: result } = normalizeEmailMergeTags(PRODUCTION_EMAIL_HTML);
    for (const { name, pattern } of mustContain) {
      expect(result, `mergeTags lost: ${name}`).toContain(pattern);
    }
  });

  it('route normalizer chain preserves all content', () => {
    let result = normalizeEmailButtonDivs(PRODUCTION_EMAIL_HTML);
    result = normalizeEmailCtaWrapperAlignment(result);
    result = normalizeEmailButtonOnlyRowAlignment(result);
    const { html: final } = normalizeEmailMergeTags(result);
    for (const { name, pattern } of mustContain) {
      expect(final, `route chain lost: ${name}`).toContain(pattern);
    }
  });

  it('postProcessPhishingEmailHtml (full pipeline) preserves all content', () => {
    const result = postProcessPhishingEmailHtml({ html: PRODUCTION_EMAIL_HTML });
    for (const { name, pattern } of mustContain) {
      expect(result, `full pipeline lost: ${name}`).toContain(pattern);
    }
    expect(result.length).toBeGreaterThan(PRODUCTION_EMAIL_HTML.length * 0.8);
  });

  it('TR row count is preserved through full pipeline', () => {
    const inputTrs = (PRODUCTION_EMAIL_HTML.match(/<tr/gi) || []).length;
    const result = postProcessPhishingEmailHtml({ html: PRODUCTION_EMAIL_HTML });
    const outputTrs = (result.match(/<tr/gi) || []).length;
    // Pipeline may add spacer rows but should never remove rows
    expect(outputTrs).toBeGreaterThanOrEqual(inputTrs);
  });

  it('collapseEmptyWrappers preserves all content (pre-AI step)', () => {
    const result = collapseEmptyWrappers(PRODUCTION_EMAIL_HTML);
    // Content markers must survive (except GrapeJS wrapper divs — intentionally removed)
    for (const { name, pattern } of mustContain) {
      if (pattern === 'id="ixx7h"') continue;
      expect(result, `collapseEmptyWrappers lost: ${name}`).toContain(pattern);
    }
    // GrapeJS wrapper divs should be stripped
    expect(result).not.toContain('id="ixx7h"');
    expect(result).not.toContain('id="ix2q8"');
    // Structural table must remain
    expect(result).toContain('id="ikff8"');
  });

  it('collapseEmptyWrappers + full pipeline preserves all content', () => {
    const collapsed = collapseEmptyWrappers(PRODUCTION_EMAIL_HTML);
    const result = postProcessPhishingEmailHtml({ html: collapsed });
    for (const { name, pattern } of mustContain) {
      // Skip GrapeJS wrapper div check — intentionally removed
      if (pattern === 'id="ixx7h"') continue;
      expect(result, `collapse+pipeline lost: ${name}`).toContain(pattern);
    }
  });
});
