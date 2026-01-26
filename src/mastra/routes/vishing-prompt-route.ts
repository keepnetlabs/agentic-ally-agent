import { Context } from 'hono';
import { KVService } from '../services/kv-service';
import { getLogger } from '../utils/core/logger';
import { validateBCP47LanguageCode } from '../utils/language/language-utils';
import type { VishingPromptRequestBody } from '../types';

const logger = getLogger('VishingPromptRoute');
const DEFAULT_AGENT_ID = 'agent_0901kfr9djtqfg988bypdyah40mm';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function vishingPromptHandler(c: Context) {
  try {
    const body = await c.req.json<VishingPromptRequestBody>();
    const { microlearningId, language } = body || {};

    if (!microlearningId || typeof microlearningId !== 'string') {
      return c.json({ success: false, error: 'Missing microlearningId' }, 400);
    }
    if (!language || typeof language !== 'string') {
      return c.json({ success: false, error: 'Missing language' }, 400);
    }

    const normalizedLanguage = validateBCP47LanguageCode(language).toLowerCase();
    const kvService = new KVService();
    const microlearning = await kvService.getMicrolearning(microlearningId, normalizedLanguage);

    if (!microlearning?.language) {
      return c.json({ success: false, error: 'Language content not found' }, 404);
    }

    const scene4 = microlearning.language?.['4'];
    const prompt = scene4?.prompt;
    const firstMessage = scene4?.firstMessage;

    if (!prompt || !firstMessage) {
      return c.json({ success: false, error: 'Vishing prompt not available' }, 404);
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    let signedUrl: string | undefined;

    if (ELEVENLABS_API_KEY) {
      try {
        const signedUrlResp = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
          }
        );

        if (signedUrlResp.ok) {
          const signedPayload = await signedUrlResp.json();
          signedUrl = signedPayload?.signedUrl || signedPayload?.signed_url;
        } else {
          const errorText = await signedUrlResp.text();
          logger.warn('vishing_prompt_signed_url_failed', {
            status: signedUrlResp.status,
            error: errorText.substring(0, 200),
          });
        }
      } catch (signedError) {
        logger.warn('vishing_prompt_signed_url_error', {
          error: signedError instanceof Error ? signedError.message : String(signedError),
        });
      }
    }

    return c.json({
      success: true,
      microlearningId,
      language: normalizedLanguage,
      prompt,
      firstMessage,
      agentId,
      wsUrl,
      signedUrl,
    }, 200);
  } catch (error) {
    logger.error('vishing_prompt_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
