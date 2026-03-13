/**
 * List HeyGen Avatars Tool
 *
 * Fetches all available avatars from HeyGen API.
 * Used by the Deepfake Video Agent to let the user pick an avatar
 * before generating a deepfake video simulation.
 *
 * API: GET https://api.heygen.com/v2/avatars
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HEYGEN } from '../../constants';

import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { withHeartbeat } from '../../utils/core/sse-heartbeat';

const logger = getLogger('ListHeyGenAvatarsTool');

// ============================================
// Schemas
// ============================================

const listHeyGenAvatarsInputSchema = z.object({
  autoSelect: z
    .boolean()
    .optional()
    .describe(
      'When true, signals that the agent will auto-select without user input. The UI will show a brief confirmation instead of an interactive selection grid. Use when the user requested auto-fill or an orchestrator already determined the avatar.'
    ),
});

const heygenAvatarSchema = z.object({
  avatar_id: z.string().describe('Unique identifier of the avatar'),
  avatar_name: z.string().describe('Display name of the avatar'),
  gender: z.string().optional().describe('Gender of the avatar (male/female)'),
  preview_image_url: z.string().optional().describe('Preview thumbnail URL'),
  preview_video_url: z.string().optional().describe('Preview video URL'),
});

const listHeyGenAvatarsOutputSchema = z.object({
  success: z.boolean(),
  avatars: z.array(heygenAvatarSchema).optional(),
  total: z.number().optional(),
  selectionRequired: z
    .boolean()
    .optional()
    .describe('Whether user input is needed to select an avatar. false = agent auto-selects; true = show interactive selection grid.'),
  error: z.string().optional(),
});

export type HeyGenAvatar = z.infer<typeof heygenAvatarSchema>;

// ============================================
// Helper: Emit UI signal to frontend
// ============================================

async function emitAvatarSelectionSignal(
  writer: any,
  payload: { avatars: HeyGenAvatar[]; total: number; selectionRequired: boolean }
): Promise<void> {
  if (!writer) return;

  try {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    await writer.write({
      type: 'data-ui-signal',
      data: {
        signal: 'avatar_selection',
        message: `::ui:avatar_selection::${encoded}::/ui:avatar_selection::\n`,
      },
    });

    logger.info('avatar_selection_ui_signal_emitted', { total: payload.total });
  } catch (emitErr) {
    logger.warn('avatar_selection_ui_signal_failed', {
      error: normalizeError(emitErr).message,
    });
  }
}

// ============================================
// Tool Definition
// ============================================

export const listHeyGenAvatarsTool = createTool({
  id: 'list-heygen-avatars',
  description:
    'Lists all available HeyGen avatars that can be used for deepfake video generation. Returns avatar ID, name, gender, and preview URLs so the user can select one.',
  inputSchema: listHeyGenAvatarsInputSchema,
  outputSchema: listHeyGenAvatarsOutputSchema,
  execute: async (inputData, ctx?) => {
    const writer = ctx?.writer;
    try {
      const apiKey = process.env.HEYGEN_API_KEY;
      if (!apiKey) {
        logger.error('heygen_api_key_missing');
        return {
          success: false,
          error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
        };
      }

      const url = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.LIST_AVATARS}`;

      logger.info('list_heygen_avatars_request');

      const response = await withHeartbeat(writer, () =>
        withRetry(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), HEYGEN.API_TIMEOUT_MS);

          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                'x-api-key': apiKey,
              },
              signal: controller.signal,
            });
            return res;
          } finally {
            clearTimeout(timeoutId);
          }
        }, 'list_heygen_avatars'),
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error('list_heygen_avatars_api_error', {
          status: response.status,
          body: errorBody.substring(0, 300),
        });
        return {
          success: false,
          error: `HeyGen API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // HeyGen v2/avatars response: { data: { avatars: [...] } }
      const MAX_AVATARS = 100;
      const allAvatars: unknown[] = data?.data?.avatars ?? [];

      const avatars: HeyGenAvatar[] = allAvatars
        .map((a: unknown) => {
          const av = a as Record<string, unknown>;
          const gender = av.gender ? String(av.gender) : undefined;
          return {
            avatar_id: String(av.avatar_id ?? ''),
            avatar_name: String(av.avatar_name ?? 'Unnamed Avatar'),
            gender: gender === 'unknown' ? undefined : gender,
            preview_image_url: av.preview_image_url ? String(av.preview_image_url) : undefined,
            preview_video_url: av.preview_video_url ? String(av.preview_video_url) : undefined,
          };
        })
        .filter(a => a.avatar_id.length > 0)
        .slice(0, MAX_AVATARS);

      const selectionRequired = !inputData.autoSelect && avatars.length > 1;

      logger.info('list_heygen_avatars_success', {
        totalFromApi: allAvatars.length,
        returned: avatars.length,
        selectionRequired,
      });

      await emitAvatarSelectionSignal(writer, { avatars, total: avatars.length, selectionRequired });

      return {
        success: true,
        avatars,
        total: avatars.length,
        selectionRequired,
      };
    } catch (error) {
      const err = normalizeError(error);

      if (err.name === 'AbortError') {
        logger.error('list_heygen_avatars_timeout', { timeoutMs: HEYGEN.API_TIMEOUT_MS });
        return {
          success: false,
          error: `Request timed out after ${HEYGEN.API_TIMEOUT_MS}ms.`,
        };
      }

      logger.error('list_heygen_avatars_error', { error: err.message });
      return {
        success: false,
        error: `Failed to list avatars: ${err.message}`,
      };
    }
  },
});
