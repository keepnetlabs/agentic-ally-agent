/**
 * Tests repairHtml when parse5 throws (catch block coverage).
 * Separate file because we need to mock parse5 module.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../core/logger', () => ({
  getLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('parse5', () => ({
  parseFragment: () => {
    throw new Error('parse5 parse error');
  },
  serialize: vi.fn(() => ''),
}));

const { repairHtml } = await import('./json-validation-utils');

describe('repairHtml parse error', () => {
  it('should return original HTML when parse5.parseFragment throws', () => {
    const html = '<p>Hello</p>';
    const result = repairHtml(html);
    expect(result).toBe(html);
  });
});
