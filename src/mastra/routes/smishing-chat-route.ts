import { Context } from 'hono';
import { generateText } from 'ai';
import { getModelWithOverride } from '../model-providers';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { withRetry } from '../utils/core/resilience-utils';
import { INBOX_TEXT_PARAMS } from '../utils/config/llm-generation-params';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { loadScene4RouteData } from './scene4-route-helpers';
import { resolveEffectiveProvider, shouldMapAssistantHistoryAsUser } from './chat-provider-compat';
import {
  parsedSmishingChatResponseSchema,
  smishingChatRequestSchema,
} from './smishing-chat-route.schemas';
import type { SmishingChatRequestBody, SmishingChatResponse } from '../types';

const logger = getLogger('SmishingChatRoute');
const SMISHING_CHAT_JSON_OUTPUT_INSTRUCTION = 'Return ONLY valid JSON with exactly these keys: {"reply":"string","isFinished":boolean}. Set isFinished=true ONLY when your reply is the final security/debrief guidance message (simulation reminder + red flags + correct next step). Otherwise set isFinished=false. Do not include markdown or extra text.';

interface ParsedSmishingChatResponse {
  reply: string;
  isFinished: boolean;
}

const SMISHING_CHAT_FALLBACK_REPLY = 'Unable to generate smishing reply. Please try again.';
const ASSISTANT_HISTORY_PREFIX = 'Previous assistant message (context): ';

function parseSmishingChatResponse(rawText: string): ParsedSmishingChatResponse {
  const normalizedRawText = typeof rawText === 'string' ? rawText.trim() : '';

  try {
    const cleaned = cleanResponse(normalizedRawText, 'smishing-chat');
    const parsed = parsedSmishingChatResponseSchema.safeParse(JSON.parse(cleaned));
    if (parsed.success) {
      return {
        reply: parsed.data.reply.trim(),
        isFinished: parsed.data.isFinished === true,
      };
    }
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'smishing-chat-parse',
      stack: err.stack,
    });
    logErrorInfo(logger, 'warn', 'smishing_chat_response_parse_fallback', errorInfo);
  }

  return {
    reply: normalizedRawText || SMISHING_CHAT_FALLBACK_REPLY,
    isFinished: false,
  };
}

export async function smishingChatHandler(c: Context) {
  const requestStart = Date.now();
  try {
    const rawBody = await c.req.json<SmishingChatRequestBody>();
    const body = rawBody || {};
    const { microlearningId, language } = body;

    if (!microlearningId || typeof microlearningId !== 'string') {
      const response: SmishingChatResponse = { success: false, error: 'Missing microlearningId' };
      return c.json(response, 400);
    }
    if (!language || typeof language !== 'string') {
      const response: SmishingChatResponse = { success: false, error: 'Missing language' };
      return c.json(response, 400);
    }

    const parsedRequest = smishingChatRequestSchema.safeParse(body);
    if (!parsedRequest.success) {
      const hasInvalidMessages = parsedRequest.error.issues.some((issue) => issue.path[0] === 'messages');
      const response: SmishingChatResponse = {
        success: false,
        error: hasInvalidMessages ? 'Invalid message format' : 'Invalid request format',
      };
      return c.json(response, 400);
    }

    const { messages, modelProvider, model: modelOverride } = parsedRequest.data;
    const hasMessages = Array.isArray(messages) && messages.length > 0;

    const { hasLanguageContent, normalizedLanguage, prompt, firstMessage } = await loadScene4RouteData({
      microlearningId,
      language,
    });

    if (!hasLanguageContent) {
      const response: SmishingChatResponse = { success: false, error: 'Language content not found' };
      return c.json(response, 404);
    }

    if (!prompt) {
      const response: SmishingChatResponse = { success: false, error: 'Smishing prompt not available' };
      return c.json(response, 404);
    }

    if (!hasMessages) {
      if (!firstMessage) {
        const response: SmishingChatResponse = { success: false, error: 'Smishing prompt not available' };
        return c.json(response, 404);
      }

      const response: SmishingChatResponse = {
        success: true,
        microlearningId,
        language: normalizedLanguage,
        prompt,
        firstMessage,
        isFinished: false,
      };
      return c.json(response, 200);
    }

    const effectiveProvider = resolveEffectiveProvider(modelProvider, modelOverride);
    const shouldMapAssistantToUser = shouldMapAssistantHistoryAsUser(modelProvider, modelOverride);

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
      const response: SmishingChatResponse = { success: false, error: 'Missing user messages' };
      return c.json(response, 400);
    }

    logger.info('smishing_chat_request', {
      route: '/smishing/chat',
      event: 'request',
      microlearningId,
      language: normalizedLanguage,
      requestedProvider: typeof modelProvider === 'string' ? modelProvider : 'default',
      effectiveProvider,
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

    const aiResponse = await withRetry(
      () => generateText({
        model,
        messages: chatMessages,
        ...INBOX_TEXT_PARAMS,
      }),
      'Smishing chat completion'
    );
    const parsedResponse = parseSmishingChatResponse(aiResponse.text);

    logger.info('smishing_chat_response', {
      route: '/smishing/chat',
      event: 'response',
      microlearningId,
      language: normalizedLanguage,
      effectiveProvider,
      isFinished: parsedResponse.isFinished,
      replyLength: parsedResponse.reply.length,
      durationMs: Date.now() - requestStart,
    });

    const response: SmishingChatResponse = {
      success: true,
      microlearningId,
      language: normalizedLanguage,
      reply: parsedResponse.reply,
      isFinished: parsedResponse.isFinished,
    };
    return c.json(response, 200);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      route: '/smishing/chat',
      event: 'error',
      durationMs: Date.now() - requestStart,
    });
    logErrorInfo(logger, 'error', 'smishing_chat_error', errorInfo);
    const response: SmishingChatResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    return c.json(response, 500);
  }
}
