import { describe, it, expect } from 'vitest';
import { rewriteScene1Intro } from './scene1-intro-rewriter';
import { RewriteContext } from './scene-rewriter-base';

/**
 * Test suite for Scene 1 (Intro) Rewriter
 * Tests semantic localization of intro scenes across languages
 */
describe('Scene 1 - Intro Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;

  // Base valid context
  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Phishing Prevention',
    model: mockModel,
    department: 'IT',
  };

  // Base valid scene (intro content)
  const baseScene = {
    title: 'Stop Phishing Attacks',
    subtitle: 'Learn to identify suspicious emails',
    highlights: [
      { iconName: 'mail-warning', know: 'Phishing uses fake emails' },
      { iconName: 'alert-circle', remember: 'Verify before clicking' },
      { iconName: 'eye', see: 'Check sender address' },
    ],
    keyMessages: [
      { whatToKnow: 'Phishing mimics trusted senders', icon: 'brain' },
      { whyItMatters: 'Your credentials are targets', icon: 'target' },
      { whatYouDo: 'Always verify sender identity', icon: 'check' },
    ],
    callToActionText: { mobile: 'Swipe to learn', desktop: 'Click to continue' },
    sectionTitle: 'What this training covers',
  };

  // ==================== FUNCTION CALL TESTS ====================
  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should be an async function', () => {
      const result = rewriteScene1Intro(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene1Intro(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene1Intro(baseScene, undefined as any)
      ).rejects.toThrow();
    });

    it('should require context with sourceLanguage', async () => {
      const invalidContext = { ...baseContext, sourceLanguage: '' };
      await expect(
        rewriteScene1Intro(baseScene, invalidContext)
      ).rejects.toThrow();
    });

    it('should require context with targetLanguage', async () => {
      const invalidContext = { ...baseContext, targetLanguage: '' };
      await expect(
        rewriteScene1Intro(baseScene, invalidContext)
      ).rejects.toThrow();
    });

    it('should require context with model', async () => {
      const invalidContext = { ...baseContext, model: null };
      await expect(
        rewriteScene1Intro(baseScene, invalidContext as any)
      ).rejects.toThrow();
    });

    it('should require context with topic', async () => {
      const invalidContext = { ...baseContext, topic: '' };
      await expect(
        rewriteScene1Intro(baseScene, invalidContext)
      ).rejects.toThrow();
    });
  });

  // ==================== SCENE STRUCTURE TESTS ====================
  describe('Scene Structure Preservation', () => {
    it('should preserve title field', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('title');
    });

    it('should preserve subtitle field', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('subtitle');
    });

    it('should preserve highlights array', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('highlights');
      expect(Array.isArray(result.highlights)).toBe(true);
    });

    it('should preserve keyMessages array', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('keyMessages');
      expect(Array.isArray(result.keyMessages)).toBe(true);
    });

    it('should preserve callToActionText object', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('callToActionText');
      expect(result.callToActionText).toHaveProperty('mobile');
      expect(result.callToActionText).toHaveProperty('desktop');
    });

    it('should preserve sectionTitle field', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(result).toHaveProperty('sectionTitle');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const turContext = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene1Intro(baseScene, turContext);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const deContext = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene1Intro(baseScene, deContext);
      expect(result).toBeDefined();
    });

    it('should support French rewriting', async () => {
      const frContext = { ...baseContext, targetLanguage: 'fr' };
      const result = await rewriteScene1Intro(baseScene, frContext);
      expect(result).toBeDefined();
    });

    it('should support Spanish rewriting', async () => {
      const esContext = { ...baseContext, targetLanguage: 'es' };
      const result = await rewriteScene1Intro(baseScene, esContext);
      expect(result).toBeDefined();
    });

    it('should support Chinese rewriting', async () => {
      const zhContext = { ...baseContext, targetLanguage: 'zh' };
      const result = await rewriteScene1Intro(baseScene, zhContext);
      expect(result).toBeDefined();
    });

    it('should support Japanese rewriting', async () => {
      const jaContext = { ...baseContext, targetLanguage: 'ja' };
      const result = await rewriteScene1Intro(baseScene, jaContext);
      expect(result).toBeDefined();
    });

    it('should support Arabic rewriting', async () => {
      const arContext = { ...baseContext, targetLanguage: 'ar' };
      const result = await rewriteScene1Intro(baseScene, arContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Context', () => {
    it('should handle IT department context', async () => {
      const itContext = { ...baseContext, department: 'IT' };
      const result = await rewriteScene1Intro(baseScene, itContext);
      expect(result).toBeDefined();
    });

    it('should handle Finance department context', async () => {
      const finContext = { ...baseContext, department: 'Finance' };
      const result = await rewriteScene1Intro(baseScene, finContext);
      expect(result).toBeDefined();
    });

    it('should handle HR department context', async () => {
      const hrContext = { ...baseContext, department: 'HR' };
      const result = await rewriteScene1Intro(baseScene, hrContext);
      expect(result).toBeDefined();
    });

    it('should handle Sales department context', async () => {
      const salesContext = { ...baseContext, department: 'Sales' };
      const result = await rewriteScene1Intro(baseScene, salesContext);
      expect(result).toBeDefined();
    });

    it('should handle undefined department', async () => {
      const noContext = { ...baseContext, department: undefined };
      const result = await rewriteScene1Intro(baseScene, noContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== SEMANTIC LOCALIZATION TESTS ====================
  describe('Semantic Localization', () => {
    it('should preserve content details', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      // Result should contain localized content
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should preserve structural integrity', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      // All key fields should be present
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('highlights');
      expect(result).toHaveProperty('keyMessages');
    });

    it('should not change icon names', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      const originalIcons = baseScene.highlights.map((h: any) => h.iconName);
      const resultIcons = result.highlights.map((h: any) => h.iconName);
      expect(resultIcons).toEqual(originalIcons);
    });

    it('should maintain array structure for highlights', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(Array.isArray(result.highlights)).toBe(true);
      expect(result.highlights.length).toBe(baseScene.highlights.length);
    });

    it('should maintain array structure for keyMessages', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(Array.isArray(result.keyMessages)).toBe(true);
      expect(result.keyMessages.length).toBe(baseScene.keyMessages.length);
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Rewriting', () => {
    it('should handle Phishing Prevention topic', async () => {
      const phishContext = { ...baseContext, topic: 'Phishing Prevention' };
      const result = await rewriteScene1Intro(baseScene, phishContext);
      expect(result).toBeDefined();
    });

    it('should handle Password Security topic', async () => {
      const passContext = { ...baseContext, topic: 'Password Security' };
      const result = await rewriteScene1Intro(baseScene, passContext);
      expect(result).toBeDefined();
    });

    it('should handle MFA Training topic', async () => {
      const mfaContext = { ...baseContext, topic: 'Multi-Factor Authentication' };
      const result = await rewriteScene1Intro(baseScene, mfaContext);
      expect(result).toBeDefined();
    });

    it('should handle Data Protection topic', async () => {
      const dataContext = { ...baseContext, topic: 'Data Protection' };
      const result = await rewriteScene1Intro(baseScene, dataContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle empty scene object', async () => {
      const emptyScene = {};
      const result = await rewriteScene1Intro(emptyScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with only title', async () => {
      const minimalScene = { title: 'Introduction' };
      const result = await rewriteScene1Intro(minimalScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with long title', async () => {
      const longScene = {
        ...baseScene,
        title: 'Advanced Phishing Prevention Techniques for Enterprise Security Teams in 2024',
      };
      const result = await rewriteScene1Intro(longScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with special characters', async () => {
      const specialScene = {
        ...baseScene,
        title: 'Stop Phishing & Spear-phishing (OWASP Top 10)',
      };
      const result = await rewriteScene1Intro(specialScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with Unicode characters', async () => {
      const unicodeScene = {
        ...baseScene,
        title: 'Phishing-Prävention für Sicherheit',
      };
      const result = await rewriteScene1Intro(unicodeScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with many highlights', async () => {
      const manyHighlights = {
        ...baseScene,
        highlights: Array.from({ length: 10 }, (_, i) => ({
          iconName: `icon-${i}`,
          know: `Know statement ${i}`,
        })),
      };
      const result = await rewriteScene1Intro(manyHighlights, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with empty highlights array', async () => {
      const noHighlights = { ...baseScene, highlights: [] };
      const result = await rewriteScene1Intro(noHighlights, baseContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== ASYNC BEHAVIOR TESTS ====================
  describe('Async Behavior', () => {
    it('should return a promise', async () => {
      const result = rewriteScene1Intro(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to an object', async () => {
      const result = await rewriteScene1Intro(baseScene, baseContext);
      expect(typeof result).toBe('object');
    });

    it('should handle concurrent calls', async () => {
      const contexts = [
        { ...baseContext, targetLanguage: 'tr' },
        { ...baseContext, targetLanguage: 'de' },
        { ...baseContext, targetLanguage: 'fr' },
      ];

      const results = await Promise.all(
        contexts.map(ctx => rewriteScene1Intro(baseScene, ctx))
      );

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', async () => {
      const result1 = await rewriteScene1Intro(baseScene, baseContext);
      const result2 = await rewriteScene1Intro(baseScene, baseContext);

      // Structure should be the same
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    });

    it('should handle repeated calls', async () => {
      const calls = [
        rewriteScene1Intro(baseScene, baseContext),
        rewriteScene1Intro(baseScene, baseContext),
        rewriteScene1Intro(baseScene, baseContext),
      ];

      const results = await Promise.all(calls);
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration', () => {
    it('should work with phishing training context', async () => {
      const phishingScene = {
        title: 'Identify Phishing Attacks',
        subtitle: 'Learn red flags in suspicious emails',
        highlights: [
          { iconName: 'mail-warning', know: 'Phishing uses fake emails' },
        ],
      };

      const result = await rewriteScene1Intro(phishingScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should work with multi-language workflow', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];

      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene1Intro(baseScene, context);
        expect(result).toBeDefined();
      }
    });

    it('should handle complex scene structure', async () => {
      const complexScene = {
        ...baseScene,
        metadata: { duration: 20, difficulty: 'intermediate' },
        additionalResources: [
          { title: 'Link 1', url: 'https://example.com' },
        ],
      };

      const result = await rewriteScene1Intro(complexScene, baseContext);
      expect(result).toBeDefined();
    });
  });
});
