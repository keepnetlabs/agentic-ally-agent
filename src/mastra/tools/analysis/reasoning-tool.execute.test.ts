import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerDebug: vi.fn(),
  loggerError: vi.fn(),
  validation: vi.fn(),
  internal: vi.fn(),
  normalizeError: vi.fn(),
  createToolErrorResponse: vi.fn(),
  logErrorInfo: vi.fn(),
}));

vi.mock('@mastra/core/tools', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual };
});

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    debug: mocks.loggerDebug,
    error: mocks.loggerError,
  }),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    validation: mocks.validation,
    internal: mocks.internal,
  },
}));

vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
  createToolErrorResponse: mocks.createToolErrorResponse,
  logErrorInfo: mocks.logErrorInfo,
}));

import { reasoningTool } from './reasoning-tool';

describe('reasoningTool.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validation.mockReturnValue({ code: 'VALIDATION', message: 'Thought is required' });
    mocks.internal.mockReturnValue({ code: 'INTERNAL', message: 'writer failure' });
    mocks.normalizeError.mockImplementation((e: Error) => e);
    mocks.createToolErrorResponse.mockImplementation((errorInfo: any) => ({
      success: false,
      error: JSON.stringify(errorInfo),
    }));
  });

  it('returns success true and emits start/delta/end when writer exists', async () => {
    const writer = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    const result = await (reasoningTool as any).execute(
      { thought: 'I will use option B because it minimizes risk.' },
      { writer }
    );

    expect(result).toEqual({ success: true });
    expect(writer.write).toHaveBeenCalledTimes(3);
    expect(writer.write.mock.calls[0][0].type).toBe('data-reasoning');
    expect(writer.write.mock.calls[0][0].data.event).toBe('start');
    expect(writer.write.mock.calls[1][0].type).toBe('data-reasoning');
    expect(writer.write.mock.calls[1][0].data.event).toBe('delta');
    expect(writer.write.mock.calls[1][0].data.text).toBe('I will use option B because it minimizes risk.');
    expect(writer.write.mock.calls[2][0].type).toBe('data-reasoning');
    expect(writer.write.mock.calls[2][0].data.event).toBe('end');
    expect(writer.write.mock.calls[0][0].data.id).toBe(writer.write.mock.calls[1][0].data.id);
    expect(writer.write.mock.calls[1][0].data.id).toBe(writer.write.mock.calls[2][0].data.id);
  });

  it('returns success true when writer is missing', async () => {
    const result = await (reasoningTool as any).execute(
      { thought: 'No stream writer available, continue without events.' }
    );

    expect(result).toEqual({ success: true });
    expect(mocks.loggerDebug).toHaveBeenCalled();
  });

  it('returns validation error response when thought is empty', async () => {
    const result = await (reasoningTool as any).execute(
      { thought: '' }
    );

    expect(mocks.validation).toHaveBeenCalledWith('Thought is required for reasoning tool');
    expect(mocks.createToolErrorResponse).toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('returns internal error response when writer throws', async () => {
    const writer = {
      write: vi.fn().mockRejectedValue(new Error('stream failed')),
    };

    const result = await (reasoningTool as any).execute(
      { thought: 'Attempting to emit reasoning.' },
      { writer }
    );

    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.internal).toHaveBeenCalledWith(
      'stream failed',
      expect.objectContaining({ step: 'reasoning-emission' })
    );
    expect(result.success).toBe(false);
  });

  it('accepts thought from direct inputData', async () => {
    const resultFromInputData = await (reasoningTool as any).execute(
      { thought: 'From inputData' }
    );

    expect(resultFromInputData).toEqual({ success: true });
  });

  it('logs emitted reasoning with ellipsis for long thought', async () => {
    const writer = {
      write: vi.fn().mockResolvedValue(undefined),
    };
    const longThought = 'A'.repeat(130);

    await (reasoningTool as any).execute(
      { thought: longThought },
      { writer }
    );

    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      'Reasoning emitted',
      expect.objectContaining({
        thought: expect.stringContaining('...'),
      })
    );
  });

  it('accepts thought from root-level input', async () => {
    const result = await (reasoningTool as any).execute(
      { thought: 'Root level thought input' }
    );

    expect(result).toEqual({ success: true });
  });
});
