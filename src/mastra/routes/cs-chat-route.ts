/**
 * POST /customer-service/chat - Customer Service Chat Route Handler
 *
 * Separate Agent Swarm for customer service requests.
 * Uses CS Orchestrator to route to CompanySearch or TrainingStats agents.
 */

import { Context } from 'hono';
import { toAISdkStream } from '@mastra/ai-sdk';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { parseAndValidateRequest } from '../utils/chat-request-helpers';
import {
  extractAndPrepareThreadId,
  buildFinalPromptWithModelOverride,
  createAgentStream,
} from '../utils/chat-orchestration-helpers';
import { requestStorage } from '../utils/core/request-storage';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { routeToCSAgent } from '../utils/cs-orchestration-helpers';
import { getLogger } from '../utils/core/logger';
import type { ChatRequestBody } from '../types';

const logger = getLogger('CSChatRoute');

export async function csChatHandler(c: Context) {
  const mastra = c.get('mastra');

  // Step 1: Parse and validate request (reuse existing helper)
  let body: ChatRequestBody = {};
  try {
    body = await c.req.json<ChatRequestBody>();
  } catch {
    // ignore JSON parse errors
  }

  const parsedRequest = parseAndValidateRequest(body);
  if (!parsedRequest) {
    return c.json(
      {
        success: false,
        message: 'Missing prompt. Provide {prompt}, {text}, {input}, or AISDK {messages} with user text.',
      },
      400
    );
  }

  const { prompt, routingContext } = parsedRequest;

  logger.info('CS_CHAT_REQUEST Customer service chat request', { prompt });

  // Step 2: Thread ID (reuse existing helper)
  const threadId = extractAndPrepareThreadId(body);
  const store = requestStorage.getStore();
  if (store) store.threadId = threadId;

  // Step 3: Build CS orchestrator input
  const orchestratorInput = routingContext
    ? `Here is the recent conversation history:\n---\n${routingContext}\n---\n\nCurrent user message: "${prompt}"\n\nBased on this history and the current message, decide which CS agent should handle the request.`
    : prompt;

  // Step 4: Route via CS Orchestrator
  let routeResult;
  try {
    routeResult = await routeToCSAgent(mastra, orchestratorInput);
    logger.info('CS_ROUTING Agent selected', {
      agentName: routeResult.agentName,
      taskContext: routeResult.taskContext,
    });
  } catch (routingError) {
    const err = normalizeError(routingError);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'cs-agent-routing',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'cs_agent_routing_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: 'CS agent routing failed',
        message: routingError instanceof Error ? routingError.message : 'Unknown routing error',
      },
      500
    );
  }

  // Step 5: Get agent instance
  const agent = mastra.getAgent(routeResult.agentName);
  if (!agent) {
    logger.error('cs_agent_not_found', { agentName: routeResult.agentName });
    return c.json(
      {
        success: false,
        error: 'CS agent not found',
        message: `Agent "${routeResult.agentName}" is not available`,
      },
      500
    );
  }

  // Step 6: Build final prompt with CS context
  let finalPrompt = buildFinalPromptWithModelOverride(prompt, body?.modelProvider, body?.model);
  if (routeResult.taskContext) {
    finalPrompt = `[CONTEXT FROM CS ORCHESTRATOR: ${routeResult.taskContext}]\n\n${finalPrompt}`;
  }

  // Step 7: Create agent stream (reuse existing helper)
  let stream;
  try {
    stream = await createAgentStream(agent, finalPrompt, threadId, routeResult.agentName);
  } catch (streamError) {
    const err = normalizeError(streamError);
    const errorInfo = errorService.external(err.message, {
      step: 'cs-stream-creation',
      stack: err.stack,
      agentName: routeResult.agentName,
    });
    logErrorInfo(logger, 'error', 'cs_stream_creation_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: 'Stream creation failed',
        message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
      },
      500
    );
  }

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const part of toAISdkStream(stream, { from: 'agent' }) as AsyncIterable<any>) {
        await writer.write(part);
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: uiMessageStream,
  });
}
