import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene4Actionable } from './scene4-actionable-rewriter';
import { RewriteContext } from './scene-rewriter-base';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn(() => ({ code: 'AI_ERROR', message: 'AI Error' })),
  },
}));

describe('Scene 4 - Actionable Rewriter', () => {
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
        title: 'Translated Title',
        actionItems: [
          { step: 1, action: 'Translated Action 1', guidance: 'Translated Guidance 1' },
          { step: 2, action: 'Translated Action 2', guidance: 'Translated Guidance 2' },
          { step: 3, action: 'Translated Action 3', guidance: 'Translated Guidance 3' },
        ],
        successCriteria: 'Translated Success Criteria',
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
    title: 'Take Action',
    actionItems: [
      { step: 1, action: 'Check sender email address', guidance: 'Verify domain matches official sources' },
      { step: 2, action: 'Hover over links', guidance: 'Never click without verifying' },
      { step: 3, action: 'Report to IT', guidance: 'Use the report phishing button' },
    ],
    successCriteria: 'All action items completed',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene4Actionable(undefined as any, baseContext)
      ).resolves.toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene4Actionable(baseScene as any, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve actionItems array', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      expect(result).toHaveProperty('actionItems');
      expect(Array.isArray((result as any).actionItems)).toBe(true);
      expect((result as any).actionItems.length).toBe(baseScene.actionItems.length);
    });

    it('should preserve action steps in order', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      (result as any).actionItems.forEach((item: any, index: number) => {
        expect(item.step).toBe(baseScene.actionItems[index].step);
      });
    });

    it('should preserve successCriteria field', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      expect(result).toHaveProperty('successCriteria');
    });

    it('should maintain action item structure', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      (result as any).actionItems.forEach((item: any) => {
        expect(item).toHaveProperty('step');
        expect(item).toHaveProperty('action');
        expect(item).toHaveProperty('guidance');
      });
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene4Actionable(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene4Actionable(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual content', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene4Actionable(baseScene as any, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Actionable Content', () => {
    it('should keep actions concrete and measurable', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      (result as any).actionItems.forEach((item: any) => {
        expect(item.action).toBeTruthy();
        expect(typeof item.action).toBe('string');
      });
    });

    it('should preserve guidance field', async () => {
      const result = await rewriteScene4Actionable(baseScene as any, baseContext);
      (result as any).actionItems.forEach((item: any) => {
        expect(item.guidance).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single action item', async () => {
      const singleAction = {
        ...baseScene,
        actionItems: [{ step: 1, action: 'Check sender', guidance: 'Verify domain' }],
      };
      const result = await rewriteScene4Actionable(singleAction as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle many action items', async () => {
      const manyActions = {
        ...baseScene,
        actionItems: Array.from({ length: 10 }, (_, i) => ({
          step: i + 1,
          action: `Action ${i + 1}`,
          guidance: `Guidance ${i + 1}`,
        })),
      };
      const result = await rewriteScene4Actionable(manyActions as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle long guidance text', async () => {
      const longScene = {
        ...baseScene,
        actionItems: [
          { step: 1, action: 'Check', guidance: 'A'.repeat(500) },
        ],
      };
      const result = await rewriteScene4Actionable(longScene as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene4Actionable(baseScene as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene4Actionable(baseScene as any, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene4Actionable(baseScene as any, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
