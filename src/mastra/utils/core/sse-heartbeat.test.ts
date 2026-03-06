import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withHeartbeat } from './sse-heartbeat';

const mockLoggerFns = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./logger', () => ({
  getLogger: () => mockLoggerFns,
}));

describe('withHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('null/undefined writer', () => {
    it('should run operation directly when writer is null', async () => {
      const operation = vi.fn().mockResolvedValue('result');
      const result = await withHeartbeat(null, operation);
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should run operation directly when writer is undefined', async () => {
      const operation = vi.fn().mockResolvedValue(42);
      const result = await withHeartbeat(undefined, operation);
      expect(result).toBe(42);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('with writer - success path', () => {
    it('should return operation result and send heartbeats', async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      const writer = { write };
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('done'), 50))
      );

      const promise = withHeartbeat(writer, operation, 10);
      await vi.advanceTimersByTimeAsync(60);
      const result = await promise;

      expect(result).toBe('done');
      expect(operation).toHaveBeenCalled();
      expect(write).toHaveBeenCalled();
      expect(write).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'text-delta', delta: '::heartbeat::' })
      );
    });

    it('should clear interval when operation completes', async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      const writer = { write };
      const operation = vi.fn().mockResolvedValue('ok');

      const result = await withHeartbeat(writer, operation, 100);
      expect(result).toBe('ok');

      vi.advanceTimersByTime(500);
      const callCountAfterCompletion = write.mock.calls.length;
      vi.advanceTimersByTime(500);
      expect(write.mock.calls.length).toBe(callCountAfterCompletion);
    });
  });

  describe('with writer - stopped branch', () => {
    it('should skip heartbeat when operation completes before first interval', async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      const writer = { write };
      const operation = vi.fn().mockResolvedValue('fast');

      const result = await withHeartbeat(writer, operation, 100);
      expect(result).toBe('fast');
      expect(operation).toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    });

    it('should skip heartbeat when interval fires after operation completes (stopped=true)', async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      const writer = { write };
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('done'), 5))
      );

      const promise = withHeartbeat(writer, operation, 10);
      await vi.advanceTimersByTimeAsync(15);
      const result = await promise;

      expect(result).toBe('done');
      expect(write.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });

  describe('with writer - catch block (stream closed)', () => {
    it('should stop heartbeat when writer.write throws', async () => {
      const write = vi.fn().mockRejectedValue(new Error('Stream closed'));
      const writer = { write };
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('done'), 100))
      );

      const promise = withHeartbeat(writer, operation, 20);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;

      expect(result).toBe('done');
      expect(write).toHaveBeenCalled();
      const writeCountAfterError = write.mock.calls.length;
      vi.advanceTimersByTime(500);
      expect(write.mock.calls.length).toBe(writeCountAfterError);
    });

    it('should log when writer.write throws (stream closed path)', async () => {
      const write = vi.fn().mockRejectedValue(new Error('Connection reset'));
      const writer = { write };
      const operation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('ok'), 50))
      );

      const promise = withHeartbeat(writer, operation, 10);
      await vi.advanceTimersByTimeAsync(60);
      await promise;

      expect(mockLoggerFns.debug).toHaveBeenCalledWith('heartbeat_stream_closed');
    });
  });

  describe('operation throws', () => {
    it('should propagate operation error and still clear interval', async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      const writer = { write };
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(withHeartbeat(writer, operation, 10)).rejects.toThrow('Operation failed');

      vi.advanceTimersByTime(100);
      const callCount = write.mock.calls.length;
      vi.advanceTimersByTime(500);
      expect(write.mock.calls.length).toBe(callCount);
    });
  });
});
