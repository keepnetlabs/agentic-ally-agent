import { describe, it, expect } from 'vitest';
import { cleanGrapejsStyles } from './email-style-cleaner';

describe('cleanGrapejsStyles', () => {
  it('should return empty/null input unchanged', () => {
    expect(cleanGrapejsStyles('')).toBe('');
    expect(cleanGrapejsStyles(null as any)).toBeNull();
  });

  it('should strip box-sizing and text-size-adjust resets', () => {
    const input = '<div style="box-sizing: border-box; text-size-adjust: 100%; padding: 10px;">';
    const result = cleanGrapejsStyles(input);
    expect(result).not.toContain('box-sizing');
    expect(result).not.toContain('text-size-adjust');
    expect(result).toContain('padding: 10px');
  });

  it('should strip verbose longhand border properties with initial values', () => {
    const input = '<img style="border-top-width: 0px; border-right-width: 0px; border-bottom-width: 0px; border-left-width: 0px; border-top-style: initial; border-right-style: initial; border-bottom-style: initial; border-left-style: initial; border-top-color: initial; border-right-color: initial; border-bottom-color: initial; border-left-color: initial; border-image-source: initial; border-image-slice: initial; border-image-width: initial; border-image-outset: initial; border-image-repeat: initial; display: block; width: 100%; height: auto;">';
    const result = cleanGrapejsStyles(input);
    expect(result).not.toContain('border-top-width');
    expect(result).not.toContain('border-image');
    expect(result).toContain('display: block');
    expect(result).toContain('width: 100%');
    expect(result).toContain('height: auto');
  });

  it('should strip outline and text-decoration longhand noise', () => {
    const input = '<a style="outline-color: initial; outline-style: none; outline-width: initial; text-decoration-line: none; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; color: #ffffff; display: inline-block;">';
    const result = cleanGrapejsStyles(input);
    expect(result).not.toContain('outline-color');
    expect(result).not.toContain('text-decoration-thickness');
    expect(result).toContain('color: #ffffff');
    expect(result).toContain('display: inline-block');
  });

  it('should keep meaningful shorthand properties', () => {
    const input = '<td style="box-sizing: border-box; padding: 18px 20px; background: #0057B8; border-collapse: collapse;">';
    const result = cleanGrapejsStyles(input);
    expect(result).toContain('padding: 18px 20px');
    expect(result).toContain('background: #0057B8');
    expect(result).toContain('border-collapse: collapse');
    expect(result).not.toContain('box-sizing');
  });

  it('should keep font and text properties', () => {
    const input = '<td style="box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #374151;">';
    const result = cleanGrapejsStyles(input);
    expect(result).toContain('font-family');
    expect(result).toContain('font-size: 14px');
    expect(result).toContain('line-height: 1.7');
    expect(result).toContain('color: #374151');
  });

  it('should remove empty style attributes after cleaning', () => {
    const input = '<div style="box-sizing: border-box; text-size-adjust: 100%;">content</div>';
    const result = cleanGrapejsStyles(input);
    expect(result).not.toContain('style=');
    expect(result).toBe('<div >content</div>');
  });

  it('should handle production GrapeJS img tag', () => {
    const input = `<img src="logo.png" alt="Logo" id="ilfys" width="227" class="logo" style="box-sizing: border-box; text-size-adjust: 100%; border-top-width: 0px; border-right-width: 0px; border-bottom-width: 0px; border-left-width: 0px; border-top-style: initial; border-right-style: initial; border-bottom-style: initial; border-left-style: initial; border-top-color: initial; border-right-color: initial; border-bottom-color: initial; border-left-color: initial; border-image-source: initial; border-image-slice: initial; border-image-width: initial; border-image-outset: initial; border-image-repeat: initial; outline-color: initial; outline-style: initial; outline-width: 0px; text-decoration-line: none; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; max-width: none; width: 227px; display: block; border: 0; outline: none; text-decoration: none; height: auto;">`;

    const result = cleanGrapejsStyles(input);

    // Must keep meaningful styles
    expect(result).toContain('display: block');
    expect(result).toContain('width: 227px');
    expect(result).toContain('height: auto');

    // Must strip noise
    expect(result).not.toContain('box-sizing');
    expect(result).not.toContain('border-top-width');
    expect(result).not.toContain('border-image-source');
    expect(result).not.toContain('text-decoration-thickness');

    // Massive size reduction
    console.log(`IMG tag: ${input.length} → ${result.length} chars (${Math.round((1 - result.length / input.length) * 100)}% saved)`);
    expect(result.length).toBeLessThan(input.length * 0.4);
  });

  it('should handle production CTA button styles', () => {
    const input = `<a href="{PHISHINGURL}" style="box-sizing: border-box; text-size-adjust: 100%; text-decoration-line: none; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; font-style: normal; font-variant-caps: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-size-adjust: none; font-kerning: auto; font-optical-sizing: auto; font-feature-settings: normal; font-variation-settings: normal; font-variant-position: normal; font-variant-emoji: normal; font-stretch: normal; padding-top: 14px; padding-right: 24px; padding-bottom: 14px; padding-left: 24px; border-top-left-radius: 10px; border-top-right-radius: 10px; border-bottom-right-radius: 10px; border-bottom-left-radius: 10px; background-image: initial; background-position-x: initial; background-position-y: initial; background-size: initial; background-repeat: initial; background-attachment: initial; background-origin: initial; background-clip: initial; background-color: #114EA7; text-decoration: none; display: inline-block; background: #00539B; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; line-height: 48px; text-align: center; width: 300px; border-radius: 8px;">Click</a>`;

    const result = cleanGrapejsStyles(input);

    // Core CTA styles kept
    expect(result).toContain('display: inline-block');
    expect(result).toContain('background: #00539B');
    expect(result).toContain('color: #ffffff');
    expect(result).toContain('font-size: 16px');
    expect(result).toContain('width: 300px');
    expect(result).toContain('border-radius: 8px');
    expect(result).toContain('text-align: center');

    // Noise stripped
    expect(result).not.toContain('font-variant-caps');
    expect(result).not.toContain('font-variant-emoji');
    expect(result).not.toContain('background-image: initial');
    // border-top-left-radius: 10px is kept (non-noise value, meaningful override)

    console.log(`CTA tag: ${input.length} → ${result.length} chars (${Math.round((1 - result.length / input.length) * 100)}% saved)`);
  });

  it('should preserve mso-hide style (Outlook)', () => {
    const input = '<span style="box-sizing: border-box; mso-hide: all; display: none;">preheader</span>';
    const result = cleanGrapejsStyles(input);
    expect(result).toContain('mso-hide: all');
    expect(result).toContain('display: none');
  });

  it('should not touch HTML without style attributes', () => {
    const input = '<table role="presentation" width="100%" cellpadding="0"><tr><td>content</td></tr></table>';
    expect(cleanGrapejsStyles(input)).toBe(input);
  });

  it('should be idempotent', () => {
    const input = '<div style="box-sizing: border-box; padding: 10px; color: red;">';
    const once = cleanGrapejsStyles(input);
    const twice = cleanGrapejsStyles(once);
    expect(twice).toBe(once);
  });

  it('should preserve HR border-top when border:none shorthand exists', () => {
    const input = '<hr style="box-sizing: border-box; width: 100%; border: none; border-top: 0.5px solid #707070; margin: 0 0 36px 0;">';
    const result = cleanGrapejsStyles(input);
    expect(result).toContain('border-top: 0.5px solid #707070');
    expect(result).toContain('margin: 0 0 36px 0');
  });

  it('should still strip border longhands with noise values when border shorthand exists', () => {
    const input = '<img style="border: 0; border-top-width: 0px; border-right-color: initial; border-left-style: none; display: block;">';
    const result = cleanGrapejsStyles(input);
    expect(result).not.toContain('border-top-width');
    expect(result).not.toContain('border-right-color');
    expect(result).not.toContain('border-left-style');
    expect(result).toContain('display: block');
  });
});
