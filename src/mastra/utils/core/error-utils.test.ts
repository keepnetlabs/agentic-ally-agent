import { describe, it, expect, vi } from 'vitest';
import { normalizeError, createToolErrorResponse, logErrorInfo } from './error-utils';
import { errorService } from '../../services/error-service';
import type { ErrorInfo } from '../../services/error-service';

describe('error-utils', () => {
  describe('normalizeError', () => {
    it('should return Error instance unchanged', () => {
      const err = new Error('test message');
      expect(normalizeError(err)).toBe(err);
      expect(normalizeError(err).message).toBe('test message');
    });

    it('should convert string to Error', () => {
      const result = normalizeError('string error');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('string error');
    });

    it('should convert number to Error', () => {
      const result = normalizeError(42);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('42');
    });

    it('should convert null to Error', () => {
      const result = normalizeError(null);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });

    it('should convert undefined to Error', () => {
      const result = normalizeError(undefined);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('undefined');
    });

    it('should convert object to Error', () => {
      const result = normalizeError({ foo: 'bar' });
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('should preserve stack trace for Error', () => {
      const err = new Error('stack test');
      const result = normalizeError(err);
      expect(result.stack).toBeDefined();
      expect(result.stack).toContain('Error');
    });

    it('should preserve Error name when present', () => {
      const err = new Error('Custom error');
      err.name = 'CustomError';
      const result = normalizeError(err);
      expect(result.name).toBe('CustomError');
      expect(result.message).toBe('Custom error');
    });

    it('should convert boolean to Error', () => {
      const result = normalizeError(true);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('true');
    });
  });

  describe('createToolErrorResponse', () => {
    it('should return success: false and stringified error', () => {
      const errorInfo: ErrorInfo = errorService.auth('Token missing');
      const result = createToolErrorResponse(errorInfo);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      const parsed = JSON.parse(result.error);
      expect(parsed.code).toBeDefined();
      expect(parsed.message).toBe('Token missing');
      expect(parsed.category).toBeDefined();
    });

    it('should include all ErrorInfo fields in stringified output', () => {
      const errorInfo: ErrorInfo = errorService.validation('Invalid input', {
        field: 'email',
        suggestion: 'Use valid format',
      });
      const result = createToolErrorResponse(errorInfo);

      const parsed = JSON.parse(result.error);
      expect(parsed.message).toBe('Invalid input');
      expect(parsed.details).toBeDefined();
    });
  });

  describe('logErrorInfo', () => {
    it('should call logger.error when level is error', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };
      const errorInfo = errorService.auth('Auth failed');

      logErrorInfo(mockLogger, 'error', 'Auth error occurred', errorInfo);

      expect(mockLogger.error).toHaveBeenCalledWith('Auth error occurred', {
        code: errorInfo.code,
        message: errorInfo.message,
        category: errorInfo.category,
      });
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should call logger.warn when level is warn', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };
      const errorInfo = errorService.external('API timeout');

      logErrorInfo(mockLogger, 'warn', 'External service warning', errorInfo);

      expect(mockLogger.warn).toHaveBeenCalledWith('External service warning', {
        code: errorInfo.code,
        message: errorInfo.message,
        category: errorInfo.category,
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should call logger.info when level is info', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
      };
      const errorInfo = errorService.notFound('Resource not found');

      logErrorInfo(mockLogger, 'info', 'Resource lookup', errorInfo);

      expect(mockLogger.info).toHaveBeenCalledWith('Resource lookup', {
        code: errorInfo.code,
        message: errorInfo.message,
        category: errorInfo.category,
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});
