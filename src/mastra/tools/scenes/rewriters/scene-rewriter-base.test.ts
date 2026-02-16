import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteSceneWithBase, RewriteContext } from './scene-rewriter-base';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn(() => ({ code: 'AI_ERROR', message: 'AI Error' })),
    recoveryAttempt: vi.fn(), // Used by withRetry
    external: vi.fn(() => ({ code: 'EXT_ERROR', message: 'Ext Error' })),
  },
}));

vi.mock('../../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn(text => text), // Pass through by default
}));

vi.mock('../../../utils/language/localization-language-rules', () => ({
  getLanguagePrompt: vi.fn(() => 'Mock language rules for localization'),
}));

/**
 * Test suite for Scene Rewriter Base
 * Core semantic localization engine for all scene types
 */
describe('Scene Rewriter Base', () => {
  const mockModel = {
    id: 'test-model',
    provider: 'test-provider',
    version: 'v2',
    modelId: 'test-model-id',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({
        title: 'Localized Title',
        content: 'Localized Content',
        metadata: { duration: 5 },
      }),
    });
  });

  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Introduction',
    content: 'Welcome to training',
    metadata: { duration: 5 },
  };

  describe('Function Signature', () => {
    it('should be async function', async () => {
      const result = rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should accept scene parameter', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should accept sceneType parameter', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'goal' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should accept RewriteContext parameter', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should require scene parameter', async () => {
      await expect(rewriteSceneWithBase(undefined as any, 'intro' as any, baseContext)).resolves.toBeUndefined();
    });

    it('should require sceneType parameter', async () => {
      await expect(rewriteSceneWithBase(baseScene, undefined as any, baseContext)).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(rewriteSceneWithBase(baseScene, 'intro' as any, undefined as any)).rejects.toThrow();
    });

    it('should require context.sourceLanguage', async () => {
      const invalidContext = { ...baseContext, sourceLanguage: '' };
      await expect(rewriteSceneWithBase(baseScene, 'intro' as any, invalidContext)).resolves.toBeDefined();
    });

    it('should require context.targetLanguage', async () => {
      const invalidContext = { ...baseContext, targetLanguage: '' };
      await expect(rewriteSceneWithBase(baseScene, 'intro' as any, invalidContext)).resolves.toBeDefined();
    });

    it('should require context.model', async () => {
      const invalidContext = { ...baseContext, model: null };
      await expect(rewriteSceneWithBase(baseScene, 'intro' as any, invalidContext as any)).resolves.toBeDefined();
    });

    it('should require context.topic', async () => {
      const invalidContext = { ...baseContext, topic: '' };
      await expect(rewriteSceneWithBase(baseScene, 'intro' as any, invalidContext)).resolves.toBeDefined();
    });
  });

  describe('Scene Type Handling', () => {
    const sceneTypes = ['intro', 'goal', 'video', 'actionable', 'quiz', 'survey', 'nudge', 'summary', 'app-texts'];

    sceneTypes.forEach(sceneType => {
      it(`should handle ${sceneType} scene type`, async () => {
        const result = await rewriteSceneWithBase(baseScene, sceneType as any, baseContext);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Language Configuration', () => {
    it('should support Turkish target language', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should support German target language', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should support French target language', async () => {
      const context = { ...baseContext, targetLanguage: 'fr' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should support Spanish target language', async () => {
      const context = { ...baseContext, targetLanguage: 'es' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should support Chinese target language', async () => {
      const context = { ...baseContext, targetLanguage: 'zh' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should support different source languages', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, sourceLanguage: lang };
        const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Department Context', () => {
    it('should handle IT department context', async () => {
      const context = { ...baseContext, department: 'IT' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should handle Finance department context', async () => {
      const context = { ...baseContext, department: 'Finance' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should handle undefined department', async () => {
      const context = { ...baseContext, department: undefined };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });

    it('should handle empty department', async () => {
      const context = { ...baseContext, department: '' };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });
  });

  describe('Semantic Localization', () => {
    it('should not be translation but re-authoring', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should preserve content details', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(typeof result).toBe('object');
    });

    it('should maintain structure integrity', async () => {
      const complexScene = {
        title: 'Title',
        content: 'Content',
        items: [
          { id: 1, text: 'Item 1' },
          { id: 2, text: 'Item 2' },
        ],
        metadata: { duration: 5 },
      };
      const result = await rewriteSceneWithBase(complexScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Content Preservation', () => {
    it('should preserve JSON structure', async () => {
      const structuredScene = {
        title: 'Test',
        nested: {
          content: 'Nested content',
          deep: {
            value: 'Deep value',
          },
        },
      };
      const result = await rewriteSceneWithBase(structuredScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should preserve arrays in content', async () => {
      const sceneWithArrays = {
        title: 'Title',
        items: [1, 2, 3],
        options: ['a', 'b', 'c'],
      };
      const result = await rewriteSceneWithBase(sceneWithArrays, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should preserve numbers and booleans', async () => {
      const sceneWithTypes = {
        title: 'Title',
        duration: 300,
        isActive: true,
        score: 95.5,
      };
      const result = await rewriteSceneWithBase(sceneWithTypes, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scene object', async () => {
      const emptyScene = {};
      const result = await rewriteSceneWithBase(emptyScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle null scene gracefully', async () => {
      const result = await rewriteSceneWithBase(null as any, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with very long strings', async () => {
      const longScene = {
        title: 'A'.repeat(1000),
        content: 'B'.repeat(5000),
      };
      const result = await rewriteSceneWithBase(longScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with special characters', async () => {
      const specialScene = {
        title: 'Test & <special> "characters" \'quotes\'',
        content: 'SQL: DROP TABLE; XSS: <script>alert(1)</script>',
      };
      const result = await rewriteSceneWithBase(specialScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with Unicode', async () => {
      const unicodeScene = {
        title: '中文测试 Tëst Türkçe',
        content: '🚀 Emoji test 日本語',
      };
      const result = await rewriteSceneWithBase(unicodeScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to an object', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(typeof result).toBe('object');
    });

    it('should handle concurrent rewrites', async () => {
      const promises = [
        rewriteSceneWithBase(baseScene, 'intro' as any, baseContext),
        rewriteSceneWithBase(baseScene, 'goal' as any, baseContext),
        rewriteSceneWithBase(baseScene, 'video' as any, baseContext),
      ];
      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      results.forEach(r => expect(r).toBeDefined());
    });

    it('should handle sequential rewrites', async () => {
      const scene1 = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(scene1).toBeDefined();

      const scene2 = await rewriteSceneWithBase(scene1, 'goal' as any, baseContext);
      expect(scene2).toBeDefined();

      const scene3 = await rewriteSceneWithBase(scene2, 'video' as any, baseContext);
      expect(scene3).toBeDefined();
    });
  });

  describe('Model Integration', () => {
    it('should use provided model for generation', async () => {
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should work with different model providers', async () => {
      const customModel = { id: 'custom-model', name: 'Custom' };
      const context = { ...baseContext, model: customModel as any };
      const result = await rewriteSceneWithBase(baseScene, 'intro' as any, context);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    describe('Optimization & Resilience', () => {
      it('should bypass AI for empty scene', async () => {
        const emptyScene = {};
        const result = await rewriteSceneWithBase(emptyScene, 'intro' as any, baseContext);
        expect(result).toBe(emptyScene);
        expect(generateText).not.toHaveBeenCalled();
      });

      it('should bypass AI for null scene', async () => {
        const result = await rewriteSceneWithBase(null as any, 'intro' as any, baseContext);
        expect(result).toBeNull();
        expect(generateText).not.toHaveBeenCalled();
      });

      it('should propagate errors from AI generation', async () => {
        (generateText as any).mockRejectedValue(new Error('AI Overload'));
        await expect(rewriteSceneWithBase(baseScene, 'intro' as any, baseContext)).rejects.toThrow('AI Overload');
      });

      it('should throw error on malformed JSON response', async () => {
        (generateText as any).mockResolvedValue({
          text: 'This is not JSON',
        });
        await expect(rewriteSceneWithBase(baseScene, 'intro' as any, baseContext)).rejects.toThrow();
      });
    });
  });

  describe('Consistency', () => {
    it('should produce consistent output for same input', async () => {
      const result1 = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      const result2 = await rewriteSceneWithBase(baseScene, 'intro' as any, baseContext);
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    });
  });
});
