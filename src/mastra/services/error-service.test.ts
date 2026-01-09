import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorService, ErrorCategory } from './error-service';
import '../../../src/__tests__/setup';

/**
 * Test Suite: ErrorService
 * Tests for centralized error handling service
 * Covers: All error categories, error info structure, JSON serialization
 */

describe('ErrorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth', () => {
    it('should create AUTH error with correct structure', () => {
      const error = errorService.auth('Token expired');

      expect(error.code).toBe('ERR_AUTH_001');
      expect(error.message).toBe('Token expired');
      expect(error.category).toBe(ErrorCategory.AUTH);
      expect(error.retryable).toBe(false);
      expect(error.suggestion).toContain('authentication');
      expect(error.nextStep).toBeDefined();
      expect(error.nextStep).toContain('Ask user');
      expect(error.timestamp).toBeTypeOf('number');
    });

    it('should include details when provided', () => {
      const error = errorService.auth('Token missing', { userId: 'user-123' });

      expect(error.details).toEqual({ userId: 'user-123' });
    });

    it('should be JSON serializable', () => {
      const error = errorService.auth('Token expired');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.code).toBe('ERR_AUTH_001');
      expect(parsed.message).toBe('Token expired');
      expect(parsed.category).toBe('AUTH');
    });

    it('should accept custom error code', () => {
      const error = errorService.auth('Token invalid', {}, 'ERR_AUTH_002');

      expect(error.code).toBe('ERR_AUTH_002');
      expect(error.message).toBe('Token invalid');
    });
  });

  describe('validation', () => {
    it('should create VALIDATION error with correct structure', () => {
      const error = errorService.validation('Invalid email format');

      expect(error.code).toBe('ERR_VAL_001');
      expect(error.message).toBe('Invalid email format');
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.retryable).toBe(false);
      expect(error.suggestion).toContain('input');
    });

    it('should include field details', () => {
      const error = errorService.validation('Email required', { field: 'email' });

      expect(error.details).toEqual({ field: 'email' });
    });

    it('should include context-aware nextStep when field is provided', () => {
      const error = errorService.validation('Email required', { field: 'email' });

      expect(error.nextStep).toContain('email');
      expect(error.nextStep).toContain('Ask user');
    });

    it('should include generic nextStep when field is not provided', () => {
      const error = errorService.validation('Invalid input');

      expect(error.nextStep).toBeDefined();
      expect(error.nextStep).toContain('Ask user');
    });
  });

  describe('external', () => {
    it('should create EXTERNAL error with retryable flag', () => {
      const error = errorService.external('Worker failed: 502');

      expect(error.code).toBe('ERR_API_001');
      expect(error.category).toBe(ErrorCategory.EXTERNAL);
      expect(error.retryable).toBe(true);
      expect(error.suggestion).toContain('temporarily unavailable');
    });

    it('should include service details', () => {
      const error = errorService.external('API error', { service: 'KV', status: 502 });

      expect(error.details).toEqual({ service: 'KV', status: 502 });
    });

    it('should include context-aware nextStep when service is provided', () => {
      const error = errorService.external('API error', { service: 'KV' });

      expect(error.nextStep).toContain('KV');
      expect(error.nextStep).toContain('Retry');
    });
  });

  describe('notFound', () => {
    it('should create NOT_FOUND error', () => {
      const error = errorService.notFound('Microlearning not found');

      expect(error.code).toBe('ERR_NF_001');
      expect(error.category).toBe(ErrorCategory.NOT_FOUND);
      expect(error.retryable).toBe(false);
    });

    it('should include resource details', () => {
      const error = errorService.notFound('Resource missing', { resourceId: 'ml-123' });

      expect(error.details).toEqual({ resourceId: 'ml-123' });
    });

    it('should include context-aware nextStep when resourceType and resourceId are provided', () => {
      const error = errorService.notFound('Resource missing', { resourceType: 'microlearning', resourceId: 'ml-123' });

      expect(error.nextStep).toContain('microlearning');
      expect(error.nextStep).toContain('ml-123');
      expect(error.nextStep).toContain('Ask user');
    });
  });

  describe('aiModel', () => {
    it('should create AI_MODEL error', () => {
      const error = errorService.aiModel('JSON parsing failed');

      expect(error.code).toBe('ERR_AI_001');
      expect(error.category).toBe(ErrorCategory.AI_MODEL);
      expect(error.retryable).toBe(true);
    });

    it('should include step details', () => {
      const error = errorService.aiModel('Generation failed', { step: 'scene-1', scene: 1 });

      expect(error.details).toEqual({ step: 'scene-1', scene: 1 });
    });
  });

  describe('timeout', () => {
    it('should create TIMEOUT error', () => {
      const error = errorService.timeout('Request timed out');

      expect(error.code).toBe('ERR_TO_001');
      expect(error.category).toBe(ErrorCategory.TIMEOUT);
      expect(error.retryable).toBe(true);
    });
  });

  describe('rateLimit', () => {
    it('should create RATE_LIMIT error', () => {
      const error = errorService.rateLimit('Too many requests');

      expect(error.code).toBe('ERR_RL_001');
      expect(error.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(error.retryable).toBe(true);
    });
  });

  describe('internal', () => {
    it('should create INTERNAL error', () => {
      const error = errorService.internal('Unexpected error');

      expect(error.code).toBe('ERR_INT_001');
      expect(error.category).toBe(ErrorCategory.INTERNAL);
      expect(error.retryable).toBe(false);
    });
  });

  describe('Error format compatibility', () => {
    it('should be compatible with tool outputSchema format', () => {
      const error = errorService.validation('Invalid input');
      const toolResponse = {
        success: false,
        error: JSON.stringify(error)
      };

      expect(toolResponse.success).toBe(false);
      expect(() => JSON.parse(toolResponse.error)).not.toThrow();
      const parsed = JSON.parse(toolResponse.error);
      expect(parsed.code).toBe('ERR_VAL_001');
    });

    it('should have consistent timestamp format', () => {
      const error1 = errorService.auth('Error 1');
      const error2 = errorService.auth('Error 2');

      expect(error1.timestamp).toBeTypeOf('number');
      expect(error2.timestamp).toBeTypeOf('number');

      // TypeScript guard: timestamp is always defined in errorService methods
      if (error1.timestamp !== undefined && error2.timestamp !== undefined) {
        expect(error2.timestamp).toBeGreaterThanOrEqual(error1.timestamp);
      } else {
        throw new Error('Timestamp should always be defined');
      }
    });
  });
});
