import { describe, it, expect } from 'vitest';
import { outOfScopeAgent } from './out-of-scope-agent';
import { AGENT_NAMES, AGENT_IDS } from '../constants';
import '../../__tests__/setup';

/**
 * Test Suite: Out-of-Scope Agent
 * Tests agent configuration, instructions, and boundary enforcement.
 */
describe('OutOfScopeAgent', () => {
  describe('agent configuration', () => {
    it('should have correct agent ID', () => {
      expect(outOfScopeAgent.id).toBe(AGENT_IDS.OUT_OF_SCOPE);
    });

    it('should have correct agent name', () => {
      expect(outOfScopeAgent.name).toBe(AGENT_NAMES.OUT_OF_SCOPE);
    });

    it('should be an Agent instance', () => {
      expect(outOfScopeAgent).toBeDefined();
      expect(outOfScopeAgent.id).toBeTruthy();
      expect(outOfScopeAgent.name).toBeTruthy();
    });
  });

  describe('instructions', () => {
    it('should include scope boundary rules', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('scope boundary');
    });

    it('should instruct NOT to answer the user question', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('Do NOT answer');
    });

    it('should instruct NOT to guess or fabricate', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('Do NOT guess');
    });

    it('should list supported capabilities', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('Security awareness training');
      expect(instructions).toContain('Phishing email simulations');
      expect(instructions).toContain('Smishing');
      expect(instructions).toContain('Vishing');
      expect(instructions).toContain('Deepfake');
      expect(instructions).toContain('User risk analysis');
      expect(instructions).toContain('Security policy guidance');
    });

    it('should mention language matching rule', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('language');
    });

    it('should suggest contacting support team', async () => {
      const instructions = await outOfScopeAgent.getInstructions();
      expect(instructions).toContain('support team');
    });
  });
});
