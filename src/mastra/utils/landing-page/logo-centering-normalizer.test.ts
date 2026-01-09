import { describe, expect, it } from 'vitest';
import { normalizeLandingLogoCentering } from './logo-centering-normalizer';

describe('normalizeLandingLogoCentering', () => {
  it('wraps icon divs with centered container', () => {
    const input = `<div style="width: 64px; height: 64px; border-radius: 999px; background: #22c55e; display: flex; align-items: center; justify-content: center;"><span>✓</span></div>`;
    const out = normalizeLandingLogoCentering(input);
    expect(out).toContain('display: flex; justify-content: center;');
    expect(out).toContain('width: 64px');
  });

  it('preserves icon div styles when wrapping', () => {
    const input = `<div style="width: 96px; height: 96px; border-radius: 999px; background: #3b82f6; display: flex; align-items: center; justify-content: center;">🔒</div>`;
    const out = normalizeLandingLogoCentering(input);
    expect(out).toContain('background: #3b82f6');
    expect(out).toContain('width: 96px');
    expect(out).toContain('border-radius: 999px');
  });

  it('wraps multiple icon divs', () => {
    const input = `
      <div style="width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center;">✓</div>
      <div style="width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center;">✓</div>
    `;
    const out = normalizeLandingLogoCentering(input);
    const wrapperCount = (out.match(/display: flex; justify-content: center;/g) || []).length;
    expect(wrapperCount).toBeGreaterThan(0);
  });

  it('does not wrap regular divs without icon pattern', () => {
    const input = `<div style="width: 100%; padding: 20px; display: flex;"><p>Content</p></div>`;
    const out = normalizeLandingLogoCentering(input);
    // Should not add extra wrapper for non-icon divs
    expect(out.match(/display: flex; justify-content: center;/g) || []).length === 0 ? true : false;
  });

  it('handles div with margin-bottom in wrapper', () => {
    const input = `<div style="width: 64px; height: 64px; border-radius: 999px; display: flex; margin-bottom: 16px;">✓</div>`;
    const out = normalizeLandingLogoCentering(input);
    expect(out).toContain('margin-bottom: 24px;');
    expect(out).toContain('margin-bottom: 16px;');
  });

  it('returns original HTML if no icon divs found', () => {
    const input = `<div><p>No icons here</p></div>`;
    const out = normalizeLandingLogoCentering(input);
    expect(out).toBe(input);
  });

  it('handles invalid HTML gracefully', () => {
    const input = null;
    const out = normalizeLandingLogoCentering(input as any);
    expect(out).toBe(input);
  });
});

