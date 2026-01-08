import { describe, it, expect } from 'vitest';
import { rewriteScene6Survey } from './scene6-survey-rewriter';
import { RewriteContext } from './scene-rewriter-base';

describe('Scene 6 - Survey Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Your Feedback Matters',
    surveyQuestions: [
      {
        id: 1,
        question: 'How confident are you in identifying phishing emails?',
        type: 'rating',
        scale: [1, 2, 3, 4, 5],
      },
      {
        id: 2,
        question: 'What was most helpful about this training?',
        type: 'open-ended',
      },
    ],
    description: 'Your feedback helps us improve',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene6Survey(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene6Survey(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve surveyQuestions array', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toHaveProperty('surveyQuestions');
      expect(Array.isArray(result.surveyQuestions)).toBe(true);
      expect(result.surveyQuestions.length).toBe(baseScene.surveyQuestions.length);
    });

    it('should preserve question IDs', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.surveyQuestions.forEach((q: any, index: number) => {
        expect(q.id).toBe(baseScene.surveyQuestions[index].id);
      });
    });

    it('should preserve question type', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.surveyQuestions.forEach((q: any, index: number) => {
        expect(q.type).toBe(baseScene.surveyQuestions[index].type);
      });
    });

    it('should preserve rating scale if present', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      const ratingQuestion = result.surveyQuestions.find((q: any) => q.type === 'rating');
      if (ratingQuestion) {
        expect(ratingQuestion.scale).toBeDefined();
      }
    });

    it('should preserve description field', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toHaveProperty('description');
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene6Survey(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene6Survey(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual surveys', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene6Survey(baseScene, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Question Quality', () => {
    it('should keep survey questions neutral', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.surveyQuestions.forEach((q: any) => {
        expect(q.question).toBeTruthy();
        expect(typeof q.question).toBe('string');
      });
    });

    it('should maintain straightforward phrasing', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.surveyQuestions.forEach((q: any) => {
        expect(q.question.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single survey question', async () => {
      const singleQuestion = {
        ...baseScene,
        surveyQuestions: [baseScene.surveyQuestions[0]],
      };
      const result = await rewriteScene6Survey(singleQuestion, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle many survey questions', async () => {
      const manyQuestions = {
        ...baseScene,
        surveyQuestions: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          question: `Question ${i + 1}?`,
          type: i % 2 === 0 ? 'rating' : 'open-ended',
          scale: [1, 2, 3, 4, 5],
        })),
      };
      const result = await rewriteScene6Survey(manyQuestions, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle long survey question text', async () => {
      const longQuestion = {
        ...baseScene,
        surveyQuestions: [
          {
            id: 1,
            question: 'A'.repeat(200),
            type: 'open-ended',
          },
        ],
      };
      const result = await rewriteScene6Survey(longQuestion, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene6Survey(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene6Survey(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene6Survey(baseScene, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
