import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene4Vishing } from './scene4-vishing-rewriter';
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

describe('Scene 4 - Vishing Rewriter', () => {
  const mockModel = {
    id: 'test-model',
    provider: 'test-provider',
    version: 'v2',
    modelId: 'test-model-id',
  } as any;

  const mockVishingScene = {
    callerName: 'IT Support',
    firstMessage: 'Hello, this is IT Support calling about your account security.',
    scenario: 'IT support impersonation',
    redFlags: ['Unsolicited call', 'Requests credentials'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({
        callerName: 'Bilgi Teknolojileri',
        firstMessage: 'Merhaba, BT Destek ekibinden arıyorum, hesap güvenliğinizle ilgili.',
        scenario: 'BT destek taklidi',
        redFlags: ['Beklenmeyen arama', 'Kimlik bilgisi talebi'],
      }),
    });
  });

  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Vishing Awareness',
    model: mockModel,
    department: 'All',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should return undefined for empty scene', async () => {
      await expect(rewriteScene4Vishing(undefined as any, baseContext)).resolves.toBeUndefined();
    });

    it('should throw when context is missing', async () => {
      await expect(rewriteScene4Vishing(mockVishingScene as any, undefined as any)).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve callerName field', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, baseContext);
      expect(result).toHaveProperty('callerName');
    });

    it('should preserve firstMessage field', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, baseContext);
      expect(result).toHaveProperty('firstMessage');
    });

    it('should preserve redFlags array', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, baseContext);
      expect(result).toHaveProperty('redFlags');
      expect(Array.isArray((result as any).redFlags)).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, { ...baseContext, targetLanguage: 'tr' });
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const result = await rewriteScene4Vishing(mockVishingScene as any, { ...baseContext, targetLanguage: 'de' });
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene4Vishing(mockVishingScene as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene4Vishing(mockVishingScene as any, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene4Vishing(mockVishingScene as any, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
