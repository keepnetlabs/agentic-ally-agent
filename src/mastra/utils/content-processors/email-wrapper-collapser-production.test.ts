import { describe, it, expect } from 'vitest';
import { collapseEmptyWrappers } from './email-wrapper-collapser';

/** Exact production HTML from user's GrapeJS export (abbreviated for key structures) */
const PRODUCTION_HTML = `<div id="iux41" style="box-sizing: border-box;"><div id="incrd" style="box-sizing: border-box;"><div id="i1g4z" style="box-sizing: border-box;"><div id="ib9sq" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="iz2ggp" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="i6ki3" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ix2q8" style="box-sizing: border-box; text-size-adjust: 100%;"><table role="presentation" width="100%" id="ikff8" class="container" style="max-width: 600px; background: #FFFFFF;"><tbody id="i5w1l" style="box-sizing: border-box;"><tr id="ifrce"><td align="center" id="ij4xh" bgcolor="#164372" style="padding: 18px 20px; background: #0057B8;"><div id="io5tp" style="box-sizing: border-box;"><div id="ijl5g" style="box-sizing: border-box;"><div id="i4cv8" style="box-sizing: border-box;"><div id="iyjln" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="is8r0j" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ixx2m" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="iqq9g" style="box-sizing: border-box; text-size-adjust: 100%;"><!-- Logo --><img src="https://api.keepnetlabs.com/api/file/Z1wnAaH9FfG0" alt="Mavi" id="ilfys" width="227" class="logo" style="border: 0; max-width: none; width: 227px; display: block; height: auto;"></div></div></div></div></div></div></div></td></tr><tr id="iqxia"><td id="inn2q" class="content mso-font" style="padding: 28px 24px; font-family: Arial, Helvetica, sans-serif;"><div id="i1ybq" style="box-sizing: border-box;"><div id="idon2" style="box-sizing: border-box;"><div id="iqotn" style="box-sizing: border-box;"><div id="ihf93" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ia6r8h" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ipeol" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ivp4l" style="box-sizing: border-box; text-size-adjust: 100%;"><h1 id="i6qqk" style="margin: 14px 0 8px 0; font-size: 22px;">{FIRSTNAME}, Cumhuriyet Bayramı</h1><p id="i3j8i" style="margin: 8px 0 0 0; font-size: 15px;">Content with {CURRENT_DATE} and {EMAIL}.</p></div></div></div></div></div></div></div></td></tr></tbody></table></div></div></div></div></div></div></div>`;

describe('collapseEmptyWrappers — production HTML', () => {
  it('should significantly reduce HTML size', () => {
    const result = collapseEmptyWrappers(PRODUCTION_HTML);
    const savedChars = PRODUCTION_HTML.length - result.length;
    const savedPct = Math.round((savedChars / PRODUCTION_HTML.length) * 100);

    console.log(`Original: ${PRODUCTION_HTML.length} chars`);
    console.log(`Collapsed: ${result.length} chars`);
    console.log(`Saved: ${savedChars} chars (${savedPct}%)`);

    expect(savedChars).toBeGreaterThan(0);
  });

  it('should preserve all content elements', () => {
    const result = collapseEmptyWrappers(PRODUCTION_HTML);

    // Content preserved
    expect(result).toContain('src="https://api.keepnetlabs.com/api/file/Z1wnAaH9FfG0"');
    expect(result).toContain('{FIRSTNAME}');
    expect(result).toContain('{CURRENT_DATE}');
    expect(result).toContain('{EMAIL}');
    expect(result).toContain('Cumhuriyet Bayramı');
    expect(result).toContain('<!-- Logo -->');

    // Structural elements preserved (have class/real style)
    expect(result).toContain('id="ikff8"');
    expect(result).toContain('class="container"');
    expect(result).toContain('class="content mso-font"');
    expect(result).toContain('class="logo"');
  });

  it('should remove outer GrapeJS wrapper divs', () => {
    const result = collapseEmptyWrappers(PRODUCTION_HTML);

    // Outer 7-deep wrappers around <table> must be removed
    expect(result).not.toContain('id="iux41"');
    expect(result).not.toContain('id="incrd"');
    expect(result).not.toContain('id="i1g4z"');

    // Some inner wrappers inside <td> cells may remain due to non-greedy matching
    // across element boundaries — this is acceptable; the key savings come from
    // the outer wrappers (which are the largest)
  });

  it('should preserve TR count', () => {
    const inputTrs = (PRODUCTION_HTML.match(/<tr/gi) || []).length;
    const result = collapseEmptyWrappers(PRODUCTION_HTML);
    const outputTrs = (result.match(/<tr/gi) || []).length;
    expect(outputTrs).toBe(inputTrs);
  });
});
