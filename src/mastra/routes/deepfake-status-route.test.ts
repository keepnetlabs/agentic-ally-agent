import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { deepfakeStatusHandler } from './deepfake-status-route';
import { HEYGEN } from '../constants';

/* ------------------------------------------------------------------ */
/*  Mocks — vi.hoisted() ensures these exist before vi.mock factories  */
/* ------------------------------------------------------------------ */

const { mockLogger, mockNormalizeError, mockLogErrorInfo, mockExternalError } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  mockNormalizeError: vi.fn((err: unknown) => ({
    name: (err as Error)?.name ?? 'Error',
    message: (err as Error)?.message ?? 'Unknown error',
    stack: (err as Error)?.stack,
  })),
  mockLogErrorInfo: vi.fn(),
  mockExternalError: vi.fn((msg: string, ctx?: object) => ({ message: msg, ...ctx })),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue(mockLogger),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: (err: unknown) => mockNormalizeError(err),
  logErrorInfo: (logger: unknown, level: unknown, msg: unknown, info: unknown) => mockLogErrorInfo(logger, level, msg, info),
}));

vi.mock('../services/error-service', () => ({
  errorService: {
    external: (...args: unknown[]) => mockExternalError(...(args as [string, object?])),
  },
}));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function createMockContext(videoId: string | undefined) {
  const jsonFn = vi.fn();
  return {
    req: {
      param: vi.fn((name: string) => (name === 'videoId' ? videoId : undefined)),
    },
    json: jsonFn,
  } as any;
}

