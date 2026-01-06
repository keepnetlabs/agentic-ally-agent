import { describe, expect, it } from 'vitest';
import { normalizeLandingCentering, normalizeLandingFormCentering, normalizeLandingMaxWidthCentering } from './form-centering-normalizer';

describe('normalizeLandingFormCentering', () => {
  it('adds margin:0 auto when form has max-width and no margin', () => {
    const input = `<form method='POST' action='#' style='width: 100%; max-width: 400px;'><input /></form>`;
    const out = normalizeLandingFormCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });

  it('does not override existing margin', () => {
    const input = `<form style='width: 100%; max-width: 400px; margin: 0 16px;'><input /></form>`;
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
});

describe('normalizeLandingCentering', () => {
  it('applies both container and form centering where needed', () => {
    const input = `<div style='max-width: 400px; width: 100%; margin: 0 16px;'><form style='width: 100%; max-width: 400px;'><input/></form></div>`;
    const out = normalizeLandingCentering(input);
    expect(out).toMatch(/margin:\s*0 auto/i);
  });
});


