/**
 * API Request/Response Type Definitions
 * 
 * Type definitions for HTTP API endpoints in the Agentic Ally system.
 * These types ensure type safety for request bodies, responses, and middleware.
 */

/**
 * Message content types for AI SDK compatibility
 */
export interface MessageContentPart {
  type: 'text' | 'image';
  text?: string;
}

export interface MessageParts {
  type: 'text';
  text: string;
}

/**
 * Chat API request body types
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string | MessageContentPart[] | { text?: string };
  parts?: MessageParts[];
  toolInvocations?: unknown[];
  function_call?: unknown;
  tool_calls?: unknown;
}

export interface ChatRequestBody {
  prompt?: string;
  text?: string;
  input?: string;
  messages?: ChatMessage[];
  conversationId?: string;
  threadId?: string;
  sessionId?: string;
  modelProvider?: string;
  model?: string;
}

/**
 * Code review validation request body
 */
export interface CodeReviewRequestBody {
  issueType: string;
  originalCode: string;
  fixedCode: string;
  language: string;
  outputLanguage?: string;
  modelProvider?: string;
  model?: string;
}

/**
 * Autonomous generation request body
 */
export interface AutonomousRequestBody {
  token: string;
  firstName: string;
  lastName?: string;
  actions: ('training' | 'phishing')[];
}

/**
 * Cloudflare environment bindings
 * Using Record<string, unknown> for flexibility with Cloudflare Workers types
 */
export type CloudflareEnv = Record<string, unknown> & {
  agentic_ally_embeddings_cache?: unknown; // D1Database
  agentic_ally_memory?: unknown; // D1Database
  MICROLEARNING_KV?: unknown; // KVNamespace
  CRUD_WORKER?: unknown; // Service
};

