/**
 * Generate Deepfake Video Tool
 *
 * Triggers video generation via HeyGen Create Video V2 API.
 * Builds a structured scene with character (avatar), voice (text-to-speech),
 * and background, then returns a video_id — HeyGen renders asynchronously.
 *
 * UI Integration:
 * - Emits `::ui:deepfake_video_generating::{payload}::/ui:deepfake_video_generating::`
 *   so the frontend can show a "generating..." state and poll for completion.
 *
 * Polling:
 * - Frontend uses the video_id to poll GET /deepfake/status/:videoId (our backend proxy)
 * - When status === "completed", backend returns video_url for the player.
 *
 * API: POST https://api.heygen.com/v2/video/generate
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
  inputText: z
    .string()
    .describe(
      'The actual spoken script text for the avatar. This is what the avatar will say in the video, written in the target language. No stage directions or tags — only spoken words.'
    ),
  avatarId: z
    .string()
    .describe('HeyGen avatar_id selected by the user from the listHeyGenAvatars tool response.'),
  voiceId: z
    .string()
    .describe('HeyGen voice_id selected by the user from the listHeyGenVoices tool response.'),
  title: z
    .string()
    .optional()
    .describe('Title for the video (e.g., "Deepfake Simulation - CEO Fraud"). Used for organization in HeyGen.'),
  orientation: z
    .enum(['portrait', 'landscape'])
    .optional()
    .describe('Video orientation. portrait = vertical (mobile), landscape = horizontal (desktop). Defaults to landscape.'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color in hex format (e.g., "#1a1a2e"). Defaults to professional dark background.'),
  emotion: z
    .enum(['Excited', 'Friendly', 'Serious', 'Soothing', 'Broadcaster'])
    .optional()
    .describe(
      'Voice emotion to apply. Mapped from urgency + persona: High urgency CEO → "Serious", IT Support → "Friendly", Bank fraud alert → "Excited". Only applied if the selected voice supports emotions.'
    ),
  speed: z
    .number()
    .min(0.5)
    .max(1.5)
    .optional()
    .describe(
      'Voice speed multiplier (0.5–1.5). Mapped from urgency: Low → 0.9, Medium → 1.0, High → 1.15. Defaults to 1.0.'
    ),
  avatarStyle: z
    .enum(['normal', 'closeUp', 'circle'])
    .optional()
    .describe(
      'Avatar visual style. "closeUp" for high-pressure executive scenarios, "circle" for thumbnail-style, "normal" for standard framing. Defaults to normal.'
    ),
  locale: z
    .string()
    .optional()
    .describe(
      'Voice locale/accent code for multilingual voices (e.g., "en-US", "tr-TR", "en-GB"). Ensures correct accent for the target language.'
    ),
  caption: z
    .boolean()
    .optional()
    .describe('Whether to enable captions/subtitles in the video. Defaults to true for accessibility.'),
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
// Helper: Build V2 request body
// ============================================

function buildV2RequestBody(params: {
  inputText: string;
  avatarId: string;
  voiceId: string;
  title?: string;
  orientation: 'portrait' | 'landscape';
  backgroundColor: string;
  emotion?: string;
  speed?: number;
  avatarStyle: 'normal' | 'closeUp' | 'circle';
  locale?: string;
  caption: boolean;
}): Record<string, unknown> {
  const dimension = HEYGEN.DIMENSIONS[params.orientation];

  const voice: Record<string, unknown> = {
    type: 'text',
    voice_id: params.voiceId,
    input_text: params.inputText,
  };
  if (params.emotion) voice.emotion = params.emotion;
  if (params.speed !== undefined) voice.speed = params.speed;
  if (params.locale) voice.locale = params.locale;

  const requestBody: Record<string, unknown> = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: params.avatarId,
          avatar_style: params.avatarStyle,
        },
        voice,
        background: {
          type: 'color',
          value: params.backgroundColor,
        },
      },
    ],
    dimension: {
      width: dimension.width,
      height: dimension.height,
    },
    caption: params.caption,
  };

  if (params.title) {
    requestBody.title = params.title;
  }

  return requestBody;
}

// ============================================
// Tool Definition
// ============================================

export const generateDeepfakeVideoTool = createTool({
  id: 'generate-deepfake-video',
  description:
    'Generates a deepfake video simulation using HeyGen Create Video V2 API. Takes the spoken script text, avatar ID, and voice ID. Returns immediately with a video_id — the video renders asynchronously in the background.',
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
        inputText,
        avatarId,
        voiceId,
        title,
        orientation = HEYGEN.DEFAULT_ORIENTATION,
        backgroundColor = HEYGEN.DEFAULT_BACKGROUND_COLOR,
        emotion,
        speed,
        avatarStyle = 'normal',
        locale,
        caption = true,
      } = context;

      const url = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.GENERATE_VIDEO}`;

      const requestBody = buildV2RequestBody({
        inputText,
        avatarId,
        voiceId,
        title,
        orientation,
        backgroundColor,
        emotion,
        speed,
        avatarStyle,
        locale,
        caption,
      });

      logger.info('generate_deepfake_video_request', {
        avatarId,
        voiceId,
        orientation,
        avatarStyle,
        emotion: emotion ?? 'none',
        speed: speed ?? 1.0,
        locale: locale ?? 'default',
        caption,
        inputTextLength: inputText.length,
        fullRequestBody: JSON.stringify(requestBody).substring(0, 1500),
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
          error: 'Video generation failed. Please check your avatar and voice selection, then try again.',
        };
      }

      const data = await response.json();

      logger.info('generate_deepfake_video_raw_response', {
        response: JSON.stringify(data).substring(0, 1000),
      });

      // HeyGen V2 response: { error: null, data: { video_id: "..." } }
      if (data?.error) {
        logger.error('generate_deepfake_video_heygen_error', {
          error: JSON.stringify(data.error).substring(0, 500),
        });
        const errorMsg = typeof data.error === 'object' ? data.error.message ?? JSON.stringify(data.error) : String(data.error);
        logger.error('generate_deepfake_video_heygen_error_detail', { errorMsg: errorMsg.substring(0, 500) });
        return {
          success: false,
          error: 'Video generation failed due to a configuration issue. Please try a different avatar or voice.',
        };
      }

      const videoId: string = data?.data?.video_id ?? '';

      if (!videoId) {
        logger.error('generate_deepfake_video_no_id', { response: JSON.stringify(data).substring(0, 500) });
        return {
          success: false,
          error: 'HeyGen returned a successful response but no video_id was found.',
        };
      }

      logger.info('generate_deepfake_video_success', {
        videoId,
        durationMs: Date.now() - startTime,
      });

      await emitVideoGeneratingSignal(writer, {
        videoId,
        status: 'generating',
      });

      return {
        success: true,
        videoId,
        message: 'Video generation started. Rendering typically takes 5–10 minutes for AI avatars.',
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
