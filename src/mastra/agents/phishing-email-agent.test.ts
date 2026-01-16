import { describe, it, expect } from 'vitest';
import { phishingEmailAgent } from './phishing-email-agent';
import { AGENT_NAMES } from '../constants';

/**
 * Phishing Email Agent - Structural Verification Suite
 */
describe('Phishing Email Agent', () => {
  // ==================== BASIC CONFIGURATION TESTS ====================
  describe('Basic Configuration', () => {
    it('should have the correct agent name from constants', () => {
      expect(phishingEmailAgent.name).toBe(AGENT_NAMES.PHISHING);
    });

    it('should have tools configured', () => {
      expect(phishingEmailAgent.tools).toBeDefined();
      expect(Object.keys(phishingEmailAgent.tools)).toContain('phishingExecutor');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('phishingEditor');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('uploadPhishing');
      expect(Object.keys(phishingEmailAgent.tools)).toContain('assignPhishing');
    });
  });

  // ==================== INSTRUCTION QUALITY TESTS ====================
  describe('Agent Instructions', () => {
    it('should have substantial content', () => {
      expect(phishingEmailAgent.instructions).toBeDefined();
      expect(phishingEmailAgent.instructions.length).toBeGreaterThan(500);
    });

    it('should contain the specialist persona', () => {
      expect(phishingEmailAgent.instructions).toContain('Phishing Simulation Specialist');
    });

    it('should have the language rules', () => {
      expect(phishingEmailAgent.instructions).toContain('LANGUAGE RULES');
    });

    it('should have safety rules', () => {
      expect(phishingEmailAgent.instructions).toContain('SAFETY RULES');
    });

    it('should have the tool/tech jargon restriction', () => {
      expect(phishingEmailAgent.instructions).toContain('NO TECH JARGON');
    });

    it('should mention Cialdini Principles', () => {
      expect(phishingEmailAgent.instructions).toContain('Cialdini Principles');
    });
  });

  // ==================== MESSAGING GUIDELINES COMPLIANCE ====================
  describe('Messaging Guidelines Compliance', () => {
    it('should list blacklist words to avoid', () => {
      expect(phishingEmailAgent.instructions).toContain('NEVER use');
    });

    it('should NOT contain unauthorized system strings', () => {
      const forbiddenStrings = [
        'EMPLOYEE_MATCH',
        'ASSIGNMENT_SUCCESS.TRAINING',
        'ASSIGNMENT_SUCCESS.SIMULATION',
      ];

      forbiddenStrings.forEach((str) => {
        expect(phishingEmailAgent.instructions).not.toContain(str);
      });
    });
  });

  // ==================== BASIC STRUCTURAL VALIDATION TESTS ====================
  describe('Basic Structural Validation', () => {
    it('should have all required agent properties', () => {
      expect(phishingEmailAgent).toHaveProperty('name');
      expect(phishingEmailAgent).toHaveProperty('instructions');
      expect(phishingEmailAgent).toHaveProperty('model');
      expect(phishingEmailAgent).toHaveProperty('tools');
    });

    it('should have tools as object type', () => {
      expect(typeof phishingEmailAgent.tools).toBe('object');
      expect(Array.isArray(phishingEmailAgent.tools)).toBe(false);
    });
  });
});
