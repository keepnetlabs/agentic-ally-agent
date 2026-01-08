import { describe, it, expect } from 'vitest';
import { rewriteScene2Goal } from './scene2-goal-rewriter';
import { RewriteContext } from './scene-rewriter-base';

/**
 * Test suite for Scene 2 (Goals) Rewriter
 * Tests semantic localization of goals scenes across languages
 */
describe('Scene 2 - Goals Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;

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
      const result = await rewriteScene2Goal(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene2Goal(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene2Goal(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve goalsList array', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      expect(result).toHaveProperty('goalsList');
      expect(Array.isArray(result.goalsList)).toBe(true);
      expect(result.goalsList.length).toBe(baseScene.goalsList.length);
    });

    it('should preserve description field', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      expect(result).toHaveProperty('description');
    });

    it('should preserve goal order', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      result.goalsList.forEach((goal: any, index: number) => {
        expect(goal.order).toBe(baseScene.goalsList[index].order);
      });
    });

    it('should preserve icon names in goals', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      const originalIcons = baseScene.goalsList.map(g => g.icon);
      const resultIcons = result.goalsList.map((g: any) => g.icon);
      expect(resultIcons).toEqual(originalIcons);
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support French rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'fr' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support Chinese rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'zh' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });
  });

  describe('Department-Specific Context', () => {
    it('should handle IT department', async () => {
      const context = { ...baseContext, department: 'IT' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should handle Finance department', async () => {
      const context = { ...baseContext, department: 'Finance' };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should handle undefined department', async () => {
      const context = { ...baseContext, department: undefined };
      const result = await rewriteScene2Goal(baseScene, context);
      expect(result).toBeDefined();
    });
  });

  describe('Semantic Localization', () => {
    it('should preserve goal count', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      expect(result.goalsList.length).toBe(baseScene.goalsList.length);
    });

    it('should maintain goal structure', async () => {
      const result = await rewriteScene2Goal(baseScene, baseContext);
      result.goalsList.forEach((goal: any) => {
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
      const result = await rewriteScene2Goal(singleGoal, baseContext);
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
      const result = await rewriteScene2Goal(manyGoals, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle goal with special characters', async () => {
      const specialScene = {
        ...baseScene,
        goalsList: [
          { order: 1, goal: 'Identify phishing & spear-phishing (OWASP)', icon: 'check' },
        ],
      };
      const result = await rewriteScene2Goal(specialScene, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene2Goal(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene2Goal(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene2Goal(baseScene, { ...baseContext, targetLanguage: 'de' }),
        rewriteScene2Goal(baseScene, { ...baseContext, targetLanguage: 'fr' }),
      ]);

      expect(results.length).toBe(3);
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});
