import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitUISignal } from './ui-signal';

vi.mock('./error-utils', () => ({
  normalizeError: vi.fn((e: any) => ({ message: e?.message || 'Unknown', code: 'UNKNOWN' })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    external: vi.fn().mockReturnValue({ code: 'ERR', message: 'Error' }),
  },
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
};

describe('emitUISignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should no-op when writer is undefined', async () => {
    await emitUISignal({
      writer: undefined,
      signalName: 'test-signal',
      meta: { foo: 'bar' },
      logger: mockLogger as any,
      stepLabel: 'test-step',
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should emit data-ui-signal event when writer is provided', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const writer = { write };

    await emitUISignal({
      writer,
      signalName: 'progress',
      meta: { percent: 50, message: 'Half done' },
      logger: mockLogger as any,
      stepLabel: 'test-step',
    });

    expect(write).toHaveBeenCalledTimes(1);
    const call = write.mock.calls[0][0];
    expect(call.type).toBe('data-ui-signal');
    expect(call.data.signal).toBe('progress');
    expect(call.data.message).toContain('::ui:progress::');
    expect(call.data.message).toContain('::/ui:progress::');
  });

  it('should base64-encode meta in message', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const meta = { key: 'value' };
    const expectedB64 = Buffer.from(JSON.stringify(meta)).toString('base64');

    await emitUISignal({
      writer: { write },
      signalName: 'done',
      meta,
      logger: mockLogger as any,
      stepLabel: 'test-step',
    });

    expect(write.mock.calls[0][0].data.message).toContain(expectedB64);
  });

  it('should log error but not throw when write fails', async () => {
    const write = vi.fn().mockRejectedValue(new Error('Write failed'));
    const { logErrorInfo } = await import('./error-utils');

    await emitUISignal({
      writer: { write },
      signalName: 'fail',
      meta: {},
      logger: mockLogger as any,
      stepLabel: 'fail-step',
    });

    expect(logErrorInfo).toHaveBeenCalledWith(
      mockLogger,
      'warn',
      'Failed to emit UI signal for fail-step',
      expect.any(Object)
    );
  });
});
