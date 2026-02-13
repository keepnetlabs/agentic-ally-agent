/**
 * List Phone Numbers Tool
 *
 * Retrieves available outbound phone numbers from ElevenLabs Conversational AI.
 * These numbers are pre-configured in ElevenLabs via Twilio integration and
 * can be used as caller IDs for outbound vishing calls.
 *
 * API: GET https://api.elevenlabs.io/v1/convai/phone-numbers
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ELEVENLABS } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';

const logger = getLogger('ListPhoneNumbersTool');

// ============================================
// Schemas
// ============================================

const listPhoneNumbersInputSchema = z.object({
  refresh: z
    .boolean()
    .optional()
    .default(false)
    .describe('Force refresh the phone number list (bypass any cache)'),
});

const phoneNumberSchema = z.object({
  phone_number: z.string().describe('The phone number in E.164 format'),
  phone_number_id: z.string().describe('Unique identifier for this phone number'),
  label: z.string().describe('Human-readable label for the number'),
  provider: z.enum(['twilio', 'sip_trunk']).describe('Telephony provider'),
});

const listPhoneNumbersOutputSchema = z.object({
  success: z.boolean(),
  phoneNumbers: z.array(phoneNumberSchema).optional(),
  count: z.number().optional(),
  error: z.string().optional(),
});

// ============================================
// Tool Definition
// ============================================

export const listPhoneNumbersTool = createTool({
  id: 'list-phone-numbers',
  description:
    'List available outbound phone numbers from ElevenLabs. Returns phone numbers that can be used as caller ID for vishing (voice phishing) simulation calls.',
  inputSchema: listPhoneNumbersInputSchema,
  outputSchema: listPhoneNumbersOutputSchema,
  execute: async ({ context }) => {
    const startTime = Date.now();

    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        logger.error('elevenlabs_api_key_missing');
        return {
          success: false,
          error: 'ElevenLabs API key is not configured. Please set ELEVENLABS_API_KEY environment variable.',
        };
      }

      const url = `${ELEVENLABS.API_BASE_URL}${ELEVENLABS.ENDPOINTS.LIST_PHONE_NUMBERS}`;

      logger.info('list_phone_numbers_request', { url });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS.API_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error('list_phone_numbers_api_error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody.substring(0, 500),
        });
        return {
          success: false,
          error: `ElevenLabs API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // ElevenLabs returns an array directly
      const phoneNumbers = Array.isArray(data) ? data : (data?.phone_numbers ?? []);

      logger.info('list_phone_numbers_success', {
        count: phoneNumbers.length,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        phoneNumbers: phoneNumbers.map((pn: Record<string, unknown>) => ({
          phone_number: String(pn.phone_number ?? ''),
          phone_number_id: String(pn.phone_number_id ?? ''),
          label: String(pn.label ?? 'Unlabeled'),
          provider: pn.provider === 'sip_trunk' ? ('sip_trunk' as const) : ('twilio' as const),
        })),
        count: phoneNumbers.length,
      };
    } catch (error) {
      const err = normalizeError(error);

      if (err.name === 'AbortError') {
        logger.error('list_phone_numbers_timeout', {
          timeoutMs: ELEVENLABS.API_TIMEOUT_MS,
        });
        return {
          success: false,
          error: `Request timed out after ${ELEVENLABS.API_TIMEOUT_MS}ms`,
        };
      }

      logger.error('list_phone_numbers_error', {
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: `Failed to list phone numbers: ${err.message}`,
      };
    }
  },
});
