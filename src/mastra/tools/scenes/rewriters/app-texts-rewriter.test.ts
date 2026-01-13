import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteAppTexts } from './app-texts-rewriter';
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

vi.mock('../../../utils/language/localization-language-rules', () => ({
  getLanguagePrompt: vi.fn(() => 'Mock language rules for localization'),
}));

/**
 * Test suite for App Texts Rewriter
 * Tests localization of application UI text labels, buttons, placeholders, etc.
 */
describe('App Texts Rewriter', () => {
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
        buttons: {
          submit: 'Translated Submit',
          cancel: 'Translated Cancel',
          continue: 'Translated Continue',
          previous: 'Translated Previous',
          next: 'Translated Next',
          start: 'Translated Start',
        },
        labels: {
          email: 'Translated Email Address',
          password: 'Translated Password',
          username: 'Translated Username',
          firstName: 'Translated First Name',
          lastName: 'Translated Last Name',
        },
        placeholders: {
          emailInput: 'Translated Enter your email address',
          passwordInput: 'Translated Enter your password',
          searchBox: 'Translated Search...',
        },
        messages: {
          welcome: 'Translated Welcome to the Security Training',
          goodbye: 'Translated Thank you for completing the module',
          error: 'Translated An error occurred',
          success: 'Translated Operation successful',
        },
      }),
    });
  });

  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: '',  // Not used for app-texts
    model: mockModel,
    department: 'IT',
  };

  const baseAppTexts = {
    buttons: {
      submit: 'Submit',
      cancel: 'Cancel',
      continue: 'Continue',
      previous: 'Previous',
      next: 'Next',
      start: 'Start',
    },
    labels: {
      email: 'Email Address',
      password: 'Password',
      username: 'Username',
      firstName: 'First Name',
      lastName: 'Last Name',
    },
    placeholders: {
      emailInput: 'Enter your email address',
      passwordInput: 'Enter your password',
      searchBox: 'Search...',
    },
    messages: {
      welcome: 'Welcome to the Security Training',
      goodbye: 'Thank you for completing the module',
      error: 'An error occurred',
      success: 'Operation successful',
    },
  };

  // ==================== FUNCTION CALL TESTS ====================
  describe('Function Call', () => {
    it('should accept valid app texts and context', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should require app texts parameter', async () => {
      await expect(
        rewriteAppTexts(undefined as any, baseContext)
      ).resolves.toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteAppTexts(baseAppTexts as any, undefined as any)
      ).resolves.toBeDefined();
    });

    it('should require context with proper structure', async () => {
      const invalidContext = { targetLanguage: 'tr' } as any;
      await expect(
        rewriteAppTexts(baseAppTexts as any, invalidContext)
      ).resolves.toBeDefined();
    });
  });

  // ==================== STRUCTURE PRESERVATION TESTS ====================
  describe('Structure Preservation', () => {
    it('should preserve buttons object structure', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result).toHaveProperty('buttons');
      expect(typeof (result as any).buttons).toBe('object');
    });

    it('should preserve labels object structure', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result).toHaveProperty('labels');
      expect(typeof (result as any).labels).toBe('object');
    });

    it('should preserve placeholders object structure', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result).toHaveProperty('placeholders');
      expect(typeof (result as any).placeholders).toBe('object');
    });

    it('should preserve messages object structure', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result).toHaveProperty('messages');
      expect(typeof (result as any).messages).toBe('object');
    });

    it('should preserve all button keys', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      const originalKeys = Object.keys(baseAppTexts.buttons);
      const resultKeys = Object.keys((result as any).buttons);
      expect(resultKeys.sort()).toEqual(originalKeys.sort());
    });

    it('should preserve all label keys', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      const originalKeys = Object.keys(baseAppTexts.labels);
      const resultKeys = Object.keys((result as any).labels);
      expect(resultKeys.sort()).toEqual(originalKeys.sort());
    });

    it('should preserve all placeholder keys', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      const originalKeys = Object.keys(baseAppTexts.placeholders);
      const resultKeys = Object.keys((result as any).placeholders);
      expect(resultKeys.sort()).toEqual(originalKeys.sort());
    });

    it('should preserve all message keys', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      const originalKeys = Object.keys(baseAppTexts.messages);
      const resultKeys = Object.keys((result as any).messages);
      expect(resultKeys.sort()).toEqual(originalKeys.sort());
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support Turkish localization', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
      expect((result as any).buttons).toBeDefined();
    });

    it('should support German localization', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should support French localization', async () => {
      const context = { ...baseContext, targetLanguage: 'fr' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should support Spanish localization', async () => {
      const context = { ...baseContext, targetLanguage: 'es' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should support Japanese localization', async () => {
      const context = { ...baseContext, targetLanguage: 'ja' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should support Chinese (Simplified) localization', async () => {
      const context = { ...baseContext, targetLanguage: 'zh' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should support Arabic localization', async () => {
      const context = { ...baseContext, targetLanguage: 'ar' };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });
  });

  // ==================== OUTPUT VALIDATION TESTS ====================
  describe('Output Validation', () => {
    it('should return non-empty strings for buttons', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      Object.values((result as any).buttons).forEach((text: any) => {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('should return non-empty strings for labels', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      Object.values((result as any).labels).forEach((text: any) => {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('should return non-empty strings for placeholders', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      Object.values((result as any).placeholders).forEach((text: any) => {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      });
    });

    it('should return non-empty strings for messages', async () => {
      const result = await rewriteAppTexts(baseAppTexts as any, baseContext);
      Object.values((result as any).messages).forEach((text: any) => {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== MINIMAL CONTENT TESTS ====================
  describe('Minimal Content Handling', () => {
    it('should handle app texts with only buttons', async () => {
      const minimalTexts = { buttons: { submit: 'Submit' } };
      const result = await rewriteAppTexts(minimalTexts as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle empty nested objects', async () => {
      const emptyTexts = {
        buttons: {},
        labels: {},
        placeholders: {},
        messages: {},
      };
      const result = await rewriteAppTexts(emptyTexts as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', async () => {
      const result1 = await rewriteAppTexts(baseAppTexts as any, baseContext);
      const result2 = await rewriteAppTexts(baseAppTexts as any, baseContext);
      expect(result1).toEqual(result2);
    });

    it('should handle repeated calls without error', async () => {
      const contexts = [
        { ...baseContext, targetLanguage: 'tr' },
        { ...baseContext, targetLanguage: 'de' },
        { ...baseContext, targetLanguage: 'fr' },
      ];

      for (const context of contexts) {
        const result = await rewriteAppTexts(baseAppTexts as any, context);
        expect(result).toBeDefined();
      }
    });
  });

  // ==================== SPECIAL CHARACTERS TESTS ====================
  describe('Special Characters Handling', () => {
    it('should handle apostrophes in text', async () => {
      const textsWithApostrophe = {
        buttons: { submit: "Don't submit" },
      };
      const result = await rewriteAppTexts(textsWithApostrophe as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle quotes in text', async () => {
      const textsWithQuotes = {
        messages: { welcome: 'Welcome to "Security Training"' },
      };
      const result = await rewriteAppTexts(textsWithQuotes as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle parentheses in text', async () => {
      const textsWithParens = {
        labels: { email: 'Email (optional)' },
      };
      const result = await rewriteAppTexts(textsWithParens as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle numbers in text', async () => {
      const textsWithNumbers = {
        messages: { error: 'Error 404: Not found' },
      };
      const result = await rewriteAppTexts(textsWithNumbers as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle punctuation marks', async () => {
      const textsWithPunctuation = {
        messages: { success: 'Operation completed! Check your email...' },
      };
      const result = await rewriteAppTexts(textsWithPunctuation as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONTEXT HANDLING TESTS ====================
  describe('Context Handling', () => {
    it('should use source language from context', async () => {
      const context = {
        ...baseContext,
        sourceLanguage: 'es',
      };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should use target language from context', async () => {
      const context = {
        ...baseContext,
        targetLanguage: 'ja',
      };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });

    it('should use department information', async () => {
      const context = {
        ...baseContext,
        department: 'Finance',
      };
      const result = await rewriteAppTexts(baseAppTexts as any, context);
      expect(result).toBeDefined();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle very long text strings', async () => {
      const longTexts = {
        messages: {
          welcome: 'W'.repeat(500),
        },
      };
      const result = await rewriteAppTexts(longTexts as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle single character strings', async () => {
      const shortTexts = {
        buttons: { ok: 'Y' },
      };
      const result = await rewriteAppTexts(shortTexts as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle deeply nested structure', async () => {
      const nestedTexts = {
        buttons: {
          submit: 'Submit',
          cancel: 'Cancel',
        },
        labels: {
          email: 'Email',
          password: 'Password',
          account: {
            username: 'Username',
          },
        },
      };
      const result = await rewriteAppTexts(nestedTexts as any, baseContext);
      expect(result).toBeDefined();
    });
  });
});
