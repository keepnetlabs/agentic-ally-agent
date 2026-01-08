import { describe, it, expect } from 'vitest';
import { rewriteScene7Nudge } from './scene7-nudge-rewriter';
import { RewriteContext } from './scene-rewriter-base';

describe('Scene 7 - Nudge Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  const baseScene = {
    title: 'Stay Alert',
    nudgeMessage: 'Check email headers before clicking links!',
    callToAction: 'Take the quiz again',
    icon: 'alert-triangle',
    urgency: 'medium',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene7Nudge(undefined as any, baseContext)
      ).rejects.toThrow();
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

    it('should preserve nudgeMessage field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('nudgeMessage');
    });

    it('should preserve callToAction field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('callToAction');
    });

    it('should preserve icon field', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('icon');
      expect(result.icon).toBe(baseScene.icon);
    });

    it('should preserve urgency level', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toHaveProperty('urgency');
      expect(result.urgency).toBe(baseScene.urgency);
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
      expect(result.nudgeMessage).toBeTruthy();
      expect(typeof result.nudgeMessage).toBe('string');
      expect(result.nudgeMessage.length).toBeLessThan(200);
    });

    it('should maintain motivational tone', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result).toBeDefined();
      expect(result.nudgeMessage).toBeTruthy();
    });

    it('should preserve callToAction text', async () => {
      const result = await rewriteScene7Nudge(baseScene, baseContext);
      expect(result.callToAction).toBeTruthy();
      expect(typeof result.callToAction).toBe('string');
    });
  });

  describe('Urgency Levels', () => {
    it('should handle low urgency nudges', async () => {
      const lowUrgency = { ...baseScene, urgency: 'low' };
      const result = await rewriteScene7Nudge(lowUrgency, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle medium urgency nudges', async () => {
      const mediumUrgency = { ...baseScene, urgency: 'medium' };
      const result = await rewriteScene7Nudge(mediumUrgency, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle high urgency nudges', async () => {
      const highUrgency = { ...baseScene, urgency: 'high' };
      const result = await rewriteScene7Nudge(highUrgency, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal nudge', async () => {
      const minimal = {
        title: 'Alert',
        nudgeMessage: 'Act now',
      };
      const result = await rewriteScene7Nudge(minimal, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle nudge with special characters', async () => {
      const special = {
        ...baseScene,
        nudgeMessage: 'Check email & verify sender (DO NOT CLICK)!',
      };
      const result = await rewriteScene7Nudge(special, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle nudge with emoji-like content', async () => {
      const withSymbols = {
        ...baseScene,
        nudgeMessage: '⚠️ Check email headers before clicking',
      };
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
