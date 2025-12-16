/**
 * Centralized Error Handling Service
 * Provides standardized, categorized error responses for all tools
 * Compatible with existing outputSchema (error: string) via JSON serialization
 *
 * Usage:
 * catch (error) {
 *   const errorInfo = errorService.auth('Token expired');
 *   logger.error('Operation failed', errorInfo);
 *   return { success: false, error: JSON.stringify(errorInfo) };
 * }
 */

import { getLogger } from '../utils/core/logger';

const logger = getLogger('ErrorService');

/**
 * Error categories matching AI agent decision-making needs
 */
export enum ErrorCategory {
  // Authentication/authorization errors
  AUTH = 'AUTH',

  // Input validation errors
  VALIDATION = 'VALIDATION',

  // External service errors (APIs, KV, workers)
  EXTERNAL = 'EXTERNAL',

  // Resource not found
  NOT_FOUND = 'NOT_FOUND',

  // AI model errors (generation, parsing)
  AI_MODEL = 'AI_MODEL',

  // Timeout errors
  TIMEOUT = 'TIMEOUT',

  // Rate limiting
  RATE_LIMIT = 'RATE_LIMIT',

  // Internal/unexpected errors
  INTERNAL = 'INTERNAL',
}

/**
 * Standardized error information structure
 * Can be JSON-serialized to fit outputSchema: error: string
 */
export interface ErrorInfo {
  code: string;                           // Short error code (e.g., 'AUTH', 'EXTERNAL')
  message: string;                        // Human-readable error message
  category: ErrorCategory;                // Error category for agent understanding
  retryable: boolean;                     // Whether this error can be retried
  suggestion?: string;                    // User-friendly suggestion for resolution
  details?: Record<string, unknown>;      // Additional context for debugging
  timestamp?: number;                     // When error occurred
}

/**
 * Centralized error factory service
 * Each method returns a standardized ErrorInfo object
 */
