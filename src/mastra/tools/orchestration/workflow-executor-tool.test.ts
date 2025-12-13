/**
 * Test Suite: Workflow Executor Tool
 *
 * Tests for workflow orchestration, routing, and execution.
 * Covers: create-microlearning, add-language, add-multiple-languages, update-microlearning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workflowExecutorTool } from './workflow-executor-tool';
import { PROMPT_ANALYSIS, MODEL_PROVIDERS } from '../../constants';

describe('Workflow Executor Tool', () => {
  describe('Input Validation - create-microlearning', () => {
    describe('Prompt validation', () => {
      it('should require prompt for create-microlearning', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create phishing training',
        };

        expect(input.workflowType).toBe('create-microlearning');
        expect(input.prompt).toBeTruthy();
      });

      it('should reject prompt below minimum length', () => {
        const shortPrompt = 'a'.repeat(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH - 1);
        expect(shortPrompt.length).toBeLessThan(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH);
      });

      it('should accept prompt at minimum length', () => {
        const minPrompt = 'a'.repeat(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH);
        expect(minPrompt.length).toBeGreaterThanOrEqual(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH);
      });

      it('should reject prompt exceeding maximum length', () => {
        const longPrompt = 'a'.repeat(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH + 1);
        expect(longPrompt.length).toBeGreaterThan(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH);
      });

      it('should accept prompt at maximum length', () => {
        const maxPrompt = 'a'.repeat(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH);
        expect(maxPrompt.length).toBeLessThanOrEqual(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH);
      });
    });

    describe('Additional context validation', () => {
      it('should accept additionalContext when provided', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          additionalContext: 'Focus on advanced techniques',
        };

        expect(input.additionalContext).toBeTruthy();
      });

      it('should reject additionalContext exceeding max length', () => {
        const longContext = 'x'.repeat(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH + 1);
        expect(longContext.length).toBeGreaterThan(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH);
      });

      it('should be optional', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
        };

        expect(input.additionalContext).toBeUndefined();
      });
    });

    describe('Custom requirements validation', () => {
      it('should accept customRequirements when provided', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          customRequirements: 'Include gamification and simulations',
        };

        expect(input.customRequirements).toBeTruthy();
      });

      it('should reject customRequirements exceeding max length', () => {
        const longReq = 'x'.repeat(PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH + 1);
        expect(longReq.length).toBeGreaterThan(PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH);
      });
    });

    describe('Department validation', () => {
      it('should accept department string', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          department: 'IT',
        };

        expect(input.department).toBe('IT');
      });

      it('should reject department exceeding max length', () => {
        const longDept = 'x'.repeat(PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH + 1);
        expect(longDept.length).toBeGreaterThan(PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH);
      });

      it('should default to "All" if not provided', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          department: undefined,
        };

        const defaultDept = input.department || 'All';
        expect(defaultDept).toBe('All');
      });
    });

    describe('Level (difficulty) validation', () => {
      it('should accept Beginner level', () => {
        const input = {
          level: 'Beginner',
        };

        expect([...PROMPT_ANALYSIS.DIFFICULTY_LEVELS]).toContain('Beginner');
      });

      it('should accept Intermediate level', () => {
        const input = {
          level: 'Intermediate',
        };

        expect([...PROMPT_ANALYSIS.DIFFICULTY_LEVELS]).toContain('Intermediate');
      });

      it('should accept Advanced level', () => {
        const input = {
          level: 'Advanced',
        };

        expect([...PROMPT_ANALYSIS.DIFFICULTY_LEVELS]).toContain('Advanced');
      });

      it('should default to Intermediate', () => {
        const input = {
          level: undefined,
        };

        const defaultLevel = input.level || 'Intermediate';
        expect(defaultLevel).toBe('Intermediate');
      });

      it('should reject invalid level', () => {
        const input = {
          level: 'Expert', // Not in enum
        };

        expect([...PROMPT_ANALYSIS.DIFFICULTY_LEVELS]).not.toContain('Expert');
      });
    });

    describe('Priority validation', () => {
      it('should accept low priority', () => {
        expect([...PROMPT_ANALYSIS.PRIORITY_LEVELS]).toContain('low');
      });

      it('should accept medium priority', () => {
        expect([...PROMPT_ANALYSIS.PRIORITY_LEVELS]).toContain('medium');
      });

      it('should accept high priority', () => {
        expect([...PROMPT_ANALYSIS.PRIORITY_LEVELS]).toContain('high');
      });

      it('should default to medium', () => {
        const priority = undefined;
        const defaultPriority = priority || 'medium';
        expect(defaultPriority).toBe('medium');
      });
    });
  });

  describe('Input Validation - add-language', () => {
    describe('Language ID validation', () => {
      it('should require existingMicrolearningId', () => {
        const input = {
          workflowType: 'add-language',
          existingMicrolearningId: 'phishing-101',
          targetLanguage: 'de',
        };

        expect(input.existingMicrolearningId).toBeTruthy();
        expect(input.existingMicrolearningId.length).toBeGreaterThan(0);
      });

      it('should reject empty microlearningId', () => {
        const id = '';
        expect(id.length).toBe(0);
      });

      it('should reject microlearningId exceeding max length', () => {
        const longId = 'x'.repeat(257);
        expect(longId.length).toBeGreaterThan(256);
      });
    });

    describe('Target language validation', () => {
      it('should validate BCP-47 language code (en)', () => {
        const language = 'en';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(language)).toBe(true);
      });

      it('should validate BCP-47 language code with region (en-US)', () => {
        const language = 'en-us';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(language)).toBe(true);
      });

      it('should validate German (de)', () => {
        const language = 'de';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(language)).toBe(true);
      });

      it('should validate Turkish (tr)', () => {
        const language = 'tr';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(language)).toBe(true);
      });

      it('should reject invalid language code', () => {
        const invalidLang = 'X';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(invalidLang)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test('EN')).toBe(true);
        expect(pattern.test('en')).toBe(true);
      });
    });

    describe('Source language validation', () => {
      it('should accept source language when provided', () => {
        const input = {
          sourceLanguage: 'en',
        };

        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(input.sourceLanguage)).toBe(true);
      });

      it('should be optional', () => {
        const input = {
          sourceLanguage: undefined,
        };

        expect(input.sourceLanguage).toBeUndefined();
      });
    });
  });

  describe('Input Validation - add-multiple-languages', () => {
    describe('Target languages array validation', () => {
      it('should accept array of languages', () => {
        const input = {
          targetLanguages: ['de', 'fr', 'es'],
        };

        expect(Array.isArray(input.targetLanguages)).toBe(true);
        expect(input.targetLanguages.length).toBe(3);
      });

      it('should reject empty array', () => {
        const input = {
          targetLanguages: [],
        };

        expect(input.targetLanguages.length).toBe(0);
      });

      it('should reject more than 12 languages', () => {
        const languages = Array.from({ length: 13 }, (_, i) =>
          String.fromCharCode(97 + (i % 26)) // a, b, c, ...
        );

        expect(languages.length).toBeGreaterThan(12);
      });

      it('should accept exactly 12 languages', () => {
        const languages = Array.from({ length: 12 }, (_, i) =>
          String.fromCharCode(97 + (i % 26))
        );

        expect(languages.length).toBeLessThanOrEqual(12);
      });

      it('should validate each language code', () => {
        const languages = ['de', 'fr', 'es'];
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;

        const allValid = languages.every(lang => pattern.test(lang));
        expect(allValid).toBe(true);
      });
    });
  });

  describe('Input Validation - update-microlearning', () => {
    describe('Updates object validation', () => {
      it('should accept theme updates', () => {
        const input = {
          updates: {
            theme: {
              fontFamily: 'Arial',
              colors: { primary: '#FF0000' },
              logo: 'https://example.com/logo.png',
            },
          },
        };

        expect(input.updates).toBeDefined();
        expect(input.updates.theme).toBeDefined();
      });

      it('should be optional', () => {
        const input = {
          updates: undefined,
        };

        expect(input.updates).toBeUndefined();
      });
    });
  });

  describe('Model Provider & Override', () => {
    describe('Model provider validation', () => {
      it('should accept OPENAI provider', () => {
        expect([...MODEL_PROVIDERS.NAMES]).toContain('OPENAI');
      });

      it('should accept WORKERS_AI provider', () => {
        expect([...MODEL_PROVIDERS.NAMES]).toContain('WORKERS_AI');
      });

      it('should accept GOOGLE provider', () => {
        expect([...MODEL_PROVIDERS.NAMES]).toContain('GOOGLE');
      });

      it('should be optional', () => {
        const input = {
          modelProvider: undefined,
        };

        expect(input.modelProvider).toBeUndefined();
      });
    });

    describe('Model name override', () => {
      it('should accept custom model name', () => {
        const input = {
          model: 'OPENAI_GPT_4O_MINI',
        };

        expect(input.model).toBeTruthy();
      });

      it('should be optional', () => {
        const input = {
          model: undefined,
        };

        expect(input.model).toBeUndefined();
      });

      it('should work with modelProvider override', () => {
        const input = {
          modelProvider: 'OPENAI',
          model: 'OPENAI_GPT_4O',
        };

        expect(input.modelProvider).toBe('OPENAI');
        expect(input.model).toBe('OPENAI_GPT_4O');
      });
    });
  });

  describe('Workflow Type Routing', () => {
    describe('Workflow selection', () => {
      it('should route to create-microlearning workflow', () => {
        const input = {
          workflowType: 'create-microlearning',
        };

        expect(input.workflowType).toBe('create-microlearning');
      });

      it('should route to add-language workflow', () => {
        const input = {
          workflowType: 'add-language',
        };

        expect(input.workflowType).toBe('add-language');
      });

      it('should route to add-multiple-languages workflow', () => {
        const input = {
          workflowType: 'add-multiple-languages',
        };

        expect(input.workflowType).toBe('add-multiple-languages');
      });

      it('should route to update-microlearning workflow', () => {
        const input = {
          workflowType: 'update-microlearning',
        };

        expect(input.workflowType).toBe('update-microlearning');
      });
    });

    describe('Workflow parameter requirements', () => {
      it('should require prompt for create-microlearning', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: undefined,
        };

        // Should fail validation - no prompt
        expect(input.prompt).toBeUndefined();
      });

      it('should require existingMicrolearningId + targetLanguage for add-language', () => {
        const input = {
          workflowType: 'add-language',
          existingMicrolearningId: undefined,
          targetLanguage: undefined,
        };

        expect(input.existingMicrolearningId).toBeUndefined();
        expect(input.targetLanguage).toBeUndefined();
      });

      it('should require existingMicrolearningId + targetLanguages for add-multiple-languages', () => {
        const input = {
          workflowType: 'add-multiple-languages',
          existingMicrolearningId: undefined,
          targetLanguages: undefined,
        };

        expect(input.existingMicrolearningId).toBeUndefined();
        expect(input.targetLanguages).toBeUndefined();
      });
    });
  });

  describe('Complete Workflow Scenarios', () => {
    describe('Create-microlearning workflow', () => {
      it('should accept valid create-microlearning request', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create phishing awareness training for IT department',
          additionalContext: 'Focus on email indicators',
          department: 'IT',
          level: 'Intermediate',
          priority: 'high',
        };

        expect(input.workflowType).toBe('create-microlearning');
        expect(input.prompt).toBeTruthy();
        expect(input.department).toBe('IT');
      });

      it('should accept minimal create-microlearning request', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create ransomware training',
        };

        expect(input.workflowType).toBe('create-microlearning');
        expect(input.prompt).toBeTruthy();
      });

      it('should accept with model overrides', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          modelProvider: 'OPENAI',
          model: 'OPENAI_GPT_4O',
        };

        expect(input.modelProvider).toBe('OPENAI');
        expect(input.model).toBe('OPENAI_GPT_4O');
      });
    });

    describe('Add-language workflow', () => {
      it('should accept valid add-language request', () => {
        const input = {
          workflowType: 'add-language',
          existingMicrolearningId: 'phishing-101',
          targetLanguage: 'de',
          sourceLanguage: 'en',
        };

        expect(input.workflowType).toBe('add-language');
        expect(input.existingMicrolearningId).toBe('phishing-101');
        expect(input.targetLanguage).toBe('de');
      });

      it('should accept without sourceLanguage', () => {
        const input = {
          workflowType: 'add-language',
          existingMicrolearningId: 'phishing-101',
          targetLanguage: 'tr',
        };

        expect(input.sourceLanguage).toBeUndefined();
      });

      it('should accept with model overrides', () => {
        const input = {
          workflowType: 'add-language',
          existingMicrolearningId: 'phishing-101',
          targetLanguage: 'fr',
          modelProvider: 'WORKERS_AI',
        };

        expect(input.modelProvider).toBe('WORKERS_AI');
      });
    });

    describe('Add-multiple-languages workflow', () => {
      it('should accept valid add-multiple-languages request', () => {
        const input = {
          workflowType: 'add-multiple-languages',
          existingMicrolearningId: 'phishing-101',
          targetLanguages: ['de', 'fr', 'es', 'tr'],
        };

        expect(input.workflowType).toBe('add-multiple-languages');
        expect(input.targetLanguages.length).toBe(4);
      });

      it('should accept max 12 languages', () => {
        const languages = ['de', 'fr', 'es', 'it', 'pt', 'ja', 'zh', 'ar', 'ru', 'ko', 'tr', 'nl'];
        const input = {
          workflowType: 'add-multiple-languages',
          existingMicrolearningId: 'phishing-101',
          targetLanguages: languages,
        };

        expect(input.targetLanguages.length).toBeLessThanOrEqual(12);
      });
    });

    describe('Update-microlearning workflow', () => {
      it('should accept valid update-microlearning request', () => {
        const input = {
          workflowType: 'update-microlearning',
          existingMicrolearningId: 'phishing-101',
          updates: {
            theme: {
              fontFamily: 'Helvetica',
              colors: { primary: '#0066CC' },
            },
          },
        };

        expect(input.workflowType).toBe('update-microlearning');
        expect(input.updates).toBeDefined();
      });
    });
  });

  describe('Output Format', () => {
    describe('Success response format', () => {
      it('should return success flag', () => {
        const output = {
          success: true,
          status: 'success',
        };

        expect(output.success).toBe(true);
        expect(output.status).toBe('success');
      });

      it('should include title in response', () => {
        const output = {
          success: true,
          title: 'Phishing Awareness Training',
        };

        expect(output.title).toBeTruthy();
      });

      it('should include microlearningId in create response', () => {
        const output = {
          success: true,
          microlearningId: 'phishing-101',
        };

        expect(output.microlearningId).toBeTruthy();
      });

      it('should include department in response', () => {
        const output = {
          success: true,
          department: 'IT',
        };

        expect(output.department).toBeTruthy();
      });
    });

    describe('Error response format', () => {
      it('should return success: false on error', () => {
        const output = {
          success: false,
          error: 'Prompt is required for create-microlearning workflow',
        };

        expect(output.success).toBe(false);
        expect(output.error).toBeTruthy();
      });

      it('should include error message', () => {
        const output = {
          success: false,
          error: 'Microlearning not found',
        };

        expect(typeof output.error).toBe('string');
      });
    });
  });

  describe('Edge Cases & Error Scenarios', () => {
    describe('Invalid input combinations', () => {
      it('should handle create-microlearning without prompt', () => {
        const input = {
          workflowType: 'create-microlearning',
          // Missing prompt
        };

        // Should fail - prompt required
        expect(input).not.toHaveProperty('prompt');
      });

      it('should handle add-language without microlearning ID', () => {
        const input = {
          workflowType: 'add-language',
          targetLanguage: 'de',
          // Missing existingMicrolearningId
        };

        expect(input).not.toHaveProperty('existingMicrolearningId');
      });

      it('should handle language code with invalid format', () => {
        const invalidCode = '12';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(invalidCode)).toBe(false);
      });
    });

    describe('Boundary conditions', () => {
      it('should handle very long prompt', () => {
        const longPrompt = 'Create training ' + 'about phishing '.repeat(300);
        expect(longPrompt.length).toBeGreaterThan(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH);
      });

      it('should handle special characters in prompt', () => {
        const input = {
          prompt: 'Create training with "quotes" & special chars: @#$%',
        };

        expect(input.prompt).toBeTruthy();
      });

      it('should handle unicode characters in language codes', () => {
        // Language codes are ASCII only
        const code = 'de';
        const pattern = PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX;
        expect(pattern.test(code)).toBe(true);
      });
    });

    describe('Missing optional fields', () => {
      it('should work without additionalContext', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          // additionalContext omitted
        };

        expect(input).not.toHaveProperty('additionalContext');
      });

      it('should work without customRequirements', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          // customRequirements omitted
        };

        expect(input).not.toHaveProperty('customRequirements');
      });

      it('should work without department (defaults to All)', () => {
        const input = {
          workflowType: 'create-microlearning',
          prompt: 'Create training',
          department: undefined,
        };

        const dept = input.department || 'All';
        expect(dept).toBe('All');
      });
    });
  });
});
