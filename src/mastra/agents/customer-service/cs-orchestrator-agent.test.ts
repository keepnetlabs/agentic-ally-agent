import { describe, it, expect } from 'vitest';
import { csOrchestratorAgent } from './cs-orchestrator-agent';
import { CS_AGENT_NAMES, CS_AGENT_IDS } from './cs-constants';
import '../../../__tests__/setup';

describe('CSOrchestratorAgent', () => {
  describe('agent configuration', () => {
    it('should have correct agent ID', () => {
      expect(csOrchestratorAgent.id).toBe(CS_AGENT_IDS.CS_ORCHESTRATOR);
    });

    it('should have correct agent name', () => {
      expect(csOrchestratorAgent.name).toBe(CS_AGENT_NAMES.CS_ORCHESTRATOR);
    });

    it('should have no tools (pure router)', () => {
      expect(Object.keys(csOrchestratorAgent.tools ?? {})).toHaveLength(0);
    });
  });

  describe('instructions', () => {
    it('should reference both specialist agents', async () => {
      const instructions = await csOrchestratorAgent.getInstructions();
      expect(instructions).toContain(CS_AGENT_NAMES.COMPANY_SEARCH);
      expect(instructions).toContain(CS_AGENT_NAMES.TRAINING_STATS);
    });

    it('should include routing scenarios A through D', async () => {
      const instructions = await csOrchestratorAgent.getInstructions();
      expect(instructions).toContain('SCENARIO A');
      expect(instructions).toContain('SCENARIO B');
      expect(instructions).toContain('SCENARIO C');
      expect(instructions).toContain('SCENARIO D');
    });

    it('should include semantic tag reading instructions', async () => {
      const instructions = await csOrchestratorAgent.getInstructions();
      expect(instructions).toContain('[Company Selected');
      expect(instructions).toContain('companyResourceId');
    });

    it('should require strict JSON response format', async () => {
      const instructions = await csOrchestratorAgent.getInstructions();
      expect(instructions).toContain('"agent"');
      expect(instructions).toContain('"taskContext"');
      expect(instructions).toContain('"reasoning"');
    });

    it('should handle continuation scenario', async () => {
      const instructions = await csOrchestratorAgent.getInstructions();
      expect(instructions).toContain('Next page');
      expect(instructions).toContain('SAME agent');
    });
  });
});
