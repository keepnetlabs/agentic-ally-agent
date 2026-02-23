/**
 * Unit tests for error-service
 * Covers ErrorCategory, ErrorInfo, all error factory methods, parse, isRetryable, recoveryAttempt
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorService, ErrorCategory } from './error-service';
import { ERROR_CODES } from '../constants';

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('error-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ErrorCategory', () => {
    it('should have expected categories', () => {
      expect(ErrorCategory.AUTH).toBe('AUTH');
      expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
      expect(ErrorCategory.EXTERNAL).toBe('EXTERNAL');
      expect(ErrorCategory.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCategory.AI_MODEL).toBe('AI_MODEL');
      expect(ErrorCategory.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCategory.RATE_LIMIT).toBe('RATE_LIMIT');
      expect(ErrorCategory.INTERNAL).toBe('INTERNAL');
    });
  });

  describe('auth', () => {
    it('should return ErrorInfo with AUTH category', () => {
      const result = errorService.auth('Token expired');
      expect(result.code).toBe(ERROR_CODES.AUTH_TOKEN_MISSING);
      expect(result.message).toBe('Token expired');
      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.retryable).toBe(false);
      expect(result.suggestion).toContain('credentials');
      expect(result.nextStep).toContain('token');
      expect(result.timestamp).toBeDefined();
    });

    it('should accept custom error code', () => {
      const result = errorService.auth('Invalid token', undefined, ERROR_CODES.AUTH_TOKEN_INVALID);
      expect(result.code).toBe(ERROR_CODES.AUTH_TOKEN_INVALID);
    });

    it('should include details when provided', () => {
      const result = errorService.auth('Token missing', { userId: 'u-1' });
      expect(result.details).toEqual({ userId: 'u-1' });
    });
  });

  describe('validation', () => {
    it('should return ErrorInfo with VALIDATION category', () => {
      const result = errorService.validation('Invalid email format');
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
    });

    it('should use field from details for nextStep', () => {
      const result = errorService.validation('Invalid', { field: 'email' });
      expect(result.nextStep).toContain('email');
    });
  });

  describe('external', () => {
    it('should return ErrorInfo with EXTERNAL category and retryable true', () => {
      const result = errorService.external('API 502');
      expect(result.category).toBe(ErrorCategory.EXTERNAL);
      expect(result.retryable).toBe(true);
    });

    it('should use service from details for nextStep', () => {
      const result = errorService.external('Failed', { service: 'KV' });
      expect(result.nextStep).toContain('KV');
    });
  });

  describe('notFound', () => {
    it('should return ErrorInfo with NOT_FOUND category', () => {
      const result = errorService.notFound('Microlearning ml-123 not found');
      expect(result.category).toBe(ErrorCategory.NOT_FOUND);
      expect(result.retryable).toBe(false);
    });

    it('should use resourceType and resourceId for nextStep', () => {
      const result = errorService.notFound('Not found', {
        resourceType: 'microlearning',
        resourceId: 'ml-1',
      });
      expect(result.nextStep).toContain('microlearning');
      expect(result.nextStep).toContain('ml-1');
    });
  });

  describe('aiModel', () => {
    it('should return ErrorInfo with AI_MODEL category and retryable true', () => {
      const result = errorService.aiModel('JSON parse failed');
      expect(result.category).toBe(ErrorCategory.AI_MODEL);
      expect(result.retryable).toBe(true);
    });

    it('should customize nextStep when reason includes JSON', () => {
      const result = errorService.aiModel('Failed', { reason: 'JSON parsing failed' });
      expect(result.nextStep).toContain('JSON');
    });
  });

  describe('timeout', () => {
    it('should return ErrorInfo with TIMEOUT category', () => {
      const result = errorService.timeout('Operation exceeded 60s');
      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.retryable).toBe(true);
    });

    it('should use operation from details for nextStep', () => {
      const result = errorService.timeout('Timeout', { operation: 'generate' });
      expect(result.nextStep).toContain('generate');
    });
  });

  describe('rateLimit', () => {
    it('should return ErrorInfo with RATE_LIMIT category', () => {
      const result = errorService.rateLimit('Too many requests');
      expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(result.retryable).toBe(true);
    });

    it('should use resetAt for nextStep', () => {
      const resetAt = Date.now() + 60000;
      const result = errorService.rateLimit('Rate limited', { resetAt });
      expect(result.nextStep).toContain('Wait until');
      expect(result.nextStep).toContain('retrying');
    });
  });

  describe('internal', () => {
    it('should return ErrorInfo with INTERNAL category', () => {
      const result = errorService.internal('Unexpected error');
      expect(result.category).toBe(ErrorCategory.INTERNAL);
      expect(result.retryable).toBe(false);
    });
  });

  describe('generic', () => {
    it('should delegate to auth when category is AUTH', () => {
      const result = errorService.generic(new Error('Token invalid'), ErrorCategory.AUTH);
      expect(result.category).toBe(ErrorCategory.AUTH);
    });

    it('should delegate to internal when category is INTERNAL (default)', () => {
      const result = errorService.generic(new Error('Something broke'));
      expect(result.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should extract message from Error', () => {
      const result = errorService.generic(new Error('Custom msg'), ErrorCategory.VALIDATION);
      expect(result.message).toBe('Custom msg');
    });

    it('should extract message from string', () => {
      const result = errorService.generic('String error', ErrorCategory.EXTERNAL);
      expect(result.message).toBe('String error');
    });
  });

  describe('parse', () => {
    it('should parse valid ErrorInfo JSON string', () => {
      const errorInfo = errorService.auth('Test');
      const json = JSON.stringify(errorInfo);
      const parsed = errorService.parse(json);
      expect(parsed).not.toBeNull();
      expect(parsed!.code).toBe(errorInfo.code);
      expect(parsed!.message).toBe(errorInfo.message);
    });

    it('should return null for invalid JSON', () => {
      expect(errorService.parse('not json')).toBeNull();
    });

    it('should return null when code, message, or category missing', () => {
      expect(errorService.parse('{"code":"X"}')).toBeNull();
      expect(errorService.parse('{"message":"x"}')).toBeNull();
      expect(errorService.parse('{}')).toBeNull();
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable ErrorInfo', () => {
      const error = errorService.external('API failed');
      expect(errorService.isRetryable(error)).toBe(true);
    });

    it('should return false for non-retryable ErrorInfo', () => {
      const error = errorService.auth('Token missing');
      expect(errorService.isRetryable(error)).toBe(false);
    });

    it('should parse JSON string and return retryable from parsed', () => {
      const error = errorService.external('Retry me');
      const json = JSON.stringify(error);
      expect(errorService.isRetryable(json)).toBe(true);
    });

    it('should return false for invalid JSON string', () => {
      expect(errorService.isRetryable('invalid')).toBe(false);
    });
  });

  describe('recoveryAttempt', () => {
    it('should not throw when called', () => {
      expect(() => {
        errorService.recoveryAttempt(1, 3, 'test-op', 'Error message');
      }).not.toThrow();
    });

    it('should accept optional context', () => {
      expect(() => {
        errorService.recoveryAttempt(1, 3, 'op', 'err', { jitterEnabled: true });
      }).not.toThrow();
    });
  });
});
