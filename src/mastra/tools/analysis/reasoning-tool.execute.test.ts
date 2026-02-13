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

vi.mock('@mastra/core/tools', () => ({
  Tool: class Tool {
    id: string;
    description: string;
    inputSchema: unknown;
    outputSchema: unknown;
    execute: (context: unknown) => Promise<unknown>;
    constructor(config: any) {
      this.id = config.id;
      this.description = config.description;
      this.inputSchema = config.inputSchema;
      this.outputSchema = config.outputSchema;
      this.execute = config.execute;
    }
  },
}));

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

    const result = await (reasoningTool as any).execute({
      context: { thought: 'I will use option B because it minimizes risk.' },
      writer,
    });

    expect(result).toEqual({ success: true });
    expect(writer.write).toHaveBeenCalledTimes(3);
    expect(writer.write.mock.calls[0][0].type).toBe('reasoning-start');
    expect(writer.write.mock.calls[1][0].type).toBe('reasoning-delta');
    expect(writer.write.mock.calls[2][0].type).toBe('reasoning-end');
    expect(writer.write.mock.calls[1][0].delta).toBe('I will use option B because it minimizes risk.');
    expect(writer.write.mock.calls[0][0].id).toBe(writer.write.mock.calls[1][0].id);
    expect(writer.write.mock.calls[1][0].id).toBe(writer.write.mock.calls[2][0].id);
  });

  it('returns success true when writer is missing', async () => {
    const result = await (reasoningTool as any).execute({
      context: { thought: 'No stream writer available, continue without events.' },
    });

    expect(result).toEqual({ success: true });
    expect(mocks.loggerDebug).toHaveBeenCalled();
  });

  it('returns validation error response when thought is empty', async () => {
    const result = await (reasoningTool as any).execute({
      context: { thought: '' },
    });

    expect(mocks.validation).toHaveBeenCalledWith('Thought is required for reasoning tool');
    expect(mocks.createToolErrorResponse).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain('VALIDATION');
  });

  it('returns internal error response when writer throws', async () => {
    const writer = {
      write: vi.fn().mockRejectedValue(new Error('stream failed')),
    };

    const result = await (reasoningTool as any).execute({
      context: { thought: 'Attempting to emit reasoning.' },
      writer,
    });

    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.internal).toHaveBeenCalledWith(
      'stream failed',
      expect.objectContaining({ step: 'reasoning-emission' })
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('INTERNAL');
  });

  it('accepts thought from inputData and input fallbacks', async () => {
    const resultFromInputData = await (reasoningTool as any).execute({
      inputData: { thought: 'From inputData' },
    });
    const resultFromInput = await (reasoningTool as any).execute({
      input: { thought: 'From input' },
    });

    expect(resultFromInputData).toEqual({ success: true });
    expect(resultFromInput).toEqual({ success: true });
  });

  it('logs emitted reasoning with ellipsis for long thought', async () => {
    const writer = {
      write: vi.fn().mockResolvedValue(undefined),
    };
    const longThought = 'A'.repeat(130);

    await (reasoningTool as any).execute({
      context: { thought: longThought },
      writer,
    });

    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      'Reasoning emitted',
      expect.objectContaining({
        thought: expect.stringContaining('...'),
      })
    );
  });

  it('accepts thought from root-level context object', async () => {
    const result = await (reasoningTool as any).execute({
      thought: 'Root level thought input',
    });

    expect(result).toEqual({ success: true });
  });
});
