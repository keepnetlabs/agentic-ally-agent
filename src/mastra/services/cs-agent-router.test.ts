import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CSAgentRouter } from './cs-agent-router';
import { Mastra } from '@mastra/core/mastra';
import { CS_AGENT_NAMES, CS_DEFAULT_AGENT } from '../agents/customer-service/cs-constants';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { withRetry } from '../utils/core/resilience-utils';
import '../../__tests__/setup';

vi.mock('../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn(),
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(),
}));

describe('CSAgentRouter', () => {
  let router: CSAgentRouter;
  let mockMastra: any;
  let mockOrchestrator: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrchestrator = { generate: vi.fn() };
    mockMastra = { getAgent: vi.fn().mockReturnValue(mockOrchestrator) };
    router = new CSAgentRouter(mockMastra as Mastra);
  });

  describe('route', () => {
    it('should route to companySearchAssistant when orchestrator returns valid agent', async () => {
      const decision = { agent: CS_AGENT_NAMES.COMPANY_SEARCH, taskContext: 'Find companies' };
      mockOrchestrator.generate.mockResolvedValue({ text: JSON.stringify(decision) });
      (cleanResponse as any).mockReturnValue(JSON.stringify(decision));
      (withRetry as any).mockImplementation(async (fn: () => Promise<any>) => fn());

      const result = await router.route('Show me companies in healthcare');

      expect(result.agentName).toBe(CS_AGENT_NAMES.COMPANY_SEARCH);
      expect(result.taskContext).toBe('Find companies');
      expect(mockMastra.getAgent).toHaveBeenCalledWith(CS_AGENT_NAMES.CS_ORCHESTRATOR);
    });

    it('should route to trainingStatsAssistant when orchestrator returns it', async () => {
      const decision = { agent: CS_AGENT_NAMES.TRAINING_STATS, taskContext: 'Training stats' };
      mockOrchestrator.generate.mockResolvedValue({ text: JSON.stringify(decision) });
      (cleanResponse as any).mockReturnValue(JSON.stringify(decision));
      (withRetry as any).mockImplementation(async (fn: () => Promise<any>) => fn());

      const result = await router.route('How many trainings are in English?');

      expect(result.agentName).toBe(CS_AGENT_NAMES.TRAINING_STATS);
    });

    it('should route to reportAgent when orchestrator returns it', async () => {
      const decision = { agent: CS_AGENT_NAMES.REPORT, taskContext: 'Generate usage report' };
      mockOrchestrator.generate.mockResolvedValue({ text: JSON.stringify(decision) });
      (cleanResponse as any).mockReturnValue(JSON.stringify(decision));
      (withRetry as any).mockImplementation(async (fn: () => Promise<any>) => fn());

      const result = await router.route('Show me a report');

      expect(result.agentName).toBe(CS_AGENT_NAMES.REPORT);
      expect(result.taskContext).toBe('Generate usage report');
    });

    it('should fallback to default agent when orchestrator returns invalid agent', async () => {
      const decision = { agent: 'invalid-agent', taskContext: 'Unknown' };
      mockOrchestrator.generate.mockResolvedValue({ text: JSON.stringify(decision) });
      (cleanResponse as any).mockReturnValue(JSON.stringify(decision));
      (withRetry as any).mockImplementation(async (fn: () => Promise<any>) => fn());

      const result = await router.route('Random query');

      expect(result.agentName).toBe(CS_DEFAULT_AGENT);
      expect(result.taskContext).toBeUndefined();
    });

    it('should fallback to default agent on routing error', async () => {
      (withRetry as any).mockRejectedValue(new Error('Orchestrator failed'));

      const result = await router.route('Any prompt');

      expect(result.agentName).toBe(CS_DEFAULT_AGENT);
    });

    it('should fallback to default agent on JSON parse error', async () => {
      mockOrchestrator.generate.mockResolvedValue({ text: 'not valid json' });
      (cleanResponse as any).mockReturnValue('not valid json');
      (withRetry as any).mockImplementation(async (fn: () => Promise<any>) => fn());

      const result = await router.route('Query');

      expect(result.agentName).toBe(CS_DEFAULT_AGENT);
    });
  });
});
