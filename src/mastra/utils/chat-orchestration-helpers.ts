/**
 * Chat Orchestration Helper Functions
 *
 * Utilities for orchestrating chat request execution with focus on security
 * and clean separation of concerns.
 *
 * OVERALL STRATEGY:
 * =================
 *
 * This module implements the "Masked Routing, Unmasked Execution" pattern:
 *
 * 1. MASKED ROUTING (preparePIIMaskedInput, routeToAgent)
 *    - Orchestrator sees masked data like [PERSON1], [EMAIL1], [PHONE1]
 *    - Routes based on intent, not personal identifiers
 *    - Result: Unbiased routing decisions
 *
 * 2. UNMASKED EXECUTION (injectOrchestratorContext, createAgentStream)
 *    - Agent receives original names, emails, phone numbers
 *    - Can execute tools that require real PII (CRM, email, etc.)
 *    - Result: Agents can integrate with external systems
 *
 * FUNCTIONS:
 * ==========
 * - preparePIIMaskedInput()           → Step 1: Create masked data for orchestrator
 * - extractAndPrepareThreadId()       → Step 2: Session continuity (UUID-based)
 * - buildFinalPromptWithModelOverride() → Step 3: Add model instructions
 * - routeToAgent()                    → Step 4: Route to agent (using masked data)
 * - injectOrchestratorContext()       → Step 5: Unmask and inject context
 * - createAgentStream()               → Step 6: Stream response from agent
 *
 * SECURITY BENEFITS:
 * ==================
 * ✅ PII doesn't influence routing logic (no bias)
 * ✅ Agents still get real data for tool execution (functionality)
 * ✅ Clear audit trail of what data goes where
 * ✅ Easily extensible for additional security measures
 */

import { randomUUID } from 'crypto';
import { PinoLogger } from '@mastra/loggers';
import { Mastra } from '@mastra/core/mastra';
import { AgentRouter } from '../services/agent-router';
import { maskPII, unmaskPII } from './parsers/pii-masking-utils';

const logger = new PinoLogger({
  name: 'ChatOrchestration',
  level: 'info',
});

/**
 * Prepares PII-masked orchestrator input for routing decision
 *
 * SECURITY RULE: Orchestrator ONLY gets masked data (no PII exposure to routing)
 *
 * Masks personal information in prompt and routing context to prevent PII from
 * influencing the routing decision. The orchestrator decides which agent to use
 * based on intent, not personal identifiers.
 *
 * @param prompt - Original user prompt (will be masked)
 * @param routingContext - Conversation history (will be masked)
 *
 * @returns {
 *   orchestratorInput: Formatted prompt with masked conversation for routing,
 *   maskedPrompt: Individual masked version of user's prompt,
 *   piiMapping: Map of [PERSON1]→"John", [EMAIL1]→"john@example.com" for later unmasking
 * }
 *
 * @example
 * Input:  { prompt: "Send email to john@example.com", context: "John asked..." }
 * Output: {
 *   orchestratorInput: "User: John asked...\nUser: Send email to [EMAIL1]...",
 *   piiMapping: { "[PERSON1]": "John", "[EMAIL1]": "john@example.com" }
 * }
 */
export const preparePIIMaskedInput = (
  prompt: string,
  routingContext: string
) => {
  // Optimization: Mask both texts together for single maskPII call + consistent mapping
  // This ensures "John" gets same [PERSON1] ID in both routingContext and prompt
  const separator = '\n---CONTENT_SEPARATOR---\n';
  const combinedText = `${routingContext}${separator}${prompt}`;
  const { maskedText: combinedMasked, mapping: piiMapping } = maskPII(combinedText);

  // Extract masked versions from combined result
  const [maskedRoutingContext, maskedPrompt] = combinedMasked
    .split(separator)
    .map(t => t.trim());

  logger.info('pii_masking_applied', { identifiersCount: Object.keys(piiMapping).length });

  const orchestratorInput = maskedRoutingContext ?
    `Here is the recent conversation history:\n---\n${maskedRoutingContext}\n---\n\nCurrent user message: "${maskedPrompt}"\n\nBased on this history and the current message, decide which agent should handle the request.` :
    maskedPrompt;

  return { orchestratorInput, maskedPrompt, piiMapping };
};

/**
 * Extracts or generates thread ID for session continuity
 *
 * Prefers explicit thread ID from request body,
 * falls back to generating a unique UUID
 *
 * @param body - Request body containing optional threadId/conversationId/sessionId
 * @returns Generated or provided thread ID
 */
