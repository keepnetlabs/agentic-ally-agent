/**
 * Customer Service Chat Orchestration Helpers
 *
 * Utilities for the /customer-service/chat endpoint.
 * Reuses existing helpers from chat-orchestration-helpers.ts where possible.
 */
import { Mastra } from '@mastra/core/mastra';
import { CSAgentRouter, type CSAgentRoutingResult } from '../services/cs-agent-router';
import { getLogger } from './core/logger';

const logger = getLogger('CSOrchestration');

/**
 * Routes a customer service request to the appropriate CS agent.
 *
 * Uses CSAgentRouter which delegates to the CS Orchestrator agent.
 * Falls back to companySearchAssistant on routing failure.
 */
export const routeToCSAgent = async (
  mastra: Mastra,
  orchestratorInput: string
): Promise<CSAgentRoutingResult> => {
  const router = new CSAgentRouter(mastra);
  const routeResult = await router.route(orchestratorInput);

  logger.info('CS agent routing successful', {
    agentName: routeResult.agentName,
    taskContext: routeResult.taskContext,
  });

  return routeResult;
};
