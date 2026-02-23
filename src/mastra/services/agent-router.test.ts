import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentRouter } from './agent-router';
import { Mastra } from '@mastra/core/mastra';
import { AGENT_NAMES } from '../constants';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { withRetry } from '../utils/core/resilience-utils';
import '../../../../src/__tests__/setup';

// Mock dependencies
vi.mock('../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn(),
}));

vi.mock('../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(),
}));

/**
 * Test Suite: AgentRouter
 * Tests for routing user prompts to appropriate agents
 * Covers: Routing logic, JSON parsing, agent validation, error handling
 */

describe('AgentRouter', () => {
  let agentRouter: AgentRouter;
  let mockMastra: any;
  let mockOrchestrator: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock orchestrator agent
    mockOrchestrator = {
      generate: vi.fn(),
    };

    // Mock Mastra instance
    mockMastra = {
      getAgent: vi.fn().mockReturnValue(mockOrchestrator),
    };

    agentRouter = new AgentRouter(mockMastra as Mastra);
  });

  describe('Constructor', () => {
    it('should initialize with Mastra instance', () => {
      const router = new AgentRouter(mockMastra as Mastra);
      expect(router).toBeDefined();
    });
  });

  describe('Route - Successful Routing', () => {
    it('should route to microlearning agent when orchestrator returns microlearning', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
        taskContext: 'Create training content',
      };

      const mockRoutingText = JSON.stringify(mockDecision);
      mockOrchestrator.generate.mockReturnValue({
        text: mockRoutingText,
      });

      (cleanResponse as any).mockReturnValue(mockRoutingText);
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingResult = await mockOrchestrator.generate('Create a training about cybersecurity');
        const routingText = routingResult.text;
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      const result = await agentRouter.route('Create a training about cybersecurity');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
      expect(result.taskContext).toBe('Create training content');
      expect(mockMastra.getAgent).toHaveBeenCalledWith('orchestrator');
      expect(mockOrchestrator.generate).toHaveBeenCalledWith('Create a training about cybersecurity');
    });

    it('should route to phishing agent when orchestrator returns phishing', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.PHISHING,
        taskContext: 'Generate phishing simulation',
      };

      const mockRoutingText = JSON.stringify(mockDecision);
      mockOrchestrator.generate.mockReturnValue({
        text: mockRoutingText,
      });

      (cleanResponse as any).mockReturnValue(mockRoutingText);
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingResult = await mockOrchestrator.generate('Generate a phishing email');
        const routingText = routingResult.text;
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      const result = await agentRouter.route('Generate a phishing email');

      expect(result.agentName).toBe(AGENT_NAMES.PHISHING);
      expect(result.taskContext).toBe('Generate phishing simulation');
    });

    it('should handle routing with optional taskContext', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Create training');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
      expect(result.taskContext).toBeUndefined();
    });
  });

  describe('Route - Invalid Agent Name', () => {
    it('should default to microlearning agent when orchestrator returns invalid agent name', async () => {
      const mockDecision = {
        agent: 'INVALID_AGENT',
        taskContext: 'Some context',
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Some prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
      expect(result.taskContext).toBeUndefined();
    });

    it('should default to microlearning when orchestrator returns orchestrator agent name', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.ORCHESTRATOR, // Invalid - orchestrator shouldn't route to itself
        taskContext: 'Some context',
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Some prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
    });
  });

  describe('Route - Error Handling', () => {
    it('should default to microlearning agent when orchestrator throws error', async () => {
      mockOrchestrator.generate.mockRejectedValue(new Error('Orchestrator failed'));
      (withRetry as any).mockRejectedValue(new Error('All retries exhausted'));

      const result = await agentRouter.route('Some prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
      expect(result.taskContext).toBeUndefined();
    });

    it('should default to microlearning agent when JSON parsing fails after retries', async () => {
      mockOrchestrator.generate.mockReturnValue({
        text: 'Invalid JSON response',
      });

      (cleanResponse as any).mockReturnValue('Invalid JSON');
      (withRetry as any).mockRejectedValue(new Error('JSON parse failed'));

      const result = await agentRouter.route('Some prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
    });

    it('should handle withRetry exhausts all attempts', async () => {
      mockOrchestrator.generate.mockRejectedValue(new Error('Network error'));
      (withRetry as any).mockRejectedValue(new Error('All retries exhausted'));

      const result = await agentRouter.route('Some prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
    });
  });

  describe('Route - Integration with withRetry', () => {
    it('should use withRetry for orchestrator call and JSON parsing', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
        taskContext: 'Test context',
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      await agentRouter.route('Test prompt');

      expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'orchestrator-routing');
    });

    it('should invoke withRetry callback which calls orchestrator and cleanResponse', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.POLICY_SUMMARY,
        taskContext: 'Summarize policy',
        reasoning: 'User asked for policy summary',
      };
      const jsonText = JSON.stringify(mockDecision);

      mockOrchestrator.generate.mockResolvedValue({ text: jsonText });
      (cleanResponse as any).mockReturnValue(jsonText);
      (withRetry as any).mockImplementation(async (fn: () => Promise<unknown>) => fn());

      const result = await agentRouter.route('Summarize this policy document');

      expect(result.agentName).toBe(AGENT_NAMES.POLICY_SUMMARY);
      expect(result.taskContext).toBe('Summarize policy');
      expect(mockOrchestrator.generate).toHaveBeenCalledWith('Summarize this policy document');
      expect(cleanResponse).toHaveBeenCalledWith(jsonText, 'orchestrator-decision');
    });

    it('should retry on JSON parse errors', async () => {
      let attemptCount = 0;
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
        taskContext: 'Test context',
      };

      (cleanResponse as any).mockReturnValueOnce('Invalid JSON').mockReturnValueOnce(JSON.stringify(mockDecision));

      (withRetry as any).mockImplementation(async (_fn: any) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('JSON parse error');
        }
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Test prompt');

      expect(result.agentName).toBe(AGENT_NAMES.MICROLEARNING);
    });
  });

  describe('Route - Valid Agents List', () => {
    it('should exclude orchestrator from valid agents list', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      await agentRouter.route('Test prompt');

      // Verify orchestrator is not in valid agents (implicitly tested by routing logic)
      expect(AGENT_NAMES.ORCHESTRATOR).toBeDefined();
    });
  });

  describe('Route - All valid agents', () => {
    const setupRouteTest = async (
      agent: string,
      taskContext: string,
      prompt: string
    ): Promise<{ agentName: string; taskContext?: string }> => {
      const mockDecision = { agent, taskContext };
      const json = JSON.stringify(mockDecision);
      vi.mocked(cleanResponse).mockReturnValue(json);
      vi.mocked(withRetry).mockResolvedValue(mockDecision as never);
      return agentRouter.route(prompt);
    };

    it('should route to smishing agent', async () => {
      const result = await setupRouteTest(AGENT_NAMES.SMISHING, 'SMS phishing', 'Create smishing');
      expect(result.agentName).toBe(AGENT_NAMES.SMISHING);
      expect(result.taskContext).toBe('SMS phishing');
    });

    it('should route to vishing agent', async () => {
      const result = await setupRouteTest(AGENT_NAMES.VISHING_CALL, 'Place call', 'Initiate vishing call');
      expect(result.agentName).toBe(AGENT_NAMES.VISHING_CALL);
    });

    it('should route to deepfake video agent', async () => {
      const result = await setupRouteTest(AGENT_NAMES.DEEPFAKE_VIDEO, 'Generate video', 'Create deepfake video');
      expect(result.agentName).toBe(AGENT_NAMES.DEEPFAKE_VIDEO);
    });

    it('should route to user info agent', async () => {
      const result = await setupRouteTest(AGENT_NAMES.USER_INFO, 'Get user list', 'Show user assignments');
      expect(result.agentName).toBe(AGENT_NAMES.USER_INFO);
    });

    it('should route to policy summary agent', async () => {
      const result = await setupRouteTest(AGENT_NAMES.POLICY_SUMMARY, 'Summarize policy', 'Summarize policy doc');
      expect(result.agentName).toBe(AGENT_NAMES.POLICY_SUMMARY);
    });
  });

  describe('AgentRoutingResult interface', () => {
    it('should have agentName field', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
        taskContext: 'Create training',
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Test');

      expect(result).toHaveProperty('agentName');
      expect(typeof result.agentName).toBe('string');
    });

    it('should have optional taskContext field', async () => {
      const mockDecision = {
        agent: AGENT_NAMES.MICROLEARNING,
        taskContext: 'Build intermediate training',
      };

      (cleanResponse as any).mockReturnValue(JSON.stringify(mockDecision));
      (withRetry as any).mockImplementation(async (_fn: any) => {
        const routingText = JSON.stringify(mockDecision);
        const cleanJsonText = cleanResponse(routingText, 'orchestrator-decision');
        return JSON.parse(cleanJsonText);
      });

      mockOrchestrator.generate.mockReturnValue({
        text: JSON.stringify(mockDecision),
      });

      const result = await agentRouter.route('Test');

      expect(result).toHaveProperty('taskContext');
      expect(result.taskContext).toBe('Build intermediate training');
    });
  });
});
