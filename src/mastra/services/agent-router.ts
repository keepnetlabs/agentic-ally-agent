import { Mastra } from '@mastra/core/mastra';
import { z } from 'zod';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { AGENT_NAMES } from '../constants';
import { withRetry } from '../utils/core/resilience-utils';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';

const logger = getLogger('AgentRouter');

// Extract agent name type from constants
type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];
type PublicRoutableAgentName =
  | typeof AGENT_NAMES.PHISHING
  | typeof AGENT_NAMES.SMISHING
  | typeof AGENT_NAMES.MICROLEARNING
  | typeof AGENT_NAMES.USER_INFO
  | typeof AGENT_NAMES.POLICY_SUMMARY
  | typeof AGENT_NAMES.VISHING_CALL
  | typeof AGENT_NAMES.EMAIL_IR_ANALYST
  | typeof AGENT_NAMES.DEEPFAKE_VIDEO
  | typeof AGENT_NAMES.OUT_OF_SCOPE;

export type AgentRoutingResult = {
  agentName: AgentName;
  taskContext?: string;
};

interface RoutingDecision {
  agent: AgentName;
  taskContext?: string;
  reasoning?: string;
}

const routingDecisionSchema = z.object({
  agent: z.string().min(1, 'agent is required'),
  taskContext: z.string().optional(),
  reasoning: z.string().optional(),
});

const normalizeAgentKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const PUBLIC_ROUTABLE_AGENT_NAMES: readonly PublicRoutableAgentName[] = [
  AGENT_NAMES.PHISHING,
  AGENT_NAMES.SMISHING,
  AGENT_NAMES.MICROLEARNING,
  AGENT_NAMES.USER_INFO,
  AGENT_NAMES.POLICY_SUMMARY,
  AGENT_NAMES.VISHING_CALL,
  AGENT_NAMES.EMAIL_IR_ANALYST,
  AGENT_NAMES.DEEPFAKE_VIDEO,
  AGENT_NAMES.OUT_OF_SCOPE,
] as const;

const buildNormalizedAgentMap = (
  validAgents: readonly PublicRoutableAgentName[]
): ReadonlyMap<string, PublicRoutableAgentName> => {
  const map = new Map<string, PublicRoutableAgentName>();

  for (const agentName of validAgents) {
    map.set(normalizeAgentKey(agentName), agentName);
  }

  map.set('outofscope', AGENT_NAMES.OUT_OF_SCOPE);

  return map;
};

const normalizeAgentName = (
  agent: string,
  normalizedAgentMap: ReadonlyMap<string, PublicRoutableAgentName>
): PublicRoutableAgentName | undefined => normalizedAgentMap.get(normalizeAgentKey(agent));

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
    const validAgents = PUBLIC_ROUTABLE_AGENT_NAMES;
    const normalizedAgentMap = buildNormalizedAgentMap(validAgents);

    try {
      logger.info('Orchestrator analyzing intent');

      const decision = await withRetry<RoutingDecision>(async () => {
        const routingResult = await orchestrator.generate(prompt);
        const routingText = routingResult.text;

        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        const parsed = routingDecisionSchema.parse(JSON.parse(cleanJsonText));
        const normalizedAgent = normalizeAgentName(parsed.agent, normalizedAgentMap);

        if (!normalizedAgent) {
          throw new Error(`Invalid agent name from orchestrator: ${parsed.agent}`);
        }

        return {
          agent: normalizedAgent,
          taskContext: parsed.taskContext?.trim() || undefined,
          reasoning: parsed.reasoning?.trim() || undefined,
        };
      }, 'orchestrator-routing');

      const agent = decision?.agent
        ? normalizeAgentName(decision.agent, normalizedAgentMap)
        : undefined;
      const taskContext = decision?.taskContext?.trim() || undefined;
      const reasoning = decision?.reasoning;

      if (!agent) {
        logger.warn('Invalid agent name from orchestrator, defaulting', {
          received: decision?.agent,
          validAgents,
          decision: JSON.stringify(decision),
          defaultAgent: AGENT_NAMES.MICROLEARNING,
        });
        return { agentName: AGENT_NAMES.MICROLEARNING };
      }

      const logEmoji = agent === AGENT_NAMES.OUT_OF_SCOPE ? '🚫' : '✅';
      logger.info(`${logEmoji} Routed to agent`, {
        agent,
        taskContext,
        reasoning,
      });
      return { agentName: agent, taskContext };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        step: 'orchestrator-routing',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', 'Orchestrator routing failed after all retries', errorInfo);
      return { agentName: AGENT_NAMES.MICROLEARNING };
    }
  }
}
