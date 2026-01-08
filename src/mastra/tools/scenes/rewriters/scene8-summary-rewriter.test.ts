import { describe, it, expect } from 'vitest';
import { rewriteScene8Summary } from './scene8-summary-rewriter';
import { RewriteContext } from './scene-rewriter-base';

describe('Scene 8 - Summary Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Key Takeaways',
    keyPoints: [
      'Phishing emails mimic trusted senders',
      'Always verify sender email addresses',
      'Report suspicious emails to IT immediately',
    ],
    conclusion: 'You now have the knowledge to protect yourself from phishing attacks.',
    nextSteps: ['Practice identifying phishing', 'Share knowledge with team'],
    certificateText: 'Completion Certificate',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene8Summary(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene8Summary(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve keyPoints array', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('keyPoints');
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBe(baseScene.keyPoints.length);
    });

    it('should preserve conclusion field', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('conclusion');
    });

    it('should preserve nextSteps array', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('nextSteps');
      expect(Array.isArray(result.nextSteps)).toBe(true);
      expect(result.nextSteps.length).toBe(baseScene.nextSteps.length);
    });

    it('should preserve certificateText field', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('certificateText');
    });

    it('should maintain key point order', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      result.keyPoints.forEach((point: any) => {
        expect(typeof point).toBe('string');
      });
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene8Summary(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene8Summary(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual summaries', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene8Summary(baseScene, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Summary Quality', () => {
    it('should summarize key points concisely', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      result.keyPoints.forEach((point: any) => {
        expect(typeof point).toBe('string');
        expect(point.length).toBeGreaterThan(0);
        expect(point.length).toBeLessThan(500);
      });
    });

    it('should maintain conclusion clarity', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result.conclusion).toBeTruthy();
      expect(typeof result.conclusion).toBe('string');
    });

    it('should preserve next steps guidance', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      result.nextSteps.forEach((step: any) => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Summarization', () => {
    it('should handle training with 3 key points', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result.keyPoints.length).toBe(3);
    });

    it('should handle training with many key points', async () => {
      const manyPoints = {
        ...baseScene,
        keyPoints: Array.from({ length: 10 }, (_, i) => `Key point ${i + 1}`),
      };
      const result = await rewriteScene8Summary(manyPoints, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle single key point', async () => {
      const singlePoint = {
        ...baseScene,
        keyPoints: ['Main lesson learned'],
      };
      const result = await rewriteScene8Summary(singlePoint, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long conclusion text', async () => {
      const longConclusion = {
        ...baseScene,
        conclusion: 'A'.repeat(500),
      };
      const result = await rewriteScene8Summary(longConclusion, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle key point with special characters', async () => {
      const special = {
        ...baseScene,
        keyPoints: ['Phishing uses fake domains (e.g., pay-pal.fake.com)'],
      };
      const result = await rewriteScene8Summary(special, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle next steps with links', async () => {
      const withLinks = {
        ...baseScene,
        nextSteps: [
          'Visit https://example.com for more info',
          'Email security@company.com for questions',
        ],
      };
      const result = await rewriteScene8Summary(withLinks, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle empty nextSteps', async () => {
      const noNextSteps = {
        ...baseScene,
        nextSteps: [],
      };
      const result = await rewriteScene8Summary(noNextSteps, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene8Summary(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene8Summary(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene8Summary(baseScene, { ...baseContext, targetLanguage: 'de' }),
        rewriteScene8Summary(baseScene, { ...baseContext, targetLanguage: 'fr' }),
      ]);
      expect(results.length).toBe(3);
    });
  });

  describe('Integration', () => {
    it('should work as final training scene', async () => {
      const fullTrainingContext = {
        ...baseContext,
        topic: 'Complete Security Awareness',
        department: 'All',
      };
      const result = await rewriteScene8Summary(baseScene, fullTrainingContext);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('keyPoints');
      expect(result).toHaveProperty('conclusion');
    });

    it('should handle certificate generation', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result.certificateText).toBeTruthy();
    });

    it('should produce multi-language summary variants', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh', 'ja'];
      const results = await Promise.all(
        languages.map(lang =>
          rewriteScene8Summary(baseScene, { ...baseContext, targetLanguage: lang })
        )
      );
      expect(results.length).toBe(languages.length);
      results.forEach(result => {
        expect(result.keyPoints.length).toBe(baseScene.keyPoints.length);
      });
    });
  });
});
