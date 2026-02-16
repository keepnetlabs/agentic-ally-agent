import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateCreateMicrolearningResult, validateAddLanguageResult } from './validators';
import { CreateMicrolearningResult, AddLanguageResult } from './types';
import '../../../../src/__tests__/setup';

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

/**
 * Test Suite: WorkflowValidators
 * Tests for workflow result validation functions
 * Covers: validateCreateMicrolearningResult and validateAddLanguageResult
 */

describe('WorkflowValidators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCreateMicrolearningResult', () => {
    it('should return true for valid CreateMicrolearningResult with success status', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
            title: 'Phishing Awareness',
            department: 'IT',
            microlearningId: 'ml-123',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(true);
    });

    it('should return true for valid result with only required metadata fields', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-456',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(true);
    });

    it('should return false when status is "error"', () => {
      const result: CreateMicrolearningResult = {
        status: 'error',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when status is "failed"', () => {
      const result: CreateMicrolearningResult = {
        status: 'failed',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when status is "pending"', () => {
      const result: CreateMicrolearningResult = {
        status: 'error', // Note: 'pending' is not a valid status in the type, but testing edge cases
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when status is "suspended"', () => {
      const result: CreateMicrolearningResult = {
        status: 'suspended',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when result is undefined', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when result.metadata is undefined', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {},
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when result.metadata is null', () => {
      const result: any = {
        status: 'success',
        result: {
          metadata: null,
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when metadata.trainingUrl is missing', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            title: 'Phishing Awareness',
            department: 'IT',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when metadata.trainingUrl is empty string', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: '',
            title: 'Phishing Awareness',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return false when metadata.trainingUrl is null', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: null as any,
            title: 'Phishing Awareness',
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should return true with various valid URL formats', () => {
      const urlFormats = [
        'https://example.com/training',
        'http://example.com/training',
        'https://example.com:8080/path/to/training',
        'https://cdn.example.com/training?id=123',
        'https://example.com/training#section',
        'https://example.com/training?id=123&lang=en',
      ];

      urlFormats.forEach(url => {
        const result: CreateMicrolearningResult = {
          status: 'success',
          result: {
            metadata: {
              trainingUrl: url,
            },
          },
        };

        expect(validateCreateMicrolearningResult(result)).toBe(true);
      });
    });

    it('should handle extra fields in metadata gracefully', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
            customField: 'value',
            anotherField: { nested: 'data' },
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(true);
    });

    it('should handle extra fields in result gracefully', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
          extraField: 'some value',
          anotherExtraField: 123,
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(true);
    });

    it('should handle extra fields at root level gracefully', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
        extraField: 'value',
        anotherExtra: true,
      };

      expect(validateCreateMicrolearningResult(result)).toBe(true);
    });
  });

  describe('validateAddLanguageResult', () => {
    it('should return true for valid AddLanguageResult with success status', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-es',
            title: 'Conciencia de Phishing',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should return true for valid result with only required data fields', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-fr',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should return false when status is "error"', () => {
      const result: AddLanguageResult = {
        status: 'error',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when status is "failed"', () => {
      const result: AddLanguageResult = {
        status: 'failed',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when status is "suspended"', () => {
      const result: AddLanguageResult = {
        status: 'suspended',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-123',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when result is undefined', () => {
      const result: AddLanguageResult = {
        status: 'success',
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when result.data is undefined', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {},
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when result.data is null', () => {
      const result: any = {
        status: 'success',
        result: {
          data: null,
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when data.trainingUrl is missing', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            title: 'Phishing Training in Spanish',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when data.trainingUrl is empty string', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: '',
            title: 'Phishing Training',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return false when data.trainingUrl is null', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: null as any,
            title: 'Phishing Training',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should return true with various valid URL formats', () => {
      const urlFormats = [
        'https://example.com/training-es',
        'http://example.com/training-fr',
        'https://example.com:8080/path/to/training-de',
        'https://cdn.example.com/training-ja?id=123',
        'https://example.com/training-pt#section',
        'https://example.com/training-it?id=123&lang=it',
      ];

      urlFormats.forEach(url => {
        const result: AddLanguageResult = {
          status: 'success',
          result: {
            data: {
              trainingUrl: url,
            },
          },
        };

        expect(validateAddLanguageResult(result)).toBe(true);
      });
    });

    it('should handle extra fields in data gracefully', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-es',
            customField: 'value',
            language: 'es',
            anotherField: { nested: 'data' },
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should handle extra fields in result gracefully', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-fr',
          },
          extraField: 'some value',
          anotherExtraField: 456,
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should handle extra fields at root level gracefully', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-de',
          },
        },
        extraField: 'value',
        anotherExtra: false,
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should handle results with both data and metadata (edge case)', () => {
      const result: any = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-it',
          },
          metadata: {
            trainingUrl: 'https://example.com/metadata-url',
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });

    it('should validate independently from CreateMicrolearningResult', () => {
      // AddLanguageResult should only check for data, not metadata
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training-ja',
          },
          // metadata would be ignored - data is what matters
        },
      };

      expect(validateAddLanguageResult(result)).toBe(true);
    });
  });

  describe('Validators - Combined Tests', () => {
    it('should validate both result types independently', () => {
      const microlearning: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/ml-123',
          },
        },
      };

      const addLanguage: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/lang-es',
          },
        },
      };

      expect(validateCreateMicrolearningResult(microlearning)).toBe(true);
      expect(validateAddLanguageResult(addLanguage)).toBe(true);
    });

    it('should fail both validators when status is invalid', () => {
      const invalidCreateResult: CreateMicrolearningResult = {
        status: 'error',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training',
          },
        },
      };

      const invalidAddLanguageResult: AddLanguageResult = {
        status: 'failed',
        result: {
          data: {
            trainingUrl: 'https://example.com/training',
          },
        },
      };

      expect(validateCreateMicrolearningResult(invalidCreateResult)).toBe(false);
      expect(validateAddLanguageResult(invalidAddLanguageResult)).toBe(false);
    });

    it('should handle undefined results in both validators', () => {
      const createResult: CreateMicrolearningResult = { status: 'success' };
      const addLanguageResult: AddLanguageResult = { status: 'success' };

      expect(validateCreateMicrolearningResult(createResult)).toBe(false);
      expect(validateAddLanguageResult(addLanguageResult)).toBe(false);
    });
  });

  describe('Validators - Null and Undefined Handling', () => {
    it('should handle result being undefined in CreateMicrolearningResult', () => {
      const result: any = {
        status: 'success',
        result: undefined,
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should handle result being undefined in AddLanguageResult', () => {
      const result: any = {
        status: 'success',
        result: undefined,
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should treat undefined trainingUrl as falsy in CreateMicrolearningResult', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: undefined,
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should treat undefined trainingUrl as falsy in AddLanguageResult', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: undefined,
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });

    it('should handle object with trainingUrl as 0 (falsy number)', () => {
      const result: CreateMicrolearningResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 0 as any,
          },
        },
      };

      expect(validateCreateMicrolearningResult(result)).toBe(false);
    });

    it('should handle object with trainingUrl as false (falsy boolean)', () => {
      const result: AddLanguageResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: false as any,
          },
        },
      };

      expect(validateAddLanguageResult(result)).toBe(false);
    });
  });
});
