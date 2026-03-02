import { describe, it, expect, vi } from 'vitest';
import { normalizeEmailContentAlign } from './email-content-align-normalizer';

vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('normalizeEmailContentAlign', () => {
  it('returns input unchanged when empty or not string', () => {
    expect(normalizeEmailContentAlign('')).toBe('');
    expect(normalizeEmailContentAlign(null as any)).toBe(null);
    expect(normalizeEmailContentAlign(undefined as any)).toBe(undefined);
  });

  it('returns input unchanged when no text-align or center', () => {
    const html = '<td style="font-size:14px">Hello</td>';
    expect(normalizeEmailContentAlign(html)).toBe(html);
  });

  it('replaces text-align: center with text-align: left on content td (font-family)', () => {
    const html = `<td style="font-family:Arial; text-align: center;">Greeting</td>`;
    const result = normalizeEmailContentAlign(html);
    expect(result).toContain('text-align: left');
    expect(result).not.toContain('text-align: center');
  });

  it('replaces text-align: center on td with line-height', () => {
    const html = `<td style="line-height:1.5; text-align: center;">Body</td>`;
    const result = normalizeEmailContentAlign(html);
    expect(result).toContain('text-align: left');
  });

  it('replaces text-align: center on td with font-size', () => {
    const html = `<td style="font-size:14px; text-align: center;">Content</td>`;
    const result = normalizeEmailContentAlign(html);
    expect(result).toContain('text-align: left');
  });

  it('leaves logo/button td unchanged (no font-family, line-height, font-size)', () => {
    const html = `<td style="text-align: center;"><img src="logo.png"/></td>`;
    const result = normalizeEmailContentAlign(html);
    expect(result).toBe(html);
  });

  it('handles double-quoted style attribute', () => {
    const html = `<td style="font-size:14px; text-align: center">Text</td>`;
    const result = normalizeEmailContentAlign(html);
    expect(result).toContain('text-align: left');
  });
});
