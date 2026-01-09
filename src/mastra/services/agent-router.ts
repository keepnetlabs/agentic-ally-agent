import { Mastra } from '@mastra/core/mastra';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { AGENT_NAMES } from '../constants';
import { withRetry } from '../utils/core/resilience-utils';
import { getLogger } from '../utils/core/logger';
import { normalizeError } from '../utils/core/error-utils';

const logger = getLogger('AgentRouter');

// Extract agent name type from constants
type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];

export type AgentRoutingResult = {
  agentName: AgentName;
  taskContext?: string;
};

interface RoutingDecision {
  agent: AgentName;
  taskContext?: string;
}

export class AgentRouter {
  private mastra: Mastra;

  constructor(mastra: Mastra) {
    this.mastra = mastra;
  }

  /**
   * Routes a user prompt to the appropriate agent using pure semantic analysis.
   * Expects a JSON response: { "agent": "...", "taskContext": "..." }
   * Uses withRetry utility for automatic retry with exponential backoff on JSON parse errors.
   */
  async route(prompt: string): Promise<AgentRoutingResult> {
    const orchestrator = this.mastra.getAgent('orchestrator');
    const validAgents: AgentName[] = Object.values(AGENT_NAMES).filter(name => name !== AGENT_NAMES.ORCHESTRATOR);

    try {
      logger.info('Orchestrator analyzing intent');

      // Wrap orchestrator call + JSON parsing in retry mechanism
      // withRetry will automatically retry on errors with exponential backoff
      const decision = await withRetry<RoutingDecision>(
        async () => {
          // Get response from orchestrator
          const routingResult = await orchestrator.generate(prompt);
          const routingText = routingResult.text;

          // Clean and parse JSON (cleanResponse handles jsonrepair internally)
          const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
          const parsed = JSON.parse(cleanJsonText);

          return parsed as RoutingDecision;
        },
        'orchestrator-routing'
      );

      const agent = decision?.agent;
      const taskContext = decision?.taskContext;

      // Validate agent name
      if (validAgents.includes(agent)) {
        logger.info('Routed to agent', { agent, taskContext });
        return { agentName: agent, taskContext };
      }

      // Invalid agent name - this is a logic error, not a transient error
      // Don't retry, just fallback to default
      logger.warn('Invalid agent name from orchestrator, defaulting', {
        received: agent,
        validAgents,
        decision: JSON.stringify(decision),
        defaultAgent: AGENT_NAMES.MICROLEARNING
      });
      return { agentName: AGENT_NAMES.MICROLEARNING };

    } catch (error) {
      // withRetry exhausted all attempts - fallback to default
      const err = normalizeError(error);
      logger.error('Orchestrator routing failed after all retries', {
        error: err.message,
        stack: err.stack,
        errorType: err.constructor.name
      });
      return { agentName: AGENT_NAMES.MICROLEARNING };
    }
  }
}
