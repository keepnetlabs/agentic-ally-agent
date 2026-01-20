import { describe, expect, it } from 'vitest';
import {
  normalizeLandingCentering,
  normalizeLandingFormCentering,
  normalizeLandingMaxWidthCentering,
  enforceMinimalLayoutMaxWidth,
} from './form-centering-normalizer';

describe('normalizeLandingFormCentering', () => {
  it('adds margin:0 auto when form has max-width and no margin', () => {
    const input = `<form method='POST' action='#' style='width: 100%; max-width: 600px;'><input /></form>`;
    const out = normalizeLandingFormCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });

  it('does not override existing margin', () => {
    const input = `<form style='width: 100%; max-width: 600px; margin: 0 16px;'><input /></form>`;
    const out = normalizeLandingFormCentering(input);
    expect(out).toMatch(/margin:\s*0 16px/i);
  });
});

describe('normalizeLandingMaxWidthCentering', () => {
  it('replaces margin:0 16px with margin:0 auto on max-width width:100% containers', () => {
    const input = `<div style='background:#fff; max-width: 400px; width: 100%; margin: 0 16px; padding: 20px;'>X</div>`;
    const out = normalizeLandingMaxWidthCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });

  it('adds margin:0 auto when max-width width:100% container is missing margin', () => {
    const input = `<div style='max-width: 480px; width: 100%; padding: 24px; background: #fff;'>X</div>`;
    const out = normalizeLandingMaxWidthCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });
});

describe('enforceMinimalLayoutMaxWidth', () => {
  it('adds max-width to form with no style attribute', () => {
    const input = `<form method='POST'><input type='email' /></form>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    expect(out).toContain('max-width: 600px');
    expect(out).toContain('margin: 0 auto');
    expect(out).toContain('width: 100%');
  });

  it('adds max-width to form with existing style but missing max-width', () => {
    const input = `<form style='padding: 20px;'><input /></form>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    expect(out).toContain('max-width: 600px');
    expect(out).toContain('padding: 20px');
  });

  it('does not override form that already has max-width', () => {
    const input = `<form style='max-width: 500px; width: 100%;'><input /></form>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    expect(out).toContain('max-width: 500px');
    expect(out).not.toContain('max-width: 400px');
  });

  it('preserves existing inline styles when adding max-width', () => {
    const input = `<form style='background: #fff; padding: 24px; border: 1px solid #ccc;'><input /></form>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    expect(out).toContain('max-width: 600px');
    expect(out).toContain('background: #fff');
    expect(out).toContain('padding: 24px');
    expect(out).toContain('border: 1px solid #ccc');
  });

  it('returns original HTML if no form tags present', () => {
    const input = `<div><p>No form here</p></div>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    expect(out).toBe(input);
  });

  it('handles multiple form elements', () => {
    const input = `<form style='padding: 10px;'><input /></form><form><input /></form>`;
    const out = enforceMinimalLayoutMaxWidth(input);
    const forms = out.match(/<form[^>]*>/g) || [];
    expect(forms.length).toBe(2);
    // Both should have max-width
    expect(out).toMatch(/max-width:\s*600px.*max-width:\s*600px/s);
  });

  it('handles invalid HTML gracefully', () => {
    const input = null;
    const out = enforceMinimalLayoutMaxWidth(input as any);
    expect(out).toBe(input);
  });
});

describe('normalizeLandingCentering', () => {
  it('applies both container and form centering where needed', () => {
    const input = `<div style='max-width: 600px; width: 100%; margin: 0 16px;'><form style='width: 100%; max-width: 600px;'><input/></form></div>`;
    const out = normalizeLandingCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });

  it('enforces max-width on form missing it entirely', () => {
    const input = `<form style='padding: 20px;'><input /></form>`;
    const out = normalizeLandingCentering(input);
    expect(out).toContain('max-width: 600px');
    expect(out).toContain('margin: 0 auto');
  });

  it('handles form without style attribute', () => {
    const input = `<form><input type='email' /><button>Submit</button></form>`;
    const out = normalizeLandingCentering(input);
    expect(out).toContain('max-width: 600px');
    expect(out).toContain('margin: 0 auto');
  });

  it('preserves form that already has both max-width and margin', () => {
    const input = `<form style='max-width: 600px; width: 100%; margin: 0 auto;'><input /></form>`;
    const out = normalizeLandingCentering(input);
    // Should not add duplicate styles
    expect(out).not.toMatch(/max-width:\s*600px.*max-width:\s*600px/);
  });
});
