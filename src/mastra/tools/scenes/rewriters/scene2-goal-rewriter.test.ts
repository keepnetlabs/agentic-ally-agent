import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene2Goal } from './scene2-goal-rewriter';
import { RewriteContext } from './scene-rewriter-base';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('./scene-rewriter-base', () => ({
  rewriteSceneWithBase: vi.fn(async (scene, type, context) => {
    // Added 'type' argument
    if (!context) throw new Error('Context required');
    if (!scene) return undefined;
    return {
      title: 'Translated Learning Goals',
      goalsList: [
        { order: 1, goal: 'Translated Goal 1', icon: 'check' },
        { order: 2, goal: 'Translated Goal 2', icon: 'search' },
        { order: 3, goal: 'Translated Goal 3', icon: 'flag' },
      ],
      description: 'Translated Description',
    };
  }),
}));

vi.mock('../../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn(() => ({ code: 'AI_ERROR', message: 'AI Error' })),
  },
}));

vi.mock('../../../utils/language/localization-language-rules', () => ({
  getLanguagePrompt: vi.fn(() => 'Mock language rules for localization'),
}));

/**
 * Test suite for Scene 2 (Goals) Rewriter
 * Tests semantic localization of goals scenes across languages
 */
describe('Scene 2 - Goals Rewriter', () => {
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
        title: 'Translated Learning Goals',
        goalsList: [
          { order: 1, goal: 'Translated Goal 1', icon: 'check' },
          { order: 2, goal: 'Translated Goal 2', icon: 'search' },
          { order: 3, goal: 'Translated Goal 3', icon: 'flag' },
        ],
        description: 'Translated Description',
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
    title: 'Your Learning Goals',
    goalsList: [
      { order: 1, goal: 'Identify phishing characteristics', icon: 'check' },
      { order: 2, goal: 'Evaluate sender legitimacy', icon: 'search' },
      { order: 3, goal: 'Report suspicious emails', icon: 'flag' },
    ],
    description: 'By the end of this module, you will be able to:',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(rewriteScene2Goal(undefined as any, baseContext)).resolves.toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(rewriteScene2Goal(baseScene as any, undefined as any)).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve goalsList array', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      expect(result).toHaveProperty('goalsList');
      expect(Array.isArray((result as any).goalsList)).toBe(true);
      expect((result as any).goalsList.length).toBe(baseScene.goalsList.length);
    });

    it('should preserve description field', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      expect(result).toHaveProperty('description');
    });

    it('should preserve goal order', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      (result as any).goalsList.forEach((goal: any, index: number) => {
        expect(goal.order).toBe(baseScene.goalsList[index].order);
      });
    });

    it('should preserve icon names in goals', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      const originalIcons = baseScene.goalsList.map(g => g.icon);
      const resultIcons = (result as any).goalsList.map((g: any) => g.icon);
      expect(resultIcons).toEqual(originalIcons);
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support French rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'fr' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support Chinese rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'zh' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });
  });

  describe('Department-Specific Context', () => {
    it('should handle IT department', async () => {
      const context = { ...baseContext, department: 'IT' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should handle Finance department', async () => {
      const context = { ...baseContext, department: 'Finance' };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should handle undefined department', async () => {
      const context = { ...baseContext, department: undefined };
      const result = await rewriteScene2Goal(baseScene as any, context);
      expect(result).toBeDefined();
    });
  });

  describe('Semantic Localization', () => {
    it('should preserve goal count', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      expect((result as any).goalsList.length).toBe(baseScene.goalsList.length);
    });

    it('should maintain goal structure', async () => {
      const result = await rewriteScene2Goal(baseScene as any, baseContext);
      (result as any).goalsList.forEach((goal: any) => {
        expect(goal).toHaveProperty('order');
        expect(goal).toHaveProperty('goal');
        expect(goal).toHaveProperty('icon');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle scene with single goal', async () => {
      const singleGoal = {
        ...baseScene,
        goalsList: [{ order: 1, goal: 'Identify phishing', icon: 'check' }],
      };
      const result = await rewriteScene2Goal(singleGoal as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with many goals', async () => {
      const manyGoals = {
        ...baseScene,
        goalsList: Array.from({ length: 10 }, (_, i) => ({
          order: i + 1,
          goal: `Goal ${i + 1}`,
          icon: 'check',
        })),
      };
      const result = await rewriteScene2Goal(manyGoals as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle goal with special characters', async () => {
      const specialScene = {
        ...baseScene,
        goalsList: [{ order: 1, goal: 'Identify phishing & spear-phishing (OWASP)', icon: 'check' }],
      };
      const result = await rewriteScene2Goal(specialScene as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene2Goal(baseScene as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene2Goal(baseScene as any, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene2Goal(baseScene as any, { ...baseContext, targetLanguage: 'de' }),
        rewriteScene2Goal(baseScene as any, { ...baseContext, targetLanguage: 'fr' }),
      ]);

      expect(results.length).toBe(3);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});
