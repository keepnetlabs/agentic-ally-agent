import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene8Summary } from './scene8-summary-rewriter';
import { RewriteContext } from './scene-rewriter-base';

// Mock the AI module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';

describe('Scene 8 - Summary Rewriter', () => {
  const mockModel = { id: 'test-model', provider: 'test' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Key Takeaways',
    immediateActions: [
      { title: 'Check Headers', description: 'Always verify sender' },
      { title: 'Report', description: 'Click the report button' }
    ],
    resources: [
      { title: 'Policy', type: 'PDF', url: 'http://policy' }
    ],
    key_message: ['Phishing emails mimic trusted senders'],
    icon: { sceneIconName: 'book', sparkleIconName: 'star' }
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(baseScene),
    });
  });

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(generateText).toHaveBeenCalled();
    });

    it('should return undefined if scene is undefined', async () => {
      const result = await rewriteScene8Summary(undefined as any, baseContext);
      expect(result).toBeUndefined();
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

    it('should preserve immediateActions array', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('immediateActions');
      expect(Array.isArray(result.immediateActions)).toBe(true);
      expect(result.immediateActions.length).toBe(baseScene.immediateActions.length);
    });

    it('should preserve resources array', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
    });

    it('should preserve key_message', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      // BaseScene has key_message
      expect(result).toHaveProperty('key_message');
    });

    it('should preserve icon field', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toHaveProperty('icon');
      expect(result.icon).toHaveProperty('sceneIconName');
      expect(result.icon).toHaveProperty('sparkleIconName');
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
    it('should exist', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should maintain immediateActions structure', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      result.immediateActions.forEach((action: any) => {
        expect(typeof action.title).toBe('string');
        expect(typeof action.description).toBe('string');
        expect(action.title.length).toBeGreaterThan(0);
        expect(action.description.length).toBeGreaterThan(0);
      });
    });

    it('should maintain resources structure', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      result.resources.forEach((resource: any) => {
        expect(typeof resource.title).toBe('string');
        expect(typeof resource.type).toBe('string');
        expect(typeof resource.url).toBe('string');
        expect(resource.title.length).toBeGreaterThan(0);
        expect(resource.type.length).toBeGreaterThan(0);
        expect(resource.url.length).toBeGreaterThan(0);
      });
    });

    it('should maintain key_message clarity', async () => {
      const result = await rewriteScene8Summary(baseScene, baseContext);
      expect(result.key_message).toBeTruthy();
      expect(Array.isArray(result.key_message)).toBe(true);
      expect(result.key_message[0].length).toBeGreaterThan(0);
    });
  });

  describe('Content Summarization', () => {
    it('should handle training with 3 immediateActions', async () => {
      const threeActions = {
        ...baseScene,
        immediateActions: [
          { title: 'A', description: 'D' },
          { title: 'B', description: 'E' },
          { title: 'C', description: 'F' }
        ]
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(threeActions) });

      const result = await rewriteScene8Summary(threeActions, baseContext);
      expect(result.immediateActions.length).toBe(3);
    });

    it('should handle training with many immediateActions', async () => {
      const manyActions = {
        ...baseScene,
        immediateActions: Array.from({ length: 10 }, (_, i) => ({ title: `Action ${i + 1}`, description: `Desc ${i + 1}` })),
      };
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(manyActions) });
      const result = await rewriteScene8Summary(manyActions, baseContext);
      expect(result).toBeDefined();
      expect(result.immediateActions.length).toBe(10);
    });

    it('should handle single immediateAction', async () => {
      const singleAction = {
        ...baseScene,
        immediateActions: [{ title: 'Main Action', description: 'Main description' }],
      };
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(singleAction) });
      const result = await rewriteScene8Summary(singleAction, baseContext);
      expect(result).toBeDefined();
      expect(result.immediateActions.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no resources', async () => {
      const noResources = {
        ...baseScene,
        resources: [],
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(noResources) });
      const result = await rewriteScene8Summary(noResources, baseContext);
      expect(result).toBeDefined();
      expect(result.resources.length).toBe(0);
    });

    it('should handle empty immediateActions', async () => {
      const noActions = {
        ...baseScene,
        immediateActions: [],
      } as any;
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(noActions) });
      const result = await rewriteScene8Summary(noActions, baseContext);
      expect(result).toBeDefined();
      expect(result.immediateActions.length).toBe(0);
    });

    it('should handle long immediateAction descriptions', async () => {
      const longDescription = {
        ...baseScene,
        immediateActions: [{ title: 'Long Desc', description: 'A'.repeat(500) }],
      };
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(longDescription) });
      const result = await rewriteScene8Summary(longDescription, baseContext);
      expect(result).toBeDefined();
      expect(result.immediateActions[0].description.length).toBeGreaterThan(100);
    });

    it('should handle special characters in titles/descriptions', async () => {
      const specialChars = {
        ...baseScene,
        immediateActions: [{ title: 'Action with !@#$', description: 'Desc with %^&*()' }],
      };
      (generateText as any).mockResolvedValueOnce({ text: JSON.stringify(specialChars) });
      const result = await rewriteScene8Summary(specialChars, baseContext);
      expect(result).toBeDefined();
      expect(result.immediateActions[0].title).toContain('!@#$');
      expect(result.immediateActions[0].description).toContain('%^&*()');
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
      expect(result).toHaveProperty('immediateActions');
      expect(result).toHaveProperty('key_message');
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
        expect(result.immediateActions.length).toBe(baseScene.immediateActions.length);
      });
    });
  });
});
