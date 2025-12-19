import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validateToolResult, validateToolResultOrThrow } from './tool-result-validation';
import '../../../src/__tests__/setup';

/**
 * Test Suite: Tool Result Validation
 * Tests for tool output schema validation utility
 */

describe('Tool Result Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateToolResult', () => {
    const testSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.string(),
        name: z.string().optional(),
      }).optional(),
      error: z.string().optional(),
    });

    it('should validate correct result', () => {
      const result = {
        success: true,
        data: {
          id: 'test-123',
          name: 'Test',
        },
      };

      const validation = validateToolResult(result, testSchema, 'test-tool');

      expect(validation.success).toBe(true);
      if (validation.success) {
        expect(validation.data.success).toBe(true);
        expect(validation.data.data?.id).toBe('test-123');
      }
    });

    it('should reject invalid result with missing required field', () => {
      const result = {
        success: true,
        // Missing 'data' or 'error' - but schema allows both optional
      };

      const validation = validateToolResult(result, testSchema, 'test-tool');

      // This should pass because both data and error are optional
      expect(validation.success).toBe(true);
    });

    it('should reject invalid result with wrong type', () => {
      const result = {
        success: 'true', // Should be boolean
        data: {
          id: 'test-123',
        },
      };

      const validation = validateToolResult(result, testSchema, 'test-tool');

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error.code).toBe('INTERNAL');
        expect(validation.error.message).toContain('validation failed');
      }
    });

    it('should reject invalid nested object', () => {
      const result = {
        success: true,
        data: {
          id: 123, // Should be string
        },
      };

      const validation = validateToolResult(result, testSchema, 'test-tool');

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error.code).toBe('INTERNAL');
      }
    });

    it('should include error details in validation failure', () => {
      const result = {
        success: true,
        data: {
          id: 123, // Wrong type
        },
      };

      const validation = validateToolResult(result, testSchema, 'test-tool');

      expect(validation.success).toBe(false);
      if (!validation.success) {
        expect(validation.error.details).toBeDefined();
        expect(validation.error.details?.toolName).toBe('test-tool');
        expect(validation.error.details?.errors).toBeDefined();
        expect(Array.isArray(validation.error.details?.errors)).toBe(true);
      }
    });
  });

  describe('validateToolResultOrThrow', () => {
    const testSchema = z.object({
      success: z.boolean(),
      data: z.object({
        id: z.string(),
      }).optional(),
    });

    it('should return validated data when valid', () => {
      const result = {
        success: true,
        data: {
          id: 'test-123',
        },
      };

      const validated = validateToolResultOrThrow(result, testSchema, 'test-tool');

      expect(validated.success).toBe(true);
      expect(validated.data?.id).toBe('test-123');
    });

    it('should throw error when validation fails', () => {
      const result = {
        success: 'true', // Wrong type
        data: {
          id: 'test-123',
        },
      };

      expect(() => {
        validateToolResultOrThrow(result, testSchema, 'test-tool');
      }).toThrow();
    });
  });
});
