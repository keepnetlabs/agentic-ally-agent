import { Context } from 'hono';
import { generateText } from 'ai';
import { KVService } from '../services/kv-service';
import { getModelWithOverride } from '../model-providers';
import { getLogger } from '../utils/core/logger';
import { validateBCP47LanguageCode } from '../utils/language/language-utils';
import { withRetry } from '../utils/core/resilience-utils';
import { INBOX_TEXT_PARAMS } from '../utils/config/llm-generation-params';
import type { SmishingChatRequestBody, SmishingChatMessage } from '../types';

const logger = getLogger('SmishingChatRoute');

function isValidChatMessage(message: unknown): message is SmishingChatMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as SmishingChatMessage;
  const validRole = candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system';
  return validRole && typeof candidate.content === 'string' && candidate.content.trim().length > 0;
}

export async function smishingChatHandler(c: Context) {
  try {
    const body = await c.req.json<SmishingChatRequestBody>();
    const { microlearningId, language, messages, modelProvider, model: modelOverride } = body || {};

    if (!microlearningId || typeof microlearningId !== 'string') {
      return c.json({ success: false, error: 'Missing microlearningId' }, 400);
    }
    if (!language || typeof language !== 'string') {
      return c.json({ success: false, error: 'Missing language' }, 400);
    }
    const hasMessages = Array.isArray(messages) && messages.length > 0;
    if (hasMessages) {
      const invalidMessage = messages.find((message) => !isValidChatMessage(message));
      if (invalidMessage) {
        return c.json({ success: false, error: 'Invalid message format' }, 400);
      }
    }

    const normalizedLanguage = validateBCP47LanguageCode(language).toLowerCase();
    const kvService = new KVService();
    const microlearning = await kvService.getMicrolearning(microlearningId, normalizedLanguage);

    if (!microlearning?.language) {
      return c.json({ success: false, error: 'Language content not found' }, 404);
    }

    const scene4 = microlearning.language?.['4'];
    const prompt = scene4?.prompt;

    if (!prompt) {
      return c.json({ success: false, error: 'Smishing prompt not available' }, 404);
    }

    if (!hasMessages) {
      const firstMessage = scene4?.firstMessage;
      if (!firstMessage) {
        return c.json({ success: false, error: 'Smishing prompt not available' }, 404);
      }

      return c.json({
        success: true,
        microlearningId,
        language: normalizedLanguage,
        prompt,
        firstMessage,
      }, 200);
    }

    const userMessages = messages
      .filter((message) => message.role === 'user')
      .map((message) => ({ role: 'user' as const, content: message.content }));

    if (userMessages.length === 0) {
      return c.json({ success: false, error: 'Missing user messages' }, 400);
    }

    const model = getModelWithOverride(modelProvider, modelOverride);
    const chatMessages = [
      { role: 'system' as const, content: prompt },
      ...userMessages,
    ];

    const response = await withRetry(
      () => generateText({
        model,
        messages: chatMessages,
        ...INBOX_TEXT_PARAMS,
      }),
      'Smishing chat completion'
    );

    return c.json({
      success: true,
      microlearningId,
      language: normalizedLanguage,
      reply: response.text,
    }, 200);
  } catch (error) {
    logger.error('smishing_chat_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
