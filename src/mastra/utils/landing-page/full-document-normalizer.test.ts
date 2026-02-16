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

  it('should use custom title parameter', () => {
    const input = `<div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Custom Title');
    expect(out).toMatch(/<title>Custom Title<\/title>/);
  });

  it('should use default title when not provided', () => {
    const input = `<div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input);
    expect(out).toMatch(/<title>Secure Portal<\/title>/);
  });

  it('should handle empty string input', () => {
    const out = ensureLandingFullHtmlDocument('', 'Test');
    expect(out).toBe('');
  });

  it('should handle null input gracefully', () => {
    const out = ensureLandingFullHtmlDocument(null as any, 'Test');
    expect(out).toBe(null);
  });

  it('should handle undefined input gracefully', () => {
    const out = ensureLandingFullHtmlDocument(undefined as any, 'Test');
    expect(out).toBe(undefined);
  });

  it('should handle non-string input gracefully', () => {
    const out = ensureLandingFullHtmlDocument(123 as any, 'Test');
    expect(out).toBe(123);
  });

  it('should detect <html> tag case-insensitively (uppercase)', () => {
    const input = `<HTML><head></head><body>OK</body></HTML>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toBe(input);
  });

  it('should detect <html> tag case-insensitively (mixed case)', () => {
    const input = `<HtMl><head></head><body>OK</body></HtMl>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toBe(input);
  });

  it('should detect <html> with attributes', () => {
    const input = `<html lang="en"><head></head><body>OK</body></html>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toBe(input);
  });

  it('should wrap fragment with existing DOCTYPE but no <html>', () => {
    const input = `<!DOCTYPE html><div>Fragment</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<html>/);
    expect(out).toMatch(/<div>Fragment<\/div>/);
    // Should not add duplicate DOCTYPE
    expect((out.match(/<!DOCTYPE/gi) || []).length).toBe(1);
  });

  it('should wrap fragment with <head> but no <html>', () => {
    const input = `<head><title>Old</title></head><div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<html>/);
    expect(out).toMatch(/<body>/);
    expect(out).toMatch(/<div>Content<\/div>/);
  });

  it('should wrap fragment with <body> but no <html>', () => {
    const input = `<body><div>Content</div></body>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<html>/);
    expect(out).toMatch(/<head>/);
  });

  it('should include UTF-8 charset meta tag', () => {
    const input = `<div>Test</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<meta charset=['"]UTF-8['"]\s*\/>/i);
  });

  it('should include viewport meta tag', () => {
    const input = `<div>Test</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(
      /<meta name=['"]viewport['"]\s+content=['"]width=device-width,\s*initial-scale=1\.0['"]\s*\/>/i
    );
  });

  it('should preserve special characters in fragment', () => {
    const input = `<div>&lt;script&gt;alert('test')&lt;/script&gt;</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/&lt;script&gt;alert\('test'\)&lt;\/script&gt;/);
  });

  it('should preserve inline styles', () => {
    const input = `<div style="color: red;">Styled</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/style="color: red;"/);
  });

  it('should preserve script tags in fragment', () => {
    const input = `<script>console.log('test');</script><div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<script>console\.log\('test'\);<\/script>/);
  });

  it('should preserve multiple elements in fragment', () => {
    const input = `<header>Header</header><main>Main</main><footer>Footer</footer>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<header>Header<\/header>/);
    expect(out).toMatch(/<main>Main<\/main>/);
    expect(out).toMatch(/<footer>Footer<\/footer>/);
  });

  it('should handle fragment with inline CSS', () => {
    const input = `<style>body { margin: 0; }</style><div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<style>body \{ margin: 0; \}<\/style>/);
  });

  it('should handle complex nested HTML structures', () => {
    const input = `<div><ul><li><a href="#">Link</a></li></ul></div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<div><ul><li><a href="#">Link<\/a><\/li><\/ul><\/div>/);
  });

  it('should not wrap if fragment contains <html> anywhere in content', () => {
    const input = `<html><body><div>Test</div></body></html>`;
    const out = ensureLandingFullHtmlDocument(input, 'Custom Title');
    expect(out).toBe(input);
  });

  it('should detect DOCTYPE case-insensitively', () => {
    const input = `<!doctype html><div>Test</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    // Should not add duplicate DOCTYPE
    expect((out.match(/<!doctype/gi) || []).length).toBe(1);
  });

  it('should handle whitespace in fragment', () => {
    const input = `  \n  <div>Content</div>  \n  `;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<div>Content<\/div>/);
    expect(out).toMatch(/<html>/);
  });

  it('should handle very long fragments', () => {
    const longContent = '<div>' + 'A'.repeat(10000) + '</div>';
    const out = ensureLandingFullHtmlDocument(longContent, 'Test');
    expect(out).toMatch(/<html>/);
    expect(out).toMatch(/<body>/);
    expect(out).toContain('A'.repeat(10000));
  });

  it('should escape special characters in title', () => {
    const input = `<div>Test</div>`;
    const out = ensureLandingFullHtmlDocument(input, `Test's "Title" & More`);
    expect(out).toMatch(/<title>Test's "Title" & More<\/title>/);
  });

  it('should handle fragments with comments', () => {
    const input = `<!-- Comment --><div>Content</div>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<!-- Comment -->/);
    expect(out).toMatch(/<div>Content<\/div>/);
  });

  it('should handle fragments with CDATA sections', () => {
    const input = `<script><![CDATA[var x = 1;]]></script>`;
    const out = ensureLandingFullHtmlDocument(input, 'Test');
    expect(out).toMatch(/<!\[CDATA\[var x = 1;\]\]>/);
  });
});
