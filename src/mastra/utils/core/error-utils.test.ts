import { describe, it, expect, vi } from 'vitest';
import { ErrorCategory } from '../../services/error-service';
import {
  normalizeError,
  createToolErrorResponse,
  logErrorInfo,
} from './error-utils';

describe('error-utils', () => {
  describe('normalizeError', () => {
    it('should return Error unchanged when passed an Error instance', () => {
      const error = new Error('Test error');
      const result = normalizeError(error);

      expect(result).toBe(error);
      expect(result instanceof Error).toBe(true);
    });

    it('should convert string to Error object', () => {
      const result = normalizeError('String error message');

      expect(result instanceof Error).toBe(true);
      expect(result.message).toBe('String error message');
    });

    it('should convert number to Error object', () => {
      const result = normalizeError(404);

      expect(result instanceof Error).toBe(true);
      expect(result.message).toBe('404');
    });

    it('should convert object to Error object', () => {
      const obj = { code: 'AUTH_ERROR', message: 'Unauthorized' };
      const result = normalizeError(obj);

      expect(result instanceof Error).toBe(true);
    });

    it('should handle null by converting to Error', () => {
      const result = normalizeError(null);

      expect(result instanceof Error).toBe(true);
      expect(result.message).toBe('null');
    });

    it('should handle undefined by converting to Error', () => {
      const result = normalizeError(undefined);

      expect(result instanceof Error).toBe(true);
      expect(result.message).toBe('undefined');
    });

    it('should handle boolean values', () => {
      const resultTrue = normalizeError(true);
      const resultFalse = normalizeError(false);

      expect(resultTrue instanceof Error).toBe(true);
      expect(resultFalse instanceof Error).toBe(true);
    });

    it('should preserve error stack when passed Error', () => {
      const error = new Error('Original error');
      error.stack = 'Error: Original error\n  at test.ts:10:5';

      const result = normalizeError(error);

      expect(result.stack).toBe(error.stack);
    });

    it('should be deterministic', () => {
      const input = 'Error message';
      const result1 = normalizeError(input);
      const result2 = normalizeError(input);

      expect(result1.message).toBe(result2.message);
    });

    it('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        code = 'CUSTOM';
      }

      const error = new CustomError('Custom error message');
      const result = normalizeError(error);

      expect(result).toBe(error);
      expect(result instanceof CustomError).toBe(true);
    });
  });

  describe('createToolErrorResponse', () => {
    it('should create error response with success: false', () => {
      const errorInfo = {
        code: 'AUTH_ERROR',
        message: 'Token missing',
        category: ErrorCategory.AUTH,
        retryable: false,
      };

      const response = createToolErrorResponse(errorInfo);

      expect(response.success).toBe(false);
    });

    it('should stringify errorInfo in error field', () => {
      const errorInfo = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        category: ErrorCategory.VALIDATION,
        retryable: false,
      };

      const response = createToolErrorResponse(errorInfo);

      expect(typeof response.error).toBe('string');
      expect(response.error).toContain('VALIDATION_ERROR');
    });

    it('should be parseable back to original object', () => {
      const errorInfo = {
        code: 'TEST_ERROR',
        message: 'Test message',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      const response = createToolErrorResponse(errorInfo);
      const parsed = JSON.parse(response.error);

      expect(parsed).toEqual(errorInfo);
    });

    it('should handle errorInfo with additional fields', () => {
      const errorInfo = {
        code: 'COMPLEX_ERROR',
        message: 'Complex error',
        category: ErrorCategory.INTERNAL,
        retryable: false,
        timestamp: 1736294400000,
        details: { userId: '123' },
      };

      const response = createToolErrorResponse(errorInfo);
      const parsed = JSON.parse(response.error);

      expect(parsed).toEqual(errorInfo);
    });

    it('should have exactly 2 properties in response', () => {
      const errorInfo = {
        code: 'ERROR',
        message: 'msg',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      const response = createToolErrorResponse(errorInfo);

      expect(Object.keys(response)).toHaveLength(2);
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('error');
    });
  });

  describe('logErrorInfo', () => {
    it('should call logger.error with error level', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'ERROR_CODE',
        message: 'Error message',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Operation failed', errorInfo);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed',
        expect.any(Object)
      );
    });

    it('should call logger.warn with warn level', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'WARN_CODE',
        message: 'Warning message',
        category: ErrorCategory.VALIDATION,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'warn', 'Warning', errorInfo);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Warning',
        expect.any(Object)
      );
    });

    it('should call logger.info with info level', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'INFO_CODE',
        message: 'Info message',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'info', 'Information', errorInfo);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Information',
        expect.any(Object)
      );
    });

    it('should log errorInfo code, message, and category', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'TEST_CODE',
        message: 'Test message',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Test', errorInfo);

      const callArgs = mockLogger.error.mock.calls[0][1];
      expect(callArgs.code).toBe('TEST_CODE');
      expect(callArgs.message).toBe('Test message');
      expect(callArgs.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should pass message through to logger', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'CODE',
        message: 'msg',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Custom log message', errorInfo);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Custom log message',
        expect.any(Object)
      );
    });

    it('should not mutate errorInfo object', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'CODE',
        message: 'msg',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      const originalErrorInfo = JSON.stringify(errorInfo);

      logErrorInfo(mockLogger, 'error', 'Test', errorInfo);

      expect(JSON.stringify(errorInfo)).toBe(originalErrorInfo);
    });

    it('should handle all three log levels', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'CODE',
        message: 'msg',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Error', errorInfo);
      logErrorInfo(mockLogger, 'warn', 'Warn', errorInfo);
      logErrorInfo(mockLogger, 'info', 'Info', errorInfo);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should only call the specified log level', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const errorInfo = {
        code: 'CODE',
        message: 'msg',
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Test', errorInfo);

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should normalize error and create response', () => {
      const error = new Error('Operation failed');
      const normalized = normalizeError(error);

      expect(normalized instanceof Error).toBe(true);
    });

    it('should normalize error and log it', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const error = new Error('Test error');
      const normalized = normalizeError(error);

      const errorInfo = {
        code: 'ERROR',
        message: normalized.message,
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Caught error', errorInfo);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should normalize, log, and create response', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };

      const error = 'String error';
      const normalized = normalizeError(error);

      const errorInfo = {
        code: 'ERROR',
        message: normalized.message,
        category: ErrorCategory.INTERNAL,
        retryable: false,
      };

      logErrorInfo(mockLogger, 'error', 'Error occurred', errorInfo);
      const response = createToolErrorResponse(errorInfo);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(response.success).toBe(false);
      expect(JSON.parse(response.error)).toEqual(errorInfo);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);
      const result = normalizeError(error);

      expect(result.message).toBe(longMessage);
    });

    it('should handle Symbol values', () => {
      const sym = Symbol('test');
      const result = normalizeError(sym);

      expect(result instanceof Error).toBe(true);
    });

    it('should handle Function objects', () => {
      const fn = () => { /* noop */ };
      const result = normalizeError(fn);

      expect(result instanceof Error).toBe(true);
    });
  });
});
