/**
 * Deepfake Video Status Route
 *
 * Backend proxy for HeyGen video status polling.
 * Keeps HEYGEN_API_KEY server-side — frontend never sees it.
 *
 * Flow:
 *   Frontend receives video_id from ::ui:deepfake_video_generating:: signal
 *   → polls GET /deepfake/status/:videoId every ~10s
 *   → this handler calls HeyGen GET /v1/video_status.get?video_id=...
 *   → returns { status, videoUrl } to frontend
 *   → frontend shows <video> player when status === "completed"
 *
 * Terminal statuses: completed | failed
 * In-progress:       processing | pending | waiting
 */

import { Context } from 'hono';
import { HEYGEN } from '../constants';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';

const logger = getLogger('DeepfakeStatusRoute');

export async function deepfakeStatusHandler(c: Context) {
  try {
    const videoId = c.req.param('videoId');

    if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
      return c.json({ success: false, error: 'Missing videoId' }, 400);
    }

    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      logger.error('deepfake_status_api_key_missing');
      return c.json({ success: false, error: 'HeyGen is not configured on this server' }, 503);
    }

    const url = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.VIDEO_STATUS}?video_id=${encodeURIComponent(videoId.trim())}`;

    logger.info('deepfake_status_request', { videoId });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEYGEN.API_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.error('deepfake_status_api_error', {
        videoId,
        status: response.status,
        body: errorBody.substring(0, 200),
      });
      return c.json(
        { success: false, error: `HeyGen API returned ${response.status}` },
        502
      );
    }

    const data = await response.json();

    // HeyGen response shape:
    // Success: { error: null, data: { video_id, status, video_url, thumbnail_url, duration } }
    // Failed:  { error: null, data: { video_id, status: "failed", error: { code, message } } }
    const videoData = data?.data ?? {};
    const status: string = videoData.status ?? 'processing';
    const videoUrl: string | null = videoData.video_url ?? null;
    const thumbnailUrl: string | null = videoData.thumbnail_url ?? null;
    const durationSec: number | null = videoData.duration ?? null;

    // Extract failure reason from HeyGen when video rendering fails
    let failureReason: string | null = null;
    let failureCode: string | null = null;
    if (status === 'failed') {
      const heygenError = videoData.error ?? data?.error;
      if (heygenError && typeof heygenError === 'object') {
        const errObj = heygenError as Record<string, unknown>;
        failureCode = errObj.code ? String(errObj.code) : null;
        failureReason = errObj.detail
          ? String(errObj.detail)
          : errObj.message
            ? String(errObj.message)
            : JSON.stringify(heygenError);
      } else if (typeof heygenError === 'string') {
        failureReason = heygenError;
      } else if (videoData.message) {
        failureReason = String(videoData.message);
      }
    }

    logger.info('deepfake_status_raw', { videoId, rawData: JSON.stringify(data).substring(0, 500) });
    logger.info('deepfake_status_result', { videoId, status, failureCode, failureReason });

    return c.json(
      {
        success: true,
        videoId,
        status,
        videoUrl,
        thumbnailUrl,
        durationSec,
        ...(failureReason ? { failureReason } : {}),
        ...(failureCode ? { failureCode } : {}),
      },
      200
    );
  } catch (error) {
    const err = normalizeError(error);

    if (err.name === 'AbortError') {
      logger.error('deepfake_status_timeout', { timeoutMs: HEYGEN.API_TIMEOUT_MS });
      return c.json({ success: false, error: 'Request timed out' }, 504);
    }

    const errorInfo = errorService.external(err.message, {
      route: '/deepfake/status/:videoId',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'deepfake_status_error', errorInfo);

    return c.json({ success: false, error: 'Failed to fetch video status' }, 500);
  }
}
