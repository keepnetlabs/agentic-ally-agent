import { Context } from 'hono';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { getLogger } from '../utils/core/logger';
import { withRetry } from '../utils/core/resilience-utils';
import { INBOX_TEXT_PARAMS } from '../utils/config/llm-generation-params';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { loadScene4RouteData } from './scene4-route-helpers';
import type { SmishingChatRequestBody, SmishingChatMessage } from '../types';

const logger = getLogger('SmishingChatRoute');
const SMISHING_CHAT_JSON_OUTPUT_INSTRUCTION = 'Return ONLY valid JSON with exactly these keys: {"reply":"string","isFinished":boolean}. Set isFinished=true ONLY when your reply is the final security/debrief guidance message (simulation reminder + red flags + correct next step). Otherwise set isFinished=false. Do not include markdown or extra text.';

interface ParsedSmishingChatResponse {
  reply: string;
  isFinished: boolean;
}

const SMISHING_CHAT_FALLBACK_REPLY = 'Unable to generate smishing reply. Please try again.';
const WORKERS_AI_PROVIDER = 'workers-ai';
const ASSISTANT_HISTORY_PREFIX = 'Previous assistant message (context): ';

function isValidChatMessage(message: unknown): message is SmishingChatMessage {
  if (!message || typeof message !== 'object') return false;
  const candidate = message as SmishingChatMessage;
  const validRole = candidate.role === 'user' || candidate.role === 'assistant' || candidate.role === 'system';
  return validRole && typeof candidate.content === 'string' && candidate.content.trim().length > 0;
}

function parseSmishingChatResponse(rawText: string): ParsedSmishingChatResponse {
  const normalizedRawText = typeof rawText === 'string' ? rawText.trim() : '';

  try {
    const cleaned = cleanResponse(normalizedRawText, 'smishing-chat');
    const parsed = JSON.parse(cleaned) as Partial<ParsedSmishingChatResponse>;
    if (typeof parsed.reply === 'string' && parsed.reply.trim().length > 0) {
      return {
        reply: parsed.reply.trim(),
        isFinished: parsed.isFinished === true,
      };
    }
  } catch (error) {
    // Fallback to plain text when model does not follow JSON contract.
    logger.warn('smishing_chat_response_parse_fallback', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    reply: normalizedRawText || SMISHING_CHAT_FALLBACK_REPLY,
    isFinished: false,
  };
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

    const { hasLanguageContent, normalizedLanguage, prompt, firstMessage } = await loadScene4RouteData({
      microlearningId,
      language,
    });

    if (!hasLanguageContent) {
      return c.json({ success: false, error: 'Language content not found' }, 404);
    }

    if (!prompt) {
      return c.json({ success: false, error: 'Smishing prompt not available' }, 404);
    }

    if (!hasMessages) {
      if (!firstMessage) {
        return c.json({ success: false, error: 'Smishing prompt not available' }, 404);
      }

      return c.json({
        success: true,
        microlearningId,
        language: normalizedLanguage,
        prompt,
        firstMessage,
        isFinished: false,
      }, 200);
    }

    const normalizedProvider = typeof modelProvider === 'string'
      ? modelProvider.toLowerCase().replace(/_/g, '-').trim()
      : undefined;
    const shouldMapAssistantToUser = !normalizedProvider || normalizedProvider === WORKERS_AI_PROVIDER;

    const hasExplicitUserMessage = messages.some((message) => message.role === 'user');

    const conversationMessages = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => {
        if (shouldMapAssistantToUser && message.role === 'assistant') {
          return {
            role: 'user' as const,
            content: `${ASSISTANT_HISTORY_PREFIX}${message.content}`,
          };
        }

        return {
          role: message.role as 'user' | 'assistant',
          content: message.content,
        };
      });

    if (!hasExplicitUserMessage) {
      return c.json({ success: false, error: 'Missing user messages' }, 400);
    }

    logger.info('smishing_chat_request', {
      microlearningId,
      language: normalizedLanguage,
      modelProvider: normalizedProvider || 'default',
      messageCount: conversationMessages.length,
      userMessageCount: conversationMessages.filter((message) => message.role === 'user').length,
      assistantMessageCount: messages.filter((message) => message.role === 'assistant').length,
    });

    const model = getModelWithOverride(modelProvider, modelOverride);
    const chatMessages = [
      { role: 'system' as const, content: prompt },
      { role: 'system' as const, content: SMISHING_CHAT_JSON_OUTPUT_INSTRUCTION },
      ...conversationMessages,
    ];

    const response = await withRetry(
      () => generateText({
        model,
        messages: chatMessages,
        ...INBOX_TEXT_PARAMS,
      }),
      'Smishing chat completion'
    );
    const parsedResponse = parseSmishingChatResponse(response.text);

    logger.info('smishing_chat_response', {
      microlearningId,
      language: normalizedLanguage,
      modelProvider: normalizedProvider || 'default',
      isFinished: parsedResponse.isFinished,
      replyLength: parsedResponse.reply.length,
    });

    return c.json({
      success: true,
      microlearningId,
      language: normalizedLanguage,
      reply: parsedResponse.reply,
      isFinished: parsedResponse.isFinished,
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
