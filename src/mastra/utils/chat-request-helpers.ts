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

// Window size for conversation context
const CONTEXT_WINDOW_SIZE = 10;

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
export const buildRoutingContext = (messages: ChatMessage[]): string => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }

  const recentMessages = messages.slice(-CONTEXT_WINDOW_SIZE);

  return recentMessages.map((message: ChatMessage) => {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    const content = extractMessageContent(message);

    // Validate extracted content
    if (!content || content === '[]' || content === '{}') {
      const fallback = message.toolInvocations ? '[Tool Call]' : '[Empty Message]';
      return `${role}: ${fallback}`;
    }

    return `${role}: ${content}`;
  }).join('\n');
};

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
  body: any
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
