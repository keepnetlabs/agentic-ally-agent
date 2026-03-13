import { describe, it, expect } from 'vitest';
import { microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent, deepfakeVideoAgent } from './index';
import { AGENT_NAMES, ORCHESTRATOR_CONFIRMATION_EXAMPLES } from '../constants';

/**
 * Test suite for Agents Index Exports
 * Tests all agent exports are properly defined and configured
 */
describe('Agents Index Exports', () => {
  // ==================== MICROLEARNING AGENT EXPORT TESTS ====================
  describe('Microlearning Agent Export', () => {
    it('should export microlearningAgent', () => {
      expect(microlearningAgent).toBeDefined();
      expect(microlearningAgent).not.toBeNull();
    });

    it('should be an Agent instance with proper structure', () => {
      expect(microlearningAgent).toHaveProperty('name');
      expect(microlearningAgent).toHaveProperty('getInstructions');
      expect(microlearningAgent).toHaveProperty('model');
      expect(microlearningAgent).toHaveProperty('listTools');
    });

    it('should have correct agent name', () => {
      expect(microlearningAgent.name).toBe(AGENT_NAMES.MICROLEARNING);
      expect(microlearningAgent.name).toBe('microlearningAgent');
    });

    it('should have defined instructions', async () => {
      const instructions = await microlearningAgent.getInstructions();
      expect(instructions).toBeDefined();
      expect(instructions).not.toBe('');
      expect(typeof instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(microlearningAgent.model).toBeDefined();
      expect(microlearningAgent.model).not.toBeNull();
    });

    it('should have tools defined', async () => {
      const tools = await microlearningAgent.listTools();
      expect(tools).toBeDefined();
      expect(typeof tools).toBe('object');
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== ORCHESTRATOR AGENT EXPORT TESTS ====================
  describe('Orchestrator Agent Export', () => {
    it('should export orchestratorAgent', () => {
      expect(orchestratorAgent).toBeDefined();
      expect(orchestratorAgent).not.toBeNull();
    });

    it('should be an Agent instance with proper structure', () => {
      expect(orchestratorAgent).toHaveProperty('name');
      expect(orchestratorAgent).toHaveProperty('getInstructions');
      expect(orchestratorAgent).toHaveProperty('model');
      expect(orchestratorAgent).toHaveProperty('listTools');
    });

    it('should have correct agent name', () => {
      expect(orchestratorAgent.name).toBe(AGENT_NAMES.ORCHESTRATOR);
      expect(orchestratorAgent.name).toBe('orchestrator');
    });

    it('should have defined instructions', async () => {
      const instructions = await orchestratorAgent.getInstructions();
      expect(instructions).toBeDefined();
      expect(instructions).not.toBe('');
      expect(typeof instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(orchestratorAgent.model).toBeDefined();
      expect(orchestratorAgent.model).not.toBeNull();
    });

    it('should be a valid routing agent (may not have tools)', async () => {
      expect(orchestratorAgent.name).toBeDefined();
      expect(await orchestratorAgent.getInstructions()).toBeDefined();
      expect(orchestratorAgent.model).toBeDefined();
    });

    it('should include ORCHESTRATOR_CONFIRMATION_EXAMPLES in Scenario A instructions', async () => {
      const instructions = await orchestratorAgent.getInstructions();
      for (const example of ORCHESTRATOR_CONFIRMATION_EXAMPLES) {
        expect(instructions).toContain(example);
      }
    });
  });

  // ==================== PHISHING EMAIL AGENT EXPORT TESTS ====================
  describe('Phishing Email Agent Export', () => {
    it('should export phishingEmailAgent', () => {
      expect(phishingEmailAgent).toBeDefined();
      expect(phishingEmailAgent).not.toBeNull();
    });

    it('should be an Agent instance with proper structure', () => {
      expect(phishingEmailAgent).toHaveProperty('name');
      expect(phishingEmailAgent).toHaveProperty('getInstructions');
      expect(phishingEmailAgent).toHaveProperty('model');
      expect(phishingEmailAgent).toHaveProperty('listTools');
    });

    it('should have correct agent name', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
      expect(phishingEmailAgent.name).toBe('phishingEmailAssistant');
    });

    it('should have defined instructions', async () => {
      const instructions = await phishingEmailAgent.getInstructions();
      expect(instructions).toBeDefined();
      expect(instructions).not.toBe('');
      expect(typeof instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(phishingEmailAgent.model).toBeDefined();
      expect(phishingEmailAgent.model).not.toBeNull();
    });

    it('should have tools defined', async () => {
      const tools = await phishingEmailAgent.listTools();
      expect(tools).toBeDefined();
      expect(typeof tools).toBe('object');
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== POLICY SUMMARY AGENT EXPORT TESTS ====================
  describe('Policy Summary Agent Export', () => {
    it('should export policySummaryAgent', () => {
      expect(policySummaryAgent).toBeDefined();
      expect(policySummaryAgent).not.toBeNull();
    });

    it('should be an Agent instance with proper structure', () => {
      expect(policySummaryAgent).toHaveProperty('name');
      expect(policySummaryAgent).toHaveProperty('getInstructions');
      expect(policySummaryAgent).toHaveProperty('model');
      expect(policySummaryAgent).toHaveProperty('listTools');
    });

    it('should have correct agent name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
      expect(policySummaryAgent.name).toBe('policySummaryAssistant');
    });

    it('should have defined instructions', async () => {
      const instructions = await policySummaryAgent.getInstructions();
      expect(instructions).toBeDefined();
      expect(instructions).not.toBe('');
      expect(typeof instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(policySummaryAgent.model).toBeDefined();
      expect(policySummaryAgent.model).not.toBeNull();
    });

    it('should have tools defined', async () => {
      const tools = await policySummaryAgent.listTools();
      expect(tools).toBeDefined();
      expect(typeof tools).toBe('object');
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== USER INFO AGENT EXPORT TESTS ====================
  describe('User Info Agent Export', () => {
    it('should export userInfoAgent', () => {
      expect(userInfoAgent).toBeDefined();
      expect(userInfoAgent).not.toBeNull();
    });

    it('should be an Agent instance with proper structure', () => {
      expect(userInfoAgent).toHaveProperty('name');
      expect(userInfoAgent).toHaveProperty('getInstructions');
      expect(userInfoAgent).toHaveProperty('model');
      expect(userInfoAgent).toHaveProperty('listTools');
    });

    it('should have correct agent name', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
      expect(userInfoAgent.name).toBe('userInfoAssistant');
    });

    it('should have defined instructions', async () => {
      const instructions = await userInfoAgent.getInstructions();
      expect(instructions).toBeDefined();
      expect(instructions).not.toBe('');
      expect(typeof instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(userInfoAgent.model).toBeDefined();
      expect(userInfoAgent.model).not.toBeNull();
    });

    it('should have tools defined', async () => {
      const tools = await userInfoAgent.listTools();
      expect(tools).toBeDefined();
      expect(typeof tools).toBe('object');
      expect(Object.keys(tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== ALL EXPORTS DEFINED TESTS ====================
  describe('All Exports Validation', () => {
    it('should export exactly 8 agents', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent, deepfakeVideoAgent];

      expect(agents).toHaveLength(8);
    });

    it('should export all agents as defined and not null', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent).toBeDefined();
        expect(agent).not.toBeNull();
      });
    });

    it('should export all agents as objects', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(typeof agent).toBe('object');
        expect(Array.isArray(agent)).toBe(false);
      });
    });

    it('should have each agent with name property', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(typeof agent.name).toBe('string');
        expect(agent.name.length).toBeGreaterThan(0);
      });
    });

    it('should have each agent with instructions method', async () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      for (const agent of agents) {
        const instructions = (await agent.getInstructions()) as string;
        expect(instructions).toBeDefined();
        expect(typeof instructions).toBe('string');
        expect(instructions.length).toBeGreaterThan(0);
      }
    });

    it('should have each agent with model property', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent).toHaveProperty('model');
        expect(agent.model).not.toBeNull();
      });
    });

    it('should have each agent with tools (except orchestrator)', async () => {
      const agents = [microlearningAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent];

      for (const agent of agents) {
        const tools = await agent.listTools();
        expect(tools).toBeDefined();
        expect(typeof tools).toBe('object');
        expect(Object.keys(tools).length).toBeGreaterThan(0);
      }

      expect(orchestratorAgent).toHaveProperty('name');
      expect(orchestratorAgent).toHaveProperty('model');
    });
  });

  // ==================== UNIQUE NAMES TESTS ====================
  describe('Agent Names Uniqueness', () => {
    it('should have unique agent names', () => {
      const agentNames = [
        microlearningAgent.name,
        orchestratorAgent.name,
        phishingEmailAgent.name,
        policySummaryAgent.name,
        userInfoAgent.name,
        smishingSmsAgent.name,
        vishingCallAgent.name,
      ];

      const uniqueNames = new Set(agentNames);
      expect(uniqueNames.size).toBe(agentNames.length);
    });

    it('should use AGENT_NAMES constants', () => {
      expect(microlearningAgent.name).toBe(AGENT_NAMES.MICROLEARNING);
      expect(orchestratorAgent.name).toBe(AGENT_NAMES.ORCHESTRATOR);
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
      expect(smishingSmsAgent.name).toBe(AGENT_NAMES.SMISHING);
      expect(vishingCallAgent.name).toBe(AGENT_NAMES.VISHING_CALL);
    });

    it('should have all constant names defined', () => {
      const constantNames = [
        AGENT_NAMES.MICROLEARNING,
        AGENT_NAMES.ORCHESTRATOR,
        AGENT_NAMES.PHISHING,
        AGENT_NAMES.POLICY_SUMMARY,
        AGENT_NAMES.USER_INFO,
        AGENT_NAMES.SMISHING,
        AGENT_NAMES.VISHING_CALL,
      ];

      constantNames.forEach(name => {
        expect(name).toBeDefined();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== AGENT NAME MAPPING TESTS ====================
  describe('Agent Name Constant Mapping', () => {
    it('should map MICROLEARNING constant correctly', () => {
      expect(AGENT_NAMES.MICROLEARNING).toBe('microlearningAgent');
      expect(microlearningAgent.name).toBe('microlearningAgent');
    });

    it('should map ORCHESTRATOR constant correctly', () => {
      expect(AGENT_NAMES.ORCHESTRATOR).toBe('orchestrator');
      expect(orchestratorAgent.name).toBe('orchestrator');
    });

    it('should map PHISHING constant correctly', () => {
      expect(AGENT_NAMES.PHISHING).toBe('phishingEmailAssistant');
      expect(phishingEmailAgent.name).toBe('phishingEmailAssistant');
    });

    it('should map POLICY_SUMMARY constant correctly', () => {
      expect(AGENT_NAMES.POLICY_SUMMARY).toBe('policySummaryAssistant');
      expect(policySummaryAgent.name).toBe('policySummaryAssistant');
    });

    it('should map USER_INFO constant correctly', () => {
      expect(AGENT_NAMES.USER_INFO).toBe('userInfoAssistant');
      expect(userInfoAgent.name).toBe('userInfoAssistant');
    });

    it('should map SMISHING constant correctly', () => {
      expect(AGENT_NAMES.SMISHING).toBe('smishingSmsAssistant');
      expect(smishingSmsAgent.name).toBe('smishingSmsAssistant');
    });

    it('should map VISHING_CALL constant correctly', () => {
      expect(AGENT_NAMES.VISHING_CALL).toBe('vishingCallAssistant');
      expect(vishingCallAgent.name).toBe('vishingCallAssistant');
    });
  });

  // ==================== IMPORT PATH TESTS ====================
  describe('Import Path Validation', () => {
    it('should be importable from barrel export', () => {
      expect(microlearningAgent).toBeDefined();
      expect(orchestratorAgent).toBeDefined();
      expect(phishingEmailAgent).toBeDefined();
      expect(policySummaryAgent).toBeDefined();
      expect(userInfoAgent).toBeDefined();
      expect(smishingSmsAgent).toBeDefined();
      expect(vishingCallAgent).toBeDefined();
    });

    it('should support named imports', () => {
      expect(typeof microlearningAgent).not.toBe('undefined');
      expect(typeof orchestratorAgent).not.toBe('undefined');
      expect(typeof phishingEmailAgent).not.toBe('undefined');
      expect(typeof policySummaryAgent).not.toBe('undefined');
      expect(typeof userInfoAgent).not.toBe('undefined');
      expect(typeof smishingSmsAgent).not.toBe('undefined');
      expect(typeof vishingCallAgent).not.toBe('undefined');
    });
  });

  // ==================== AGENT TOOLS VALIDATION TESTS ====================
  describe('Agent Tools Validation', () => {
    it('microlearningAgent should have tools defined', async () => {
      expect(Object.keys(await microlearningAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('orchestratorAgent should be a valid Agent (may not have tools)', () => {
      expect(orchestratorAgent).toHaveProperty('name');
      expect(orchestratorAgent).toHaveProperty('model');
      expect(orchestratorAgent.name).toBe(AGENT_NAMES.ORCHESTRATOR);
    });

    it('phishingEmailAgent should have tools defined', async () => {
      expect(Object.keys(await phishingEmailAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('policySummaryAgent should have tools defined', async () => {
      expect(Object.keys(await policySummaryAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('userInfoAgent should have tools defined', async () => {
      expect(Object.keys(await userInfoAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('smishingSmsAgent should have tools defined', async () => {
      expect(Object.keys(await smishingSmsAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('vishingCallAgent should have tools defined', async () => {
      expect(Object.keys(await vishingCallAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('deepfakeVideoAgent should have tools defined', async () => {
      expect(Object.keys(await deepfakeVideoAgent.listTools()).length).toBeGreaterThan(0);
    });

    it('all agents should have tools as object (except orchestrator)', async () => {
      const agents = [microlearningAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent, deepfakeVideoAgent];

      for (const agent of agents) {
        const tools = await agent.listTools();
        expect(typeof tools).toBe('object');
        expect(Array.isArray(tools)).toBe(false);
      }

      expect(orchestratorAgent).toBeDefined();
    });
  });

  // ==================== MODEL CONFIGURATION TESTS ====================
  describe('Model Configuration Across Agents', () => {
    it('should have models configured for all agents', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent.model).toBeDefined();
        expect(agent.model).not.toBeNull();
        expect(typeof agent.model).not.toBe('string');
      });
    });
  });

  // ==================== INSTRUCTIONS CONTENT TESTS ====================
  describe('Instructions Content Validation', () => {
    it('microlearningAgent should have substantial instructions', async () => {
      expect(((await microlearningAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('orchestratorAgent should have substantial instructions', async () => {
      expect(((await orchestratorAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('phishingEmailAgent should have substantial instructions', async () => {
      expect(((await phishingEmailAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('policySummaryAgent should have substantial instructions', async () => {
      expect(((await policySummaryAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('userInfoAgent should have substantial instructions', async () => {
      expect(((await userInfoAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('deepfakeVideoAgent should have substantial instructions', async () => {
      expect(((await deepfakeVideoAgent.getInstructions()) as string).length).toBeGreaterThan(500);
    });

    it('all agents should have non-empty trimmed instructions', async () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent, deepfakeVideoAgent];

      for (const agent of agents) {
        const instructions = (await agent.getInstructions()) as string;
        expect(instructions.trim().length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== COMPLETE EXPORT INTEGRITY TESTS ====================
  describe('Complete Export Integrity', () => {
    it('should export all 8 agents without duplicates', () => {
      const exportedAgents = {
        microlearningAgent,
        orchestratorAgent,
        phishingEmailAgent,
        policySummaryAgent,
        userInfoAgent,
        smishingSmsAgent,
        vishingCallAgent,
        deepfakeVideoAgent,
      };

      const agentCount = Object.keys(exportedAgents).length;
      expect(agentCount).toBe(8);
    });

    it('should maintain consistency across exports', async () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent, deepfakeVideoAgent];

      for (const agent of agents) {
        expect(agent.name).toBeDefined();
        expect(await agent.getInstructions()).toBeDefined();
        expect(agent.model).toBeDefined();
        expect(await agent.listTools()).toBeDefined();

        const agentNameMatch = Object.values(AGENT_NAMES).includes(agent.name as any);
        expect(agentNameMatch).toBe(true);
      }
    });

    it('should represent all agent types', () => {
      const agentTypes = new Set([
        microlearningAgent.name,
        orchestratorAgent.name,
        phishingEmailAgent.name,
        policySummaryAgent.name,
        userInfoAgent.name,
        smishingSmsAgent.name,
        vishingCallAgent.name,
        deepfakeVideoAgent.name,
      ]);

      expect(agentTypes.size).toBe(8);

      expect(agentTypes.has('microlearningAgent')).toBe(true);
      expect(agentTypes.has('orchestrator')).toBe(true);
      expect(agentTypes.has('phishingEmailAssistant')).toBe(true);
      expect(agentTypes.has('policySummaryAssistant')).toBe(true);
      expect(agentTypes.has('userInfoAssistant')).toBe(true);
      expect(agentTypes.has('smishingSmsAssistant')).toBe(true);
      expect(agentTypes.has('vishingCallAssistant')).toBe(true);
      expect(agentTypes.has('deepfakeVideoAssistant')).toBe(true);
    });
  });
});
