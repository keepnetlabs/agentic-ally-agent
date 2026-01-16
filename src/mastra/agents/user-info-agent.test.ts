import { describe, it, expect } from 'vitest';
import { userInfoAgent } from './user-info-agent';
import { AGENT_NAMES } from '../constants';

/**
 * User Info Agent - Basic Verification Suite
 */
describe('User Info Agent', () => {
  // ==================== BASIC CONFIGURATION TESTS ====================
  describe('Basic Configuration', () => {
    it('should have the correct agent name from constants', () => {
      expect(userInfoAgent.name).toBe(AGENT_NAMES.USER_INFO);
    });

    it('should have tools configured', () => {
      expect(userInfoAgent.tools).toBeDefined();
      expect(Object.keys(userInfoAgent.tools)).toContain('getUserInfo');
      expect(Object.keys(userInfoAgent.tools)).toContain('getTargetGroupInfo');
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Agent Instructions', () => {
    it('should have substantial content', () => {
      expect(userInfoAgent.instructions).toBeDefined();
      expect(userInfoAgent.instructions.length).toBeGreaterThan(500);
    });

    it('should contain the executive expert persona', () => {
      expect(userInfoAgent.instructions).toContain('Executive Security Communications Expert');
    });

    it('should have the language rule', () => {
      expect(userInfoAgent.instructions).toContain('LANGUAGE RULE');
      expect(userInfoAgent.instructions).toContain('Match user\'s exact language');
    });

    it('should describe the available modes', () => {
      expect(userInfoAgent.instructions).toContain('ASSIGNMENT MODE');
      expect(userInfoAgent.instructions).toContain('REPORT MODE');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should list blacklist words to avoid', () => {
      expect(userInfoAgent.instructions).toContain('NEVER use');
    });

    it('should NOT contain unauthorized system strings', () => {
      const forbiddenStrings = [
        'EMPLOYEE_MATCH',
        'ASSIGNMENT_SUCCESS.TRAINING',
        'ASSIGNMENT_SUCCESS.SIMULATION',
      ];

      forbiddenStrings.forEach((str) => {
        expect(userInfoAgent.instructions).not.toContain(str);
      });
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(userInfoAgent).toHaveProperty('name');
      expect(userInfoAgent).toHaveProperty('instructions');
      expect(userInfoAgent).toHaveProperty('model');
      expect(userInfoAgent).toHaveProperty('tools');
    });
  });
});
