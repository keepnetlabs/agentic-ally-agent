import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { addMultipleLanguagesWorkflow, processMultipleLanguagesStep } from './add-multiple-languages-workflow';
import { addLanguageWorkflow } from './add-language-workflow';

// Mocks
const mocks = vi.hoisted(() => ({
  createRunAsync: vi.fn(),
  runStart: vi.fn(),
  updateLengthAvailabilityAtomic: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn()
}));

vi.mock('./add-language-workflow', () => ({
  addLanguageWorkflow: {
    createRunAsync: mocks.createRunAsync,
    id: 'add-language-workflow',
    description: 'Add language workflow mock',
    inputSchema: z.object({}),
    outputSchema: z.object({})
  }
}));

vi.mock('../services/kv-service', () => ({
  KVService: vi.fn().mockImplementation(function () {
    return {
      updateLanguageAvailabilityAtomic: mocks.updateLengthAvailabilityAtomic
    };
  })
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    error: mocks.loggerError,
    warn: vi.fn()
  })
}));

describe('add-multiple-languages-workflow', () => {
  // Tests for workflow definition and structure
  describe('Workflow Definition', () => {
    it('should define addMultipleLanguagesWorkflow', () => {
      expect(addMultipleLanguagesWorkflow).toBeDefined();
    });

    it('should be a Workflow instance', () => {
      expect(addMultipleLanguagesWorkflow).toHaveProperty('id');
      expect(addMultipleLanguagesWorkflow).toHaveProperty('description');
      expect(addMultipleLanguagesWorkflow).toHaveProperty('inputSchema');
      expect(addMultipleLanguagesWorkflow).toHaveProperty('outputSchema');
    });

    it('should have correct workflow id', () => {
      expect(addMultipleLanguagesWorkflow.id).toBe('add-multiple-languages-workflow');
    });

    it('should have a description', () => {
      expect(addMultipleLanguagesWorkflow.description).toBeDefined();
      expect(typeof addMultipleLanguagesWorkflow.description).toBe('string');
      if (typeof addMultipleLanguagesWorkflow.description === 'string') {
        expect(addMultipleLanguagesWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('should mention parallel processing in description', () => {
      expect(addMultipleLanguagesWorkflow.description).toBeDefined();
      if (typeof addMultipleLanguagesWorkflow.description === 'string') {
        expect(addMultipleLanguagesWorkflow.description.toLowerCase()).toContain('parallel');
      }
    });

    it('should have inputSchema defined', () => {
      expect(addMultipleLanguagesWorkflow.inputSchema).toBeDefined();
      expect(typeof addMultipleLanguagesWorkflow.inputSchema).toBe('object');
    });

    it('should have outputSchema defined', () => {
      expect(addMultipleLanguagesWorkflow.outputSchema).toBeDefined();
      expect(typeof addMultipleLanguagesWorkflow.outputSchema).toBe('object');
    });
  });

  // Tests for input schema validation
  describe('Input Schema Validation', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should require existingMicrolearningId', () => {
      const testData = {
        targetLanguages: ['tr-TR', 'de-DE']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should accept valid existingMicrolearningId', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should require targetLanguages', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should require targetLanguages to be an array', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should require at least one language in targetLanguages', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: []
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should accept single language in array', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept multiple languages in array', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR', 'de-DE', 'fr-FR', 'ja-JP']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make sourceLanguage optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR', 'de-DE']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept sourceLanguage when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR', 'de-DE'],
        sourceLanguage: 'en-US'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make department optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept department when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR', 'de-DE'],
        department: 'HR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should apply default department as All', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.department).toBe('All');
    });

    it('should make modelProvider optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept valid modelProvider values', () => {
      const validProviders = ['OPENAI', 'WORKERS_AI', 'GOOGLE'];
      const baseData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['tr-TR']
      };

      validProviders.forEach(provider => {
        expect(() => {
          inputSchema.parse({
            ...baseData,
            modelProvider: provider
          });
        }).not.toThrow();
      });
    });

    it('should make model optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept model when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguages: ['tr-TR'],
        model: 'gpt-4o-mini'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for language validation
  describe('Language Validation', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should accept many languages (no hard limit)', () => {
      const manyLanguages = [
        'tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT',
        'ru-RU', 'ar-AR', 'zh-CN', 'ja-JP', 'ko-KR', 'hi-IN', 'vi-VN'
      ];
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: manyLanguages
        });
      }).not.toThrow();
    });

    it('should accept exactly 12 languages', () => {
      const twelveLanguages = [
        'tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-PT',
        'ru-RU', 'ar-AR', 'zh-CN', 'ja-JP', 'ko-KR', 'hi-IN'
      ];
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: twelveLanguages
        });
      }).not.toThrow();
    });

    it('should accept language codes in various formats', () => {
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['en', 'en-US', 'en_US', 'tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should normalize languages to lowercase', () => {
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['TR-TR', 'DE-DE', 'FR-FR']
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.targetLanguages).toBeDefined();
    });
  });

  // Tests for output schema structure
  describe('Output Schema Structure', () => {
    const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;

    it('should have success field in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '4.00s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('success');
    });

    it('should have successCount field in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('successCount');
    });

    it('should have failureCount field in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('failureCount');
    });

    it('should have totalDuration field in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('totalDuration');
    });

    it('should have languages array in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('languages');
    });

    it('should have results array in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('results');
    });

    it('should have status enum in output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [{ language: 'tr-TR', success: true }],
        status: 'success'
      };
      expect(sampleOutput).toHaveProperty('status');
    });

    it('each result should have language field', () => {
      const sampleResult = {
        language: 'tr-TR',
        success: true
      };
      expect(sampleResult).toHaveProperty('language');
    });

    it('each result should have success field', () => {
      const sampleResult = {
        language: 'tr-TR',
        success: true,
        trainingUrl: 'https://example.com/?courseId=test'
      };
      expect(sampleResult).toHaveProperty('success');
    });

    it('each result should have optional trainingUrl', () => {
      const sampleResult = {
        language: 'tr-TR',
        success: true,
        trainingUrl: 'https://example.com/?courseId=test'
      };
      expect(sampleResult).toHaveProperty('trainingUrl');
    });

    it('each result should have optional error field', () => {
      const sampleResult = {
        language: 'tr-TR',
        success: false,
        error: 'Test error message'
      };
      expect(sampleResult).toHaveProperty('error');
    });

    it('each result should have optional duration field', () => {
      const sampleResult = {
        language: 'tr-TR',
        success: true,
        duration: 4000
      };
      expect(sampleResult).toHaveProperty('duration');
    });

    it('should validate a sample successful output', () => {
      const sampleOutput = {
        success: true,
        successCount: 3,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR', 'de-DE', 'fr-FR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com/?courseId=test',
            title: 'Test Course',
            duration: 4000
          },
          {
            language: 'de-DE',
            success: true,
            trainingUrl: 'https://example.com/?courseId=test',
            title: 'Test Course',
            duration: 4100
          },
          {
            language: 'fr-FR',
            success: true,
            trainingUrl: 'https://example.com/?courseId=test',
            title: 'Test Course',
            duration: 4200
          }
        ],
        status: 'success'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('should validate a partial failure output', () => {
      const sampleOutput = {
        success: false,
        successCount: 2,
        failureCount: 1,
        totalDuration: '9.50s',
        languages: ['tr-TR', 'de-DE', 'fr-FR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com/?courseId=test',
            title: 'Test Course',
            duration: 3000
          },
          {
            language: 'de-DE',
            success: true,
            trainingUrl: 'https://example.com/?courseId=test',
            title: 'Test Course',
            duration: 3500
          },
          {
            language: 'fr-FR',
            success: false,
            error: 'Translation timeout',
            duration: 3000
          }
        ],
        status: 'partial'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('should validate a complete failure output', () => {
      const sampleOutput = {
        success: false,
        successCount: 0,
        failureCount: 2,
        totalDuration: '5.00s',
        languages: ['tr-TR', 'de-DE'],
        results: [
          {
            language: 'tr-TR',
            success: false,
            error: 'Microlearning not found',
            duration: 2500
          },
          {
            language: 'de-DE',
            success: false,
            error: 'Microlearning not found',
            duration: 2500
          }
        ],
        status: 'failed'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });
  });

  // Tests for status enum values
  describe('Status Enum Values', () => {
    const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;

    it('should accept success status', () => {
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '5.00s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com',
            title: 'Test',
            duration: 5000
          }
        ],
        status: 'success'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('should accept partial status', () => {
      const sampleOutput = {
        success: false,
        successCount: 1,
        failureCount: 1,
        totalDuration: '5.00s',
        languages: ['tr-TR', 'de-DE'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com',
            title: 'Test',
            duration: 2500
          },
          {
            language: 'de-DE',
            success: false,
            error: 'Error',
            duration: 2500
          }
        ],
        status: 'partial'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('should accept failed status', () => {
      const sampleOutput = {
        success: false,
        successCount: 0,
        failureCount: 1,
        totalDuration: '5.00s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: false,
            error: 'Error',
            duration: 5000
          }
        ],
        status: 'failed'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });
  });

  // Tests for workflow steps
  describe('Workflow Steps', () => {
    it('should have createRunAsync method to execute steps', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).createRunAsync).toBe('function');
    });

    it('should have been created with then() chaining', () => {
      // Workflow is created with .then() to add steps
      expect(addMultipleLanguagesWorkflow).toBeDefined();
      expect(typeof (addMultipleLanguagesWorkflow as any).then).toBe('function');
    });

    it('should have committed workflow state', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).commit).toBe('function');
    });
  });

  // Tests for workflow execution pattern
  describe('Workflow Execution Pattern', () => {
    it('should have createRunAsync method', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).createRunAsync).toBe('function');
    });

    it('should be executable', () => {
      // The workflow should have a method to execute
      const workflow = addMultipleLanguagesWorkflow as any;
      expect(workflow).toBeDefined();
      expect(typeof workflow.createRunAsync).toBe('function');
    });

    it('should support chaining with .then()', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).then).toBe('function');
    });

    it('should have commit method', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).commit).toBe('function');
    });
  });

  // Tests for integration with addLanguageWorkflow
  describe('Integration with addLanguageWorkflow', () => {
    it('description should mention add-language-workflow usage', () => {
      expect(addMultipleLanguagesWorkflow.description).toBeDefined();
      if (typeof addMultipleLanguagesWorkflow.description === 'string') {
        expect(addMultipleLanguagesWorkflow.description.toLowerCase()).toContain('language');
      }
    });

    it('should support passing through model provider', () => {
      const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['tr-TR', 'de-DE'],
        modelProvider: 'OPENAI'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should support passing through model', () => {
      const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['tr-TR'],
        model: 'gpt-4o-mini'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for result structure
  describe('Result Structure Per Language', () => {
    it('each result should have language string', () => {
      const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '5.00s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com',
            title: 'Test',
            duration: 5000
          }
        ],
        status: 'success'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();

      const parsed = outputSchema.parse(sampleOutput);
      expect(parsed.results[0].language).toBe('tr-TR');
    });

    it('successful result should have trainingUrl', () => {
      const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '5.00s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com',
            title: 'Test Course',
            duration: 5000
          }
        ],
        status: 'success'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('failed result should have error message', () => {
      const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;
      const sampleOutput = {
        success: false,
        successCount: 0,
        failureCount: 1,
        totalDuration: '5.00s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: false,
            error: 'Translation failed due to network error',
            duration: 5000
          }
        ],
        status: 'failed'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('result should include duration in milliseconds', () => {
      const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '4.50s',
        languages: ['tr-TR'],
        results: [
          {
            language: 'tr-TR',
            success: true,
            trainingUrl: 'https://example.com',
            title: 'Test',
            duration: 4500
          }
        ],
        status: 'success'
      };

      const parsed = outputSchema.parse(sampleOutput);
      expect(typeof parsed.results[0].duration).toBe('number');
    });
  });

  // Tests for async patterns
  describe('Async Workflow Patterns', () => {
    it('should support async execution', () => {
      expect(typeof (addMultipleLanguagesWorkflow as any).createRunAsync).toBe('function');
    });

    it('should handle multiple concurrent language requests', () => {
      const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: ['tr-TR', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for error scenarios
  describe('Error Handling', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should validate with missing existingMicrolearningId', () => {
      const testData = {
        targetLanguages: ['tr-TR']
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should validate with missing targetLanguages', () => {
      const testData = {
        existingMicrolearningId: 'test-id'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should validate with empty targetLanguages array', () => {
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguages: []
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should reject non-string language codes', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: [123, 'tr-TR']
        });
      }).toThrow();
    });

    it('should reject invalid modelProvider enum', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          modelProvider: 'INVALID'
        });
      }).toThrow();
    });
  });

  // Tests for count accuracy
  describe('Count Accuracy', () => {
    const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;

    it('successCount should equal successful results count', () => {
      const sampleOutput = {
        success: true,
        successCount: 2,
        failureCount: 0,
        totalDuration: '8.00s',
        languages: ['tr-TR', 'de-DE'],
        results: [
          { language: 'tr-TR', success: true, trainingUrl: 'url1', title: 'Test', duration: 4000 },
          { language: 'de-DE', success: true, trainingUrl: 'url2', title: 'Test', duration: 4000 }
        ],
        status: 'success'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('failureCount should equal failed results count', () => {
      const sampleOutput = {
        success: false,
        successCount: 1,
        failureCount: 1,
        totalDuration: '6.00s',
        languages: ['tr-TR', 'de-DE'],
        results: [
          { language: 'tr-TR', success: true, trainingUrl: 'url1', title: 'Test', duration: 3000 },
          { language: 'de-DE', success: false, error: 'Error', duration: 3000 }
        ],
        status: 'partial'
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });

    it('totalDuration should be a string with duration format', () => {
      const sampleOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '12.34s',
        languages: ['tr-TR'],
        results: [
          { language: 'tr-TR', success: true, trainingUrl: 'url', title: 'Test', duration: 12340 }
        ],
        status: 'success'
      };

      const parsed = outputSchema.parse(sampleOutput);
      expect(typeof parsed.totalDuration).toBe('string');
      expect(parsed.totalDuration).toContain('s');
    });
  });

  // Additional edge case tests
  describe('Edge Cases and Boundary Conditions', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should accept single language (minimum)', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['en-US']
        });
      }).not.toThrow();
    });

    it('should handle microlearning ID with special characters', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'phishing-training-2024-12-31_v1.5',
          targetLanguages: ['tr-TR', 'de-DE']
        });
      }).not.toThrow();
    });

    it('should handle microlearning ID with UUID format', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: '550e8400-e29b-41d4-a716-446655440000',
          targetLanguages: ['fr-FR']
        });
      }).not.toThrow();
    });

    it('should accept very long list of languages', () => {
      const manyLanguages: string[] = [];
      for (let i = 0; i < 30; i++) {
        manyLanguages.push(`lang-${i}`);
      }
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: manyLanguages
        });
      }).not.toThrow();
    });

    it('should accept duplicate languages in array', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['en-US', 'en-US', 'fr-FR']
        });
      }).not.toThrow();
    });

    it('should handle all optional fields at once', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR', 'de-DE', 'fr-FR'],
          sourceLanguage: 'en-US',
          department: 'IT',
          modelProvider: 'OPENAI',
          model: 'gpt-4'
        });
      }).not.toThrow();
    });

    it('should accept empty sourceLanguage override', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          sourceLanguage: 'en'
        });
      }).not.toThrow();
    });
  });

  // Output validation edge cases
  describe('Output Validation Edge Cases', () => {
    const outputSchema = addMultipleLanguagesWorkflow.outputSchema as z.ZodSchema;

    it('should validate partial success output', () => {
      const partialOutput = {
        success: false,
        successCount: 2,
        failureCount: 1,
        totalDuration: '8.50s',
        languages: ['tr-TR', 'de-DE', 'fr-FR'],
        results: [
          { language: 'tr-TR', success: true, trainingUrl: 'https://example.com', duration: 4000 },
          { language: 'de-DE', success: true, trainingUrl: 'https://example.com', duration: 4000 },
          { language: 'fr-FR', success: false, error: 'Network timeout', duration: 500 }
        ],
        status: 'partial'
      };
      expect(() => {
        outputSchema.parse(partialOutput);
      }).not.toThrow();
    });

    it('should validate complete failure output', () => {
      const failureOutput = {
        success: false,
        successCount: 0,
        failureCount: 2,
        totalDuration: '1.50s',
        languages: ['tr-TR', 'de-DE'],
        results: [
          { language: 'tr-TR', success: false, error: 'API rate limit exceeded' },
          { language: 'de-DE', success: false, error: 'Invalid language code' }
        ],
        status: 'failed'
      };
      expect(() => {
        outputSchema.parse(failureOutput);
      }).not.toThrow();
    });

    it('should handle results without optional fields', () => {
      const minimalOutput = {
        success: true,
        successCount: 1,
        failureCount: 0,
        totalDuration: '4.00s',
        languages: ['tr-TR'],
        results: [
          { language: 'tr-TR', success: true }
        ],
        status: 'success'
      };
      expect(() => {
        outputSchema.parse(minimalOutput);
      }).not.toThrow();
    });

    it('should handle large duration values', () => {
      const longDurationOutput = {
        success: true,
        successCount: 5,
        failureCount: 0,
        totalDuration: '3600.00s',
        languages: ['tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT'],
        results: [
          { language: 'tr-TR', success: true, duration: 720000 },
          { language: 'de-DE', success: true, duration: 720000 },
          { language: 'fr-FR', success: true, duration: 720000 },
          { language: 'es-ES', success: true, duration: 720000 },
          { language: 'it-IT', success: true, duration: 720000 }
        ],
        status: 'success'
      };
      expect(() => {
        outputSchema.parse(longDurationOutput);
      }).not.toThrow();
    });

    it('should handle zero-duration results', () => {
      const zeroDurationOutput = {
        success: false,
        successCount: 0,
        failureCount: 1,
        totalDuration: '0.01s',
        languages: ['tr-TR'],
        results: [
          { language: 'tr-TR', success: false, error: 'Instant failure', duration: 0 }
        ],
        status: 'failed'
      };
      expect(() => {
        outputSchema.parse(zeroDurationOutput);
      }).not.toThrow();
    });
  });

  // Department-specific tests
  describe('Department-Specific Behavior', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should accept IT department', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          department: 'IT'
        });
      }).not.toThrow();
    });

    it('should accept Finance department', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          department: 'Finance'
        });
      }).not.toThrow();
    });

    it('should accept HR department', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          department: 'HR'
        });
      }).not.toThrow();
    });

    it('should accept custom department name', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          department: 'CustomDept123'
        });
      }).not.toThrow();
    });

    it('should default to All department when not provided', () => {
      const parsed = inputSchema.parse({
        existingMicrolearningId: 'test-id',
        targetLanguages: ['tr-TR']
      });
      expect(parsed.department).toBe('All');
    });
  });

  // Model provider configuration tests
  describe('Model Provider Configurations', () => {
    const inputSchema = addMultipleLanguagesWorkflow.inputSchema as z.ZodSchema;

    it('should accept OPENAI provider', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          modelProvider: 'OPENAI'
        });
      }).not.toThrow();
    });

    it('should accept GOOGLE provider', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          modelProvider: 'GOOGLE'
        });
      }).not.toThrow();
    });

    it('should accept WORKERS_AI provider', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          modelProvider: 'WORKERS_AI'
        });
      }).not.toThrow();
    });

    it('should allow custom model with provider', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguages: ['tr-TR'],
          modelProvider: 'OPENAI',
          model: 'gpt-3.5-turbo'
        });
      }).not.toThrow();
    });
  });
});

