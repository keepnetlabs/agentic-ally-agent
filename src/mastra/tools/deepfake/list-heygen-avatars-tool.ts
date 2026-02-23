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

const logger = getLogger('ListHeyGenAvatarsTool');

// ============================================
// Schemas
// ============================================

const listHeyGenAvatarsInputSchema = z.object({});

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
  error: z.string().optional(),
});

export type HeyGenAvatar = z.infer<typeof heygenAvatarSchema>;

// ============================================
// Tool Definition
// ============================================

export const listHeyGenAvatarsTool = createTool({
  id: 'list-heygen-avatars',
  description:
    'Lists all available HeyGen avatars that can be used for deepfake video generation. Returns avatar ID, name, gender, and preview URLs so the user can select one.',
  inputSchema: listHeyGenAvatarsInputSchema,
  outputSchema: listHeyGenAvatarsOutputSchema,
  execute: async () => {
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

      const response = await withRetry(async () => {
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
      }, 'list_heygen_avatars');

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
      const MAX_AVATARS = 15;
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

      logger.info('list_heygen_avatars_success', {
        totalFromApi: allAvatars.length,
        returned: avatars.length,
      });

      return {
        success: true,
        avatars,
        total: avatars.length,
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
