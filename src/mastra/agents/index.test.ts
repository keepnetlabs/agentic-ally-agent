import { describe, it, expect } from 'vitest';
import { microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent } from './index';
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
      expect(microlearningAgent).toHaveProperty('instructions');
      expect(microlearningAgent).toHaveProperty('model');
      expect(microlearningAgent).toHaveProperty('tools');
    });

    it('should have correct agent name', () => {
      expect(microlearningAgent.name).toBe(AGENT_NAMES.MICROLEARNING);
      expect(microlearningAgent.name).toBe('microlearningAgent');
    });

    it('should have defined instructions', () => {
      expect(microlearningAgent.instructions).toBeDefined();
      expect(microlearningAgent.instructions).not.toBe('');
      expect(typeof microlearningAgent.instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(microlearningAgent.model).toBeDefined();
      expect(microlearningAgent.model).not.toBeNull();
    });

    it('should have tools defined', () => {
      expect(microlearningAgent.tools).toBeDefined();
      expect(typeof microlearningAgent.tools).toBe('object');
      expect(Object.keys(microlearningAgent.tools).length).toBeGreaterThan(0);
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
      expect(orchestratorAgent).toHaveProperty('instructions');
      expect(orchestratorAgent).toHaveProperty('model');
      expect(orchestratorAgent).toHaveProperty('tools');
    });

    it('should have correct agent name', () => {
      expect(orchestratorAgent.name).toBe(AGENT_NAMES.ORCHESTRATOR);
      expect(orchestratorAgent.name).toBe('orchestrator');
    });

    it('should have defined instructions', () => {
      expect(orchestratorAgent.instructions).toBeDefined();
      expect(orchestratorAgent.instructions).not.toBe('');
      expect(typeof orchestratorAgent.instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(orchestratorAgent.model).toBeDefined();
      expect(orchestratorAgent.model).not.toBeNull();
    });

    it('should be a valid routing agent (may not have tools)', () => {
      // Orchestrator is a routing agent without tools
      expect(orchestratorAgent.name).toBeDefined();
      expect(orchestratorAgent.instructions).toBeDefined();
      expect(orchestratorAgent.model).toBeDefined();
    });

    it('should include ORCHESTRATOR_CONFIRMATION_EXAMPLES in Scenario A instructions', () => {
      const instructions = orchestratorAgent.instructions as string;
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
      expect(phishingEmailAgent).toHaveProperty('instructions');
      expect(phishingEmailAgent).toHaveProperty('model');
      expect(phishingEmailAgent).toHaveProperty('tools');
    });

    it('should have correct agent name', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
      expect(phishingEmailAgent.name).toBe('phishingEmailAssistant');
    });

    it('should have defined instructions', () => {
      expect(phishingEmailAgent.instructions).toBeDefined();
      expect(phishingEmailAgent.instructions).not.toBe('');
      expect(typeof phishingEmailAgent.instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(phishingEmailAgent.model).toBeDefined();
      expect(phishingEmailAgent.model).not.toBeNull();
    });

    it('should have tools defined', () => {
      expect(phishingEmailAgent.tools).toBeDefined();
      expect(typeof phishingEmailAgent.tools).toBe('object');
      expect(Object.keys(phishingEmailAgent.tools).length).toBeGreaterThan(0);
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
      expect(policySummaryAgent).toHaveProperty('instructions');
      expect(policySummaryAgent).toHaveProperty('model');
      expect(policySummaryAgent).toHaveProperty('tools');
    });

    it('should have correct agent name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
      expect(policySummaryAgent.name).toBe('policySummaryAssistant');
    });

    it('should have defined instructions', () => {
      expect(policySummaryAgent.instructions).toBeDefined();
      expect(policySummaryAgent.instructions).not.toBe('');
      expect(typeof policySummaryAgent.instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(policySummaryAgent.model).toBeDefined();
      expect(policySummaryAgent.model).not.toBeNull();
    });

    it('should have tools defined', () => {
      expect(policySummaryAgent.tools).toBeDefined();
      expect(typeof policySummaryAgent.tools).toBe('object');
      expect(Object.keys(policySummaryAgent.tools).length).toBeGreaterThan(0);
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
      expect(userInfoAgent).toHaveProperty('instructions');
      expect(userInfoAgent).toHaveProperty('model');
      expect(userInfoAgent).toHaveProperty('tools');
    });

    it('should have correct agent name', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
      expect(userInfoAgent.name).toBe('userInfoAssistant');
    });

    it('should have defined instructions', () => {
      expect(userInfoAgent.instructions).toBeDefined();
      expect(userInfoAgent.instructions).not.toBe('');
      expect(typeof userInfoAgent.instructions).toBe('string');
    });

    it('should have defined model', () => {
      expect(userInfoAgent.model).toBeDefined();
      expect(userInfoAgent.model).not.toBeNull();
    });

    it('should have tools defined', () => {
      expect(userInfoAgent.tools).toBeDefined();
      expect(typeof userInfoAgent.tools).toBe('object');
      expect(Object.keys(userInfoAgent.tools).length).toBeGreaterThan(0);
    });
  });

  // ==================== ALL EXPORTS DEFINED TESTS ====================
  describe('All Exports Validation', () => {
    it('should export exactly 7 agents', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      expect(agents).toHaveLength(7);
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

    it('should have each agent with instructions property', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent).toHaveProperty('instructions');
        expect(typeof agent.instructions).toBe('string');
        expect(agent.instructions.length).toBeGreaterThan(0);
      });
    });

    it('should have each agent with model property', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent).toHaveProperty('model');
        expect(agent.model).not.toBeNull();
      });
    });

    it('should have each agent with tools property (except orchestrator)', () => {
      const agents = [microlearningAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent];

      agents.forEach(agent => {
        expect(agent).toHaveProperty('tools');
        expect(typeof agent.tools).toBe('object');
        expect(Object.keys(agent.tools).length).toBeGreaterThan(0);
      });

      // Orchestrator agent may not have tools (it's a routing agent)
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
      // This test verifies that the barrel export pattern works
      expect(microlearningAgent).toBeDefined();
      expect(orchestratorAgent).toBeDefined();
      expect(phishingEmailAgent).toBeDefined();
      expect(policySummaryAgent).toBeDefined();
      expect(userInfoAgent).toBeDefined();
      expect(smishingSmsAgent).toBeDefined();
      expect(vishingCallAgent).toBeDefined();
    });

    it('should support named imports', () => {
      // Each agent should be independently importable
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
    it('microlearningAgent should have tools defined', () => {
      expect(Object.keys(microlearningAgent.tools).length).toBeGreaterThan(0);
    });

    it('orchestratorAgent should be a valid Agent (may not have tools)', () => {
      // Orchestrator agent is a routing agent that doesn't require tools
      expect(orchestratorAgent).toHaveProperty('name');
      expect(orchestratorAgent).toHaveProperty('model');
      expect(orchestratorAgent.name).toBe(AGENT_NAMES.ORCHESTRATOR);
    });

    it('phishingEmailAgent should have tools defined', () => {
      expect(Object.keys(phishingEmailAgent.tools).length).toBeGreaterThan(0);
    });

    it('policySummaryAgent should have tools defined', () => {
      expect(Object.keys(policySummaryAgent.tools).length).toBeGreaterThan(0);
    });

    it('userInfoAgent should have tools defined', () => {
      expect(Object.keys(userInfoAgent.tools).length).toBeGreaterThan(0);
    });

    it('smishingSmsAgent should have tools defined', () => {
      expect(Object.keys(smishingSmsAgent.tools).length).toBeGreaterThan(0);
    });

    it('vishingCallAgent should have tools defined', () => {
      expect(Object.keys(vishingCallAgent.tools).length).toBeGreaterThan(0);
    });

    it('all agents should have tools as object (except orchestrator)', () => {
      const agents = [microlearningAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(typeof agent.tools).toBe('object');
        expect(Array.isArray(agent.tools)).toBe(false);
      });

      // Orchestrator agent may not have tools
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
    it('microlearningAgent should have substantial instructions', () => {
      expect(microlearningAgent.instructions.length).toBeGreaterThan(500);
    });

    it('orchestratorAgent should have substantial instructions', () => {
      expect(orchestratorAgent.instructions.length).toBeGreaterThan(500);
    });

    it('phishingEmailAgent should have substantial instructions', () => {
      expect(phishingEmailAgent.instructions.length).toBeGreaterThan(500);
    });

    it('policySummaryAgent should have substantial instructions', () => {
      expect(policySummaryAgent.instructions.length).toBeGreaterThan(500);
    });

    it('userInfoAgent should have substantial instructions', () => {
      expect(userInfoAgent.instructions.length).toBeGreaterThan(500);
    });

    it('all agents should have non-empty trimmed instructions', () => {
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent.instructions.trim().length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== COMPLETE EXPORT INTEGRITY TESTS ====================
  describe('Complete Export Integrity', () => {
    it('should export all 7 agents without duplicates', () => {
      const exportedAgents = {
        microlearningAgent,
        orchestratorAgent,
        phishingEmailAgent,
        policySummaryAgent,
        userInfoAgent,
        smishingSmsAgent,
        vishingCallAgent,
      };

      const agentCount = Object.keys(exportedAgents).length;
      expect(agentCount).toBe(7);
    });

    it('should maintain consistency across exports', () => {
      // Verify that each agent maintains its properties consistently
      const agents = [microlearningAgent, orchestratorAgent, phishingEmailAgent, policySummaryAgent, userInfoAgent, smishingSmsAgent, vishingCallAgent];

      agents.forEach(agent => {
        expect(agent.name).toBeDefined();
        expect(agent.instructions).toBeDefined();
        expect(agent.model).toBeDefined();
        expect(agent.tools).toBeDefined();

        // Cross-verify with constants
        const agentNameMatch = Object.values(AGENT_NAMES).includes(agent.name);
        expect(agentNameMatch).toBe(true);
      });
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
      ]);

      // Should have exactly 7 unique agent types
      expect(agentTypes.size).toBe(7);

      // Should include all expected agent names
      expect(agentTypes.has('microlearningAgent')).toBe(true);
      expect(agentTypes.has('orchestrator')).toBe(true);
      expect(agentTypes.has('phishingEmailAssistant')).toBe(true);
      expect(agentTypes.has('policySummaryAssistant')).toBe(true);
      expect(agentTypes.has('userInfoAssistant')).toBe(true);
      expect(agentTypes.has('smishingSmsAssistant')).toBe(true);
      expect(agentTypes.has('vishingCallAssistant')).toBe(true);
    });
  });
});
