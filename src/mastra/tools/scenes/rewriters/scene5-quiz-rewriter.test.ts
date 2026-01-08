import { describe, it, expect } from 'vitest';
import { rewriteScene5Quiz } from './scene5-quiz-rewriter';
import { RewriteContext } from './scene-rewriter-base';

describe('Scene 5 - Quiz Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Test Your Knowledge',
    questions: [
      {
        id: 1,
        question: 'What is a common phishing tactic?',
        type: 'multiple-choice',
        options: ['Fake urgency', 'Legitimate emails', 'Official logos', 'Proper grammar'],
        correctAnswer: 0,
        explanation: 'Phishing emails often create false urgency',
      },
    ],
    passingScore: 80,
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene5Quiz(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene5Quiz(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve questions array', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toHaveProperty('questions');
      expect(Array.isArray(result.questions)).toBe(true);
      expect(result.questions.length).toBe(baseScene.questions.length);
    });

    it('should preserve question IDs', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any, index: number) => {
        expect(q.id).toBe(baseScene.questions[index].id);
      });
    });

    it('should preserve correct answer indices', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any, index: number) => {
        expect(q.correctAnswer).toBe(baseScene.questions[index].correctAnswer);
      });
    });

    it('should preserve question type', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any, index: number) => {
        expect(q.type).toBe(baseScene.questions[index].type);
      });
    });

    it('should preserve passing score', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toHaveProperty('passingScore');
      expect(result.passingScore).toBe(baseScene.passingScore);
    });

    it('should maintain number of options', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any, index: number) => {
        expect(q.options.length).toBe(baseScene.questions[index].options.length);
      });
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene5Quiz(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene5Quiz(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual questions', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene5Quiz(baseScene, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Question Quality', () => {
    it('should keep questions clear and unambiguous', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any) => {
        expect(q.question).toBeTruthy();
        expect(typeof q.question).toBe('string');
      });
    });

    it('should preserve explanations', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any) => {
        expect(q.explanation).toBeTruthy();
      });
    });

    it('should maintain option validity', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      result.questions.forEach((q: any) => {
        q.options.forEach((option: any) => {
          expect(typeof option).toBe('string');
          expect(option.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single question', async () => {
      const singleQuestion = { ...baseScene };
      const result = await rewriteScene5Quiz(singleQuestion, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle many questions', async () => {
      const manyQuestions = {
        ...baseScene,
        questions: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          question: `Question ${i + 1}?`,
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          explanation: `Explanation ${i + 1}`,
        })),
      };
      const result = await rewriteScene5Quiz(manyQuestions, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle questions with many options', async () => {
      const manyOptions = {
        ...baseScene,
        questions: [
          {
            ...baseScene.questions[0],
            options: Array.from({ length: 10 }, (_, i) => `Option ${i + 1}`),
          },
        ],
      };
      const result = await rewriteScene5Quiz(manyOptions, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene5Quiz(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene5Quiz(baseScene, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
