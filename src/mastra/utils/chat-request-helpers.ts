/**
 * Chat Request Helper Functions
 *
 * Utilities for parsing and processing incoming chat requests
 * with support for multiple message formats (OpenAI, Vercel AI SDK, custom)
 */

import type {
  ChatMessage,
  MessageContentPart,
  MessageParts,
} from '../types/api-types';
import { getLogger } from './core/logger';

interface ChatRequestBody {
  prompt?: string;
  text?: string;
  input?: string;
  messages?: ChatMessage[];
  [key: string]: unknown;
}

const logger = getLogger('ChatRequestHelpers');

// Window size for conversation context
const CONTEXT_WINDOW_SIZE = 20;

function extractUiPayload(content: string, signalType: string): string | undefined {
  // With explicit closing tag: ::ui:type::PAYLOAD::/ui:type::
  const withClosing = new RegExp(`::ui:${signalType}::([\\s\\S]*?)::\\/ui:${signalType}::`, 'i');
  const m1 = content.match(withClosing);
  if (m1?.[1]) return m1[1].trim();

  // Without closing tag (used by canvas_open): ::ui:type::PAYLOAD\n
  const withoutClosing = new RegExp(`::ui:${signalType}::([^\\n]+)`, 'i');
  const m2 = content.match(withoutClosing);
  if (m2?.[1]) return m2[1].trim();

  return undefined;
}

function decodeBase64Json(payload: string): unknown {
  const raw = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(raw);
}

