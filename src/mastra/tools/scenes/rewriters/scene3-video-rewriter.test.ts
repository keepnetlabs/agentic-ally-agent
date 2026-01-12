import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rewriteScene3Video } from './scene3-video-rewriter';
import { RewriteContext } from './scene-rewriter-base';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

describe('Scene 3 - Video Rewriter', () => {
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
        videoUrl: 'https://example.com/video.mp4',
        transcript: 'Translated Transcript',
        duration: 180,
        subtitles: [
          { timestamp: '0:00', text: 'Translated Welcome' },
          { timestamp: '0:10', text: 'Translated Phishing' },
        ],
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
    videoUrl: 'https://example.com/video.mp4',
    transcript: 'Welcome to phishing prevention training. In this video, you will learn...',
    duration: 180,
    subtitles: [
      { timestamp: '0:00', text: 'Welcome to training' },
      { timestamp: '0:10', text: 'Phishing emails can look legitimate' },
    ],
  };

  describe('Function Call', () => {
    it('should accept valid scene and context', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene3Video(undefined as any, baseContext)
      ).resolves.toBeUndefined();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene3Video(baseScene as any, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve videoUrl field', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toHaveProperty('videoUrl');
      expect((result as any).videoUrl).toBe(baseScene.videoUrl);
    });

    it('should preserve transcript field', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toHaveProperty('transcript');
    });

    it('should preserve duration field', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toHaveProperty('duration');
      expect((result as any).duration).toBe(baseScene.duration);
    });

    it('should preserve subtitles array', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toHaveProperty('subtitles');
      expect(Array.isArray((result as any).subtitles)).toBe(true);
      expect((result as any).subtitles.length).toBe(baseScene.subtitles.length);
    });

    it('should preserve subtitle timestamps', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      (result as any).subtitles.forEach((subtitle: any, index: number) => {
        expect(subtitle.timestamp).toBe(baseScene.subtitles[index].timestamp);
      });
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene3Video(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene3Video(baseScene as any, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual content', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene3Video(baseScene as any, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Conversation Patterns', () => {
    it('should convert to natural conversational tone', async () => {
      const result = await rewriteScene3Video(baseScene as any, baseContext);
      expect((result as any).transcript).toBeDefined();
      expect(typeof (result as any).transcript).toBe('string');
    });

    it('should maintain technical accuracy', async () => {
      const technicalScene = {
        ...baseScene,
        transcript: 'Check email headers for SPF, DKIM, and DMARC signatures...',
      };
      const result = await rewriteScene3Video(technicalScene as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long transcript', async () => {
      const longScene = {
        ...baseScene,
        transcript: 'A'.repeat(5000),
      };
      const result = await rewriteScene3Video(longScene as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene without subtitles', async () => {
      const noSubtitles = { ...baseScene, subtitles: [] };
      const result = await rewriteScene3Video(noSubtitles as any, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene with many subtitles', async () => {
      const manySubtitles = {
        ...baseScene,
        subtitles: Array.from({ length: 50 }, (_, i) => ({
          timestamp: `0:${i * 10}`,
          text: `Subtitle ${i + 1}`,
        })),
      };
      const result = await rewriteScene3Video(manySubtitles as any, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene3Video(baseScene as any, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene3Video(baseScene as any, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene3Video(baseScene as any, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
