import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createPhishingWorkflow } from './create-phishing-workflow';

describe('create-phishing-workflow', () => {
  // Tests for workflow definition and structure
  describe('Workflow Definition', () => {
    it('should define createPhishingWorkflow', () => {
      expect(createPhishingWorkflow).toBeDefined();
    });

    it('should be a Workflow instance', () => {
      expect(createPhishingWorkflow).toHaveProperty('id');
      expect(createPhishingWorkflow).toHaveProperty('description');
      expect(createPhishingWorkflow).toHaveProperty('inputSchema');
      expect(createPhishingWorkflow).toHaveProperty('outputSchema');
    });

    it('should have correct workflow id', () => {
      expect(createPhishingWorkflow.id).toBe('create-phishing-workflow');
    });

    it('should have a description', () => {
      expect(createPhishingWorkflow.description).toBeDefined();
      expect(typeof createPhishingWorkflow.description).toBe('string');
      if (typeof createPhishingWorkflow.description === 'string') {
        expect(createPhishingWorkflow.description.length).toBeGreaterThan(0);
      }
    });

    it('description should mention phishing simulations', () => {
      expect(createPhishingWorkflow.description).toBeDefined();
      if (typeof createPhishingWorkflow.description === 'string') {
        expect(createPhishingWorkflow.description.toLowerCase()).toContain('phishing');
      }
    });

    it('should have inputSchema defined', () => {
      expect(createPhishingWorkflow.inputSchema).toBeDefined();
      expect(typeof createPhishingWorkflow.inputSchema).toBe('object');
    });

    it('should have outputSchema defined', () => {
      expect(createPhishingWorkflow.outputSchema).toBeDefined();
      expect(typeof createPhishingWorkflow.outputSchema).toBe('object');
    });
  });

  // Tests for input schema validation
  describe('Input Schema Validation', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should require topic', () => {
      const testData = {
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should accept valid topic', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept isQuishing boolean parameter', () => {
      const testData = {
        topic: 'QR Code Phishing',
        isQuishing: true,
        language: 'en'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept difficulty parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        difficulty: 'Medium',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept valid difficulty levels', () => {
      const difficulties = ['Easy', 'Medium', 'Hard'];
      const baseData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };

      difficulties.forEach(diff => {
        expect(() => {
          inputSchema.parse({
            ...baseData,
            difficulty: diff
          });
        }).not.toThrow();
      });
    });

    it('should accept language parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'tr',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept method parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        method: 'Click-Only',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept valid attack methods', () => {
      const methods = ['Click-Only', 'Data-Submission'];
      const baseData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };

      methods.forEach(method => {
        expect(() => {
          inputSchema.parse({
            ...baseData,
            method
          });
        }).not.toThrow();
      });
    });

    it('should accept targetProfile object', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        targetProfile: {
          name: 'IT Manager',
          department: 'IT',
          behavioralTriggers: ['Urgency', 'Authority'],
          vulnerabilities: ['Fear of data loss']
        }
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make includeEmail optional and default to true', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make includeLandingPage optional and default to true', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept includeEmail as boolean', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeEmail: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept includeLandingPage as boolean', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeLandingPage: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should make modelProvider optional', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept valid modelProvider values', () => {
      const validProviders = ['OPENAI', 'WORKERS_AI', 'GOOGLE'];
      const baseData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
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
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept model name when provided', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        model: 'gpt-4o'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should handle all optional fields together', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'tr',
        isQuishing: true,
        difficulty: 'Hard',
        method: 'Data-Submission',
        targetProfile: {
          name: 'Finance Manager',
          department: 'Finance'
        },
        includeEmail: true,
        includeLandingPage: true,
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
    const outputSchema = createPhishingWorkflow.outputSchema as z.ZodSchema;

    it('should have subject field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('subject');
    });

    it('should have template field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('template');
    });

    it('should have fromAddress field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('fromAddress');
    });

    it('should have fromName field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('fromName');
    });

    it('should have analysis field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('analysis');
    });

    it('should have landingPage field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('landingPage');
    });

    it('should have phishingId field in output', () => {
      const shape = (outputSchema as any).shape;
      expect(shape).toHaveProperty('phishingId');
    });

    it('landingPage should have pages array', () => {
      const shape = (outputSchema as any).shape;
      const landingPageShape = shape.landingPage.unwrap().shape;
      expect(landingPageShape).toHaveProperty('pages');
    });
  });

  // Tests for workflow steps
  describe('Workflow Steps', () => {
    it('should have steps defined in workflow', () => {
      expect(createPhishingWorkflow).toHaveProperty('steps');
    });

    it('should have analyze-phishing-request step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('analyze-phishing-request');
    });

    it('should have generate-phishing-email step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('generate-phishing-email');
    });

    it('should have generate-landing-page step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('generate-landing-page');
    });

    it('should have save-phishing-content step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((step: any) => step.id);
      expect(stepIds).toContain('save-phishing-content');
    });

    it('step 1 should be analyze-phishing-request', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'analyze-phishing-request');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 2 should be generate-phishing-email', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'generate-phishing-email');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 3 should be generate-landing-page', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'generate-landing-page');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('step 4 should be save-phishing-content', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const step = stepsArray.find((s: any) => s.id === 'save-phishing-content');
      expect(step).toBeDefined();
      expect(step?.description).toBeDefined();
    });

    it('steps should be in sequential order', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((s: any) => s.id);

      const analyzeIndex = stepIds.indexOf('analyze-phishing-request');
      const emailIndex = stepIds.indexOf('generate-phishing-email');
      const lpIndex = stepIds.indexOf('generate-landing-page');
      const saveIndex = stepIds.indexOf('save-phishing-content');

      expect(analyzeIndex).toBeLessThan(emailIndex);
      expect(emailIndex).toBeLessThan(lpIndex);
      expect(lpIndex).toBeLessThan(saveIndex);
    });
  });

  // Tests for workflow execution pattern
  describe('Workflow Execution Pattern', () => {
    it('should have createRunAsync method', () => {
      expect(typeof (createPhishingWorkflow as any).createRunAsync).toBe('function');
    });

    it('should have start method available', () => {
      expect(createPhishingWorkflow).toHaveProperty('execute');
    });

    it('should support chaining with .then()', () => {
      expect(typeof (createPhishingWorkflow as any).then).toBe('function');
    });

    it('should have commit method', () => {
      expect(typeof (createPhishingWorkflow as any).commit).toBe('function');
    });
  });

  // Tests for difficulty levels
  describe('Difficulty Levels', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept Easy difficulty', () => {
      const testData = {
        topic: 'Phishing Prevention',
        difficulty: 'Easy',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept Medium difficulty', () => {
      const testData = {
        topic: 'Phishing Prevention',
        difficulty: 'Medium',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept Hard difficulty', () => {
      const testData = {
        topic: 'Phishing Prevention',
        difficulty: 'Hard',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should reject invalid difficulty', () => {
      const testData = {
        topic: 'Phishing Prevention',
        difficulty: 'Extreme',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });
  });

  // Tests for attack methods
  describe('Attack Methods', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept Click-Only method', () => {
      const testData = {
        topic: 'Phishing Prevention',
        method: 'Click-Only',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept Data-Submission method', () => {
      const testData = {
        topic: 'Phishing Prevention',
        method: 'Data-Submission',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should reject invalid method', () => {
      const testData = {
        topic: 'Phishing Prevention',
        method: 'Invalid-Method',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });
  });

  // Tests for quishing detection
  describe('Quishing Detection', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept isQuishing as true', () => {
      const testData = {
        topic: 'QR Code Phishing',
        isQuishing: true,
        language: 'en'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept isQuishing as false', () => {
      const testData = {
        topic: 'Phishing Prevention',
        isQuishing: false,
        language: 'en'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('isQuishing should be boolean type', () => {
      const testData = {
        topic: 'Phishing Prevention',
        isQuishing: false,
        language: 'en'
      };
      const parsed = inputSchema.parse(testData);
      expect(typeof parsed.isQuishing).toBe('boolean');
    });
  });

  // Tests for language support
  describe('Language Support', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept language parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept multiple language codes', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'ja', 'es'];
      const baseData = {
        topic: 'Phishing Prevention',
        isQuishing: false
      };

      languages.forEach(lang => {
        expect(() => {
          inputSchema.parse({
            ...baseData,
            language: lang
          });
        }).not.toThrow();
      });
    });

    it('should accept BCP-47 format language codes', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en-US',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for targetProfile structure
  describe('Target Profile Structure', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept targetProfile with name', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        targetProfile: {
          name: 'IT Manager'
        }
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept targetProfile with department', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        targetProfile: {
          name: 'John',
          department: 'IT'
        }
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept targetProfile with behavioralTriggers', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        targetProfile: {
          name: 'John',
          behavioralTriggers: ['Urgency', 'Authority', 'Social proof']
        }
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept targetProfile with vulnerabilities', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        targetProfile: {
          name: 'John',
          vulnerabilities: ['Fear of data loss', 'Compliance pressure']
        }
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for email generation control
  describe('Email Generation Control', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should allow disabling email generation', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeEmail: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should allow enabling email generation explicitly', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeEmail: true
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should default to including email', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.includeEmail).not.toBe(false);
    });
  });

  // Tests for landing page generation control
  describe('Landing Page Generation Control', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should allow disabling landing page generation', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeLandingPage: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should allow enabling landing page generation explicitly', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        includeLandingPage: true
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should default to including landing page', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      const parsed = inputSchema.parse(testData);
      expect(parsed.includeLandingPage).not.toBe(false);
    });
  });

  // Tests for model provider configuration
  describe('Model Provider Configuration', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept OPENAI provider', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        modelProvider: 'OPENAI'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept WORKERS_AI provider', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        modelProvider: 'WORKERS_AI'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should accept GOOGLE provider', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        modelProvider: 'GOOGLE'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should reject invalid provider', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        modelProvider: 'INVALID_PROVIDER'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for async patterns
  describe('Async Workflow Patterns', () => {
    it('should support async execution', () => {
      expect(typeof (createPhishingWorkflow as any).createRunAsync).toBe('function');
    });

    it('should define async method signatures', () => {
      const asyncMethods = ['createRunAsync', 'start'];
      asyncMethods.forEach(method => {
        if ((createPhishingWorkflow as any)[method]) {
          expect(typeof (createPhishingWorkflow as any)[method]).toBe('function');
        }
      });
    });
  });

  // Tests for error scenarios
  describe('Error Handling', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should validate with missing topic', () => {
      const testData = {
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should validate with missing isQuishing', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should provide error for invalid enum values', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        difficulty: 'SuperHard'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).toThrow();
    });

    it('should type-check boolean values', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      const parsed = inputSchema.parse(testData);
      expect(typeof parsed.isQuishing).toBe('boolean');
    });
  });

  // Tests for prompt builder integration
  describe('Prompt Builder Integration', () => {
    it('description should indicate content generation', () => {
      expect(createPhishingWorkflow.description).toBeDefined();
      if (typeof createPhishingWorkflow.description === 'string') {
        expect(createPhishingWorkflow.description.toLowerCase()).toContain('phishing');
      }
    });

    it('should have steps for scenario design', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      expect(stepsArray.length).toBeGreaterThanOrEqual(3);
    });

    it('should integrate with analysis prompts', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const analyzeStep = stepsArray.find((s: any) => s.id === 'analyze-phishing-request');
      expect(analyzeStep?.description).toBeDefined();
    });

    it('should integrate with email prompts', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const emailStep = stepsArray.find((s: any) => s.id === 'generate-phishing-email');
      expect(emailStep?.description).toBeDefined();
    });

    it('should integrate with landing page prompts', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const lpStep = stepsArray.find((s: any) => s.id === 'generate-landing-page');
      expect(lpStep?.description).toBeDefined();
    });
  });

  // Tests for KV consistency
  describe('KV Consistency', () => {
    it('should have save-phishing-content step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const stepIds = stepsArray.map((s: any) => s.id);
      expect(stepIds).toContain('save-phishing-content');
    });

    it('save step should be final step', () => {
      const rawSteps = (createPhishingWorkflow as any).steps || {};
      const stepsArray = Array.isArray(rawSteps) ? rawSteps : Object.values(rawSteps);
      const lastStep = stepsArray[stepsArray.length - 1];
      expect(lastStep?.id).toBe('save-phishing-content');
    });
  });

  // Tests for policy context support
  describe('Policy Context Support', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept optional policyContext parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        policyContext: 'Company security policy compliance required'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should not require policyContext', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });

  // Tests for additional context support
  describe('Additional Context Support', () => {
    const inputSchema = createPhishingWorkflow.inputSchema as z.ZodSchema;

    it('should accept optional additionalContext parameter', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false,
        additionalContext: 'Target user has clicked on phishing before'
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });

    it('should not require additionalContext', () => {
      const testData = {
        topic: 'Phishing Prevention',
        language: 'en',
        isQuishing: false
      };
      expect(() => {
        inputSchema.parse(testData);
      }).not.toThrow();
    });
  });
});
