import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { deepfakeStatusHandler } from './deepfake-status-route';

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: unknown) => ({
    name: (err as Error)?.name ?? 'Error',
    message: (err as Error)?.message ?? 'Unknown error',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    external: vi.fn((msg: string, ctx?: object) => ({ message: msg, ...ctx })),
  },
}));

function createMockContext(videoId: string | undefined) {
  const jsonFn = vi.fn();
  return {
    req: {
      param: vi.fn((name: string) => (name === 'videoId' ? videoId : undefined)),
    },
    json: jsonFn,
  } as any;
}

describe('deepfakeStatusHandler', () => {
  let originalFetch: typeof global.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    originalEnv = { ...process.env };
    process.env.HEYGEN_API_KEY = 'test-heygen-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('validation', () => {
    it('should return 400 when videoId is missing', async () => {
      const c = createMockContext(undefined);
      await deepfakeStatusHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Missing videoId' },
        400
      );
    });

    it('should return 400 when videoId is empty string', async () => {
      const c = createMockContext('');
      await deepfakeStatusHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Missing videoId' },
        400
      );
    });

    it('should return 400 when videoId is whitespace only', async () => {
      const c = createMockContext('   ');
      await deepfakeStatusHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Missing videoId' },
        400
      );
    });

    it('should return 503 when HEYGEN_API_KEY is not configured', async () => {
      delete process.env.HEYGEN_API_KEY;
      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen is not configured on this server' },
        503
      );
    });
  });

  describe('HeyGen API success', () => {
    it('should return status and videoUrl when HeyGen returns completed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-123',
              status: 'completed',
              video_url: 'https://example.com/video.mp4',
              thumbnail_url: 'https://example.com/thumb.jpg',
              duration: 120,
            },
          }),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          videoId: 'vid-123',
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          durationSec: 120,
        },
        200
      );
    });

    it('should return processing status when video is still processing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-456',
              status: 'processing',
            },
          }),
      });

      const c = createMockContext('vid-456');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          videoId: 'vid-456',
          status: 'processing',
          videoUrl: null,
          thumbnailUrl: null,
          durationSec: null,
        },
        200
      );
    });

    it('should return failureReason when status is failed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-789',
              status: 'failed',
              error: {
                code: 'RENDER_FAILED',
                detail: 'Video rendering failed due to invalid content',
              },
            },
          }),
      });

      const c = createMockContext('vid-789');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          videoId: 'vid-789',
          status: 'failed',
          failureReason: 'Video rendering failed due to invalid content',
          failureCode: 'RENDER_FAILED',
        }),
        200
      );
    });

    it('should use message when error.detail is not present', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-msg',
              status: 'failed',
              error: { message: 'Generic error message' },
            },
          }),
      });

      const c = createMockContext('vid-msg');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: 'Generic error message',
        }),
        200
      );
    });

    it('should use videoData.message when error is non-object non-string (e.g. number)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-msg-fallback',
              status: 'failed',
              error: 12345,
              message: 'Rendering failed with code',
            },
          }),
      });

      const c = createMockContext('vid-msg-fallback');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: 'Rendering failed with code',
        }),
        200
      );
    });

    it('should use videoData.message when error object has no detail or message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-fallback',
              status: 'failed',
              message: 'Video failed to render',
            },
          }),
      });

      const c = createMockContext('vid-fallback');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: 'Video failed to render',
        }),
        200
      );
    });

    it('should default status to processing when data is empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const c = createMockContext('vid-empty');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          videoId: 'vid-empty',
          status: 'processing',
          videoUrl: null,
          thumbnailUrl: null,
          durationSec: null,
        }),
        200
      );
    });

    it('should default to processing when data is null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      const c = createMockContext('vid-null');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          videoId: 'vid-null',
          status: 'processing',
          videoUrl: null,
        }),
        200
      );
    });

    it('should use JSON.stringify when error object has neither detail nor message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-json',
              status: 'failed',
              error: { code: 'UNKNOWN', customField: 'custom' },
            },
          }),
      });

      const c = createMockContext('vid-json');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: expect.any(String),
          failureCode: 'UNKNOWN',
        }),
        200
      );
      const callArg = c.json.mock.calls[0][0];
      expect(callArg.failureReason).toContain('UNKNOWN');
    });

    it('should use failureReason when error is a string', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              video_id: 'vid-str',
              status: 'failed',
              error: 'Simple error string',
            },
          }),
      });

      const c = createMockContext('vid-str');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: 'Simple error string',
        }),
        200
      );
    });
  });

  describe('HeyGen API errors', () => {
    it('should return 502 when HeyGen API returns non-200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen API returned 500' },
        502
      );
    });

    it('should return 502 when HeyGen API returns 401', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen API returned 401' },
        502
      );
    });

    it('should handle response.text() throwing when reading error body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.reject(new Error('Read failed')),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen API returned 502' },
        502
      );
    });
  });

  describe('fetch error handling', () => {
    it('should return 500 when fetch throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch video status' },
        500
      );
    });

    it('should return 504 when request times out (AbortError)', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortErr);

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Request timed out' },
        504
      );
    });

    it('should return 500 when response.json() throws', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch video status' },
        500
      );
    });
  });
});
