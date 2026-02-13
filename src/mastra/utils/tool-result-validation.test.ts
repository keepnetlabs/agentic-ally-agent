import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  internal: vi.fn(),
  normalizeError: vi.fn(),
}));

vi.mock('./core/logger', () => ({
  getLogger: () => ({
    warn: mocks.warn,
    debug: mocks.debug,
    error: mocks.error,
  }),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    internal: mocks.internal,
  },
}));

vi.mock('./core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
}));

import { validateToolResult, validateToolResultOrThrow } from './tool-result-validation';

describe('tool-result-validation utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.internal.mockImplementation((message: string, meta?: unknown) => ({
      code: 'ERR_INT_001',
      message,
      category: 'INTERNAL',
      meta,
    }));
    mocks.normalizeError.mockImplementation((err: Error) => err);
  });

  it('returns success with parsed data when schema validation passes', () => {
    const schema = z.object({ ok: z.boolean() });
    const result = validateToolResult({ ok: true }, schema, 'demo-tool');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ ok: true });
    }
    expect(mocks.debug).toHaveBeenCalled();
  });

  it('returns internal error payload when schema validation fails', () => {
    const schema = z.object({ ok: z.boolean() });
    const result = validateToolResult({ ok: 'nope' }, schema, 'demo-tool');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('ERR_INT_001');
      expect(result.error.message).toContain('Tool result validation failed for demo-tool');
    }
    expect(mocks.warn).toHaveBeenCalled();
    expect(mocks.internal).toHaveBeenCalled();
  });

  it('logs undefined receivedKeys when invalid result is non-object', () => {
    const schema = z.object({ ok: z.boolean() });
    const result = validateToolResult('not-an-object', schema, 'demo-tool');

    expect(result.success).toBe(false);
    expect(mocks.warn).toHaveBeenCalledWith(
      'Tool result validation failed',
      expect.objectContaining({
        receivedType: 'string',
        receivedKeys: undefined,
      })
    );
  });

  it('returns internal error payload when safeParse throws unexpectedly', () => {
    const throwingSchema = {
      safeParse: () => {
        throw new Error('safeParse exploded');
      },
    } as any;

    const result = validateToolResult({ any: 'value' }, throwingSchema, 'throwing-tool');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Unexpected error during validation for throwing-tool');
    }
    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });

  it('validateToolResultOrThrow returns data when validation succeeds', () => {
    const schema = z.object({ score: z.number() });
    const data = validateToolResultOrThrow({ score: 10 }, schema, 'score-tool');

    expect(data).toEqual({ score: 10 });
  });

  it('validateToolResultOrThrow throws when validation fails', () => {
    const schema = z.object({ score: z.number() });

    expect(() =>
      validateToolResultOrThrow({ score: 'bad' }, schema, 'score-tool')
    ).toThrow('Tool result validation failed for score-tool');
  });
});
