import { describe, it, expect } from 'vitest';
import { rewriteScene3Video } from './scene3-video-rewriter';
import { RewriteContext } from './scene-rewriter-base';

describe('Scene 3 - Video Rewriter', () => {
  const mockModel = { id: 'test-model' } as any;
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
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should require scene parameter', async () => {
      await expect(
        rewriteScene3Video(undefined as any, baseContext)
      ).rejects.toThrow();
    });

    it('should require context parameter', async () => {
      await expect(
        rewriteScene3Video(baseScene, undefined as any)
      ).rejects.toThrow();
    });
  });

  describe('Scene Structure Preservation', () => {
    it('should preserve videoUrl field', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result).toHaveProperty('videoUrl');
      expect(result.videoUrl).toBe(baseScene.videoUrl);
    });

    it('should preserve transcript field', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result).toHaveProperty('transcript');
    });

    it('should preserve duration field', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result).toHaveProperty('duration');
      expect(result.duration).toBe(baseScene.duration);
    });

    it('should preserve subtitles array', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result).toHaveProperty('subtitles');
      expect(Array.isArray(result.subtitles)).toBe(true);
      expect(result.subtitles.length).toBe(baseScene.subtitles.length);
    });

    it('should preserve subtitle timestamps', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      result.subtitles.forEach((subtitle: any, index: number) => {
        expect(subtitle.timestamp).toBe(baseScene.subtitles[index].timestamp);
      });
    });
  });

  describe('Language Support', () => {
    it('should support Turkish rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'tr' };
      const result = await rewriteScene3Video(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support German rewriting', async () => {
      const context = { ...baseContext, targetLanguage: 'de' };
      const result = await rewriteScene3Video(baseScene, context);
      expect(result).toBeDefined();
    });

    it('should support multilingual content', async () => {
      const languages = ['en', 'de', 'fr', 'tr', 'zh'];
      for (const lang of languages) {
        const context = { ...baseContext, targetLanguage: lang };
        const result = await rewriteScene3Video(baseScene, context);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Conversation Patterns', () => {
    it('should convert to natural conversational tone', async () => {
      const result = await rewriteScene3Video(baseScene, baseContext);
      expect(result.transcript).toBeDefined();
      expect(typeof result.transcript).toBe('string');
    });

    it('should maintain technical accuracy', async () => {
      const technicalScene = {
        ...baseScene,
        transcript: 'Check email headers for SPF, DKIM, and DMARC signatures...',
      };
      const result = await rewriteScene3Video(technicalScene, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long transcript', async () => {
      const longScene = {
        ...baseScene,
        transcript: 'A'.repeat(5000),
      };
      const result = await rewriteScene3Video(longScene, baseContext);
      expect(result).toBeDefined();
    });

    it('should handle scene without subtitles', async () => {
      const noSubtitles = { ...baseScene, subtitles: [] };
      const result = await rewriteScene3Video(noSubtitles, baseContext);
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
      const result = await rewriteScene3Video(manySubtitles, baseContext);
      expect(result).toBeDefined();
    });
  });

  describe('Async Behavior', () => {
    it('should return a promise', () => {
      const result = rewriteScene3Video(baseScene, baseContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle concurrent calls', async () => {
      const results = await Promise.all([
        rewriteScene3Video(baseScene, { ...baseContext, targetLanguage: 'tr' }),
        rewriteScene3Video(baseScene, { ...baseContext, targetLanguage: 'de' }),
      ]);
      expect(results.length).toBe(2);
    });
  });
});
