import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  jsonrepair: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  normalizeError: vi.fn(),
}));

vi.mock('jsonrepair', () => ({
  jsonrepair: mocks.jsonrepair,
}));

vi.mock('../core/logger', () => ({
  getLogger: () => ({
    debug: mocks.debug,
    error: mocks.error,
  }),
}));

vi.mock('../core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
}));

import { cleanResponse } from './json-cleaner';

describe('json-cleaner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jsonrepair.mockImplementation((input: string) => input);
    mocks.normalizeError.mockImplementation((err: Error) => err);
  });

  it('extracts wrapped JSON strings before repair', () => {
    const input = `'{"a":1}'`;
    const cleaned = cleanResponse(input, 'wrapped');

    expect(cleaned).toBe('{"a":1}');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('{"a":1}');
  });

  it('extracts JSON from markdown code blocks', () => {
    const input = '```json\n{"k":"v"}\n```';
    const cleaned = cleanResponse(input, 'markdown');

    expect(cleaned).toBe('{"k":"v"}');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('{"k":"v"}');
  });

  it('extracts object JSON from surrounding text', () => {
    const input = 'prefix text {"x": 1, "y": 2} suffix text';
    const cleaned = cleanResponse(input, 'object');

    expect(cleaned).toBe('{"x": 1, "y": 2}');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('{"x": 1, "y": 2}');
  });

  it('handles escaped quotes while validating extracted object braces', () => {
    const input = 'prefix {"msg":"value with \\"quoted\\" token","ok":true} suffix';
    const cleaned = cleanResponse(input, 'escaped');

    expect(cleaned).toBe('{"msg":"value with \\"quoted\\" token","ok":true}');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('{"msg":"value with \\"quoted\\" token","ok":true}');
  });

  it('extracts arrays when object extraction is unavailable', () => {
    const input = 'noise before ["a", "b", "c"] noise after';
    const cleaned = cleanResponse(input, 'array');

    expect(cleaned).toBe('["a", "b", "c"]');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('["a", "b", "c"]');
  });

  it('falls back to original text when no JSON pattern is found', () => {
    const input = 'no json here';
    mocks.jsonrepair.mockReturnValueOnce('"no json here"');

    const cleaned = cleanResponse(input, 'fallback');

    expect(cleaned).toBe('"no json here"');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('no json here');
  });

  it('falls back when extracted object has invalid brace sequence', () => {
    const input = 'prefix {"a":1} } suffix';
    mocks.jsonrepair.mockReturnValueOnce('"prefix {\\"a\\":1} } suffix"');

    const cleaned = cleanResponse(input, 'invalid-brace');

    expect(cleaned).toBe('"prefix {\\"a\\":1} } suffix"');
    expect(mocks.jsonrepair).toHaveBeenCalledWith('prefix {"a":1} } suffix');
  });

  it('throws wrapped error when cleaning fails', () => {
    mocks.jsonrepair.mockImplementationOnce(() => {
      throw new Error('repair failed');
    });

    expect(() => cleanResponse('{"bad":', 'broken')).toThrow('Failed to clean broken response: repair failed');
    expect(mocks.error).toHaveBeenCalled();
  });
});
