// src/mastra/utils/core/resilience-utils.ts
import { RETRY } from '../../constants';
import { getLogger } from './logger';

const logger = getLogger('ResilienceUtils');

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
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

/**
 * Retries an operation with exponential backoff
 * Uses RETRY constants from codebase for consistency
 * Composable - can wrap any async operation
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
    operationName: string = 'operation'
): Promise<T> {
    for (let attempt = 0; attempt < RETRY.MAX_ATTEMPTS; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === RETRY.MAX_ATTEMPTS - 1) throw error;
            const delay = RETRY.getBackoffDelay(attempt);
            logger.warn('Operation failed, retrying', {
                operation: operationName,
                attempt: attempt + 1,
                maxAttempts: RETRY.MAX_ATTEMPTS,
                retryDelayMs: delay
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Should not reach here');
}