/** Helper to build a successful HeyGen API mock response */
function mockHeyGenResponse(data: Record<string, unknown>) {
  return {
    ok: true,
    json: () => Promise.resolve({ data }),
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

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

  /* ================================================================ */
  /*  1. Input validation                                              */
  /* ================================================================ */
  describe('validation', () => {
    it('should return 400 when videoId is undefined', async () => {
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

    it('should not call fetch when videoId is invalid', async () => {
      global.fetch = vi.fn();
      const c = createMockContext('');
      await deepfakeStatusHandler(c);
      expect(global.fetch).not.toHaveBeenCalled();
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

    it('should return 503 when HEYGEN_API_KEY is empty string', async () => {
      process.env.HEYGEN_API_KEY = '';
      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);
      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen is not configured on this server' },
        503
      );
    });

    it('should log error when HEYGEN_API_KEY is missing', async () => {
      delete process.env.HEYGEN_API_KEY;
      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);
      expect(mockLogger.error).toHaveBeenCalledWith('deepfake_status_api_key_missing');
    });
  });

  /* ================================================================ */
  /*  2. Fetch URL construction and headers                            */
  /* ================================================================ */
  describe('fetch request construction', () => {
    it('should call HeyGen API with correct URL and headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processing' } }),
      });

      const c = createMockContext('vid-abc');
      await deepfakeStatusHandler(c);

      const expectedUrl = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.VIDEO_STATUS}?video_id=vid-abc`;
      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'GET',
          headers: { 'x-api-key': 'test-heygen-key' },
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should URL-encode the videoId parameter', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processing' } }),
      });

      const c = createMockContext('vid with spaces&special=chars');
      await deepfakeStatusHandler(c);

      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain(encodeURIComponent('vid with spaces&special=chars'));
      expect(fetchUrl).not.toContain('vid with spaces');
    });

    it('should trim whitespace from videoId before sending', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'processing' } }),
      });

      const c = createMockContext('  vid-trimmed  ');
      await deepfakeStatusHandler(c);

      const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('video_id=vid-trimmed');
      expect(fetchUrl).not.toContain('video_id=%20');
    });
  });

  /* ================================================================ */
  /*  3. HeyGen API success responses                                  */
  /* ================================================================ */
  describe('HeyGen API success', () => {
    it('should return completed status with all video fields', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-123',
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/thumb.jpg',
          duration: 120,
        })
      );

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
          videoUrlCaption: null,
        },
        200
      );
    });

    it('should return videoUrlCaption when HeyGen returns completed with captions', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-captions',
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/thumb.jpg',
          duration: 90,
          video_url_caption: 'https://files2.heygen.ai/movio/video/abc123/caption.mp4',
        })
      );

      const c = createMockContext('vid-captions');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          videoId: 'vid-captions',
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          durationSec: 90,
          videoUrlCaption: 'https://files2.heygen.ai/movio/video/abc123/caption.mp4',
        },
        200
      );
    });

    it('should return processing status when video is still processing', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ video_id: 'vid-456', status: 'processing' })
      );

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
          videoUrlCaption: null,
        },
        200
      );
    });

    it('should return pending status correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ video_id: 'vid-pend', status: 'pending' })
      );

      const c = createMockContext('vid-pend');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, status: 'pending' }),
        200
      );
    });

    it('should return waiting status correctly', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ video_id: 'vid-wait', status: 'waiting' })
      );

      const c = createMockContext('vid-wait');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, status: 'waiting' }),
        200
      );
    });

    it('should not include failureReason or failureCode for non-failed statuses', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-ok',
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
        })
      );

      const c = createMockContext('vid-ok');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('failureReason');
      expect(body).not.toHaveProperty('failureCode');
    });

    it('should default status to processing when data is empty', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({})
      );

      const c = createMockContext('vid-empty');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        {
          success: true,
          videoId: 'vid-empty',
          status: 'processing',
          videoUrl: null,
          thumbnailUrl: null,
          durationSec: null,
          videoUrlCaption: null,
        },
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

    it('should default to processing when data key is absent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const c = createMockContext('vid-nodata');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          videoId: 'vid-nodata',
          status: 'processing',
          videoUrl: null,
          thumbnailUrl: null,
          durationSec: null,
          videoUrlCaption: null,
        }),
        200
      );
    });

    it('should use videoId from context, not from HeyGen response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'heygen-internal-id',
          status: 'completed',
          video_url: 'https://example.com/video.mp4',
        })
      );

      const c = createMockContext('my-custom-id');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.videoId).toBe('my-custom-id');
    });
  });

  /* ================================================================ */
  /*  4. Failure status — error extraction branches                    */
  /* ================================================================ */
  describe('failure status — error extraction', () => {
    it('should extract failureReason from error.detail and failureCode from error.code', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-789',
          status: 'failed',
          error: {
            code: 'RENDER_FAILED',
            detail: 'Video rendering failed due to invalid content',
          },
        })
      );

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

    it('should fall back to error.message when error.detail is absent', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-msg',
          status: 'failed',
          error: { message: 'Generic error message' },
        })
      );

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

    it('should JSON.stringify when error object has neither detail nor message', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-json',
          status: 'failed',
          error: { code: 'UNKNOWN', customField: 'custom' },
        })
      );

      const c = createMockContext('vid-json');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.failureCode).toBe('UNKNOWN');
      expect(body.failureReason).toContain('UNKNOWN');
      expect(body.failureReason).toContain('custom');
    });

    it('should use failureReason directly when error is a string', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-str',
          status: 'failed',
          error: 'Simple error string',
        })
      );

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

    it('should not include failureCode when error is a plain string', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-str-no-code',
          status: 'failed',
          error: 'Just a string',
        })
      );

      const c = createMockContext('vid-str-no-code');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('failureCode');
    });

    it('should fall back to videoData.message when error is a non-object non-string value', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-msg-fallback',
          status: 'failed',
          error: 12345,
          message: 'Rendering failed with code',
        })
      );

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

    it('should fall back to videoData.message when no error field is present', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-fallback',
          status: 'failed',
          message: 'Video failed to render',
        })
      );

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

    it('should fall back to top-level data.error when videoData.error is undefined', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { code: 'TOP_LEVEL', detail: 'Top-level error detail' },
            data: {
              video_id: 'vid-toplevel',
              status: 'failed',
            },
          }),
      });

      const c = createMockContext('vid-toplevel');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'failed',
          failureReason: 'Top-level error detail',
          failureCode: 'TOP_LEVEL',
        }),
        200
      );
    });

    it('should have null failureReason when failed with no error info at all', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-no-err',
          status: 'failed',
        })
      );

      const c = createMockContext('vid-no-err');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.status).toBe('failed');
      // No failureReason/failureCode should be spread when they are null
      expect(body).not.toHaveProperty('failureReason');
      expect(body).not.toHaveProperty('failureCode');
    });

    it('should convert error.code to string when it is a number', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-numcode',
          status: 'failed',
          error: { code: 42, detail: 'Numeric code error' },
        })
      );

      const c = createMockContext('vid-numcode');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.failureCode).toBe('42');
      expect(body.failureReason).toBe('Numeric code error');
    });

    it('should set failureCode to null when error object has no code field', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-nocode',
          status: 'failed',
          error: { detail: 'No code provided' },
        })
      );

      const c = createMockContext('vid-nocode');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.failureReason).toBe('No code provided');
      expect(body).not.toHaveProperty('failureCode');
    });

    it('should handle error as boolean (falsy) — falls through to videoData.message', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-false-err',
          status: 'failed',
          error: false,
          message: 'Fallback message',
        })
      );

      const c = createMockContext('vid-false-err');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      expect(body.failureReason).toBe('Fallback message');
    });

    it('should handle error as null — falls through to videoData.message check', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-null-err',
          status: 'failed',
          error: null,
          message: 'Null error fallback',
        })
      );

      const c = createMockContext('vid-null-err');
      await deepfakeStatusHandler(c);

      const body = c.json.mock.calls[0][0];
      // error is null, falls through all branches. videoData.message check applies.
      expect(body.failureReason).toBe('Null error fallback');
    });
  });

  /* ================================================================ */
  /*  5. HeyGen API HTTP errors (non-ok responses)                     */
  /* ================================================================ */
  describe('HeyGen API errors', () => {
    it('should return 502 when HeyGen API returns 500', async () => {
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

    it('should return 502 when HeyGen API returns 429 (rate limit)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too Many Requests'),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'HeyGen API returned 429' },
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

    it('should log the error body (truncated to 200 chars) on API error', async () => {
      const longBody = 'x'.repeat(300);
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve(longBody),
      });

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'deepfake_status_api_error',
        expect.objectContaining({
          videoId: 'vid-123',
          status: 503,
          body: longBody.substring(0, 200),
        })
      );
    });
  });

  /* ================================================================ */
  /*  6. Fetch-level errors (network, timeout, parse)                  */
  /* ================================================================ */
  describe('fetch error handling', () => {
    it('should return 500 when fetch throws a network error', async () => {
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

    it('should log timeout details on AbortError', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortErr);

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'deepfake_status_timeout',
        { timeoutMs: HEYGEN.API_TIMEOUT_MS }
      );
    });

    it('should return 500 when response.json() throws (invalid JSON)', async () => {
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

    it('should call errorService.external for non-abort errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(mockExternalError).toHaveBeenCalledWith(
        'DNS resolution failed',
        expect.objectContaining({
          route: '/deepfake/status/:videoId',
        })
      );
    });

    it('should NOT call errorService.external for AbortError', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortErr);

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(mockExternalError).not.toHaveBeenCalled();
    });

    it('should call logErrorInfo for non-abort errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Unexpected failure'));

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(mockLogErrorInfo).toHaveBeenCalledWith(
        mockLogger,
        'error',
        'deepfake_status_error',
        expect.any(Object)
      );
    });

    it('should handle non-Error thrown values gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue('string-error');

      const c = createMockContext('vid-123');
      await deepfakeStatusHandler(c);

      expect(c.json).toHaveBeenCalledWith(
        { success: false, error: 'Failed to fetch video status' },
        500
      );
    });
  });

  /* ================================================================ */
  /*  7. Logging — info-level calls                                    */
  /* ================================================================ */
  describe('logging', () => {
    it('should log deepfake_status_request with videoId on valid request', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ status: 'processing' })
      );

      const c = createMockContext('vid-log-test');
      await deepfakeStatusHandler(c);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'deepfake_status_request',
        { videoId: 'vid-log-test' }
      );
    });

    it('should log deepfake_status_raw with truncated raw data', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ video_id: 'vid-raw', status: 'completed' })
      );

      const c = createMockContext('vid-raw');
      await deepfakeStatusHandler(c);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'deepfake_status_raw',
        expect.objectContaining({
          videoId: 'vid-raw',
          rawData: expect.any(String),
        })
      );
    });

    it('should log deepfake_status_result with status and failure info', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({
          video_id: 'vid-result',
          status: 'failed',
          error: { code: 'ERR_1', detail: 'Something broke' },
        })
      );

      const c = createMockContext('vid-result');
      await deepfakeStatusHandler(c);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'deepfake_status_result',
        {
          videoId: 'vid-result',
          status: 'failed',
          failureCode: 'ERR_1',
          failureReason: 'Something broke',
        }
      );
    });

    it('should log null failureCode and failureReason for non-failed status', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ video_id: 'vid-ok', status: 'completed' })
      );

      const c = createMockContext('vid-ok');
      await deepfakeStatusHandler(c);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'deepfake_status_result',
        {
          videoId: 'vid-ok',
          status: 'completed',
          failureCode: null,
          failureReason: null,
        }
      );
    });
  });

  /* ================================================================ */
  /*  8. Return value — handler always returns c.json(...)             */
  /* ================================================================ */
  describe('return value', () => {
    it('should return the result of c.json() on success', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        mockHeyGenResponse({ status: 'completed' })
      );

      const c = createMockContext('vid-ret');
      c.json.mockReturnValue('mock-response-object');

      const result = await deepfakeStatusHandler(c);
      expect(result).toBe('mock-response-object');
    });

    it('should return the result of c.json() on validation error', async () => {
      const c = createMockContext('');
      c.json.mockReturnValue('validation-error-response');

      const result = await deepfakeStatusHandler(c);
      expect(result).toBe('validation-error-response');
    });

    it('should return the result of c.json() on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('boom'));

      const c = createMockContext('vid-err-ret');
      c.json.mockReturnValue('error-response');

      const result = await deepfakeStatusHandler(c);
      expect(result).toBe('error-response');
    });
  });
});
