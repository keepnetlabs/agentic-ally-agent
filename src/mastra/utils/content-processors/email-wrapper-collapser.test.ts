import { describe, it, expect } from 'vitest';
import { collapseEmptyWrappers } from './email-wrapper-collapser';

describe('collapseEmptyWrappers', () => {
  it('should return empty/null input unchanged', () => {
    expect(collapseEmptyWrappers('')).toBe('');
    expect(collapseEmptyWrappers(null as any)).toBeNull();
  });

  it('should collapse single GrapeJS wrapper div (id only)', () => {
    const input = '<div id="ixx7h"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe('<table>content</table>');
  });

  it('should collapse div with box-sizing reset style', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe('<table>content</table>');
  });

  it('should collapse div with box-sizing + text-size-adjust', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box; text-size-adjust: 100%;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe('<table>content</table>');
  });

  it('should collapse deeply nested GrapeJS wrappers with styles', () => {
    const input =
      '<div id="iux41" style="box-sizing: border-box;">' +
      '<div id="incrd" style="box-sizing: border-box;">' +
      '<div id="i1g4z" style="box-sizing: border-box;">' +
      '<div id="ib9sq" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<div id="iz2ggp" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<div id="i6ki3" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<div id="ix2q8" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<table id="ikff8" class="container">email</table>' +
      '</div></div></div></div></div></div></div>';

    const result = collapseEmptyWrappers(input);
    expect(result.trim()).toBe('<table id="ikff8" class="container">email</table>');
  });

  it('should NOT collapse divs with real style (padding, background, etc.)', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box; padding: 10px;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should NOT collapse divs with class attribute', () => {
    const input = '<div id="ixx7h" class="container" style="box-sizing: border-box;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should NOT collapse divs with data-* attributes', () => {
    const input = '<div id="ixx7h" data-email-content="" style="box-sizing: border-box;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should NOT collapse divs with non-GrapeJS ids', () => {
    const input = '<div id="main-content" style="box-sizing: border-box;"><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should NOT collapse divs with multiple children', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><p>text</p><table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should NOT collapse divs with text content alongside element', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;">Some text<table>content</table></div>';
    expect(collapseEmptyWrappers(input)).toBe(input);
  });

  it('should preserve surrounding structure', () => {
    const input =
      '<center><table><tr><td>' +
      '<div id="ixx7h" style="box-sizing: border-box;"><div id="incrd" style="box-sizing: border-box;">' +
      '<table id="ikff8" class="container"><tr><td>email</td></tr></table>' +
      '</div></div>' +
      '</td></tr></table></center>';

    const result = collapseEmptyWrappers(input);
    expect(result).toContain('<center>');
    expect(result).toContain('id="ikff8"');
    expect(result).toContain('email');
    expect(result).not.toContain('id="ixx7h"');
    expect(result).not.toContain('id="incrd"');
  });

  it('should handle production email HTML pattern', () => {
    const input = `<center id="i7wk" style="box-sizing: border-box; text-size-adjust: 100%;"><table role="presentation" width="100%"><tbody><tr><td>
<div id="iux41" style="box-sizing: border-box;"><div id="incrd" style="box-sizing: border-box;"><div id="i1g4z" style="box-sizing: border-box;"><div id="ib9sq" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="iz2ggp" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="i6ki3" style="box-sizing: border-box; text-size-adjust: 100%;"><div id="ix2q8" style="box-sizing: border-box; text-size-adjust: 100%;">
<table role="presentation" width="100%" id="ikff8" class="container" style="max-width: 600px;">
<tbody><tr><td>Email content here</td></tr></tbody></table>
</div></div></div></div></div></div></div>
</td></tr></tbody></table></center>`;

    const result = collapseEmptyWrappers(input);

    // Content table preserved (has class + real style)
    expect(result).toContain('id="ikff8"');
    expect(result).toContain('class="container"');
    expect(result).toContain('Email content here');

    // GrapeJS wrappers removed
    expect(result).not.toContain('id="iux41"');
    expect(result).not.toContain('id="ix2q8"');

    // center tag preserved (has real style beyond reset)
    // Note: center id="i7wk" has only reset styles but is not a wrapper of single child here
  });

  it('should be idempotent', () => {
    const input = '<div id="ixx7h" style="box-sizing: border-box;"><table>content</table></div>';
    const once = collapseEmptyWrappers(input);
    const twice = collapseEmptyWrappers(once);
    expect(twice).toBe(once);
  });

  it('should handle mixed — some collapsible, some not', () => {
    const input =
      '<div id="iux41" style="box-sizing: border-box;">' +
      '<div id="incrd" style="box-sizing: border-box; padding: 10px;">' + // has real style → KEEP
      '<table>content</table>' +
      '</div></div>';

    const result = collapseEmptyWrappers(input);
    // Outer wrapper collapsed, inner kept (has padding)
    expect(result).not.toContain('id="iux41"');
    expect(result).toContain('id="incrd"');
    expect(result).toContain('padding: 10px');
  });

  it('should collapse wrappers around void elements (img without />)', () => {
    // GrapeJS outputs <img> without self-closing slash
    const input =
      '<div id="iqq9g" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<img src="logo.png" alt="Logo" width="227" class="logo" style="border: 0;">' +
      '</div>';

    const result = collapseEmptyWrappers(input);
    expect(result).not.toContain('id="iqq9g"');
    expect(result).toContain('src="logo.png"');
  });

  it('should collapse nested wrappers around void elements with comments', () => {
    const input =
      '<div id="io5tp" style="box-sizing: border-box;">' +
      '<div id="ijl5g" style="box-sizing: border-box;">' +
      '<div id="iqq9g" style="box-sizing: border-box; text-size-adjust: 100%;">' +
      '<!-- Logo -->' +
      '<img src="logo.png" alt="Logo" width="227">' +
      '</div></div></div>';

    const result = collapseEmptyWrappers(input);
    expect(result).not.toContain('id="io5tp"');
    expect(result).not.toContain('id="ijl5g"');
    expect(result).not.toContain('id="iqq9g"');
    expect(result).toContain('<!-- Logo -->');
    expect(result).toContain('src="logo.png"');
  });

  it('should collapse wrappers around <br> void element', () => {
    const input = '<div id="i0ohh" style="box-sizing: border-box;"><br></div>';
    const result = collapseEmptyWrappers(input);
    expect(result).toBe('<br>');
  });
});
