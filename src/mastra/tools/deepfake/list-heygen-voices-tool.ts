/**
 * List HeyGen Voices Tool
 *
 * Fetches all available voices from HeyGen API.
 * Used by the Deepfake Video Agent to let the user pick a voice
 * before generating a deepfake video simulation.
 *
 * API: GET https://api.heygen.com/v2/voices
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HEYGEN } from '../../constants';
import { uuidv4 } from '../../utils/core/id-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

const logger = getLogger('ListHeyGenVoicesTool');

// ============================================
// Schemas
// ============================================

const listHeyGenVoicesInputSchema = z.object({
  language: z
    .string()
    .optional()
    .describe(
      'Filter voices by language (e.g., "Turkish", "English", "Spanish", "Arabic"). If provided, returns only voices matching this language plus Multilingual voices. If omitted, returns a diverse set across all languages.'
    ),
});

const heygenVoiceSchema = z.object({
  voice_id: z.string().describe('Unique identifier of the voice'),
  name: z.string().describe('Display name of the voice'),
  language: z.string().optional().describe('Language of the voice (e.g., English, Turkish)'),
  gender: z.string().optional().describe('Gender of the voice (male/female)'),
  preview_audio: z.string().optional().describe('Preview audio URL'),
  support_pause: z.boolean().optional().describe('Whether the voice supports pausing'),
  emotion_support: z.boolean().optional().describe('Whether the voice supports emotions'),
});

const listHeyGenVoicesOutputSchema = z.object({
  success: z.boolean(),
  voices: z.array(heygenVoiceSchema).optional(),
  total: z.number().optional(),
  requestedLanguage: z.string().optional().describe('The language that was requested for filtering'),
  targetLanguageCount: z.number().optional().describe('Number of voices found in the target language'),
  multilingualCount: z.number().optional().describe('Number of multilingual voices included'),
  warning: z.string().optional().describe('Warning message if no target language voices were found'),
  error: z.string().optional(),
});

export type HeyGenVoice = z.infer<typeof heygenVoiceSchema>;

// ============================================
// Helper: Emit UI signal to frontend
// ============================================

async function emitVoiceSelectionSignal(
  writer: any,
  payload: {
    voices: HeyGenVoice[];
    total: number;
    requestedLanguage: string | null;
    warning: string | null;
  }
): Promise<void> {
  if (!writer) return;

  try {
    const messageId = uuidv4();
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    await writer.write({ type: 'text-start', id: messageId });
    await writer.write({
      type: 'text-delta',
      id: messageId,
      delta: `::ui:voice_selection::${encoded}::/ui:voice_selection::\n`,
    });
    await writer.write({ type: 'text-end', id: messageId });

    logger.info('voice_selection_ui_signal_emitted', { total: payload.total });
  } catch (emitErr) {
    logger.warn('voice_selection_ui_signal_failed', {
      error: normalizeError(emitErr).message,
    });
  }
}

// ============================================
// Tool Definition
// ============================================

export const listHeyGenVoicesTool = createTool({
  id: 'list-heygen-voices',
  description:
    'Lists available HeyGen voices for deepfake video generation. Accepts an optional "language" parameter (e.g., "Turkish", "English") to filter voices by language. Returns target language voices first, then Multilingual voices (which support emotion tones), then English fallback.',
  inputSchema: listHeyGenVoicesInputSchema,
  outputSchema: listHeyGenVoicesOutputSchema,
  execute: async ({ context, writer }) => {
    try {
      const apiKey = process.env.HEYGEN_API_KEY;
      if (!apiKey) {
        logger.error('heygen_api_key_missing');
        return {
          success: false,
          error: 'HeyGen API key is not configured. Please set HEYGEN_API_KEY environment variable.',
        };
      }

      const targetLanguage = context.language?.trim() || undefined;
      const url = `${HEYGEN.API_BASE_URL}${HEYGEN.ENDPOINTS.LIST_VOICES}`;

      logger.info('list_heygen_voices_request', { targetLanguage: targetLanguage ?? 'all' });

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
      }, 'list_heygen_voices');

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error('list_heygen_voices_api_error', {
          status: response.status,
          body: errorBody.substring(0, 300),
        });
        return {
          success: false,
          error: `HeyGen API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // HeyGen v2/voices response: { data: { voices: [...] } }
      // First ~60 voices are custom/cloned with language:"unknown" — skip them.
      // Only return voices with real language metadata for reliable filtering.
      const MAX_VOICES = 30;
      const allVoices: unknown[] = data?.data?.voices ?? [];

      const mappedVoices: HeyGenVoice[] = allVoices
        .map((v: unknown) => {
          const vo = v as Record<string, unknown>;
          return {
            voice_id: String(vo.voice_id ?? ''),
            name: String(vo.name ?? vo.display_name ?? 'Unnamed Voice'),
            language: vo.language ? String(vo.language) : undefined,
            gender: vo.gender ? String(vo.gender) : undefined,
            preview_audio: vo.preview_audio ? String(vo.preview_audio) : undefined,
            support_pause: typeof vo.support_pause === 'boolean' ? vo.support_pause : undefined,
            emotion_support: typeof vo.emotion_support === 'boolean' ? vo.emotion_support : undefined,
          };
        })
        .filter(v => v.voice_id.length > 0);

      // Only consider voices with known language metadata
      const knownVoices = mappedVoices.filter(v => v.language && v.language !== 'unknown');

      let targetVoices: HeyGenVoice[] = [];
      let multilingualVoices: HeyGenVoice[] = [];
      let fallbackVoices: HeyGenVoice[] = [];

      if (targetLanguage) {
        const langLower = targetLanguage.toLowerCase();
        const getLang = (v: HeyGenVoice) => (v.language ?? '').toLowerCase();
        targetVoices = knownVoices.filter(v => getLang(v) === langLower);
        multilingualVoices = knownVoices.filter(v => getLang(v) === 'multilingual');
        fallbackVoices = knownVoices.filter(
          v => getLang(v) === 'english' && langLower !== 'english'
        );
      } else {
        targetVoices = knownVoices;
      }

      // Sort each group: emotion-supporting voices first
      const byEmotion = (a: HeyGenVoice, b: HeyGenVoice) => {
        if (a.emotion_support && !b.emotion_support) return -1;
        if (!a.emotion_support && b.emotion_support) return 1;
        return 0;
      };
      targetVoices.sort(byEmotion);
      multilingualVoices.sort(byEmotion);
      fallbackVoices.sort(byEmotion);

      // Combine: target language first, then multilingual, then English fallback (deduplicated)
      const seen = new Set<string>();
      const combined: HeyGenVoice[] = [];
      for (const v of [...targetVoices, ...multilingualVoices, ...fallbackVoices]) {
        if (!seen.has(v.voice_id)) {
          seen.add(v.voice_id);
          combined.push(v);
        }
      }
      const voices = combined.slice(0, MAX_VOICES);

      logger.info('list_heygen_voices_success', {
        totalFromApi: allVoices.length,
        targetLanguage: targetLanguage ?? 'all',
        targetCount: targetVoices.length,
        multilingualCount: multilingualVoices.length,
        returned: voices.length,
      });

      const noTargetFound = targetLanguage && targetVoices.length === 0;
      const warning = noTargetFound
        ? `No dedicated ${targetLanguage} voices found. Showing Multilingual and English voices as alternatives. Multilingual voices can speak in any language.`
        : null;

      await emitVoiceSelectionSignal(writer, {
        voices,
        total: voices.length,
        requestedLanguage: targetLanguage ?? null,
        warning,
      });

      return {
        success: true,
        voices,
        total: voices.length,
        ...(targetLanguage ? { requestedLanguage: targetLanguage } : {}),
        ...(targetLanguage ? { targetLanguageCount: targetVoices.length } : {}),
        ...(targetLanguage ? { multilingualCount: multilingualVoices.length } : {}),
        ...(warning ? { warning } : {}),
      };
    } catch (error) {
      const err = normalizeError(error);

      if (err.name === 'AbortError') {
        logger.error('list_heygen_voices_timeout', { timeoutMs: HEYGEN.API_TIMEOUT_MS });
        return {
          success: false,
          error: `Request timed out after ${HEYGEN.API_TIMEOUT_MS}ms.`,
        };
      }

      logger.error('list_heygen_voices_error', { error: err.message });
      return {
        success: false,
        error: `Failed to list voices: ${err.message}`,
      };
    }
  },
});
