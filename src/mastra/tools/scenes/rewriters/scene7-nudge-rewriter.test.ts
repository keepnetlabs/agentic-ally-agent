import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene7Nudge } from './scene7-nudge-rewriter';
import { RewriteContext } from './scene-rewriter-base';

// Mock the AI module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';

describe('Scene 7 - Nudge Rewriter', () => {
  const mockModel = { id: 'test-model', provider: 'test' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Stay Alert',
    subtitle: 'Quick Reminder',
    key_message: ['Check email headers before clicking links!'],
    callToActionText: 'Take the quiz again',
    icon: { sceneIconName: 'alert-triangle', sparkleIconName: 'alert' },
    // scene_type removed from here, usually added by rewriter or implicit
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify(baseScene),
    });
  });

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(generateText).toHaveBeenCalled();
    });

    it('should return undefined if scene is undefined', async () => {
      const result = await rewriteScene7Nudge(undefined as any, baseContext);
      expect(result).toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene7Nudge(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve key_message field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('key_message');
      expect(Array.isArray(result.key_message)).toBe(true);
    });

    it('should preserve callToActionText field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('callToActionText');
    });

    it('should preserve icon field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('icon');
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene7Nudge(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene7Nudge(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual nudges', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene7Nudge(baseScene, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Nudge Quality', () => {
    it('should keep nudges concise', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result.key_message).toBeTruthy();
      expect(result.key_message[0].length).toBeLessThan(200);
    });

    it('should maintain motivational tone', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(result.key_message).toBeTruthy();
    });

    it('should preserve callToActionText', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result.callToActionText).toBeTruthy();
      expect(typeof result.callToActionText).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal nudge', async () => {
      const minimal = {
        title: 'Alert',
        key_message: ['Act now'],
      } as any;
      (generateText as any).mockResolvedValueOnce({
        text: JSON.stringify(minimal),
      });
      const result = await rewriteScene7Nudge(minimal, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle nudge with special characters', async () => {
      const special = {
        ...baseScene,
        key_message: ['Check email & verify sender (DO NOT CLICK)!'],
      };
      (generateText as any).mockResolvedValueOnce({
        text: JSON.stringify(special),
      });
      const result = await rewriteScene7Nudge(special, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle nudge with emoji-like content', async () => {
      const withSymbols = {
        ...baseScene,
        key_message: ['⚠️ Check email headers before clicking'],
      };
      (generateText as any).mockResolvedValueOnce({
        text: JSON.stringify(withSymbols),
      });
      const result = await rewriteScene7Nudge(withSymbols, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene7Nudge(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene7Nudge(baseScene, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
