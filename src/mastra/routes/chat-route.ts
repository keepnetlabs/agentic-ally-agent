/**
 * POST /chat - Main Chat Route Handler
 *
 * FLOW:
 * -----
 * 1. Parse user input (keep original prompt)
 * 2. Build routing context for orchestrator
 * 3. Pass data to orchestrator → get taskContext
 * 4. Inject taskContext into the prompt for the agent
 * 5. Agent receives: [Original prompt] + [Orchestrator context]
 */

import { Context } from 'hono';
import { toAISdkStream } from '@mastra/ai-sdk';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { parseAndValidateRequest } from '../utils/chat-request-helpers';
import { extractArtifactIdsFromRoutingContext } from '../utils/chat-request-helpers';
import {
  extractAndPrepareThreadId,
  buildFinalPromptWithModelOverride,
  routeToAgent,
  createAgentStream,
} from '../utils/chat-orchestration-helpers';
import { normalizeSafeId } from '../utils/core/id-utils';
import { requestStorage } from '../utils/core/request-storage';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import type { ChatRequestBody } from '../types';

const logger = getLogger('ChatRoute');

export async function chatHandler(c: Context) {
  const mastra = c.get('mastra');

  // Step 1: Parse and validate chat request
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

  // Debug: Parse result
  logger.info('🔍 PARSE_RESULT Chat request parsed successfully', {
    prompt: prompt,
    routingContext: routingContext,
  });

  // Step 2: Prepare orchestrator input (no masking)
  const orchestratorInput = routingContext
    ? `Here is the recent conversation history:\n---\n${routingContext}\n---\n\nCurrent user message: "${prompt}"\n\nBased on this history and the current message, decide which agent should handle the request.`
    : prompt;

  // Step 3: Extract or generate thread ID
  const threadId = extractAndPrepareThreadId(body);

  // Persist threadId in request storage so assign tools can use it as batchResourceId
  const store = requestStorage.getStore();
  if (store) store.threadId = threadId;

  // Step 4: Route to agent
  let routeResult;
  try {
    routeResult = await routeToAgent(mastra, orchestratorInput);
    logger.info('🎬 FINAL_ROUTING Agent selected', {
      agentName: routeResult.agentName,
      taskContext: routeResult.taskContext,
    });
  } catch (routingError) {
    const err = normalizeError(routingError);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'agent-routing',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'agent_routing_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: 'Agent routing failed',
        message: routingError instanceof Error ? routingError.message : 'Unknown routing error',
      },
      500
    );
  }

  // Verify agent exists
  const agent = mastra.getAgent(routeResult.agentName);
  if (!agent) {
    logger.error('agent_not_found', { agentName: routeResult.agentName });
    return c.json(
      {
        success: false,
        error: 'Agent not found',
        message: `Agent "${routeResult.agentName}" is not available`,
      },
      500
    );
  }

  // Step 5: Build final prompt with model overrides
  let finalPrompt = buildFinalPromptWithModelOverride(prompt, body?.modelProvider, body?.model);

  // Inject deterministic artifact IDs (short, code-derived) so agents don't have to guess from long history
  const {
    microlearningId,
    phishingId,
    smishingId,
    resourceId,
    scenarioResourceId,
    landingPageResourceId,
    languageId,
    sendTrainingLanguageId,
    targetUserResourceId,
    targetGroupResourceId,
  } = extractArtifactIdsFromRoutingContext(routingContext);

  if (
    microlearningId ||
    phishingId ||
    smishingId ||
    resourceId ||
    scenarioResourceId ||
    landingPageResourceId ||
    languageId ||
    sendTrainingLanguageId ||
    targetUserResourceId ||
    targetGroupResourceId
  ) {
    // Canonical / allowlisted [ARTIFACT_IDS] block (key=value, stable order, safe chars only)
    const safeMicrolearningId = normalizeSafeId(microlearningId);
    const safePhishingId = normalizeSafeId(phishingId);
    const safeSmishingId = normalizeSafeId(smishingId);
    const safeResourceId = normalizeSafeId(resourceId);
    const safeScenarioResourceId = normalizeSafeId(scenarioResourceId);
    const safeLandingPageResourceId = normalizeSafeId(landingPageResourceId);
    const safeLanguageId = normalizeSafeId(languageId);
    const safeSendTrainingLanguageId = normalizeSafeId(sendTrainingLanguageId);
    const safeTargetUserResourceId = normalizeSafeId(targetUserResourceId);
    const safeTargetGroupResourceId = normalizeSafeId(targetGroupResourceId);

    const parts = [
      safeMicrolearningId ? `microlearningId=${safeMicrolearningId}` : undefined,
      safePhishingId ? `phishingId=${safePhishingId}` : undefined,
      safeSmishingId ? `smishingId=${safeSmishingId}` : undefined,
      // upload/assign IDs (phishing + training)
      safeResourceId ? `resourceId=${safeResourceId}` : undefined,
      safeScenarioResourceId ? `scenarioResourceId=${safeScenarioResourceId}` : undefined,
      safeLandingPageResourceId ? `landingPageResourceId=${safeLandingPageResourceId}` : undefined,
      safeLanguageId ? `languageId=${safeLanguageId}` : undefined,
      safeSendTrainingLanguageId ? `sendTrainingLanguageId=${safeSendTrainingLanguageId}` : undefined,
      safeTargetUserResourceId ? `targetUserResourceId=${safeTargetUserResourceId}` : undefined,
      safeTargetGroupResourceId ? `targetGroupResourceId=${safeTargetGroupResourceId}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      finalPrompt = `[ARTIFACT_IDS] ${parts.join(' ')}\n\n${finalPrompt}`;
    }
  }

  // Step 6: Inject orchestrator context
  if (routeResult.taskContext) {
    finalPrompt = `[CONTEXT FROM ORCHESTRATOR: ${routeResult.taskContext}]\n\n${finalPrompt}`;
  }

  // Step 7: Create agent stream
  const generationStartMs = Date.now();
  let stream;
  try {
    stream = await createAgentStream(agent, finalPrompt, threadId, routeResult.agentName);
    const generationDurationMs = Date.now() - generationStartMs;
    logger.info('metric_generation_duration', {
      metric: 'generation_duration_ms',
      generation_duration_ms: generationDurationMs,
      path: '/chat',
      agentName: routeResult.agentName,
    });
  } catch (streamError) {
    const err = normalizeError(streamError);
    const errorInfo = errorService.external(err.message, {
      step: 'stream-creation',
      stack: err.stack,
      agentName: routeResult.agentName,
    });
    logErrorInfo(logger, 'error', 'stream_creation_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: 'Stream creation failed',
        message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
      },
      500
    );
  }

  // v1: Use createUIMessageStream pattern from docs
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
