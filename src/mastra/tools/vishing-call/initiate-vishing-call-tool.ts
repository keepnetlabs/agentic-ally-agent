/**
 * Initiate Vishing Call Tool
 *
 * Triggers an outbound phone call via ElevenLabs Twilio integration.
 * The tool dynamically overrides the agent's system prompt and first message
 * using `conversation_initiation_client_data` to create scenario-specific
 * vishing simulations on-the-fly.
 *
 * UI Integration:
 * - Sends `::ui:vishing_call_started::{payload}::/ui:vishing_call_started::` signal
 *   for the frontend to show a "call in progress" UI.
 *
 * API: POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ELEVENLABS } from '../../constants';
import { uuidv4 } from '../../utils/core/id-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

const logger = getLogger('InitiateVishingCallTool');

// ============================================
// Schemas
// ============================================

const initiateVishingCallInputSchema = z.object({
  agentPhoneNumberId: z
    .string()
    .describe(
      'The phone_number_id of the caller (from listPhoneNumbers). This is the number the call will appear to come from.'
    ),
  toNumber: z.string().describe('The recipient phone number in E.164 format (e.g., +905551234567)'),
  prompt: z
    .string()
    .describe(
      'Dynamic system prompt for the AI voice agent during the call. Describes persona, scenario, and behavioral rules.'
    ),
  firstMessage: z
    .string()
    .describe(
      'The opening line the AI agent speaks when the call connects. Should introduce the persona and reason for calling.'
    ),
  agentId: z
    .string()
    .optional()
    .describe('Override ElevenLabs agent ID. Defaults to ELEVENLABS_AGENT_ID env variable.'),
});

const initiateVishingCallOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  conversationId: z.string().optional(),
  callSid: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// Helper: Emit UI signal to frontend
// ============================================

async function emitCallStartedSignal(
  writer: any,
  payload: {
    conversationId: string;
    callSid: string;
    status: string;
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
      delta: `::ui:vishing_call_started::${encoded}::/ui:vishing_call_started::\n`,
    });
    await writer.write({ type: 'text-end', id: messageId });

    logger.info('vishing_call_ui_signal_emitted', {
      conversationId: payload.conversationId,
      status: payload.status,
    });
  } catch (emitErr) {
    logger.warn('vishing_call_ui_signal_failed', {
      error: normalizeError(emitErr).message,
    });
  }
}

// ============================================
// NOTE ON CALL STATUS TRACKING
// ============================================
// The HTTP stream (writer) closes after the agent sends its response,
// which happens BEFORE the call ends. Therefore, backend cannot reliably
// send a "call ended" signal via the writer — it will always fail with
// "Controller is already closed".
//
// Architecture:
// 1. Backend sends ::ui:vishing_call_started:: with { conversationId, callSid }
//    while the stream is still open (works reliably).
// 2. Frontend uses the conversationId to poll ElevenLabs for call status:
//    GET https://api.elevenlabs.io/v1/convai/conversations/{conversationId}
//    Status values: "initiated" → "in-progress" → "done" | "failed"
// 3. Frontend stops "Calling..." spinner when status != "initiated"
// ============================================

// ============================================
// Tool Definition
// ============================================

export const initiateVishingCallTool = createTool({
  id: 'initiate-vishing-call',
  description:
    'Initiate an outbound vishing (voice phishing) simulation call via ElevenLabs. Calls the specified phone number using a dynamically configured AI voice agent with custom prompt and opening message. Streams call status and transcript to the frontend.',
  inputSchema: initiateVishingCallInputSchema,
  outputSchema: initiateVishingCallOutputSchema,
  execute: async ({ context, writer }) => {
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

      const { agentPhoneNumberId, toNumber, prompt, firstMessage, agentId } = context;

      // Use provided agent ID or fall back to environment/default
      const effectiveAgentId = agentId || ELEVENLABS.DEFAULT_AGENT_ID;

      // Validate phone number format (basic E.164 check)
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(toNumber)) {
        logger.warn('invalid_phone_number_format', { toNumber });
        return {
          success: false,
          error: `Invalid phone number format: "${toNumber}". Must be in E.164 format (e.g., +905551234567).`,
        };
      }

      const url = `${ELEVENLABS.API_BASE_URL}${ELEVENLABS.ENDPOINTS.OUTBOUND_CALL}`;

      const requestBody = {
        agent_id: effectiveAgentId,
        agent_phone_number_id: agentPhoneNumberId,
        to_number: toNumber,
        conversation_initiation_client_data: {
          conversation_config_override: {
            agent: {
              prompt: {
                prompt: prompt,
              },
              first_message: firstMessage,
            },
          },
        },
      };

      logger.info('initiate_vishing_call_request', {
        agentId: effectiveAgentId,
        agentPhoneNumberId,
        toNumber: toNumber.substring(0, 6) + '***',
        promptLength: prompt.length,
        firstMessageLength: firstMessage.length,
      });

      const response = await withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS.API_TIMEOUT_MS);

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          return res;
        } finally {
          clearTimeout(timeoutId);
        }
      }, 'initiate_vishing_call_request');

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        logger.error('initiate_vishing_call_api_error', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody.substring(0, 500),
        });

        // Provide user-friendly error messages for common cases
        if (response.status === 422) {
          logger.error('initiate_vishing_call_422_detail', { body: errorBody.substring(0, 500) });
          return {
            success: false,
            error: 'Call setup failed: The phone number or agent configuration may be invalid. Please check the number format and try again.',
          };
        }

        return {
          success: false,
          error: `ElevenLabs API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      const conversationId = data.conversation_id ?? '';
      const callSid = data.callSid ?? '';

      logger.info('initiate_vishing_call_success', {
        conversationId,
        callSid,
        durationMs: Date.now() - startTime,
      });

      // Emit ::ui:vishing_call_started:: signal to frontend
      await emitCallStartedSignal(writer, {
        conversationId,
        callSid,
        status: 'ringing',
      });

      // NOTE: Call status tracking is handled by the frontend.
      // The frontend uses conversationId from the ::ui:vishing_call_started:: signal
      // to poll ElevenLabs API for call status (initiated → done/failed).
      // See architecture note at top of file.

      return {
        success: true,
        message: 'Call initiated successfully.',
        conversationId: conversationId || undefined,
        callSid: callSid || undefined,
      };
    } catch (error) {
      const err = normalizeError(error);

      if (err.name === 'AbortError') {
        logger.error('initiate_vishing_call_timeout', {
          timeoutMs: ELEVENLABS.API_TIMEOUT_MS,
        });
        return {
          success: false,
          error: `Request timed out after ${ELEVENLABS.API_TIMEOUT_MS}ms. The ElevenLabs API may be experiencing high load.`,
        };
      }

      logger.error('initiate_vishing_call_error', {
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: `Failed to initiate call: ${err.message}`,
      };
    }
  },
});
