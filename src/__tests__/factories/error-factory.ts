/**
 * Test Factory for Error Types
 * Provides reusable factory functions for creating test error data
 */

import { ErrorInfo, ErrorCategory } from '../../mastra/services/error-service';

/**
 * Creates a test ErrorInfo object
 */
export function createErrorInfo(overrides?: Partial<ErrorInfo>): ErrorInfo {
  const defaultError: ErrorInfo = {
    code: 'TEST_ERROR',
    message: 'Test error message',
    category: ErrorCategory.INTERNAL,
    retryable: false,
    suggestion: 'Test suggestion',
    timestamp: Date.now(),
  };

  return {
    ...defaultError,
    ...overrides,
  };
}

/**
 * Creates test error response format (as returned by tools)
 */
export function createErrorResponse(errorInfo?: Partial<ErrorInfo>) {
  const error = createErrorInfo(errorInfo);
  return {
    success: false,
    error: JSON.stringify(error),
  };
}
