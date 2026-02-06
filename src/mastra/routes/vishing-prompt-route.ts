import { Context } from 'hono';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { loadScene4RouteData } from './scene4-route-helpers';
import { vishingPromptRequestSchema } from './vishing-prompt-route.schemas';
import type { VishingPromptRequestBody, VishingPromptResponse } from '../types';

const logger = getLogger('VishingPromptRoute');
const DEFAULT_AGENT_ID = 'agent_0901kfr9djtqfg988bypdyah40mm';

export async function vishingPromptHandler(c: Context) {
  try {
    const rawBody = await c.req.json<VishingPromptRequestBody>();
    const body = rawBody || {};
    const { microlearningId, language } = body || {};

    if (!microlearningId || typeof microlearningId !== 'string') {
      const response: VishingPromptResponse = { success: false, error: 'Missing microlearningId' };
      return c.json(response, 400);
    }
    if (!language || typeof language !== 'string') {
      const response: VishingPromptResponse = { success: false, error: 'Missing language' };
      return c.json(response, 400);
    }

    const parsedRequest = vishingPromptRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      const response: VishingPromptResponse = { success: false, error: 'Invalid request format' };
      return c.json(response, 400);
    }

    const { hasLanguageContent, normalizedLanguage, prompt, firstMessage } = await loadScene4RouteData({
      microlearningId: parsedRequest.data.microlearningId,
      language: parsedRequest.data.language,
    });

    if (!hasLanguageContent) {
      const response: VishingPromptResponse = { success: false, error: 'Language content not found' };
      return c.json(response, 404);
    }

    if (!prompt || !firstMessage) {
      const response: VishingPromptResponse = { success: false, error: 'Vishing prompt not available' };
      return c.json(response, 404);
    }

    const agentId = process.env.ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
    let signedUrl: string | undefined;

    if (elevenLabsApiKey) {
      try {
        const signedUrlResp = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenLabsApiKey,
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

    const response: VishingPromptResponse = {
      success: true,
      microlearningId,
      language: normalizedLanguage,
      prompt,
      firstMessage,
      agentId,
      wsUrl,
      signedUrl,
    };
    return c.json(response, 200);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      route: '/vishing/prompt',
      event: 'error',
    });
    logErrorInfo(logger, 'error', 'vishing_prompt_error', errorInfo);
    const response: VishingPromptResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return c.json(response, 500);
  }
}
