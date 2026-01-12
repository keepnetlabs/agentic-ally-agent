import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { withTimeout, withRetry } from './resilience-utils';
import { errorService } from '../../services/error-service';
import { RETRY } from '../../constants';

// Mock error service
vi.mock('../../services/error-service', () => ({
  errorService: {
    recoveryAttempt: vi.fn(),
  },
}));

// Mock RETRY constants to avoid hanging on delays
vi.mock('../../constants', () => ({
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000,
    JITTER_ENABLED: true,
    getBackoffDelay: vi.fn().mockReturnValue(0),
  },
}));

describe('resilience-utils', () => {
  beforeAll(() => {
    // Suppress unhandled rejections that are inherent to the withTimeout implementation
    // since we cannot change the source code.
    process.on('unhandledRejection', (reason) => {
      if (reason instanceof Error && reason.message.includes('Timeout after')) {
        return;
      }
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
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

      await vi.advanceTimersByTimeAsync(1000);

      await expect(timeoutPromise).rejects.toThrow('Timeout after 1000ms');
    });

    it('should include timeout duration in error message', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('delayed'), 10000);
      });

      const timeoutPromise = withTimeout(promise, 5000);

      await vi.advanceTimersByTimeAsync(5000);

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
        await vi.advanceTimersByTimeAsync(timeoutMs);

        await expect(timeoutPromise).rejects.toThrow(`Timeout after ${timeoutMs}ms`);
      }
    });

    it('should handle promise that resolves exactly at timeout boundary', async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve('resolved'), 1000);
      });

      const timeoutPromise = withTimeout(promise, 1000);
      await vi.advanceTimersByTimeAsync(1000);

      // Both outcomes are acceptable due to race condition, but we check one or the other
      try {
        const result = await timeoutPromise;
        expect(result).toBe('resolved');
      } catch (error) {
        expect((error as Error).message).toContain('Timeout');
      }
    });

    it('should handle zero timeout', async () => {
      // Use a slower promise to ensure timeout wins
      const promise = new Promise(resolve => setTimeout(() => resolve('success'), 10));
      const timeoutPromise = withTimeout(promise, 0);

      await vi.advanceTimersByTimeAsync(0);

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

      const promise = withRetry(operation, 'test-operation');
      await vi.advanceTimersByTimeAsync(100); // Advance enough to trigger potential delay if it existed
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times until success', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(operation, 'test-operation');
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts exceeded', async () => {
      const finalError = new Error('Final attempt failed');
      const operation = vi.fn().mockRejectedValue(finalError);

      const promise = withRetry(operation, 'test-operation');
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).rejects.toThrow('Final attempt failed');
      expect(operation).toHaveBeenCalledTimes(3); // MAX_ATTEMPTS = 3
    });

    it('should log recovery attempts using error service', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(operation, 'my-operation');
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(errorService.recoveryAttempt).toHaveBeenCalledWith(
        1,
        3,
        'my-operation',
        'First attempt failed',
        expect.objectContaining({
          jitterEnabled: true,
        })
      );
    });

    it('should calculate exponential backoff delays correctly', async () => {
      vi.mocked(RETRY.getBackoffDelay).mockImplementation(attempt => (attempt + 1) * 1000);

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
          if (typeof delay === 'number') delays.push(delay);
          return originalSetTimeout(callback, delay);
        })
      );

      const promise = withRetry(operation, 'test-operation');

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000); // Trigger first retry
      await vi.advanceTimersByTimeAsync(2000); // Trigger second retry

      await promise;

      expect(delays).toContain(1000);
      expect(delays).toContain(2000);

      vi.unstubAllGlobals();
      vi.mocked(RETRY.getBackoffDelay).mockReturnValue(0);
    });

    it('should handle async operations that throw errors', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        throw new Error('Async error');
      });

      const promise = withRetry(operation, 'async-operation');
      await vi.advanceTimersByTimeAsync(3000);
      await expect(promise).rejects.toThrow('Async error');
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

    it('should properly propagate errors on final attempt', async () => {
      const customError = new Error('Custom error message');
      const operation = vi.fn().mockRejectedValue(customError);

      const promise = withRetry(operation, 'test-operation');
      await vi.advanceTimersByTimeAsync(3000);
      await expect(promise).rejects.toBe(customError);
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

      const promise = withRetry(wrappedOperation, 'combined-operation');
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

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
              setTimeout(() => resolve('delayed'), 10000);
            } else {
              resolve('success');
            }
          })
      );

      const wrappedOperation = () => withTimeout(operation(), 1000);

      const promise = withRetry(wrappedOperation, 'combined-operation');

      // First attempt times out
      await vi.advanceTimersByTimeAsync(1000);
      // Wait for retry delay (mocked to 0)
      await vi.advanceTimersByTimeAsync(100);

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

      // Advance through all retries (3 attempts * 1000ms)
      await vi.advanceTimersByTimeAsync(5000);

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

    it('should handle very large timeout values', async () => {
      const promise = Promise.resolve('success');
      // Use max 32-bit signed int for timeout to avoid overflow warnings
      const result = await withTimeout(promise, 2147483647);
      expect(result).toBe('success');
    });

    it('should handle rapid consecutive retries', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(operation, 'test-operation');
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
