import { Mastra } from '@mastra/core/mastra';
import { cleanResponse } from '../utils/content-processors/json-cleaner';

export type AgentRoutingResult = {
  agentName: 'phishingEmailAssistant' | 'microlearningAgent' | 'userInfoAssistant';
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
   */
  async route(prompt: string): Promise<AgentRoutingResult> {
    try {
      console.log('🧠 Orchestrator analyzing intent...');

      const orchestrator = this.mastra.getAgent('orchestrator');

      // Send full prompt directly
      const routingResult = await orchestrator.generate(prompt);
      const routingText = routingResult.text;

      // Parse JSON directly using our robust cleaner
      const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
      const decision = JSON.parse(cleanJsonText);

      const agent = decision?.agent;
      const taskContext = decision?.taskContext;

      if (['phishingEmailAssistant', 'microlearningAgent', 'userInfoAssistant'].includes(agent)) {
        console.log(`✅ Routed to: ${agent}`);
        if (taskContext) console.log(`📝 Context: ${taskContext}`);
        return { agentName: agent, taskContext };
      }

      // Fallback
      console.warn(`⚠️ Unexpected JSON output: ${JSON.stringify(decision)}. Defaulting to microlearningAgent.`);
      return { agentName: 'microlearningAgent' };

    } catch (error) {
      console.error('❌ Orchestrator routing error:', error);
      return { agentName: 'microlearningAgent' };
    }
  }
}
