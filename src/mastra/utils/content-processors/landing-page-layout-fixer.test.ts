
import { describe, it, expect } from 'vitest';
import { fixLandingPageLayout } from './landing-page-layout-fixer';

describe('fixLandingPageLayout', () => {
  it('should add margin: 0 auto to divs with max-width but missing centering', () => {
    const input = `<div style='max-width: 400px; background: white;'>Content</div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto;');
    expect(output).toBe(`<div style='max-width: 400px; background: white;; margin: 0 auto;'>Content</div>`);
  });

  it('should NOT add margin: 0 auto if already present', () => {
    const input = `<div style='max-width: 400px; margin: 0 auto;'>Content</div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toBe(input);
  });

  it('should fix broken icon nesting (sibling checkmark outside div)', () => {
    // 1. Basic Case (Border Radius 999px + Any Color)
    const basicInput = `<div style='border-radius: 999px; background:blue'></div><span style='color:white'>✓</span>`;
    const basicOutput = fixLandingPageLayout(basicInput);
    expect(basicOutput).toBe(`<div style='border-radius: 999px; background:blue'><span style='color:white'>✓</span></div>`);

    // 2. Different Radius Units (50%)
    const percentInput = `<div style='border-radius: 50%; background: red'></div><span class="icon">!</span>`;
    const percentOutput = fixLandingPageLayout(percentInput);
    expect(percentOutput).toBe(`<div style='border-radius: 50%; background: red'><span class="icon">!</span></div>`);

    // 3. Different Radius Units (99px)
    const pxInput = `<div style='border-radius: 99px; background: #000'></div><span class="icon">X</span>`;
    const pxOutput = fixLandingPageLayout(pxInput);
    expect(pxOutput).toBe(`<div style='border-radius: 99px; background: #000'><span class="icon">X</span></div>`);

    // 4. Whitespace/Newlines Case (Common LLM Output) with mixed attributes
    const messyInput = `
      <div style='background: #22c55e; border-radius: 999px; width: 64px;'></div>
      <span style='font-size: 32px;'>✓</span>
    `;
    const messyOutput = fixLandingPageLayout(messyInput);
    // Expect trimming and nesting
    expect(messyOutput).toContain(`<div style='background: #22c55e; border-radius: 999px; width: 64px;'><span style='font-size: 32px;'>✓</span></div>`);

    // 5. Attribute Variations (Classes)
    const attrInput = `<div class="circle" style="border-radius:50%"></div>  <span class="icon">✓</span>`;
    const attrOutput = fixLandingPageLayout(attrInput);
    expect(attrOutput).toBe(`<div class="circle" style="border-radius:50%"><span class="icon">✓</span></div>`);
  });

  it('should handle both fixes in one pass', () => {
    const input = `
      <div style='max-width:400px;'>
        <div style='background:#22c55e; border-radius: 999px;'></div><span style='color:white'>✓</span>
      </div>
    `;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto;');
    expect(output).toContain(`<div style='background:#22c55e; border-radius: 999px;'><span style='color:white'>✓</span></div>`);
  });

  it('should force text-align: center on H1 headers', () => {
    const input = `<h1 style="font-size:24px; font-weight:600; margin:0 0 12px 0; color:#0f172a;">Urgent Policy Update</h1>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('text-align: center');
  });
});
