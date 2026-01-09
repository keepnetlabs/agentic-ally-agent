import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { addLanguageWorkflow } from './add-language-workflow';

describe('add-language-workflow', () => {
  // Tests for workflow definition and structure
  describe('Workflow Definition', () => {
    it('should define addLanguageWorkflow', () => {
      expect(addLanguageWorkflow).toBeDefined();
    });

    it('should be a Workflow instance', () => {
      expect(addLanguageWorkflow).toHaveProperty('id');
      expect(addLanguageWorkflow).toHaveProperty('description');
      expect(addLanguageWorkflow).toHaveProperty('inputSchema');
      expect(addLanguageWorkflow).toHaveProperty('outputSchema');
    });

    it('should have correct workflow id', () => {
      expect(addLanguageWorkflow.id).toBe('add-language-workflow');
    });

    it('should have a description', () => {
      expect(addLanguageWorkflow.description).toBeDefined();
      expect(typeof addLanguageWorkflow.description).toBe('string');
      if (typeof addLanguageWorkflow.description === 'string') {
        expect(addLanguageWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('should have inputSchema defined', () => {
      expect(addLanguageWorkflow.inputSchema).toBeDefined();
      expect(typeof addLanguageWorkflow.inputSchema).toBe('object');
    });

    it('should have outputSchema defined', () => {
      expect(addLanguageWorkflow.outputSchema).toBeDefined();
      expect(typeof addLanguageWorkflow.outputSchema).toBe('object');
    });
  });

  // Tests for input schema validation
  describe('Input Schema Validation', () => {
    const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

    it('should require existingMicrolearningId', () => {
      const testData = {
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should accept valid existingMicrolearningId', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should require targetLanguage', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should accept targetLanguage in BCP-47 format', () => {
      const validLanguages = ['en-US', 'tr-TR', 'de-DE', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'fr-CA'];
      const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

      validLanguages.forEach(lang => {
        const testData = {
          existingMicrolearningId: 'test-id',
          targetLanguage: lang
        };
        expect(() => {
          inputSchema.parse(testData);
        }).not.toThrow();
      });
    });

    it('should make sourceLanguage optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept sourceLanguage when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR',
        sourceLanguage: 'en-US'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make department optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept department when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR',
        department: 'IT'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make modelProvider optional', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept valid modelProvider values', () => {
      const validProviders = ['OPENAI', 'WORKERS_AI', 'GOOGLE'];
      const baseData = {
        existingMicrolearningId: 'test-id',
        targetLanguage: 'tr-TR'
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
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept model when provided', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR',
        model: 'OPENAI_GPT_4O_MINI'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should reject empty existingMicrolearningId', () => {
      const testData = {
        existingMicrolearningId: '',
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should handle all optional fields together', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR',
        sourceLanguage: 'en-US',
        department: 'HR',
        modelProvider: 'OPENAI',
        model: 'gpt-4o-mini'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for output schema structure
  describe('Output Schema Structure', () => {
    const outputSchema = addLanguageWorkflow.outputSchema as z.ZodSchema;

    it('should have success field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('success');
    });

    it('should have message field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('message');
    });

    it('should have data object in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('data');
    });

    it('output data should contain microlearningId', () => {
      const shape = (outputSchema as any).shape;
      const dataShape = shape.data.shape;
      expect(dataShape).toHaveProperty('microlearningId');
    });

    it('output data should contain title', () => {
      const shape = (outputSchema as any).shape;
      const dataShape = shape.data.shape;
      expect(dataShape).toHaveProperty('title');
    });

    it('output data should contain targetLanguage', () => {
      const shape = (outputSchema as any).shape;
      const dataShape = shape.data.shape;
      expect(dataShape).toHaveProperty('targetLanguage');
    });

    it('output data should contain trainingUrl', () => {
      const shape = (outputSchema as any).shape;
      const dataShape = shape.data.shape;
      expect(dataShape).toHaveProperty('trainingUrl');
    });

    it('output data should contain filesGenerated array', () => {
      const shape = (outputSchema as any).shape;
      const dataShape = shape.data.shape;
      expect(dataShape).toHaveProperty('filesGenerated');
    });

    it('should validate a sample successful output', () => {
      const sampleOutput = {
        success: true,
        message: 'Language translation completed successfully!',
        data: {
          microlearningId: 'phishing-101',
          title: 'Stop Phishing Attacks',
          targetLanguage: 'tr-TR',
          trainingUrl: 'https://example.com/?courseId=phishing-101&langUrl=lang%2Ftr-TR',
          filesGenerated: ['phishing-101/tr-TR.json']
        }
      };

      expect(() => {
        outputSchema.parse(sampleOutput);
      }).not.toThrow();
    });
  });

  // Tests for workflow steps
  describe('Workflow Steps', () => {
    it('should have steps defined in workflow', () => {
      expect(addLanguageWorkflow).toHaveProperty('steps');
    });

    it('should have load-existing-microlearning step', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('load-existing-microlearning');
    });

    it('should have translate-language-content step', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('translate-language-content');
    });

    it('should have update-inbox step', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('update-inbox');
    });

    it('should have combine-results step', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('combine-results');
    });

    it('step 1 should have correct id', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'load-existing-microlearning');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 2 should have correct id', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'translate-language-content');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 3 should have correct id', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'update-inbox');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 4 should have correct id', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'combine-results');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });
  });

  // Tests for workflow execution pattern
  describe('Workflow Execution Pattern', () => {
    it('should have createRunAsync method', () => {
      expect(typeof (addLanguageWorkflow as any).createRunAsync).toBe('function');
    });

    it('should have execute method available', () => {
      expect(addLanguageWorkflow).toHaveProperty('execute');
    });

    it('should support chaining with .then()', () => {
      expect(typeof (addLanguageWorkflow as any).then).toBe('function');
    });

    it('should support .parallel() for concurrent steps', () => {
      expect(typeof (addLanguageWorkflow as any).parallel).toBe('function');
    });

    it('should have commit method', () => {
      expect(typeof (addLanguageWorkflow as any).commit).toBe('function');
    });
  });

  // Tests for language code validation
  describe('Language Code Validation', () => {
    const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

    it('should accept lowercase language codes', () => {
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguage: 'en'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept language codes with hyphens', () => {
      const testData = {
        existingMicrolearningId: 'test-id',
        targetLanguage: 'en-US'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    // it('should accept language codes with underscores', () => {
    //   const testData = {
    //     existingMicrolearningId: 'test-id',
    //     targetLanguage: 'en_US'
    //   };
    //   expect(() => {
    //     inputSchema.parse(testData);
    //   }).not.toThrow();
    // });

    it('should accept various language codes', () => {
      const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko'];

      languages.forEach(lang => {
        expect(() => {
          inputSchema.parse({
            existingMicrolearningId: 'test-id',
            targetLanguage: lang
          });
        }).not.toThrow();
      });
    });
  });

  // Tests for optional fields defaults
  describe('Optional Field Defaults', () => {
    const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

    it('should apply default for department', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.department).toBeDefined();
      expect(typeof parsed.department).toBe('string');
    });

    it('should preserve provided department value', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR',
        department: 'HR'
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.department).toBe('HR');
    });

    it('should not apply default for sourceLanguage', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.sourceLanguage).toBeUndefined();
    });

    it('should not apply default for modelProvider', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.modelProvider).toBeUndefined();
    });

    it('should not apply default for model', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.model).toBeUndefined();
    });
  });

  // Tests for KVService integration expectations
  describe('KVService Integration', () => {
    const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

    it('should accept microlearning IDs formatted for KV', () => {
      const kvFormattedIds = ['ml:phishing-101:base', 'phishing-101', 'training-xyz-123'];

      kvFormattedIds.forEach(id => {
        expect(() => {
          inputSchema.parse({
            existingMicrolearningId: id,
            targetLanguage: 'tr-TR'
          });
        }).not.toThrow();
      });
    });

    it('should reject null existingMicrolearningId', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: null,
          targetLanguage: 'tr-TR'
        });
      }).toThrow();
    });

    it('should reject undefined existingMicrolearningId', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: undefined,
          targetLanguage: 'tr-TR'
        });
      }).toThrow();
    });
  });

  // Tests for multi-retry logic expectations
  describe('Multi-Retry Logic', () => {
    it('should describe resilience in description', () => {
      expect(addLanguageWorkflow.description).toContain('parallel');
    });

    it('should have steps for retry fallback mechanisms', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      expect(stepsArray.length).toBeGreaterThanOrEqual(3);
    });

    it('should maintain step order for retries', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((s: any) => s.id);

      const loadIndex = stepIds.indexOf('load-existing-microlearning');
      const translateIndex = stepIds.indexOf('translate-language-content');
      const combineIndex = stepIds.indexOf('combine-results');

      expect(loadIndex).toBeLessThan(translateIndex);
      expect(translateIndex).toBeLessThan(combineIndex);
    });
  });

  // Tests for error scenarios
  describe('Error Handling', () => {
    const inputSchema = addLanguageWorkflow.inputSchema as z.ZodSchema;

    it('should validate with missing targetLanguage', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should validate with missing existingMicrolearningId', () => {
      const testData = {
        targetLanguage: 'tr-TR'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should provide error message for invalid enum', () => {
      expect(() => {
        inputSchema.parse({
          existingMicrolearningId: 'test-id',
          targetLanguage: 'tr-TR',
          modelProvider: 'INVALID_PROVIDER'
        });
      }).toThrow();
    });

    it('should type-check object properties correctly', () => {
      const testData = {
        existingMicrolearningId: 'phishing-101',
        targetLanguage: 'tr-TR'
      };
      const parsed = inputSchema.parse(testData);

      expect(typeof parsed.existingMicrolearningId).toBe('string');
      expect(typeof parsed.targetLanguage).toBe('string');
    });
  });

  // Tests for workflow async patterns
  describe('Async Workflow Patterns', () => {
    it('should support async execution', async () => {
      expect(typeof (addLanguageWorkflow as any).createRunAsync).toBe('function');
    });

    it('should have proper async method signatures', () => {
      const asyncMethods = ['createRunAsync', 'start', 'trigger'];
      asyncMethods.forEach(method => {
        if ((addLanguageWorkflow as any)[method]) {
          expect(typeof (addLanguageWorkflow as any)[method]).toBe('function');
        }
      });
    });

    it('should define output schema that supports async results', () => {
      const outputSchema = addLanguageWorkflow.outputSchema as z.ZodSchema;
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('success');
      expect(shape).toHaveProperty('data');
    });
  });

  // Tests for parallel processing expectations
  describe('Parallel Processing', () => {
    it('should support parallel step execution', () => {
      expect(typeof (addLanguageWorkflow as any).parallel).toBe('function');
    });

    it('should have steps that can run in parallel', () => {
      const rawSteps = (addLanguageWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((s: any) => s.id);

      // Typical pattern: translate-language-content and update-inbox should be parallel
      expect(stepIds).toContain('translate-language-content');
      expect(stepIds).toContain('update-inbox');
    });

    it('description should mention parallel processing', () => {
      expect(addLanguageWorkflow.description).toBeDefined();
      if (typeof addLanguageWorkflow.description === 'string') {
        expect(addLanguageWorkflow.description.toLowerCase()).toContain('parallel');
      }
    });
  });
});
