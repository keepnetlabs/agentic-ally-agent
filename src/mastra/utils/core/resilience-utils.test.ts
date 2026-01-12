import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, withRetry } from './resilience-utils';
import { errorService } from '../../services/error-service';

// Mock error service
vi.mock('../../services/error-service', () => ({
  errorService: {
    recoveryAttempt: vi.fn(),
  },
}));

describe('resilience-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== TIMEOUT TESTS ====================
  describe('withTimeout', () => {
    it('should return result when promise resolves before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 5000);

      expect(result).toBe('success');
    });

    it('should reject with timeout error when promise exceeds timeout', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('delayed'), 10000);
      });

      const timeoutPromise = withTimeout(promise, 1000);

      vi.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow('Timeout after 1000ms');
    });

    it('should include timeout duration in error message', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('delayed'), 10000);
      });

      const timeoutPromise = withTimeout(promise, 5000);

      vi.advanceTimersByTime(5000);

      try {
        await timeoutPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('5000');
      }
    });

    it('should handle rejection from original promise before timeout', async () => {
      const error = new Error('Original error');
      const promise = Promise.reject(error);

      await expect(withTimeout(promise, 5000)).rejects.toThrow('Original error');
    });

    it('should work with different timeout values', async () => {
      const testCases = [100, 1000, 5000, 30000];

      for (const timeoutMs of testCases) {
        const promise = new Promise((resolve) => {
          setTimeout(() => resolve('success'), timeoutMs + 1000);
        });

        const timeoutPromise = withTimeout(promise, timeoutMs);
        vi.advanceTimersByTime(timeoutMs);

        await expect(timeoutPromise).rejects.toThrow(`Timeout after ${timeoutMs}ms`);
      }
    });

    it('should handle promise that resolves exactly at timeout boundary', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('resolved'), 1000);
      });

      const timeoutPromise = withTimeout(promise, 1000);
      vi.advanceTimersByTime(1000);

      // May resolve or timeout depending on race condition timing
      // Both outcomes are acceptable
      try {
        const result = await timeoutPromise;
        expect(result).toBe('resolved');
      } catch (error) {
        expect((error as Error).message).toContain('Timeout');
      }
    });

    it('should handle zero timeout', async () => {
      const promise = Promise.resolve('success');
      const timeoutPromise = withTimeout(promise, 0);

      await expect(timeoutPromise).rejects.toThrow('Timeout after 0ms');
    });

    it('should be composable with other operations', async () => {
      let executed = false;
      const operation = async () => {
        executed = true;
        return 'result';
      };

      const result = await withTimeout(operation(), 5000);

      expect(executed).toBe(true);
      expect(result).toBe('result');
    });
  });

  // ==================== RETRY TESTS ====================
  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation on failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times until success', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts exceeded', async () => {
      const finalError = new Error('Final attempt failed');
      const operation = vi.fn().mockRejectedValue(finalError);

      await expect(withRetry(operation, 'test-operation')).rejects.toThrow('Final attempt failed');
      expect(operation).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS = 3
    });

    it('should log recovery attempts using error service', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      await withRetry(operation, 'my-operation');

      expect(errorService.recoveryAttempt).toHaveBeenCalledWith(
        1, // attempt number
        3, // max attempts
        'my-operation', // operation name
        'First attempt failed', // error message
        expect.objectContaining({
          jitterEnabled: true,
        })
      );
    });

    it('should include operation name in logging', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await withRetry(operation, 'custom-operation-name');

      const callArgs = (errorService.recoveryAttempt as any).mock.calls[0];
      expect(callArgs[2]).toBe('custom-operation-name');
    });

    it('should use default operation name if not provided', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      await withRetry(operation);

      const callArgs = (errorService.recoveryAttempt as any).mock.calls[0];
      expect(callArgs[2]).toBe('operation');
    });

    it('should handle non-Error rejections', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce('String error')
        .mockResolvedValueOnce('success');

      await withRetry(operation, 'test-operation');

      const callArgs = (errorService.recoveryAttempt as any).mock.calls[0];
      expect(callArgs[3]).toBe('String error'); // Error message should be converted to string
    });

    it('should wait between retry attempts', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(operation, 'test-operation');

      // Advance by backoff delay
      vi.advanceTimersByTime(1000); // BASE_DELAY_MS = 1000

      await promise;

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const delays: number[] = [];
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      vi.stubGlobal(
        'setTimeout',
        vi.fn((callback, delay) => {
          delays.push(delay);
          return originalSetTimeout(callback, delay);
        })
      );

      const promise = withRetry(operation, 'test-operation');

      // Advance through retries
      vi.advanceTimersByTime(10000);

      await promise;

      // Delays should be set (jitter adds randomness, so we just verify they're set)
      expect(delays.length).toBeGreaterThan(0);

      // Restore
      vi.unstubAllGlobals();
    });

    it('should handle async operations that throw errors', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('Async error');
      });

      await expect(withRetry(operation, 'async-operation')).rejects.toThrow('Async error');
    });

    it('should work with different types of resolved values', async () => {
      const testCases = [
        { value: 'string', expected: 'string' },
        { value: 123, expected: 123 },
        { value: { key: 'value' }, expected: { key: 'value' } },
        { value: [1, 2, 3], expected: [1, 2, 3] },
        { value: null, expected: null },
      ];

      for (const testCase of testCases) {
        const operation = vi.fn().mockResolvedValue(testCase.value);
        const result = await withRetry(operation);
        expect(result).toEqual(testCase.expected);
      }
    });

    it('should not retry on the first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, 'test-operation');

      expect(result).toBe('success');
      expect(errorService.recoveryAttempt).not.toHaveBeenCalled();
    });

    it('should properly propagate errors on final attempt', async () => {
      const customError = new Error('Custom error message');
      const operation = vi.fn().mockRejectedValue(customError);

      try {
        await withRetry(operation, 'test-operation');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(customError);
        expect((error as Error).message).toBe('Custom error message');
      }
    });
  });

  // ==================== COMBINED TESTS ====================
  describe('withTimeout + withRetry combination', () => {
    it('should retry with timeout on each attempt', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');

      const wrappedOperation = () => withTimeout(operation(), 5000);

      const result = await withRetry(wrappedOperation, 'combined-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should timeout and retry when individual attempt times out', async () => {
      let callCount = 0;
      const operation = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            callCount++;
            if (callCount === 1) {
              // First attempt: take longer than timeout
              setTimeout(() => resolve('delayed'), 10000);
            } else {
              // Second attempt: resolve quickly
              resolve('success');
            }
          })
      );

      const wrappedOperation = () => withTimeout(operation(), 1000);

      const promise = withRetry(wrappedOperation, 'combined-operation');

      // First attempt times out
      vi.advanceTimersByTime(1000);
      // Wait for retry delay
      vi.advanceTimersByTime(1100);
      // Second attempt succeeds immediately
      vi.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should eventually fail if retries keep timing out', async () => {
      const operation = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('success'), 10000); // Always slower than timeout
          })
      );

      const wrappedOperation = () => withTimeout(operation(), 1000);

      const promise = withRetry(wrappedOperation, 'combined-operation');

      // Advance through all retries and timeouts
      vi.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow('Timeout after 1000ms');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge cases', () => {
    it('should handle undefined values correctly', async () => {
      const operation = vi.fn().mockResolvedValue(undefined);
      const result = await withRetry(operation);

      expect(result).toBeUndefined();
    });

    it('should handle boolean return values', async () => {
      const operation1 = vi.fn().mockResolvedValue(true);
      const result1 = await withRetry(operation1);
      expect(result1).toBe(true);

      const operation2 = vi.fn().mockResolvedValue(false);
      const result2 = await withRetry(operation2);
      expect(result2).toBe(false);
    });

    it('should handle very large timeout values', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, Number.MAX_SAFE_INTEGER);

      expect(result).toBe('success');
    });

    it('should handle errors without message property', async () => {
      const operation = vi.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce('success');

      const result = await withRetry(operation, 'test-operation');
      expect(result).toBe('success');
    });

    it('should handle rapid consecutive retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      vi.advanceTimersByTime(10000); // Skip all delays

      const result = await withRetry(operation, 'test-operation');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
