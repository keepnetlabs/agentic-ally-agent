import { describe, it, expect } from 'vitest';
import { normalizeEmailParagraphs } from './email-paragraph-normalizer';

describe('normalizeEmailParagraphs', () => {
  it('returns input unchanged when td has no double-br', () => {
    const html = '<td>Single line</td>';
    expect(normalizeEmailParagraphs(html)).toBe(html);
  });

  it('returns input unchanged when td already has p tags', () => {
    const html = '<td><p style="margin:0 0 12px 0">Already wrapped</p></td>';
    expect(normalizeEmailParagraphs(html)).toBe(html);
  });

  it('returns input unchanged when td contains nested table', () => {
    const html = '<td><table><tr><td>Nested</td></tr></table></td>';
    expect(normalizeEmailParagraphs(html)).toBe(html);
  });

  it('returns input unchanged when text content is too short (< 10 chars)', () => {
    const html = '<td>Hi<br><br>Bye</td>';
    expect(normalizeEmailParagraphs(html)).toBe(html);
  });

  it('wraps br<br> separated chunks in p tags', () => {
    const html = '<td>First paragraph here.<br><br>Second paragraph here.</td>';
    const result = normalizeEmailParagraphs(html);
    expect(result).toContain("<p style='margin:0 0 12px 0;'>First paragraph here.</p>");
    expect(result).toContain("<p style='margin:0 0 12px 0;'>Second paragraph here.</p>");
  });

  it('preserves single br within paragraphs', () => {
    const html = '<td>Line one<br>Line two<br><br>New paragraph.</td>';
    const result = normalizeEmailParagraphs(html);
    expect(result).toContain('Line one<br>Line two');
    expect(result).toContain('New paragraph.');
  });

  it('handles br/ and br with different formats', () => {
    const html = '<td>Chunk one here.<br/><br/>Chunk two here.</td>';
    const result = normalizeEmailParagraphs(html);
    expect(result).toContain("<p style='margin:0 0 12px 0;'>Chunk one here.</p>");
    expect(result).toContain("<p style='margin:0 0 12px 0;'>Chunk two here.</p>");
  });

  it('leaves block elements (div, h1) as-is within chunks', () => {
    const html = '<td><div>Block</div><br><br>Text</td>';
    const result = normalizeEmailParagraphs(html);
    expect(result).toContain('<div>Block</div>');
  });
});