export const errorService = {
  /**
   * Authentication/authorization errors
   * @param message - Error message
   * @param details - Additional context
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.auth('Token missing or expired');
   * return { success: false, error: JSON.stringify(error) };
   */
  auth: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'AUTH',
      message,
      category: ErrorCategory.AUTH,
      retryable: false,
      suggestion: 'Please verify your authentication credentials and try again.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('Auth error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Input validation errors
   * @param message - Error message
   * @param details - Additional context (e.g., { field: 'email', reason: 'invalid format' })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.validation('Email must be a valid email address', { field: 'email' });
   */
  validation: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'VALIDATION',
      message,
      category: ErrorCategory.VALIDATION,
      retryable: false,
      suggestion: 'Please check your input and try again with valid data.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('Validation error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * External service errors (APIs, KV, Workers, etc.)
   * @param message - Error message
   * @param details - Additional context (e.g., { service: 'KV', status: 502 })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.external('Worker failed: 502 Bad Gateway', { service: 'phishing-worker', status: 502 });
   */
  external: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'EXTERNAL',
      message,
      category: ErrorCategory.EXTERNAL,
      retryable: true,
      suggestion: 'The external service is temporarily unavailable. Please try again in a moment.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('External service error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Resource not found errors
   * @param message - Error message
   * @param details - Additional context (e.g., { resourceId: '123', resourceType: 'microlearning' })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.notFound('Microlearning not found', { resourceId: 'ml-123' });
   */
  notFound: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'NOT_FOUND',
      message,
      category: ErrorCategory.NOT_FOUND,
      retryable: false,
      suggestion: 'The requested resource does not exist. Please verify the ID and try again.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('Not found error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * AI model errors (generation, parsing, validation)
   * @param message - Error message
   * @param details - Additional context (e.g., { reason: 'JSON parsing failed', model: 'gpt-4o' })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.aiModel('JSON parsing failed after 3 repair attempts', { model: 'gpt-4o' });
   */
  aiModel: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'AI_MODEL',
      message,
      category: ErrorCategory.AI_MODEL,
      retryable: true,
      suggestion: 'The AI service encountered an issue. Try with a simpler input or use a different model.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('AI model error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Timeout errors
   * @param message - Error message
   * @param details - Additional context (e.g., { timeoutMs: 60000, operation: 'generate-content' })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.timeout('Operation exceeded 60s timeout', { timeoutMs: 60000 });
   */
  timeout: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'TIMEOUT',
      message,
      category: ErrorCategory.TIMEOUT,
      retryable: true,
      suggestion: 'The operation took too long. Please try again, or try with a smaller request.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('Timeout error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Rate limiting errors
   * @param message - Error message
   * @param details - Additional context (e.g., { limit: 100, resetAt: 1234567890 })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.rateLimit('Too many requests', { limit: 100, remaining: 0 });
   */
  rateLimit: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'RATE_LIMIT',
      message,
      category: ErrorCategory.RATE_LIMIT,
      retryable: true,
      suggestion: 'You have exceeded the rate limit. Please wait before trying again.',
      details,
      timestamp: Date.now(),
    };

    logger.warn('Rate limit error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Internal/unexpected errors
   * @param message - Error message
   * @param details - Additional context (e.g., { stack, originalError })
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.internal('Unexpected error occurred', { originalError: error.message });
   */
  internal: (message: string, details?: Record<string, unknown>): ErrorInfo => {
    const errorInfo: ErrorInfo = {
      code: 'INTERNAL',
      message,
      category: ErrorCategory.INTERNAL,
      retryable: false,
      suggestion: 'An unexpected error occurred. Please contact support if the problem persists.',
      details,
      timestamp: Date.now(),
    };

    logger.error('Internal error', { code: errorInfo.code, message });
    return errorInfo;
  },

  /**
   * Generic error handler - categorizes error automatically
   * @param error - Error object or string
   * @param category - Override category (defaults to INTERNAL)
   * @param details - Additional context
   * @returns ErrorInfo object
   *
   * @example
   * const error = errorService.generic(new Error('Something went wrong'), ErrorCategory.EXTERNAL);
   */
  generic: (
    error: Error | string,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    details?: Record<string, unknown>
  ): ErrorInfo => {
    const message = error instanceof Error ? error.message : String(error);

    const categoryMap: Record<ErrorCategory, (msg: string, det?: Record<string, unknown>) => ErrorInfo> = {
      [ErrorCategory.AUTH]: errorService.auth,
      [ErrorCategory.VALIDATION]: errorService.validation,
      [ErrorCategory.EXTERNAL]: errorService.external,
      [ErrorCategory.NOT_FOUND]: errorService.notFound,
      [ErrorCategory.AI_MODEL]: errorService.aiModel,
      [ErrorCategory.TIMEOUT]: errorService.timeout,
      [ErrorCategory.RATE_LIMIT]: errorService.rateLimit,
      [ErrorCategory.INTERNAL]: errorService.internal,
    };

    const handler = categoryMap[category] || errorService.internal;
    return handler(message, details);
  },

  /**
   * Parse ErrorInfo from JSON string
   * @param errorString - JSON string representation of ErrorInfo
   * @returns Parsed ErrorInfo or null if parsing fails
   *
   * @example
   * const errorInfo = errorService.parse(errorString);
   * if (errorInfo) console.log(errorInfo.code, errorInfo.message);
   */
  parse: (errorString: string): ErrorInfo | null => {
    try {
      const parsed = JSON.parse(errorString);
      if (parsed.code && parsed.message && parsed.category) {
        return parsed as ErrorInfo;
      }
      return null;
    } catch (e) {
      logger.debug('Failed to parse ErrorInfo', { error: String(e) });
      return null;
    }
  },

  /**
   * Check if error is retryable
   * @param error - ErrorInfo object or JSON string
   * @returns true if error can be retried
   *
   * @example
   * if (errorService.isRetryable(errorInfo)) { retry(); }
   */
  isRetryable: (error: ErrorInfo | string): boolean => {
    if (typeof error === 'string') {
      const parsed = errorService.parse(error);
      return parsed?.retryable ?? false;
    }
    return error.retryable;
  },
};