function safeExtractPhishingIdFromUiPayload(payload: string): string | undefined {
  try {
    const decoded = decodeBase64Json(payload);
    if (decoded && typeof decoded === 'object' && 'phishingId' in decoded) {
      const value = (decoded as Record<string, unknown>).phishingId;
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function safeExtractMicrolearningIdFromUrl(url: string): string | undefined {
  try {
    // Best-effort: take the last non-empty path segment if it looks like an ID.
    // Examples we want to support:
    // - https://.../training/<id>
    // - https://.../microlearning/<id>
    // - https://.../<id>
    const cleaned = url.split('?')[0]?.split('#')[0] ?? url;
    const parts = cleaned.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) return undefined;

    // Avoid returning domain-like segments
    if (last.includes('.')) return undefined;

    // Heuristic: IDs are typically >= 8 chars and alphanumeric-ish
    if (/^[a-zA-Z0-9_-]{8,}$/.test(last)) return last;

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extracts text content from a message in various formats
 *
 * Handles:
 * - Simple string content
 * - Array of content parts (OpenAI format, multimodal)
 * - Vercel AI SDK "parts" structure
 * - Tool invocations
 * - Object fallback
 *
 * @param message - The message to extract content from
 * @returns Extracted text content or fallback string
 */
export const extractMessageContent = (message: ChatMessage): string => {
  // Case 1: Simple string
  if (typeof message.content === 'string') {
    return message.content;
  }

  // Case 2: Array (e.g. multi-modal - OpenAI format)
  if (Array.isArray(message.content)) {
    return message.content.map((part: MessageContentPart) => {
      if (part?.type === 'text') return part.text || '';
      if (part?.type === 'image') return '[Image]';
      return '';
    }).join(' ');
  }

  // Case 3: Vercel AI SDK "parts" structure
  if (Array.isArray(message.parts)) {
    return message.parts.map((p: MessageParts) => {
      if (p?.type === 'text') return p.text;
      return '';
    }).join(' ');
  }

  // Case 4: Tool Invocations (Assistant called a tool)
  if (message.toolInvocations || message.function_call || message.tool_calls) {
    return '[Tool Execution Result]';
  }

  // Case 5: Object fallback (try to find text field)
  if (typeof message.content === 'object' && message.content !== null) {
    return (message.content as { text?: string })?.text || JSON.stringify(message.content);
  }

  // Final Fallback
  return '[Empty Message]';
};

/**
 * Builds routing context from recent messages
 *
 * Takes the last N messages and formats them as:
 * "User: message\nAssistant: response\n..."
 *
 * Used for orchestrator routing decision context
 *
 * @param messages - Array of chat messages
 * @returns Formatted context string for orchestrator
 */
/**
 * Cleans UI signals and unnecessary content from message
 * Converts ::ui:* signals to semantic messages for orchestrator understanding
 * Removes markdown formatting and shortens URLs
 *
 * UI Signal Format: ::ui:signal_type::payload::/ui:signal_type:: (with optional closing tag)
 */
const cleanMessageContent = (content: string): string => {
  if (!content) return '';

  // Convert UI signals to semantic messages (for orchestrator context)
  // Matches both with and without closing tags: ::ui:canvas_open:: or ::ui:canvas_open::data::/ui:canvas_open::
  if (content.match(/::ui:training_meta::/)) {
    const payload = extractUiPayload(content, 'training_meta');
    if (payload) {
      try {
        const decoded = decodeBase64Json(payload);
        if (decoded && typeof decoded === 'object' && 'microlearningId' in decoded) {
          const value = (decoded as Record<string, unknown>).microlearningId;
          const microlearningId = typeof value === 'string' && value.trim() ? value.trim() : undefined;
          if (microlearningId) return `[Training Created: microlearningId=${microlearningId}]`;
        }
      } catch {
        // ignore
      }
    }
    return '[Training Created]';
  }
  if (content.match(/::ui:canvas_open::/)) {
    const trainingUrl = extractUiPayload(content, 'canvas_open') || '';
    const microlearningId = trainingUrl ? safeExtractMicrolearningIdFromUrl(trainingUrl) : undefined;
    if (microlearningId) {
      return `[Training Created: microlearningId=${microlearningId}]`;
    }
    return '[Training Created]';
  }
  if (content.match(/::ui:phishing_email::/)) {
    const payload = extractUiPayload(content, 'phishing_email');
    const phishingId = payload ? safeExtractPhishingIdFromUiPayload(payload) : undefined;
    if (phishingId) return `[Phishing Simulation Email Created: phishingId=${phishingId}]`;
    return '[Phishing Simulation Email Created]';
  }
  if (content.match(/::ui:landing_page::/)) {
    const payload = extractUiPayload(content, 'landing_page');
    const phishingId = payload ? safeExtractPhishingIdFromUiPayload(payload) : undefined;
    if (phishingId) return `[Phishing Simulation Landing Page Created: phishingId=${phishingId}]`;
    return '[Phishing Simulation Landing Page Created]';
  }
  if (content.match(/::ui:training_uploaded::/)) {
    return '[Training Uploaded]';
  }
  if (content.match(/::ui:phishing_uploaded::/)) {
    return '[Phishing Simulation Uploaded]';
  }
  if (content.match(/::ui:training_assigned::/)) {
    return '[Training Assigned to User]';
  }
  if (content.match(/::ui:phishing_assigned::/)) {
    return '[Phishing Simulation Assigned to User]';
  }

  // Remove remaining UI signals (includes both formats with/without closing tags)
  let cleaned = content.replace(/::ui:\w+::[^\n]*/g, '');

  // Remove extremely long URLs - keep just ID or shorten
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, (url) => {
    // Extract meaningful ID from URL
    const idMatch = url.match(/[/=]([a-zA-Z0-9_-]+)(?:[&?#]|$)/);
    if (idMatch && idMatch[1].length > 10) {
      return `[URL: ${idMatch[1].substring(0, 20)}...]`;
    }
    return '[URL]';
  });

  // Clean multiple whitespaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

export const buildRoutingContext = (messages: ChatMessage[]): string => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  logger.info('📥 ROUTING_CONTEXT_BUILD Building context from messages', {
    totalMessages: messages.length,
    selectedMessages: CONTEXT_WINDOW_SIZE
  });

  const recentMessages = messages.slice(-CONTEXT_WINDOW_SIZE);

  // Build structured context
  let context = 'CONVERSATION HISTORY\n';
  context += '====================\n\n';

  recentMessages.forEach((message: ChatMessage, index: number) => {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const rawContent = extractMessageContent(message);
    const cleanedContent = cleanMessageContent(rawContent);

    context += `[MESSAGE ${index + 1}]\n`;
    context += `Role: ${role}\n`;
    context += `Content: ${cleanedContent}\n`;
    context += '\n';
  });

  return context;
};

export function extractArtifactIdsFromRoutingContext(routingContext: string): {
  microlearningId?: string;
  phishingId?: string;
  resourceId?: string;
  scenarioResourceId?: string;
  landingPageResourceId?: string;
  languageId?: string;
  sendTrainingLanguageId?: string;
  targetUserResourceId?: string;
  targetGroupResourceId?: string;
} {
  if (!routingContext) return {};

  // Use the semantic markers we generate in cleanMessageContent:
  // - microlearningId=...
  // - phishingId=...
  const microMatches = [...routingContext.matchAll(/microlearningId=([a-zA-Z0-9_-]{6,})/g)];
  const phishingMatches = [...routingContext.matchAll(/phishingId=([a-zA-Z0-9_-]{6,})/g)];

  const microlearningId = microMatches.length ? microMatches[microMatches.length - 1]?.[1] : undefined;
  const phishingId = phishingMatches.length ? phishingMatches[phishingMatches.length - 1]?.[1] : undefined;

  // Also extract operational IDs from tool summary lines and other assistant messages.
  // Keep these regexes conservative: safe IDs only (alnum/underscore/hyphen, min 3 chars).
  const resourceMatches = [...routingContext.matchAll(/\bresourceId=([a-zA-Z0-9_-]{3,})\b/g)];
  const scenarioResourceMatches = [...routingContext.matchAll(/\bscenarioResourceId=([a-zA-Z0-9_-]{3,})\b/g)];
  const landingPageResourceMatches = [...routingContext.matchAll(/\blandingPageResourceId=([a-zA-Z0-9_-]{3,})\b/g)];
  const languageMatches = [...routingContext.matchAll(/\blanguageId=([a-zA-Z0-9_-]{3,})\b/g)];
  const sendTrainingLanguageMatches = [...routingContext.matchAll(/\bsendTrainingLanguageId=([a-zA-Z0-9_-]{3,})\b/g)];
  const targetUserMatches = [...routingContext.matchAll(/\btargetUserResourceId=([a-zA-Z0-9_-]{3,})\b/g)];
  const targetGroupMatches = [...routingContext.matchAll(/\btargetGroupResourceId=([a-zA-Z0-9_-]{3,})\b/g)];

  const resourceId = resourceMatches.length ? resourceMatches[resourceMatches.length - 1]?.[1] : undefined;
  const scenarioResourceId = scenarioResourceMatches.length ? scenarioResourceMatches[scenarioResourceMatches.length - 1]?.[1] : undefined;
  const landingPageResourceId = landingPageResourceMatches.length ? landingPageResourceMatches[landingPageResourceMatches.length - 1]?.[1] : undefined;
  const languageId = languageMatches.length ? languageMatches[languageMatches.length - 1]?.[1] : undefined;
  const sendTrainingLanguageId = sendTrainingLanguageMatches.length ? sendTrainingLanguageMatches[sendTrainingLanguageMatches.length - 1]?.[1] : undefined;
  const targetUserResourceId = targetUserMatches.length ? targetUserMatches[targetUserMatches.length - 1]?.[1] : undefined;
  const targetGroupResourceId = targetGroupMatches.length ? targetGroupMatches[targetGroupMatches.length - 1]?.[1] : undefined;

  return {
    microlearningId,
    phishingId,
    resourceId,
    scenarioResourceId,
    landingPageResourceId,
    languageId,
    sendTrainingLanguageId,
    targetUserResourceId,
    targetGroupResourceId,
  };
}

/**
 * Extracts user's intent from messages (last user message)
 *
 * Looks for the last user message in the conversation
 * and extracts its text content (handles multiple formats)
 *
 * @param messages - Array of chat messages
 * @returns User's prompt text or undefined if not found
 */
export const extractUserPrompt = (messages: ChatMessage[]): string | undefined => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return undefined;
  }

  const userMessages = messages.filter((m: ChatMessage) => m?.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1];

  if (!lastUserMessage) {
    return undefined;
  }

  // Try string content
  if (typeof lastUserMessage?.content === 'string') {
    return lastUserMessage.content;
  }

  // Try Vercel AI SDK parts
  if (Array.isArray(lastUserMessage?.parts)) {
    const textParts = lastUserMessage.parts
      .filter((p: MessageParts) => p?.type === 'text' && typeof p?.text === 'string')
      .map((p: MessageParts) => p.text);
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  return undefined;
};

/**
 * Parses and validates incoming chat request
 *
 * Extracts prompt and routing context from request body
 * Supports both explicit fields and message arrays
 *
 * @param body - The chat request body
 * @returns Object with { prompt, routingContext } or null if validation fails
 */
export const parseAndValidateRequest = (
  body: ChatRequestBody
): { prompt: string; routingContext: string } | null => {
  let prompt: string | undefined;
  let routingContext: string = '';

  // Prefer explicit fields if provided
  prompt = body?.prompt || body?.text || body?.input;

  // Extract latest prompt AND build context history
  if (Array.isArray(body?.messages)) {
    routingContext = buildRoutingContext(body.messages);

    // If prompt wasn't explicitly set, try to get it from the last message
    if (!prompt) {
      prompt = extractUserPrompt(body.messages);
    }
  }

  // Validate that we have a prompt
  if (!prompt) {
    return null;
  }

  return { prompt, routingContext };
};
