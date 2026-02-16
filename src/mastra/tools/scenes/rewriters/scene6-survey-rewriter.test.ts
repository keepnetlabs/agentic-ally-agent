import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene6Survey } from './scene6-survey-rewriter';
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

vi.mock('../../../utils/language/localization-language-rules', () => ({
  getLanguagePrompt: vi.fn(() => 'Mock language rules for localization'),
}));

import { generateText } from 'ai';

describe('Scene 6 - Survey Rewriter', () => {
  const mockModel = { id: 'test-model', provider: 'test' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Your Feedback Matters',
    subtitle: 'Help us improve',
    topics: ['Confidence in finding phishing', 'Usefulness of training'],
    icon: { sceneIconName: 'survey', sparkleIconName: 'star' },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(baseScene),
    });
  });

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(generateText).toHaveBeenCalled();
    });

    it('should return undefined if scene is undefined', async () => {
      const result = await rewriteScene6Survey(undefined as any, baseContext);
      expect(result).toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(rewriteScene6Survey(baseScene, undefined as any)).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve topics array', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      expect(result).toHaveProperty('topics');
      expect(Array.isArray(result.topics)).toBe(true);
      expect(result.topics.length).toBe(baseScene.topics.length);
    });

    it('should maintain topic strings', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.topics.forEach((topic: any) => {
        expect(typeof topic).toBe('string');
      });
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

  describe('Survey Quality', () => {
    it('should keep topics clear', async () => {
      const result = await rewriteScene6Survey(baseScene, baseContext);
      result.topics.forEach((topic: string) => {
        expect(topic.length).toBeGreaterThan(3);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single topic', async () => {
      const singleTopic = {
        ...baseScene,
        topics: ['Only One Topic'],
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(singleTopic) });
      const result = await rewriteScene6Survey(singleTopic, baseContext);
      expect(result.topics.length).toBe(1);
    });

    it('should handle many topics', async () => {
      const manyTopics = {
        ...baseScene,
        topics: Array.from({ length: 10 }, (_, i) => `Topic ${i + 1}`),
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(manyTopics) });
      const result = await rewriteScene6Survey(manyTopics, baseContext);
      expect(result.topics.length).toBe(10);
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