export const extractAndPrepareThreadId = (body: any): string => {
  let threadId = body?.conversationId || body?.threadId || body?.sessionId;

  if (!threadId) {
    // Generate a unique thread ID using UUID for guaranteed uniqueness
    threadId = randomUUID();
    logger.info('thread_id_generated');
  } else {
    logger.info('thread_id_provided');
  }

  logger.debug('thread_id_set', { threadId });
  return threadId;
};

/**
 * Builds final prompt with model override instructions
 *
 * Adds model provider/model instructions to the beginning of prompt
 * if model override is provided
 *
 * @param prompt - Base user prompt
 * @param modelProvider - Optional model provider (e.g., 'WORKERS_AI')
 * @param model - Optional model name (e.g., 'gpt-oss-120b')
 * @returns Final prompt with model instructions prepended (if applicable)
 */
export const buildFinalPromptWithModelOverride = (
  prompt: string,
  modelProvider?: string,
  model?: string
): string => {
  if (modelProvider || model) {
    logger.info('model_override_received', { modelProvider, model });
  }

  let finalPrompt = prompt;

  if (modelProvider || model) {
    const modelInstruction = modelProvider && model
      ? `[Use this model: ${modelProvider} - ${model}]\n\n`
      : modelProvider
        ? `[Use this model provider: ${modelProvider}]\n\n`
        : '';
    finalPrompt = modelInstruction + prompt;
  }

  return finalPrompt;
};

/**
 * Routes user request to appropriate agent
 *
 * Uses AgentRouter to determine which agent should handle the request
 * based on masked conversation context
 *
 * @param mastra - Mastra instance
 * @param orchestratorInput - Masked prompt + context for routing
 * @returns Route result with selected agent name and optional task context
 * @throws Error if routing fails
 */
export const routeToAgent = async (
  mastra: Mastra,
  orchestratorInput: string
) => {
  const router = new AgentRouter(mastra);
  const routeResult = await router.route(orchestratorInput);
  logger.info('agent_routing_successful', { agentName: routeResult.agentName });
  return routeResult;
};

/**
 * Creates agent stream for user response
 *
 * Initiates streaming response from selected agent
 * with memory context and AI SDK formatting
 *
 * @param agent - Agent instance to stream from
 * @param finalPrompt - Complete prompt (with context and model overrides)
 * @param threadId - Thread ID for session memory
 * @param agentName - Agent name for logging
 * @returns Stream object for UI response
 * @throws Error if stream creation fails
 */
export const createAgentStream = async (
  agent: any,
  finalPrompt: string,
  threadId: string,
  agentName: string
) => {
  const stream = await agent.stream(finalPrompt, {
    format: 'aisdk',
    memory: {
      thread: threadId,
      resource: 'agentic-ally-user'
    },
  });

  logger.info('stream_created_successfully', { agentName });
  return stream;
};

/**
 * Injects unmasked orchestrator context into final prompt
 *
 * SECURITY RULE: Agent ALWAYS gets unmasked data (for tool execution)
 *
 * Takes task context from orchestrator (which is masked), unmasks it using the
 * PII mapping, and injects it into the prompt so agent can access real names/emails
 * for tool execution (CRM lookups, email sending, etc.)
 *
 * This is the critical step that enables:
 * - Orchestrator routing = intention-based (using masked data)
 * - Agent execution = capability-based (using real data)
 *
 * @param finalPrompt - Current final prompt (with model overrides)
 * @param taskContext - Masked task context from orchestrator
 *                      (e.g., "[CONTEXT: User is in [PERSON1]'s dept]")
 * @param piiMapping - Mapping from [PERSON1] → "John" to reverse the masking
 *
 * @returns Updated final prompt with injected unmasked context
 *
 * @example
 * Input:
 *   finalPrompt: "Handle the user's request"
 *   taskContext: "[CONTEXT: Assign training to [PERSON1]]"
 *   piiMapping: { "[PERSON1]": "john.doe" }
 * Output:
 *   "[CONTEXT: Assign training to john.doe]\n\nHandle the user's request"
 *
 * Note: The [CONTEXT] is now UNMASKED so agent can execute tools with real data
 */
export const injectOrchestratorContext = (
  finalPrompt: string,
  taskContext: string | undefined,
  piiMapping: Record<string, string>
): string => {
  if (!taskContext) {
    return finalPrompt;
  }

  const unmaskedTaskContext = unmaskPII(taskContext, piiMapping);
  const updatedPrompt = `[CONTEXT FROM ORCHESTRATOR: ${unmaskedTaskContext}]\n\n${finalPrompt}`;
  logger.debug('orchestrator_context_injected');

  return updatedPrompt;
};
