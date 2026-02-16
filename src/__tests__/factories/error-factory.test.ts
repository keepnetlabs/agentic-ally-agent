/**
 * Unit tests for error factory
 */
import { describe, it, expect } from 'vitest';
import { createErrorInfo, createErrorResponse } from './error-factory';
import { ErrorCategory } from '../../mastra/services/error-service';

describe('error-factory', () => {
  describe('createErrorInfo', () => {
    it('should create ErrorInfo with defaults', () => {
      const info = createErrorInfo();
      expect(info.code).toBe('TEST_ERROR');
      expect(info.message).toBe('Test error message');
      expect(info.category).toBe(ErrorCategory.INTERNAL);
      expect(info.retryable).toBe(false);
      expect(info.suggestion).toBe('Test suggestion');
      expect(typeof info.timestamp).toBe('number');
    });

    it('should allow overrides', () => {
      const info = createErrorInfo({
        code: 'CUSTOM_CODE',
        message: 'Custom message',
        category: ErrorCategory.EXTERNAL,
      });
      expect(info.code).toBe('CUSTOM_CODE');
      expect(info.message).toBe('Custom message');
      expect(info.category).toBe(ErrorCategory.EXTERNAL);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response format', () => {
      const response = createErrorResponse();
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      const parsed = JSON.parse(response.error);
      expect(parsed.code).toBe('TEST_ERROR');
    });

    it('should use custom error info when provided', () => {
      const response = createErrorResponse({ code: 'ERR_001', message: 'Custom' });
      const parsed = JSON.parse(response.error);
      expect(parsed.code).toBe('ERR_001');
      expect(parsed.message).toBe('Custom');
    });
  });
});
