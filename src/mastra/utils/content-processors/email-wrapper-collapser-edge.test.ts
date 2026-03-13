import { describe, it, expect } from 'vitest';
import { collapseEmptyWrappers } from './email-wrapper-collapser';

describe('collapseEmptyWrappers — edge cases', () => {

  // ===== VML / Outlook conditional comments =====

  it('should NOT break VML conditional comments', () => {
    const input = `<div id="i85cti" style="box-sizing: border-box; text-size-adjust: 100%;"><!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{PHISHINGURL}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="10%" stroke="f" fillcolor="#00539B">
<w:anchorlock/>
<center style="color:#ffffff;">Siteyi Ziyaret Et</center>
</v:roundrect>
<![endif]--><!--[if !mso]><!-- --><a href="{PHISHINGURL}" class="btn" style="background: #00539B;">Siteyi Ziyaret Et</a><!--<![endif]--></div>`;

    const result = collapseEmptyWrappers(input);
    // Must preserve VML intact
    expect(result).toContain('[if mso]');
    expect(result).toContain('v:roundrect');
    expect(result).toContain('{PHISHINGURL}');
    expect(result).toContain('Siteyi Ziyaret Et');
  });

  it('should handle wrapper around VML block', () => {
    // Wrapper div with only reset style, containing VML
    const input =
      '<div id="ipn66t" style="box-sizing: border-box;">' +
      '<div id="i35luk" style="box-sizing: border-box;">' +
      '<!--[if mso]><v:roundrect href="{PHISHINGURL}"><center>Click</center></v:roundrect><![endif]-->' +
      '<!--[if !mso]><!-- --><a href="{PHISHINGURL}">Click</a><!--<![endif]-->' +
      '</div></div>';

    const result = collapseEmptyWrappers(input);
    // VML and link must survive
    expect(result).toContain('{PHISHINGURL}');
    expect(result).toContain('Click');
  });

  // ===== Clean HTML (no GrapeJS) =====

  it('should not touch clean email HTML without GrapeJS wrappers', () => {
    const input = `<table role="presentation" width="100%"><tbody><tr><td align="center">
<table width="600" class="container"><tbody>
<tr><td><img src="logo.png" alt="Logo"></td></tr>
<tr><td><h1>Hello {FIRSTNAME}</h1><p>Content here</p></td></tr>
<tr><td><a href="{PHISHINGURL}">Click</a></td></tr>
</tbody></table>
</td></tr></tbody></table>`;

    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  // ===== Malformed / broken HTML =====

  it('should not break on unclosed div tags', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><table>content</table>';
    // No </div> — regex won't match, should return unchanged
    const result = collapseEmptyWrappers(input);
    expect(result).toContain('content');
  });

  it('should not break on extra closing div tags', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><table>content</table></div></div></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toContain('content');
  });

  it('should not break on empty div', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"></div>';
    const result = collapseEmptyWrappers(input);
    // Empty div has no child element — should not collapse (hasSingleChildElement returns false)
    expect(result).toBe(input);
  });

  // ===== Style tag inside content =====

  it('should not be confused by </div> inside style tag content', () => {
    // This is an edge case — style text containing </div> string
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><style>.x { content: "</div>"; }</style></div>';
    const result = collapseEmptyWrappers(input);
    // Regex will match the first </div> inside the style tag — but that's OK
    // because the inner content won't pass hasSingleChildElement check properly
    expect(result).toContain('.x');
  });

  // ===== Deeply nested real structure =====

  it('should not collapse divs that have class even deep in nesting', () => {
    const input =
      '<div id="iux41" style="box-sizing: border-box;">' +
      '<div id="incrd" style="box-sizing: border-box;">' +
      '<div id="i1g4z" class="important-section" style="box-sizing: border-box;">' +
      '<table>content</table>' +
      '</div></div></div>';

    const result = collapseEmptyWrappers(input);
    // Outer two should collapse, inner should remain (has class)
    expect(result).not.toContain('id="iux41"');
    expect(result).not.toContain('id="incrd"');
    expect(result).toContain('class="important-section"');
    expect(result).toContain('content');
  });

  // ===== data-* attributes (Keepnet platform markers) =====

  it('should preserve data-i18n-skip="" wrappers', () => {
    const input = '<div id="i6al" data-i18n-skip="" style="box-sizing: border-box;"><span>text</span></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  it('should preserve data-email-content="" wrappers', () => {
    const input = '<div id="ij8o7" data-email-content="" style="box-sizing: border-box;"><table>email</table></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  // ===== Multiple sibling elements =====

  it('should not collapse div with h1 + p siblings', () => {
    const input =
      '<div id="ivp4l" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<h1>Title</h1><p>Body text</p>' +
      '</div>';

    const result = collapseEmptyWrappers(input);
    // Two child elements — should NOT collapse
    expect(result).toBe(input);
  });

  it('should not collapse div with span text + element', () => {
    const input =
      '<div id="ivp4l" style="box-sizing: border-box;">' +
      '<span>inline text</span>' +
      '<h1>Title</h1>' +
      '</div>';

    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  // ===== Real style properties that MUST be preserved =====

  it('should NOT collapse div with display:none (preheader)', () => {
    const input = '<div id="i6al" style="box-sizing: border-box; display: none; overflow: hidden;"><span>{FIRSTNAME}</span></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  it('should NOT collapse div with padding', () => {
    const input = '<div id="i85cti" style="box-sizing: border-box; padding: 0 0 0 0;"><a href="#">Link</a></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  it('should NOT collapse div with margin', () => {
    const input = '<div id="i85cti" style="box-sizing: border-box; margin: 0 0 0 0;"><a href="#">Link</a></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  it('should NOT collapse div with border-radius', () => {
    const input = '<div id="i85cti" style="box-sizing: border-box; border-radius: 7px 0 0 0;"><a href="#">Link</a></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe(input);
  });

  // ===== Performance / safety =====

  it('should handle very large HTML without hanging', () => {
    // Build a 50-deep nested wrapper chain
    let html = '';
    for (let i = 0; i < 50; i++) {
      html += `<div id="i${String(i).padStart(4, '0')}" style="box-sizing: border-box;">`;
    }
    html += '<table>deep content</table>';
    for (let i = 0; i < 50; i++) {
      html += '</div>';
    }

    const start = performance.now();
    const result = collapseEmptyWrappers(html);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500); // Must complete in under 500ms
    expect(result).toContain('deep content');
    // Max 20 iterations cap — some wrappers may remain
  });

  it('should not exceed MAX_ITERATIONS safety bound', () => {
    // 25-deep nesting exceeds 20 iteration cap
    let html = '';
    for (let i = 0; i < 25; i++) {
      html += `<div id="ia${String.fromCharCode(97 + i)}" style="box-sizing: border-box;">`;
    }
    html += '<table>content</table>';
    for (let i = 0; i < 25; i++) {
      html += '</div>';
    }

    // Should not hang — terminates after 20 iterations
    const result = collapseEmptyWrappers(html);
    expect(result).toContain('content');
  });
});
