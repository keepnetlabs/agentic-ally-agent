import type { ValidationError } from '@mastra/core/tools';

/**
 * Type guard to check if a tool execute result is a ValidationError.
 * ValidationError has `{ error: true, message: string, validationErrors: ... }`.
 */
export function isValidationError(result: unknown): result is ValidationError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in result &&
    (result as ValidationError).error === true
  );
}

/**
 * Assertion helper for tool tests. Narrows the union type
 * `TSchemaOut | ValidationError` down to `TSchemaOut` and throws
 * a descriptive error if the result is actually a ValidationError.
 *
 * Usage:
 * ```ts
 * const result = await myTool.execute!(input, {});
 * assertToolSuccess(result);
 * // result is now narrowed — access .success, .data, etc. safely
 * ```
 */
export function assertToolSuccess<T>(result: T | ValidationError): asserts result is T {
  if (isValidationError(result)) {
    throw new Error(`Expected tool success but got ValidationError: ${result.message}`);
  }
}
