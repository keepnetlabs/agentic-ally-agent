/**
 * Generate Deepfake Video Tool
 *
 * Triggers video generation via HeyGen Video Agent API.
 * Returns a video_id immediately — HeyGen renders the video asynchronously.
 *
 * UI Integration:
 * - Emits `::ui:deepfake_video_generating::{payload}::/ui:deepfake_video_generating::`
 *   so the frontend can show a "generating..." state and poll for completion.
 *
 * Polling:
 * - Frontend uses the video_id to poll GET /deepfake/status/:videoId (our backend proxy)
 * - When status === "completed", backend returns video_url for the player.
 *
 * API: POST https://api.heygen.com/v1/video_agent/generate
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HEYGEN } from '../../constants';
import { uuidv4 } from '../../utils/core/id-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

const logger = getLogger('GenerateDeepfakeVideoTool');

// ============================================
// Schemas
// ============================================

const generateDeepfakeVideoInputSchema = z.object({
  prompt: z
    .string()
    .describe(
      'Full script/prompt for the HeyGen Video Agent. Describes who the persona is, what they say, and the tone. Written in the target language.'
    ),
  avatarId: z
    .string()
    .optional()
    .describe('HeyGen avatar_id selected by the user. If omitted, HeyGen picks a default.'),
  durationSec: z
    .number()
    .min(5)
    .optional()
    .describe('Approximate video duration in seconds (minimum 5). Defaults to 60.'),
  orientation: z
    .enum(['portrait', 'landscape'])
    .optional()
    .describe('Video orientation. portrait = vertical (mobile), landscape = horizontal (desktop). Defaults to landscape.'),
});

const generateDeepfakeVideoOutputSchema = z.object({
  success: z.boolean(),
  videoId: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// Helper: Emit UI signal to frontend
// ============================================

async function emitVideoGeneratingSignal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  writer: any,
  payload: { videoId: string; status: string }
): Promise<void> {
  if (!writer) return;

  try {
    const messageId = uuidv4();
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    await writer.write({ type: 'text-start', id: messageId });
    await writer.write({
      type: 'text-delta',
      id: messageId,
      delta: `::ui:deepfake_video_generating::${encoded}::/ui:deepfake_video_generating::\n`,
    });
    await writer.write({ type: 'text-end', id: messageId });

    logger.info('deepfake_video_ui_signal_emitted', {
      videoId: payload.videoId,
      status: payload.status,
    });
  } catch (emitErr) {
    logger.warn('deepfake_video_ui_signal_failed', {
      error: normalizeError(emitErr).message,
    });
  }
}

// ============================================
// Tool Definition
// ============================================

export const generateDeepfakeVideoTool = createTool({
  id: 'generate-deepfake-video',
  description:
    'Generates a deepfake video simulation using HeyGen Video Agent. Takes a prompt describing the scenario and an optional avatar ID. Returns immediately with a video_id — the video renders asynchronously in the background.',
  inputSchema: generateDeepfakeVideoInputSchema,
  outputSchema: generateDeepfakeVideoOutputSchema,
  execute: async ({ context, writer }) => {
    const startTime = Date.now();

    try {
      const apiKey = process.env.HEYGEN_API_KEY;
      if (!apiKey) {
        logger.error('heygen_api_key_missing');
        return {
          success: false,
          error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
        };
      }

      const {
        prompt,
        avatarId,
        durationSec = HEYGEN.DEFAULT_DURATION_SEC,
        orientation = HEYGEN.DEFAULT_ORIENTATION,
      } = context;

      const url = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.GENERATE_VIDEO}`;

      // Build request body — only include optional fields when provided
      const requestBody: Record<string, unknown> = { prompt };

      const config: Record<string, unknown> = { orientation, duration_sec: durationSec };
      if (avatarId) config.avatar_id = avatarId;
      requestBody.config = config;

      logger.info('generate_deepfake_video_request', {
        avatarId: avatarId ?? 'default',
        durationSec,
        orientation,
        promptLength: prompt.length,
      });

      const response = await withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEYGEN.API_TIMEOUT_MS);

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          return res;
        } finally {
          clearTimeout(timeoutId);
        }
      }, 'generate_deepfake_video');

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error('generate_deepfake_video_api_error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody.substring(0, 500),
        });
        return {
          success: false,
          error: `HeyGen API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // HeyGen response: { error: null, data: { video_id: "..." } }
      const videoId: string = data?.data?.video_id ?? '';

      if (!videoId) {
        logger.error('generate_deepfake_video_no_id', { response: JSON.stringify(data).substring(0, 200) });
        return {
          success: false,
          error: 'HeyGen returned a successful response but no video_id was found.',
        };
      }

      logger.info('generate_deepfake_video_success', {
        videoId,
        durationMs: Date.now() - startTime,
      });

      // Emit ::ui:deepfake_video_generating:: signal to frontend
      // Frontend uses videoId to poll GET /deepfake/status/:videoId for completion
      await emitVideoGeneratingSignal(writer, {
        videoId,
        status: 'generating',
      });

      return {
        success: true,
        videoId,
        message: 'Video generation started. The video will be ready in approximately 1-2 minutes.',
      };
    } catch (error) {
      const err = normalizeError(error);

      if (err.name === 'AbortError') {
        logger.error('generate_deepfake_video_timeout', { timeoutMs: HEYGEN.API_TIMEOUT_MS });
        return {
          success: false,
          error: `Request timed out after ${HEYGEN.API_TIMEOUT_MS}ms. HeyGen API may be experiencing high load.`,
        };
      }

      logger.error('generate_deepfake_video_error', {
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: `Failed to generate video: ${err.message}`,
      };
    }
  },
});
