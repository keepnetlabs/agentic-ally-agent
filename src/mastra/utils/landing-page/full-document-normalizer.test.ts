import { describe, expect, it } from 'vitest';
import { ensureLandingFullHtmlDocument } from './full-document-normalizer';

describe('ensureLandingFullHtmlDocument', () => {
  it('wraps fragments that lack <html>/<head>/<body>', () => {
    const input = `<div>Hi</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<!DOCTYPE html>/i);
    expect(out).toMatch(/<html>/i);
    expect(out).toMatch(/<head>/i);
    expect(out).toMatch(/<body>/i);
    expect(out).toMatch(/<div>Hi<\/div>/i);
  });

  it('does not modify already-full documents', () => {
    const input = `<!DOCTYPE html><html><head><title>X</title></head><body>Ok</body></html>`;
    const out = ensureLandingFullHtmlDocument(input, 'Ignored');
    expect(out).toBe(input);
  });
});


