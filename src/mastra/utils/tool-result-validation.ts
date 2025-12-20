/**
 * Tool Result Validation Utility
 * Validates tool output against Zod schema to ensure type safety and catch errors early
 * 
 * Usage:
 * ```typescript
 * const result = { success: true, data: {...} };
 * const validated = validateToolResult(result, outputSchema, 'tool-name');
 * if (!validated.success) {
 *   return { success: false, error: JSON.stringify(validated.error) };
 * }
 * return validated.data;
 * ```
 */

import { z } from 'zod';
import { getLogger } from './core/logger';
import { errorService } from '../services/error-service';
import { normalizeError } from './core/error-utils';

const logger = getLogger('ToolResultValidation');

/**
 * Validates a tool result against a Zod schema
 * @param result - The result object to validate
 * @param schema - Zod schema to validate against
 * @param toolName - Name of the tool (for logging)
 * @returns Validation result with success flag and data/error
 */
export function validateToolResult<T extends z.ZodTypeAny>(
  result: unknown,
  schema: T,
  toolName: string
): {
  success: true;
  data: z.infer<T>;
} | {
  success: false;
  error: ReturnType<typeof errorService.internal>;
} {
  try {
    const validated = schema.safeParse(result);

    if (!validated.success) {
      const errorDetails = {
        toolName,
        errors: validated.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        received: result,
      };

      logger.warn('Tool result validation failed', {
        toolName,
        errorCount: validated.error.errors.length,
        errors: errorDetails.errors,
        errorPaths: validated.error.errors.map(err => err.path.join('.')),
        receivedType: typeof result,
        receivedKeys: result && typeof result === 'object' ? Object.keys(result) : undefined,
      });

      const errorInfo = errorService.internal(
        `Tool result validation failed for ${toolName}`,
        errorDetails
      );

      return {
        success: false,
        error: errorInfo,
      };
    }

    logger.debug('Tool result validation passed', { toolName });
    return {
      success: true,
      data: validated.data,
    };
  } catch (error) {
    const err = normalizeError(error);
    logger.error('Unexpected error during tool result validation', {
      toolName,
      error: err.message,
      stack: err.stack,
    });

    const errorInfo = errorService.internal(
      `Unexpected error during validation for ${toolName}: ${err.message}`,
      { toolName, originalError: err.message, stack: err.stack }
    );

    return {
      success: false,
      error: errorInfo,
    };
  }
}

/**
 * Validates a tool result and returns the validated data or throws an error
 * Use this when you want validation to fail fast
 * @param result - The result object to validate
 * @param schema - Zod schema to validate against
 * @param toolName - Name of the tool (for logging)
 * @returns Validated data
 * @throws Error if validation fails
 */
export function validateToolResultOrThrow<T extends z.ZodTypeAny>(
  result: unknown,
  schema: T,
  toolName: string
): z.infer<T> {
  const validation = validateToolResult(result, schema, toolName);

  if (!validation.success) {
    throw new Error(`Tool result validation failed for ${toolName}: ${validation.error.message}`);
  }

  return validation.data;
}
