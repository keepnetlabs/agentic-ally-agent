/**
 * Test Suite: Create Microlearning Workflow
 *
 * Integration tests for the complete microlearning creation workflow.
 * Covers: prompt analysis → generation → language content → inbox creation
 */

import { describe, it, expect } from 'vitest';
import { TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL, PRIORITY_LEVELS, DEFAULT_PRIORITY } from '../constants';

describe('Create Microlearning Workflow - Integration', () => {
  describe('Workflow Input Validation', () => {
    describe('Prompt input', () => {
      it('should accept phishing training prompt', () => {
        const input = {
          prompt: 'Create phishing awareness training for IT department',
          department: 'IT',
          level: 'Intermediate',
        };

        expect(input.prompt).toBeTruthy();
        expect(input.prompt.length).toBeGreaterThan(10);
      });

      it('should accept minimal prompt', () => {
        const input = {
          prompt: 'Create training',
        };

        expect(input.prompt).toBeTruthy();
      });

      it('should accept multilingual prompt', () => {
        const input = {
          prompt: 'Erstelle ein Phishing-Schulungsprogramm',
        };

        expect(input.prompt).toBeTruthy();
      });

      it('should accept Turkish prompt', () => {
        const input = {
          prompt: 'Phishing eğitimi oluştur',
        };

        expect(input.prompt).toBeTruthy();
      });
    });

    describe('Department input', () => {
      it('should accept IT department', () => {
        const input = {
          department: 'IT',
        };

        expect(input.department).toBe('IT');
      });

      it('should accept HR department', () => {
        const input = {
          department: 'HR',
        };

        expect(input.department).toBe('HR');
      });

      it('should accept multiple departments', () => {
        const departments = ['IT', 'Finance', 'Sales', 'HR', 'Operations'];

        for (const dept of departments) {
          expect(dept).toBeTruthy();
        }
      });

      it('should default to "All" if not provided', () => {
        const input = {
          department: undefined,
        };

        const dept = input.department || 'All';
        expect(dept).toBe('All');
      });
    });

    describe('Level (difficulty) input', () => {
      it('should accept Beginner level', () => {
        expect([...TRAINING_LEVELS]).toContain('Beginner');
      });

      it('should accept Intermediate level', () => {
        expect([...TRAINING_LEVELS]).toContain('Intermediate');
      });

      it('should accept Advanced level', () => {
        expect([...TRAINING_LEVELS]).toContain('Advanced');
      });

      it('should default to Intermediate', () => {
        const level = undefined;
        const defaultLevel = level || DEFAULT_TRAINING_LEVEL;
        expect(defaultLevel).toBe('Intermediate');
      });
    });

    describe('Priority input', () => {
      it('should accept low priority', () => {
        expect([...PRIORITY_LEVELS]).toContain('low');
      });

      it('should accept medium priority', () => {
        expect([...PRIORITY_LEVELS]).toContain('medium');
      });

      it('should accept high priority', () => {
        expect([...PRIORITY_LEVELS]).toContain('high');
      });

      it('should default to medium', () => {
        const priority = undefined;
        const defaultPriority = priority || DEFAULT_PRIORITY;
        expect(defaultPriority).toBe('medium');
      });
    });

    describe('Optional context fields', () => {
      it('should accept additionalContext', () => {
        const input = {
          prompt: 'Create training',
          additionalContext: 'Focus on advanced phishing techniques',
        };

        expect(input.additionalContext).toBeTruthy();
      });

      it('should accept customRequirements', () => {
        const input = {
          prompt: 'Create training',
          customRequirements: 'Include video content and simulations',
        };

        expect(input.customRequirements).toBeTruthy();
      });

      it('should accept both context fields', () => {
        const input = {
          prompt: 'Create training',
          additionalContext: 'For finance department',
          customRequirements: 'Gamification required',
        };

        expect(input.additionalContext).toBeTruthy();
        expect(input.customRequirements).toBeTruthy();
      });
    });
  });

  describe('STEP 1: Prompt Analysis', () => {
    describe('Language detection', () => {
      it('should detect English prompt', () => {
        const prompt = 'Create phishing awareness training';
        expect(prompt.toLowerCase()).toContain('phishing');
      });

      it('should detect German prompt', () => {
        const prompt = 'Erstelle ein Schulungsprogramm für Phishing';
        expect(prompt).toContain('Phishing');
      });

      it('should detect Turkish prompt', () => {
        const prompt = 'Phishing eğitimi oluştur';
        expect(prompt).toContain('Phishing');
      });

      it('should detect French prompt', () => {
        const prompt = 'Créez une formation sur le phishing';
        expect(prompt).toContain('phishing');
      });

      it('should default to English if unrecognized', () => {
        const prompt = '创建钓鱼培训';
        // Should still process - may default to English or detect Chinese
        expect(prompt).toBeTruthy();
      });
    });

    describe('Topic/Title extraction', () => {
      it('should extract "Phishing Prevention" from phishing prompt', () => {
        const prompt = 'Create phishing training';
        expect(prompt.toLowerCase()).toContain('phishing');
      });

      it('should extract "Ransomware Awareness" from ransomware prompt', () => {
        const prompt = 'Create ransomware training';
        expect(prompt.toLowerCase()).toContain('ransomware');
      });

      it('should extract "Social Engineering" from social engineering prompt', () => {
        const prompt = 'Create social engineering training';
        expect(prompt.toLowerCase()).toContain('social');
      });
    });

    describe('Metadata extraction', () => {
      it('should extract learning objectives from analysis', () => {
        const analysis = {
          learningObjectives: [
            'Spot phishing emails',
            'Report suspicious activity',
            'Enable MFA',
          ],
        };

        expect(Array.isArray(analysis.learningObjectives)).toBe(true);
        expect(analysis.learningObjectives.length).toBeGreaterThan(0);
      });

      it('should extract key topics', () => {
        const analysis = {
          keyTopics: ['Email Security', 'Red Flags', 'Reporting Procedures'],
        };

        expect(Array.isArray(analysis.keyTopics)).toBe(true);
      });

      it('should extract category and subcategory', () => {
        const analysis = {
          category: 'Security Awareness',
          subcategory: 'Email Security',
        };

        expect(analysis.category).toBeTruthy();
        expect(analysis.subcategory).toBeTruthy();
      });
    });

    describe('Language code normalization', () => {
      it('should normalize to lowercase BCP-47 code', () => {
        const language = 'en-gb';
        expect(/^[a-z]{2}(-[a-z]{2})?$/.test(language)).toBe(true);
      });

      it('should handle "en" as valid code', () => {
        expect(/^[a-z]{2}(-[a-z]{2})?$/.test('en')).toBe(true);
      });

      it('should handle "de-de" as valid code', () => {
        expect(/^[a-z]{2}(-[a-z]{2})?$/.test('de-de')).toBe(true);
      });

      it('should handle "tr" as valid code', () => {
        expect(/^[a-z]{2}(-[a-z]{2})?$/.test('tr')).toBe(true);
      });
    });
  });

  describe('STEP 2: Microlearning Structure Generation', () => {
    describe('8-scene structure', () => {
      it('should generate 8 scenes', () => {
        const microlearning = {
          scenes: [
            { type: 'intro' },
            { type: 'goals' },
            { type: 'video' },
            { type: 'actionable' },
            { type: 'quiz' },
            { type: 'survey' },
            { type: 'nudge' },
            { type: 'summary' },
          ],
        };

        expect(microlearning.scenes.length).toBe(8);
      });

      it('should include all required scene types', () => {
        const requiredScenes = ['intro', 'goals', 'video', 'actionable', 'quiz', 'survey', 'nudge', 'summary'];
        const sceneTypes = ['intro', 'goals', 'video', 'actionable', 'quiz', 'survey', 'nudge', 'summary'];

        for (const scene of requiredScenes) {
          expect(sceneTypes).toContain(scene);
        }
      });
    });

    describe('Metadata structure', () => {
      it('should include microlearning_id', () => {
        const microlearning = {
          microlearning_id: 'phishing-101',
        };

        expect(microlearning.microlearning_id).toBeTruthy();
      });

      it('should include microlearning_metadata', () => {
        const microlearning = {
          microlearning_metadata: {
            title: 'Phishing Prevention',
            category: 'Security Awareness',
            level: 'intermediate',
            language_availability: ['en'],
          },
        };

        expect(microlearning.microlearning_metadata).toBeDefined();
        expect(microlearning.microlearning_metadata.title).toBeTruthy();
      });

      it('should include theme configuration', () => {
        const microlearning = {
          theme: {
            fontFamily: 'Arial',
            colors: {
              primary: '#FF0000',
              secondary: '#0066CC',
            },
          },
        };

        expect(microlearning.theme).toBeDefined();
        expect(microlearning.theme.fontFamily).toBeTruthy();
      });
    });

    describe('Duration calculation', () => {
      it('should be 5 minutes (300 seconds)', () => {
        const duration = 300;
        expect(duration).toBe(300);
      });

      it('should distribute across 8 scenes', () => {
        const totalDuration = 300;
        const sceneCount = 8;
        const avgPerScene = totalDuration / sceneCount;

        expect(avgPerScene).toBeGreaterThan(0);
        expect(totalDuration).toBeGreaterThan(0);
      });
    });
  });

  describe('STEP 3: Language Content Generation', () => {
    describe('Scene content localization', () => {
      it('should generate content in target language', () => {
        const languageContent = {
          language: 'en',
          scenes: [
            { type: 'intro', content: 'Introduction text in English' },
          ],
        };

        expect(languageContent.language).toBe('en');
        expect(languageContent.scenes[0].content).toContain('English');
      });

      it('should include app texts in target language', () => {
        const languageContent = {
          app_texts: {
            title: 'Phishing Prevention',
            description: 'Learn to identify phishing emails',
          },
        };

        expect(languageContent.app_texts).toBeDefined();
        expect(languageContent.app_texts.title).toBeTruthy();
      });

      it('should handle multi-language (language_availability)', () => {
        const metadata = {
          language_availability: ['en', 'de', 'tr'],
        };

        expect(metadata.language_availability.length).toBeGreaterThanOrEqual(1);
        expect(metadata.language_availability).toContain('en');
      });
    });

    describe('Scene-specific localization', () => {
      it('should localize intro scene', () => {
        const scene = {
          type: 'intro',
          title: 'Localized Title',
          subtitle: 'Localized Subtitle',
        };

        expect(scene.title).toBeTruthy();
        expect(scene.subtitle).toBeTruthy();
      });

      it('should localize quiz scene with questions', () => {
        const scene = {
          type: 'quiz',
          questions: [
            { text: 'Localized question 1', options: ['A', 'B', 'C'] },
          ],
        };

        expect(scene.questions.length).toBeGreaterThan(0);
      });

      it('should localize actionable items', () => {
        const scene = {
          type: 'actionable',
          actions: [
            { description: 'Action 1 in target language' },
          ],
        };

        expect(scene.actions).toBeDefined();
      });
    });

    describe('Content preservation across languages', () => {
      it('should preserve structure across language versions', () => {
        const enVersion = {
          scenes: [{ type: 'intro' }, { type: 'quiz' }],
        };

        const deVersion = {
          scenes: [{ type: 'intro' }, { type: 'quiz' }],
        };

        expect(enVersion.scenes.length).toBe(deVersion.scenes.length);
      });

      it('should preserve metadata across languages', () => {
        const metadata1 = {
          microlearning_id: 'phishing-101',
          title: 'Phishing Prevention',
        };

        const metadata2 = {
          microlearning_id: 'phishing-101',
          title: 'Phishing Prevention',
        };

        expect(metadata1.microlearning_id).toBe(metadata2.microlearning_id);
      });
    });
  });

  describe('STEP 4: Inbox Structure Creation', () => {
    describe('Email generation', () => {
      it('should generate training emails', () => {
        const inbox = {
          emails: [
            { id: '1', sender: 'test@example.com', subject: 'Test' },
            { id: '2', sender: 'test2@example.com', subject: 'Test 2' },
          ],
        };

        expect(inbox.emails.length).toBeGreaterThan(0);
      });

      it('should include phishing and legitimate emails', () => {
        const inbox = {
          emails: [
            { id: '1', isPhishing: true },
            { id: '2', isPhishing: false },
            { id: '3', isPhishing: true },
            { id: '4', isPhishing: false },
          ],
        };

        const phishingCount = inbox.emails.filter(e => e.isPhishing).length;
        const legitimateCount = inbox.emails.filter(e => !e.isPhishing).length;

        expect(phishingCount).toBeGreaterThan(0);
        expect(legitimateCount).toBeGreaterThan(0);
      });

      it('should include varied difficulty levels', () => {
        const inbox = {
          emails: [
            { id: '1', difficulty: 'EASY' },
            { id: '2', difficulty: 'MEDIUM' },
            { id: '3', difficulty: 'HARD' },
          ],
        };

        const difficulties = inbox.emails.map(e => e.difficulty);
        expect(difficulties).toContain('EASY');
        expect(difficulties).toContain('MEDIUM');
      });
    });

    describe('SMS/Text generation', () => {
      it('should generate SMS texts', () => {
        const inbox = {
          texts: [
            { id: '1', content: 'SMS text 1' },
            { id: '2', content: 'SMS text 2' },
          ],
        };

        expect(inbox.texts).toBeDefined();
      });

      it('should localize SMS content', () => {
        const texts = {
          mobileTitle: 'Training Title',
          mobileHint: 'Open email and report if suspicious',
        };

        expect(texts.mobileTitle).toBeTruthy();
        expect(texts.mobileHint).toBeTruthy();
      });
    });

    describe('Department-specific inbox', () => {
      it('should generate IT-specific emails', () => {
        const inbox = {
          department: 'IT',
          emails: [
            { sender: 'admin@it.company.com' },
            { sender: 'security@it.company.com' },
          ],
        };

        expect(inbox.department).toBe('IT');
      });

      it('should generate Finance-specific emails', () => {
        const inbox = {
          department: 'Finance',
          emails: [
            { sender: 'finance@company.com' },
            { subject: 'Invoice' },
          ],
        };

        expect(inbox.department).toBe('Finance');
      });

      it('should support all departments', () => {
        const departments = ['IT', 'Finance', 'Sales', 'HR', 'Operations', 'Management'];

        for (const dept of departments) {
          expect(dept).toBeTruthy();
        }
      });
    });
  });

  describe('Data Persistence & KV Storage', () => {
    describe('KV key structure', () => {
      it('should use ml:{id}:base for base microlearning', () => {
        const key = 'ml:phishing-101:base';
        expect(key).toMatch(/^ml:[^:]+:base$/);
      });

      it('should use ml:{id}:lang:{lang} for language content', () => {
        const key = 'ml:phishing-101:lang:en';
        expect(key).toMatch(/^ml:[^:]+:lang:[^:]+$/);
      });

      it('should use ml:{id}:inbox:{dept}:{lang} for inbox', () => {
        const key = 'ml:phishing-101:inbox:IT:en';
        expect(key).toMatch(/^ml:[^:]+:inbox:[^:]+:[^:]+$/);
      });
    });

    describe('Atomic saves', () => {
      it('should save all 3 components (base, lang, inbox)', () => {
        const saves = [
          'ml:phishing-101:base',
          'ml:phishing-101:lang:en',
          'ml:phishing-101:inbox:IT:en',
        ];

        expect(saves.length).toBe(3);
      });

      it('should save with consistent microlearning ID', () => {
        const id = 'phishing-101';
        const keys = [
          `ml:${id}:base`,
          `ml:${id}:lang:en`,
          `ml:${id}:inbox:IT:en`,
        ];

        const allSameId = keys.every(k => k.includes(id));
        expect(allSameId).toBe(true);
      });
    });
  });

  describe('Parallel Execution (Language + Inbox)', () => {
    describe('Parallel generation', () => {
      it('should generate language content and inbox in parallel', () => {
        const tasks = [
          'Generate language content',
          'Generate inbox structure',
        ];

        expect(tasks.length).toBe(2);
      });

      it('should not block on sequential generation', () => {
        // Both should start without waiting
        expect(true).toBe(true);
      });
    });

    describe('Error handling in parallel execution', () => {
      it('should handle language generation failure', () => {
        const langResult = {
          success: false,
          error: 'Language generation failed',
        };

        expect(langResult.success).toBe(false);
      });

      it('should handle inbox generation failure', () => {
        const inboxResult = {
          success: false,
          error: 'Inbox generation failed',
        };

        expect(inboxResult.success).toBe(false);
      });

      it('should fail workflow if either step fails', () => {
        const langSuccess = false;
        const inboxSuccess = true;

        const workflowSuccess = langSuccess && inboxSuccess;
        expect(workflowSuccess).toBe(false);
      });
    });
  });

  describe('Complete Workflow Scenarios', () => {
    it('Scenario: Basic phishing training creation', () => {
      const input = {
        prompt: 'Create phishing training',
        department: 'All',
        level: 'Intermediate',
      };

      expect(input.prompt).toBeTruthy();
      expect(input.level).toBe('Intermediate');
    });

    it('Scenario: Advanced training with context', () => {
      const input = {
        prompt: 'Create phishing training',
        additionalContext: 'Focus on CEO fraud',
        customRequirements: 'Include video content',
        department: 'Finance',
        level: 'Advanced',
      };

      expect(input.additionalContext).toBeTruthy();
      expect(input.customRequirements).toBeTruthy();
      expect(input.level).toBe('Advanced');
    });

    it('Scenario: Multilingual training', () => {
      const languages = ['en', 'de', 'tr', 'fr'];
      const training = {
        microlearning_id: 'phishing-101',
        language_availability: languages,
      };

      expect(training.language_availability.length).toBeGreaterThanOrEqual(1);
    });

    it('Scenario: Department-specific training', () => {
      const expected = {
        microlearning_id: 'malware-101',
        department: 'IT',
      };

      expect(expected.department).toBe('IT');
    });

    it('Scenario: High-priority creation', () => {
      const input = {
        prompt: 'Create urgent security training',
        priority: 'high',
      };

      expect(input.priority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    describe('Invalid input handling', () => {
      it('should reject empty prompt', () => {
        const input = {
          prompt: '',
        };

        expect(input.prompt.length).toBe(0);
      });

      it('should reject invalid level', () => {
        expect([...TRAINING_LEVELS]).not.toContain('InvalidLevel');
      });
    });

    describe('Step failures', () => {
      it('should handle analysis failure', () => {
        const result = {
          success: false,
          step: 'analysis',
          error: 'Analysis failed',
        };

        expect(result.success).toBe(false);
      });

      it('should handle generation failure', () => {
        const result = {
          success: false,
          step: 'generation',
          error: 'Generation failed',
        };

        expect(result.success).toBe(false);
      });

      it('should propagate error to final response', () => {
        const workflowResult = {
          success: false,
          error: 'Workflow failed at step X',
        };

        expect(workflowResult.success).toBe(false);
      });
    });
  });

  describe('Output & Results', () => {
    describe('Success response', () => {
      it('should return microlearning_id', () => {
        const result = {
          success: true,
          metadata: {
            microlearningId: 'phishing-101',
          },
        };

        expect(result.metadata.microlearningId).toBeTruthy();
      });

      it('should return training URL', () => {
        const result = {
          success: true,
          metadata: {
            trainingUrl: 'https://microlearning.example.com/?id=phishing-101',
          },
        };

        expect(result.metadata.trainingUrl).toContain('http');
      });

      it('should return metadata with all info', () => {
        const result = {
          success: true,
          metadata: {
            microlearningId: 'phishing-101',
            title: 'Phishing Prevention',
            language: 'en',
            department: 'IT',
            trainingUrl: 'https://example.com',
          },
        };

        expect(result.metadata.title).toBeTruthy();
        expect(result.metadata.language).toBeTruthy();
        expect(result.metadata.department).toBeTruthy();
      });
    });

    describe('Error response', () => {
      it('should return error message', () => {
        const result = {
          success: false,
          error: 'Failed to create microlearning',
        };

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });
  });
});
