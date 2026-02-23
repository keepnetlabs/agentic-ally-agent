import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, withRetry } from './resilience-utils';

vi.mock('../../services/error-service', () => ({
  errorService: {
    recoveryAttempt: vi.fn(),
  },
}));

describe('resilience-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withTimeout', () => {

    it('should resolve when promise resolves before timeout', async () => {
      const promise = Promise.resolve('success');
      const resultPromise = withTimeout(promise, 5000);
      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should reject when timeout is exceeded', async () => {
      const slowPromise = new Promise<string>(() => {}); // Never resolves
      const resultPromise = withTimeout(slowPromise, 100);
      vi.advanceTimersByTime(100);
      await expect(resultPromise).rejects.toThrow('Timeout after 100ms');
    });

    it('should reject with timeout error message including ms', async () => {
      const slowPromise = new Promise<string>(() => {});
      const resultPromise = withTimeout(slowPromise, 30000);
      vi.advanceTimersByTime(30000);
      await expect(resultPromise).rejects.toThrow('Timeout after 30000ms');
    });

    it('should propagate rejection from inner promise', async () => {
      const failingPromise = Promise.reject(new Error('Inner failure'));
      await expect(withTimeout(failingPromise, 5000)).rejects.toThrow('Inner failure');
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.clearAllMocks();
    });

    it('should return result on first success', async () => {
      const op = vi.fn().mockResolvedValue('ok');
      const result = await withRetry(op, 'test-op');
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed on second attempt', async () => {
      const op = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');
      const resultPromise = withRetry(op, 'test-op');
      await vi.runAllTimersAsync();
      const result = await resultPromise;
      expect(result).toBe('ok');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts exhausted', async () => {
      const op = vi.fn().mockRejectedValue(new Error('always fails'));
      const resultPromise = withRetry(op, 'test-op', { maxAttempts: 3 });
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(resultPromise).rejects.toThrow('always fails'),
      ]);
      expect(op).toHaveBeenCalledTimes(3);
    });

    it('should call errorService.recoveryAttempt on failure', async () => {
      const { errorService } = await import('../../services/error-service');
      const op = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');
      const resultPromise = withRetry(op, 'my-operation');
      await vi.runAllTimersAsync();
      await resultPromise;
      expect(errorService.recoveryAttempt).toHaveBeenCalledWith(
        1,
        3,
        'my-operation',
        'fail',
        expect.objectContaining({ jitterEnabled: true })
      );
    });

    it('should pass string error message to recoveryAttempt when error is not Error instance', async () => {
      const { errorService } = await import('../../services/error-service');
      const op = vi.fn().mockRejectedValueOnce('string error').mockResolvedValueOnce('ok');
      const resultPromise = withRetry(op, 'string-error-op');
      await vi.runAllTimersAsync();
      await resultPromise;
      expect(errorService.recoveryAttempt).toHaveBeenCalledWith(
        1,
        3,
        'string-error-op',
        'string error',
        expect.any(Object)
      );
    });

    it('should respect custom maxAttempts option', async () => {
      const op = vi.fn().mockRejectedValue(new Error('fail'));
      const resultPromise = withRetry(op, 'test', { maxAttempts: 2 });
      await Promise.all([
        vi.runAllTimersAsync(),
        expect(resultPromise).rejects.toThrow('fail'),
      ]);
      expect(op).toHaveBeenCalledTimes(2);
    });
  });
});
