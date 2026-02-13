// src/mastra/utils/core/resilience-utils.ts
import { RETRY } from '../../constants';
import { errorService } from '../../services/error-service';

/**
 * Wraps a promise with timeout protection
 * Composable - can be used standalone or combined with retry
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   someAsyncOperation(),
 *   60000 // 60 seconds
 * );
 * ```
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

/**
 * Retries an operation with exponential backoff + Full Jitter (AWS Best Practice)
 *
 * Jitter prevents "thundering herd" problem where all retries happen at the same time.
 * Uses RETRY constants from codebase for consistency.
 * Composable - can wrap any async operation.
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => someAsyncOperation(),
 *   'Operation name for logging'
 * );
 * ```
 *
 * @example Combined with timeout:
 * ```typescript
 * const result = await withRetry(
 *   () => withTimeout(someAsyncOperation(), 60000),
 *   'Operation name'
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'operation',
  options?: { maxAttempts?: number }
): Promise<T> {
  const maxAttempts = options?.maxAttempts || RETRY.MAX_ATTEMPTS;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log recovery attempt using structured error service
      errorService.recoveryAttempt(attempt + 1, maxAttempts, operationName, errorMessage, {
        jitterEnabled: RETRY.JITTER_ENABLED,
      });

      if (attempt === maxAttempts - 1) throw error;

      // Get jittered delay (if enabled in constants)
      const delay = RETRY.getBackoffDelay(attempt);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Should not reach here');
}