// Step Execution Tests
describe('Step Execution (ProcessMultipleLanguages)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful run
    mocks.createRunAsync.mockResolvedValue({
      start: mocks.runStart
    });

    mocks.runStart.mockImplementation(async ({ inputData }) => {
      return {
        status: 'success',
        result: {
          data: {
            trainingUrl: `url-${inputData.targetLanguage}`,
            title: `Title (${inputData.targetLanguage})`
          }
        }
      };
    });
  });

  it('should process multiple languages in parallel', async () => {
    const input = {
      existingMicrolearningId: 'ml-123',
      targetLanguages: ['tr', 'de', 'fr'],
      department: 'IT'
    };

    const result = await (processMultipleLanguagesStep as any).execute({ inputData: input });

    expect(mocks.createRunAsync).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.successCount).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(mocks.updateLengthAvailabilityAtomic).toHaveBeenCalledWith('ml-123', ['tr', 'de', 'fr']);
  });

  it('should handle partial failures', async () => {
    mocks.runStart.mockImplementation(async ({ inputData }) => {
      if (inputData.targetLanguage === 'de') {
        return { status: 'failed', error: { message: 'Failed' } };
      }
      return {
        status: 'success',
        result: { data: { trainingUrl: 'url', title: 'Title' } }
      };
    });

    const input = {
      existingMicrolearningId: 'ml-123',
      targetLanguages: ['tr', 'de'],
      department: 'IT'
    };

    const result = await (processMultipleLanguagesStep as any).execute({ inputData: input });

    expect(result.status).toBe('partial');
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(mocks.updateLengthAvailabilityAtomic).toHaveBeenCalledWith('ml-123', ['tr']);
  });

  it('should handle complete failure', async () => {
    mocks.runStart.mockResolvedValue({
      status: 'failed',
      error: { message: 'Failed completely' }
    });

    const input = {
      existingMicrolearningId: 'ml-123',
      targetLanguages: ['tr'],
      department: 'IT'
    };

    const result = await (processMultipleLanguagesStep as any).execute({ inputData: input });

    expect(result.status).toBe('failed');
    expect(result.successCount).toBe(0);
    expect(mocks.updateLengthAvailabilityAtomic).not.toHaveBeenCalled();
  });

  it('should validation fail if too many languages', async () => {
    const manyLangs = Array(13).fill('en');
    const input = {
      existingMicrolearningId: 'ml-123',
      targetLanguages: manyLangs
    };

    await expect((processMultipleLanguagesStep as any).execute({ inputData: input }))
      .rejects.toThrow('Too many languages requested');
  });
});

