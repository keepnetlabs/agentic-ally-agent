import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene5Quiz } from './scene5-quiz-rewriter';
import { RewriteContext } from './scene-rewriter-base';

// Mock the AI module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn(() => ({ code: 'AI_ERROR', message: 'AI Error' })),
  },
}));

import { generateText } from 'ai';

describe('Scene 5 - Quiz Rewriter', () => {
  const mockModel = { id: 'test-model', provider: 'test' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Test Your Knowledge',
    subtitle: 'Quiz Time',
    callToActionText: 'Submit',
    quizCompletionCallToActionText: 'Done',
    questions: {
      totalCount: 1,
      maxAttempts: 3,
      list: [
        {
          id: '1',
          title: 'What is a common phishing tactic?',
          type: 'multiple_choice',
          explanation: 'Phishing emails often create false urgency',
          options: [
            { id: 'opt1', text: 'Fake urgency', isCorrect: true },
            { id: 'opt2', text: 'Legitimate emails', isCorrect: false },
            { id: 'opt3', text: 'Official logos', isCorrect: false },
            { id: 'opt4', text: 'Proper grammar', isCorrect: false }
          ]
        },
      ]
    },
    icon: { sceneIconName: 'quiz', sparkleIconName: 'question' }
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(baseScene),
    });
  });

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(generateText).toHaveBeenCalled();
    });

    it('should return undefined if scene is undefined', async () => {
      const result = await rewriteScene5Quiz(undefined as any, baseContext);
      expect(result).toBeUndefined();
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

    it('should preserve questions structure', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result).toHaveProperty('questions');
      expect(result.questions).toHaveProperty('list');
      expect(Array.isArray(result.questions.list)).toBe(true);
    });

    it('should preserve question IDs', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result.questions.list[0]).toHaveProperty('id');
      expect(result.questions.list?.[0]?.id).toBe('1');
    });

    it('should preserve correct answer validation', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      const correctOption = result.questions.list?.[0]?.options?.find((o: any) => o.isCorrect);
      expect(correctOption).toBeDefined();
    });

    it('should preserve question type', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result.questions.list?.[0]?.type).toBe('multiple_choice');
    });

    it('should maintain number of options', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result.questions.list?.[0]?.options?.length).toBe(4);
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
      const question = result.questions.list?.[0];
      expect(question.title).toBeTruthy();
      expect(question.title.length).toBeGreaterThan(5);
    });

    it('should preserve explanations', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result.questions.list?.[0]?.explanation).toBeTruthy();
    });

    it('should maintain option validity', async () => {
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      const options = result.questions.list?.[0]?.options || [];
      options.forEach((opt: any) => {
        expect(opt.text).toBeTruthy();
        expect(typeof opt.isCorrect).toBe('boolean');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single question', async () => {
      // baseScene is already single question
      const result = await rewriteScene5Quiz(baseScene, baseContext);
      expect(result.questions.list.length).toBe(1);
    });

    it('should handle many questions', async () => {
      const manyQuestions = {
        ...baseScene,
        questions: {
          ...baseScene.questions,
          list: Array.from({ length: 5 }, (_, i) => ({
            ...baseScene.questions.list[0],
            id: `${i + 1}`
          }))
        }
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(manyQuestions) });

      const result = await rewriteScene5Quiz(manyQuestions, baseContext);
      expect(result.questions.list.length).toBe(5);
    });

    it('should handle questions with many options', async () => {
      const manyOptions = {
        ...baseScene,
        questions: {
          ...baseScene.questions,
          list: [{
            ...baseScene.questions.list[0],
            options: Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, text: `Opt ${i}`, isCorrect: i === 0 }))
          }]
        }
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(manyOptions) });

      const result = await rewriteScene5Quiz(manyOptions, baseContext);
      expect(result.questions.list?.[0]?.options?.length).toBe(10);
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
