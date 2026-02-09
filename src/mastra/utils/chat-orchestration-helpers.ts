/**
 * Chat Orchestration Helper Functions
 *
 * Utilities for orchestrating chat request execution with focus on security
 * and clean separation of concerns.
 *
 * FUNCTIONS:
 * ==========
 * - extractAndPrepareThreadId()       → Step 1: Session continuity (UUID-based)
 * - buildFinalPromptWithModelOverride() → Step 2: Add model instructions
 * - routeToAgent()                    → Step 3: Route to agent
 * - createAgentStream()               → Step 4: Stream response from agent
 */

import { randomUUID } from 'crypto';
import { PinoLogger } from '@mastra/loggers';
import { Mastra } from '@mastra/core/mastra';
import { AgentRouter } from '../services/agent-router';
import { Agent } from '@mastra/core/agent';
import { ChatRequestBody } from '../types/api-types';
import { resolveLogLevel } from './core/logger';


const logger = new PinoLogger({
  name: 'ChatOrchestration',
  level: resolveLogLevel(),
});

/**
 * Extracts or generates thread ID for session continuity
 *
 * Prefers explicit thread ID from request body,
 * falls back to generating a unique UUID
 *
 * @param body - Request body containing optional threadId/conversationId/sessionId
 * @returns Generated or provided thread ID
 */
export const extractAndPrepareThreadId = (body: ChatRequestBody): string => {
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
 * based on conversation context
 *
 * @param mastra - Mastra instance
 * @param orchestratorInput - Prompt + context for routing
 * @returns Route result with selected agent name and optional task context
 * @throws Error if routing fails
 */
export const routeToAgent = async (
  mastra: Mastra,
  orchestratorInput: string
) => {
  const router = new AgentRouter(mastra);
  const routeResult = await router.route(orchestratorInput);

  // Debug: Routing response from orchestrator
  logger.info('✅ ORCHESTRATOR_RESPONSE Response from orchestrator', {
    agentName: routeResult.agentName,
    taskContext: routeResult.taskContext
  });

  logger.info('agent_routing_successful', {
    agentName: routeResult.agentName,
    taskContext: routeResult.taskContext
  });
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
  agent: Agent<any, any, any>,
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

