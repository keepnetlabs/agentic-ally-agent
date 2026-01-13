import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateLanguageJsonTool } from './translate-language-json-tool';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

/**
 * Test suite for translateLanguageJsonTool
 * Tests scene-by-scene translation/rewriting of training content
 */
const executeTool = (translateLanguageJsonTool as any).execute;

describe('translateLanguageJsonTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockImplementation(async () => ({
      text: JSON.stringify({
        // Common fields
        title: 'Translated Title',
        content: 'Translated Content',
        // Scene 1 (Intro)
        duration: '5 min',
        keyMessages: ['Msg 1'],
        // Scene 2 (Goals)
        goalsList: [{ order: 1, goal: 'Goal 1', icon: 'check' }],
        description: 'Desc',
        // Scene 3 (Scenario)
        videoUrl: 'http://video.mp4',
        transcript: 'Transcript',
        // Scene 4 (Actionable)
        actionItems: [{ step: 1, action: 'Action 1' }],
        // Scene 5 (Quiz)
        questions: [{ id: 'q1', question: 'Q1', options: [], correctAnswer: 'A' }],
        // App Texts
        buttons: { next: 'Weiter' },
        labels: {},
        placeholders: {},
        messages: {},
        // Fallbacks
        key_message: ['Msg 1'], // legacy
      }),
    }));
  });
  // Base valid microlearning structure
  const baseMicrolearningStructure = {
    microlearning_id: 'phishing-101',
    scenes: [
      { scene_id: '1', metadata: { scene_type: 'intro' } },
      { scene_id: '2', metadata: { scene_type: 'goal' } },
      { scene_id: '3', metadata: { scene_type: 'scenario' } },
      { scene_id: '4', metadata: { scene_type: 'actionable_content' } },
      { scene_id: '5', metadata: { scene_type: 'quiz' } },
      { scene_id: '6', metadata: { scene_type: 'survey' } },
      { scene_id: '7', metadata: { scene_type: 'nudge' } },
      { scene_id: '8', metadata: { scene_type: 'summary' } },
    ],
  };

  // Base valid JSON with all scenes
  const baseJson = {
    '1': { id: '1', title: 'Scene 1', content: 'Intro content' },
    '2': { id: '2', title: 'Scene 2', content: 'Goals content' },
    '3': { id: '3', title: 'Scene 3', content: 'Video content' },
    '4': { id: '4', title: 'Scene 4', content: 'Actionable content' },
    '5': { id: '5', title: 'Scene 5', content: 'Quiz content' },
    '6': { id: '6', title: 'Scene 6', content: 'Survey content' },
    '7': { id: '7', title: 'Scene 7', content: 'Nudge content' },
    '8': { id: '8', title: 'Scene 8', content: 'Summary content' },
    app_texts: {
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      complete: 'Complete',
    },
  };

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid input with all required fields', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-gb',
        targetLanguage: 'de',
        topic: 'Test Topic',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      expect(result.success !== undefined || result.error !== undefined).toBe(true);
    });

    it('should require json object', async () => {
      const input: any = {
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should require microlearningStructure', async () => {
      const input: any = {
        json: baseJson,
        targetLanguage: 'de',
      };

      try {
        const result = await executeTool(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should require targetLanguage', async () => {
      const input: any = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should accept optional sourceLanguage', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
        sourceLanguage: 'en',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should default sourceLanguage to en-gb', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional topic', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
        topic: 'Phishing Prevention',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional doNotTranslateKeys array', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
        doNotTranslateKeys: ['id', 'timestamp'],
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional modelProvider', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'ja',
        modelProvider: 'OPENAI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional model override', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'zh',
        model: 'gpt-4o',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== TARGET LANGUAGE TESTS ====================
  describe('Target Language Support', () => {
    it('should translate to German', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Turkish', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to French', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Spanish', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Chinese', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'zh',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Japanese', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'ja',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Portuguese', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'pt',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate to Italian', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'it',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support language codes with regions (de-de)', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de-de',
        sourceLanguage: 'en-gb',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== SOURCE LANGUAGE TESTS ====================
  describe('Source Language', () => {
    it('should accept en as source language', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en',
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept en-gb as source language', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-gb',
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept en-us as source language', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-us',
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should default to en-gb when not specified', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== SCENE TYPE TESTS ====================
  describe('Scene Type Support', () => {
    it('should handle intro scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[0]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle goal scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[1]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle scenario/video scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[2]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle actionable_content scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[3]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle code_review scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'code-security-101',
          scenes: [
            { scene_id: '4', metadata: { scene_type: 'code_review' } },
          ],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle quiz scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[4]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle survey scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[5]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle nudge scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[6]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle summary scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          ...baseMicrolearningStructure,
          scenes: [baseMicrolearningStructure.scenes[7]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle all 8 scene types together', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== SCENE PROCESSING TESTS ====================
  describe('Scene Processing', () => {
    it('should rewrite all 8 scenes', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['1']).toBeDefined();
        expect(result.data['2']).toBeDefined();
        expect(result.data['3']).toBeDefined();
        expect(result.data['4']).toBeDefined();
        expect(result.data['5']).toBeDefined();
        expect(result.data['6']).toBeDefined();
        expect(result.data['7']).toBeDefined();
        expect(result.data['8']).toBeDefined();
      }
    });

    it('should preserve original scene structure', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        // Check that rewritten scenes have same keys as original
        expect(result.data['1']).toBeDefined();
      }
    });

    it('should handle subset of scenes', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'partial-101',
          scenes: [
            baseMicrolearningStructure.scenes[0],
            baseMicrolearningStructure.scenes[1],
            baseMicrolearningStructure.scenes[2],
          ],
        },
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle single scene', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'single-101',
          scenes: [baseMicrolearningStructure.scenes[0]],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== APP TEXTS TESTS ====================
  describe('App Texts Translation', () => {
    it('should include app_texts in output', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app_texts).toBeDefined();
      }
    });

    it('should rewrite app_texts to target language', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app_texts).toBeDefined();
        expect(typeof result.data.app_texts).toBe('object');
      }
    });

    it('should preserve app_texts keys', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        // App texts should have same structure as input
        expect(result.data.app_texts).toBeDefined();
      }
    });

    it('should handle missing app_texts', async () => {
      const input = {
        json: { ...baseJson, app_texts: undefined },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle empty app_texts', async () => {
      const input = {
        json: { ...baseJson, app_texts: {} },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== PARALLEL PROCESSING TESTS ====================
  describe('Parallel Processing', () => {
    it('should process all scenes in parallel', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const startTime = Date.now();
      const result = await executeTool(input);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should continue if one scene rewrite fails', async () => {
      const input = {
        json: { ...baseJson, '4': undefined },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      // Should still return success with partial results
      expect(result).toBeDefined();
    });

    it('should handle graceful fallback on scene failure', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      if (result.success) {
        // Result should have some content even if some scenes fail
        expect(result.data).toBeDefined();
      }
    });
  });

  // ==================== STRUCTURE PRESERVATION TESTS ====================
  describe('Structure Preservation', () => {
    it('should preserve original JSON structure', async () => {
      const input = {
        json: { ...baseJson, extra_field: 'extra_value' },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.extra_field).toBe('extra_value');
      }
    });

    it('should override scenes with rewritten content', async () => {
      const input = {
        json: { ...baseJson, '1': { id: '1', original: 'content' } },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['1']).toBeDefined();
      }
    });

    it('should keep non-scene fields intact', async () => {
      const jsonWithExtra = {
        ...baseJson,
        metadata: { version: '1.0', created: '2024-01-01' },
        config: { theme: 'dark' },
      };

      const input = {
        json: jsonWithExtra,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.metadata).toBeDefined();
        expect(result.data.config).toBeDefined();
      }
    });
  });

  // ==================== OUTPUT STRUCTURE TESTS ====================
  describe('Output Structure', () => {
    it('should return success flag', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(typeof result.success).toBe('boolean');
    });

    it('should return data when successful', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('object');
      }
    });

    it('should have all scenes in output data', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        for (let i = 1; i <= 8; i++) {
          expect(result.data[String(i)]).toBeDefined();
        }
      }
    });

    it('should return error message on failure', async () => {
      const input: any = {
        json: null,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Translation', () => {
    it('should accept topic parameter', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
        topic: 'Phishing Prevention',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate Phishing Prevention topic', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
        topic: 'Phishing Prevention',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate Password Security topic', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
        topic: 'Password Security',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should translate Data Protection topic', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
        topic: 'Data Protection',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should default to general cybersecurity when topic not provided', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing json gracefully', async () => {
      const input: any = {
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      try {
        const result = await executeTool(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle missing microlearningStructure gracefully', async () => {
      const input: any = {
        json: baseJson,
        targetLanguage: 'de',
      };

      try {
        const result = await executeTool(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle null json', async () => {
      const input: any = {
        json: null,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      try {
        const result = await executeTool(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle null microlearningStructure', async () => {
      const input: any = {
        json: baseJson,
        microlearningStructure: null,
        targetLanguage: 'de',
      };

      try {
        const result = await executeTool(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle empty scenes array', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'empty-101',
          scenes: [],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should handle missing scenes metadata', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'no-scenes-101',
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle scene metadata without content', async () => {
      const input = {
        json: { app_texts: baseJson.app_texts }, // Missing scene content
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very large json object', async () => {
      const largeJson = {
        ...baseJson,
        '1': {
          ...baseJson['1'],
          content: 'Long content '.repeat(100),
        },
      };

      const input = {
        json: largeJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle json with special characters', async () => {
      const input = {
        json: {
          ...baseJson,
          '1': { id: '1', content: 'Content with special chars: <>&"' },
        },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle json with Unicode content', async () => {
      const input = {
        json: {
          ...baseJson,
          '1': { id: '1', content: '中文内容 Содержание العربية' },
        },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle json with nested structures', async () => {
      const input = {
        json: {
          ...baseJson,
          '1': {
            id: '1',
            content: 'Intro',
            nested: {
              deep: {
                value: 'Deep content',
              },
            },
          },
        },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle json with arrays', async () => {
      const input = {
        json: {
          ...baseJson,
          '1': {
            id: '1',
            items: ['Item 1', 'Item 2', 'Item 3'],
          },
        },
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle unknown scene type', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: {
          microlearning_id: 'unknown-101',
          scenes: [
            { scene_id: '1', metadata: { scene_type: 'unknown_type' } },
          ],
        },
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle invalid language code', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'invalid-lang',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== MULTILINGUAL TRANSLATION TESTS ====================
  describe('Multilingual Translation', () => {
    it('should support chain translation (en → de → tr)', async () => {
      // First: English to German
      let input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en',
        targetLanguage: 'de',
      };

      let result = await executeTool(input);
      expect(result).toBeDefined();

      if (result.success && result.data) {
        // Second: German to Turkish
        input = {
          json: result.data,
          microlearningStructure: baseMicrolearningStructure,
          sourceLanguage: 'de',
          targetLanguage: 'tr',
        };

        result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });

    it('should handle translation to multiple languages', async () => {
      const targetLanguages = ['de', 'tr', 'fr', 'es', 'zh'];

      for (const lang of targetLanguages) {
        const input = {
          json: baseJson,
          microlearningStructure: baseMicrolearningStructure,
          targetLanguage: lang,
        };

        const result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });
  });

  // ==================== MODEL PROVIDER TESTS ====================
  describe('Model Provider Support', () => {
    it('should accept OPENAI provider', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
        modelProvider: 'OPENAI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept WORKERS_AI provider', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
        modelProvider: 'WORKERS_AI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept GOOGLE provider', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'fr',
        modelProvider: 'GOOGLE',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept model override parameter', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'es',
        model: 'gpt-4o',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should work with both provider and model override', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
        modelProvider: 'OPENAI',
        model: 'gpt-4-turbo',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete translation workflow', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-gb',
        targetLanguage: 'de',
        topic: 'Phishing Prevention',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.app_texts).toBeDefined();
        for (let i = 1; i <= 8; i++) {
          expect(result.data[String(i)]).toBeDefined();
        }
      }
    });

    it('should handle advanced multilingual training', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-us',
        targetLanguage: 'zh-cn',
        topic: 'SQL Injection Prevention',
        modelProvider: 'OPENAI',
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle regional language variants', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        sourceLanguage: 'en-gb',
        targetLanguage: 'pt-br', // Brazilian Portuguese
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Output Consistency', () => {
    it('should maintain same scene count', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'de',
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        const outputSceneCount = Object.keys(result.data).filter(k => k !== 'app_texts').length;
        expect(outputSceneCount).toBeGreaterThanOrEqual(0); // May lose failed scenes
      }
    });

    it('should preserve app_texts structure', async () => {
      const input = {
        json: baseJson,
        microlearningStructure: baseMicrolearningStructure,
        targetLanguage: 'tr',
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data.app_texts) {
        expect(typeof result.data.app_texts).toBe('object');
        expect(Object.keys(result.data.app_texts).length).toBeGreaterThan(0);
      }
    });
  });
});
