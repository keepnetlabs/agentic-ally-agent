/**
 * Error Utilities
 *
 * Utilities for error handling and normalization to ensure consistent error types
 * across the codebase.
 *
 * Usage:
 * ```typescript
 * catch (error) {
 *   const err = normalizeError(error);
 *   logger.error('Operation failed', { error: err.message, stack: err.stack });
 * }
 * ```
 */

import { ErrorInfo } from '../../services/error-service';

/** Logger interface for error logging helper. Accepts any object with error/warn/info methods. */
export interface LoggerLike {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
}

/**
 * Normalizes an unknown error to an Error object
 * Ensures consistent error handling regardless of the error type
 *
 * @param error - Unknown error value (could be Error, string, object, etc.)
 * @returns Normalized Error object
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const err = normalizeError(error);
 *   // err is guaranteed to be an Error object
 *   logger.error('Failed', { message: err.message, stack: err.stack });
 * }
 * ```
 */
export function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Creates a standardized tool error response
 * Ensures consistent error response format across all tools
 *
 * @param errorInfo - ErrorInfo object from errorService
 * @returns Standardized error response with success: false and stringified error
 *
 * @example
 * ```typescript
 * if (!token) {
 *   const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.TOKEN_MISSING);
 *   return createToolErrorResponse(errorInfo);
 * }
 * ```
 */
export function createToolErrorResponse(errorInfo: ErrorInfo): {
  success: false;
  error: string;
} {
  return {
    success: false,
    error: JSON.stringify(errorInfo),
  };
}

/**
 * Logs an ErrorInfo object with standardized format
 * Ensures consistent error logging across all tools
 *
 * @param logger - Logger instance from getLogger()
 * @param level - Log level ('error', 'warn', or 'info')
 * @param message - Log message describing the context
 * @param errorInfo - ErrorInfo object from errorService
 *
 * @example
 * ```typescript
 * const errorInfo = errorService.auth('Token missing');
 * logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
 * ```
 *
 * @example
 * ```typescript
 * catch (error) {
 *   const err = normalizeError(error);
 *   const errorInfo = errorService.external(err.message);
 *   logErrorInfo(logger, 'error', 'Operation failed', errorInfo);
 *   return createToolErrorResponse(errorInfo);
 * }
 * ```
 */
export function logErrorInfo(
  logger: LoggerLike,
  level: 'error' | 'warn' | 'info',
  message: string,
  errorInfo: ErrorInfo
): void {
  logger[level](message, {
    code: errorInfo.code,
    message: errorInfo.message,
    category: errorInfo.category,
  });
}
