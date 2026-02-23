import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDeepfakeVideoTool } from './generate-deepfake-video-tool';

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('../../utils/core/id-utils', () => ({
  uuidv4: () => 'test-uuid-123',
}));

const originalEnv = process.env;

describe('generateDeepfakeVideoTool', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  describe('tool configuration', () => {
    it('should have correct tool ID', () => {
      expect(generateDeepfakeVideoTool.id).toBe('generate-deepfake-video');
    });

    it('should have description', () => {
      expect(generateDeepfakeVideoTool.description).toContain('HeyGen');
      expect(generateDeepfakeVideoTool.description).toContain('video');
    });

    it('should have input schema with required fields', () => {
      const schema = generateDeepfakeVideoTool.inputSchema;
      expect(schema).toBeDefined();
      expect(schema.shape.inputText).toBeDefined();
      expect(schema.shape.avatarId).toBeDefined();
      expect(schema.shape.voiceId).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return error when HEYGEN_API_KEY is not set', async () => {
      delete process.env.HEYGEN_API_KEY;

      const result = await generateDeepfakeVideoTool.execute!({
        context: {
          inputText: 'Hello',
          avatarId: 'av-1',
          voiceId: 'v-1',
        },
      } as any);

      expect(result).toEqual({
        success: false,
        error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
      });
    });

    it('should return videoId when API succeeds', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { video_id: 'vid-abc-123', status: 'pending' },
          }),
          { status: 200 }
        )
      );

      const result = await generateDeepfakeVideoTool.execute!({
        context: {
          inputText: 'Welcome to security training.',
          avatarId: 'av-1',
          voiceId: 'v-1',
        },
      } as any);

      expect(result).toMatchObject({
        success: true,
        videoId: 'vid-abc-123',
      });
    });

    it('should return error when API returns non-200', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Bad Request', { status: 400 })
      );

      const result = await generateDeepfakeVideoTool.execute!({
        context: {
          inputText: 'Script',
          avatarId: 'av-1',
          voiceId: 'v-1',
        },
      } as any);

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('400'),
      });
    });

    it('should pass optional params to request body', async () => {
      process.env.HEYGEN_API_KEY = 'test-key';
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({ data: { video_id: 'vid-2', status: 'pending' } }),
          { status: 200 }
        )
      );

      await generateDeepfakeVideoTool.execute!({
        context: {
          inputText: 'Script',
          avatarId: 'av-1',
          voiceId: 'v-1',
          title: 'My Video',
          orientation: 'portrait',
          emotion: 'Serious',
          speed: 1.1,
          avatarStyle: 'closeUp',
          caption: false,
        },
      } as any);

      const callBody = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(callBody.title).toBe('My Video');
      expect(callBody.video_inputs[0].voice.emotion).toBe('Serious');
      expect(callBody.video_inputs[0].voice.speed).toBe(1.1);
      expect(callBody.video_inputs[0].character.avatar_style).toBe('closeUp');
      expect(callBody.caption).toBe(false);
    });
  });
});
