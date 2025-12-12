import { Mastra } from '@mastra/core/mastra';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { AGENT_NAMES } from '../constants';
import { withRetry } from '../utils/core/resilience-utils';

// Extract agent name type from constants
type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];

export type AgentRoutingResult = {
  agentName: AgentName;
  taskContext?: string;
};

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
    const validAgents = Object.values(AGENT_NAMES).filter(name => name !== AGENT_NAMES.ORCHESTRATOR);

    try {
      console.log('🧠 Orchestrator analyzing intent...');

      // Wrap orchestrator call + JSON parsing in retry mechanism
      // withRetry will automatically retry on errors with exponential backoff
      const decision = await withRetry(
        async () => {
          // Get response from orchestrator
          const routingResult = await orchestrator.generate(prompt);
          const routingText = routingResult.text;

          // Clean and parse JSON (cleanResponse handles jsonrepair internally)
          const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
          const parsed = JSON.parse(cleanJsonText);

          return parsed;
        },
        'orchestrator-routing'
      );

      const agent = decision?.agent;
      const taskContext = decision?.taskContext;

      // Validate agent name
      if (validAgents.includes(agent)) {
        console.log(`✅ Routed to: ${agent}`);
        if (taskContext) console.log(`📝 Context: ${taskContext}`);
        return { agentName: agent, taskContext };
      }

      // Invalid agent name - this is a logic error, not a transient error
      // Don't retry, just fallback to default
      console.warn(`⚠️ Invalid agent name "${agent}" from orchestrator. Defaulting to ${AGENT_NAMES.MICROLEARNING}.`, {
        received: agent,
        validAgents,
        decision: JSON.stringify(decision),
      });
      return { agentName: AGENT_NAMES.MICROLEARNING };

    } catch (error) {
      // withRetry exhausted all attempts - fallback to default
      console.error('❌ Orchestrator routing failed after all retries:', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      return { agentName: AGENT_NAMES.MICROLEARNING };
    }
  }
}
