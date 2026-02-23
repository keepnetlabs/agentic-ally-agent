import { describe, it, expect } from 'vitest';
import { fixLandingPageLayout } from './landing-page-layout-fixer';

describe('fixLandingPageLayout', () => {
  it('should add margin: 0 auto to divs with max-width but missing centering', () => {
    const input = `<div style='max-width: 600px; background: white;'>Content</div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto;');
    expect(output).toBe(`<div style='max-width: 600px; background: white;; margin: 0 auto;'>Content</div>`);
  });

  it('should NOT add margin: 0 auto if already present', () => {
    const input = `<div style='max-width: 600px; margin: 0 auto;'>Content</div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toBe(input);
  });

  it('should NOT add margin: 0 auto if margin already exists (e.g. hero overlap margins)', () => {
    const input = `<div style='width:100%; max-width:380px; margin:-40px auto 0; padding:0 20px;'>X</div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toBe(input);
  });

  it('should fix broken icon nesting (sibling checkmark outside div)', () => {
    // 1. Basic Case (Border Radius 999px + Any Color)
    const basicInput = `<div style='border-radius: 999px; background:blue'></div><span style='color:white'>✓</span>`;
    const basicOutput = fixLandingPageLayout(basicInput);
    expect(basicOutput).toBe(
      `<div style='border-radius: 999px; background:blue'><span style='color:white'>✓</span></div>`
    );

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
    expect(messyOutput).toContain(
      `<div style='background: #22c55e; border-radius: 999px; width: 64px;'><span style='font-size: 32px;'>✓</span></div>`
    );

    // 5. Attribute Variations (Classes)
    const attrInput = `<div class="circle" style="border-radius:50%"></div>  <span class="icon">✓</span>`;
    const attrOutput = fixLandingPageLayout(attrInput);
    expect(attrOutput).toBe(`<div class="circle" style="border-radius:50%"><span class="icon">✓</span></div>`);
  });

  it('should handle both fixes in one pass', () => {
    const input = `
      <div style='max-width:600px;'>
        <div style='background:#22c55e; border-radius: 999px;'></div><span style='color:white'>✓</span>
      </div>
    `;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto;');
    expect(output).toContain(
      `<div style='background:#22c55e; border-radius: 999px;'><span style='color:white'>✓</span></div>`
    );
  });

  it('should force text-align: center on H1 headers', () => {
    const input = `<h1 style="font-size:24px; font-weight:600; margin:0 0 12px 0; color:#0f172a;">Urgent Policy Update</h1>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('text-align: center');
  });

  it('should add text-align: center to P directly below H1 (intro paragraph)', () => {
    const input = `<h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">Yeni Yan Haklar Paketi Başvurusu</h1><p style="font-size: 14px; color: #4b5563; margin: 0 0 24px 0;">Çalışanlarımız için tasarladığımız yeni fayda paketini keşfedin.</p>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('<p');
    expect(output).toMatch(/<p[^>]*text-align:\s*center/);
  });

  it('should NOT add text-align to P below H1 if already has text-align', () => {
    const input = `<h1>Title</h1><p style="text-align: left; font-size: 14px;">Left-aligned intro</p>`;
    const output = fixLandingPageLayout(input);
    // P should keep its text-align: left, not get center appended
    expect(output).toContain('text-align: left');
  });

  it('should add display: block and margin: 0 auto for anchor/button with max-width', () => {
    const input = `<a style='max-width: 200px; color: blue;'>Click here</a>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('display: block');
    expect(output).toContain('margin: 0 auto');
  });

  it('should replace display: inline-block with display: block for a/button with max-width', () => {
    const input = `<button style='max-width: 300px; display: inline-block;'>Submit</button>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('display: block');
    expect(output).not.toContain('display: inline-block');
  });

  it('should inject checkmark into empty circle div with background color (Fix B)', () => {
    const input = `<div style='border-radius: 999px; background: #22c55e; width: 64px;'></div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('&#10003;');
    expect(output).toContain("color:white");
    expect(output).toMatch(/<span[^>]*>.*?<\/span>/);
  });

  it('should NOT inject checkmark into circle div without background color', () => {
    const input = `<div style='border-radius: 999px; width: 64px;'></div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toBe(input);
  });

  it('should NOT add text-align to H1 if already has text-align', () => {
    const input = `<h1 style="text-align: left;">Left Title</h1>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('text-align: left');
  });

  it('should handle section and main tags with max-width', () => {
    const input = `<section style="max-width: 800px;">Content</section>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto');
  });

  it('should handle form tag with max-width', () => {
    const input = `<form style='max-width: 400px;'>Form</form>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('margin: 0 auto');
  });

  it('should handle empty circle with background-color property', () => {
    const input = `<div style='border-radius: 50%; background-color: #22c55e;'></div>`;
    const output = fixLandingPageLayout(input);
    expect(output).toContain('&#10003;');
  });
});
