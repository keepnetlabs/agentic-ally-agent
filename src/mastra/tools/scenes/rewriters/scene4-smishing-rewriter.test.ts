import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene4Smishing } from './scene4-smishing-rewriter';
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

describe('Scene 4 - Smishing Rewriter', () => {
  const mockModel = {
    id: 'test-model',
    provider: 'test-provider',
    version: 'v2',
    modelId: 'test-model-id',
  } as any;

  const mockSmishingScene = {
    senderName: 'Kargo Takip',
    firstMessage: 'Paketiniz teslim edilemedi. Takip: {PHISHINGURL}',
    scenario: 'Package delivery reschedule',
    redFlags: ['Unexpected SMS', 'Shortened link'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({
        senderName: 'Paket Servisi',
        firstMessage: 'Paketiniz teslim edilemedi. Kontrol edin: {PHISHINGURL}',
        scenario: 'Kargo teslim erteleme',
        redFlags: ['Beklenmeyen SMS', 'Kısa link'],
      }),
    });
  });

  const baseContext: RewriteContext = {
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    topic: 'Smishing Awareness',
    model: mockModel,
    department: 'All',
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should return undefined for empty scene', async () => {
      await expect(rewriteScene4Smishing(undefined as any, baseContext)).resolves.toBeUndefined();
    });

    it('should throw when context is missing', async () => {
      await expect(rewriteScene4Smishing(mockSmishingScene as any, undefined as any)).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve senderName field', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, baseContext);
      expect(result).toHaveProperty('senderName');
    });

    it('should preserve firstMessage field', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, baseContext);
      expect(result).toHaveProperty('firstMessage');
    });

    it('should preserve redFlags array', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, baseContext);
      expect(result).toHaveProperty('redFlags');
      expect(Array.isArray((result as any).redFlags)).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, { ...baseContext, targetLanguage: 'tr' });
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const result = await rewriteScene4Smishing(mockSmishingScene as any, { ...baseContext, targetLanguage: 'de' });
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene4Smishing(mockSmishingScene as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene4Smishing(mockSmishingScene as any, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene4Smishing(mockSmishingScene as any, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
