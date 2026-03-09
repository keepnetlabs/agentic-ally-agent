/**
 * Customer Service Agent Router
 *
 * Routes CS queries to specialized sub-agents via the CS Orchestrator.
 * Follows the same pattern as AgentRouter but with CS-specific config:
 * - Uses csOrchestrator instead of main orchestrator
 * - Validates against CS_VALID_AGENTS only
 * - Falls back to CS_DEFAULT_AGENT (companySearchAssistant)
 */
import { Mastra } from '@mastra/core/mastra';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { withRetry } from '../utils/core/resilience-utils';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import {
  CS_AGENT_NAMES,
  CS_VALID_AGENTS,
  CS_DEFAULT_AGENT,
  CS_ERROR_MESSAGES,
  type CSAgentName,
} from '../agents/customer-service/cs-constants';

const logger = getLogger('CSAgentRouter');

export type CSAgentRoutingResult = {
  agentName: CSAgentName;
  taskContext?: string;
};

interface CSRoutingDecision {
  agent: CSAgentName;
  taskContext?: string;
  reasoning?: string;
}

export class CSAgentRouter {
  private mastra: Mastra;

  constructor(mastra: Mastra) {
    this.mastra = mastra;
  }

  /**
   * Routes a user prompt to the appropriate CS agent using semantic analysis.
   * Expects a JSON response: { "agent": "...", "taskContext": "..." }
   */
  async route(prompt: string): Promise<CSAgentRoutingResult> {
    const orchestrator = this.mastra.getAgent(CS_AGENT_NAMES.CS_ORCHESTRATOR);
    const validAgents: readonly CSAgentName[] = CS_VALID_AGENTS;

    try {
      logger.info('CS Orchestrator analyzing intent');

      const decision = await withRetry<CSRoutingDecision>(async () => {
        const routingResult = await orchestrator.generate(prompt);
        const routingText = routingResult.text;

        const cleanJsonText = cleanResponse(routingText, 'cs-orchestrator-decision');
        const parsed = JSON.parse(cleanJsonText);

        return parsed as CSRoutingDecision;
      }, 'cs-orchestrator-routing');

      const agent = decision?.agent;
      const taskContext = decision?.taskContext;
      const reasoning = decision?.reasoning;

      if (validAgents.includes(agent)) {
        logger.info('CS Routed to agent', {
          agent,
          taskContext,
          reasoning,
        });
        return { agentName: agent, taskContext };
      }

      logger.warn('Invalid CS agent name from orchestrator, defaulting', {
        received: agent,
        validAgents,
        decision: JSON.stringify(decision),
        defaultAgent: CS_DEFAULT_AGENT,
      });
      return { agentName: CS_DEFAULT_AGENT };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        step: 'cs-orchestrator-routing',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', CS_ERROR_MESSAGES.ROUTING_FAILED, errorInfo);
      return { agentName: CS_DEFAULT_AGENT };
    }
  }
}
