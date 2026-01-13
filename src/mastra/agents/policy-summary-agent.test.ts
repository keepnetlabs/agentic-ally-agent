import { describe, it, expect } from 'vitest';
import { policySummaryAgent } from './policy-summary-agent';
import { AGENT_NAMES } from '../constants';
import * as fs from 'fs';

describe('Policy Summary Agent', () => {
  describe('Agent Configuration', () => {
    it('should be properly instantiated', () => {
      expect(policySummaryAgent).toBeDefined();
    });

    it('should have the correct name', () => {
      expect(policySummaryAgent.name).toBe(AGENT_NAMES.POLICY_SUMMARY);
    });

    it('should have tools configured', () => {
      expect(policySummaryAgent.tools).toHaveProperty('summarizePolicy');
    });

    it('should have description-like mission in instructions', () => {
      expect(policySummaryAgent.instructions).toContain('analyze company security policies');
    });
  });

  describe('Agent Instructions', () => {
    const instructions = policySummaryAgent.instructions;

    it('should define role as Policy Intelligence Specialist', () => {
      expect(instructions).toContain('Policy Intelligence Specialist');
    });

    it('should include MISSION section', () => {
      expect(instructions).toContain('MISSION');
      expect(instructions).toContain('Translate complex policy legalese');
    });

    it('should mention summarizePolicy tool', () => {
      expect(instructions).toContain('summarizePolicy');
    });

    it('should have NO HALLUCINATIONS section', () => {
      expect(instructions).toContain('NO HALLUCINATIONS');
      expect(instructions).toContain("couldn't find a specific policy");
      expect(instructions).toContain('Do NOT invent rules');
    });

    it('should have LANGUAGE RULES section', () => {
      expect(instructions).toContain('LANGUAGE RULES');
      expect(instructions).toContain("Match the user's CURRENT message language");
      expect(instructions).toContain('Respond in Turkish');
      expect(instructions).toContain('Respond in English');
    });

    it('should have WORKFLOW section', () => {
      expect(instructions).toContain('WORKFLOW');
      expect(instructions).toContain('Listen');
      expect(instructions).toContain('IMMEDIATELY Call Tool');
      expect(instructions).toContain('Analyze Tool Output');
      expect(instructions).toContain('Respond');
    });

    it('should include tool call examples', () => {
      expect(instructions).toContain('Şifre kuralları neler?');
      expect(instructions).toContain('focusArea="password"');
    });

    it('should define RESPONSE FORMAT', () => {
      expect(instructions).toContain('RESPONSE FORMAT (Strict HTML)');
      expect(instructions).toContain('SINGLE block of HTML');
      expect(instructions).toContain('<strong>{Topic_Summary_Header}</strong>');
      expect(instructions).toContain('<ul>');
    });

    it('should include CRITICAL RULES', () => {
      expect(instructions).toContain('CRITICAL RULES');
      expect(instructions).toContain('conciseness');
      expect(instructions).toContain('clarity');
      expect(instructions).toContain('safety');
      expect(instructions).toContain('Security Team');
    });
  });

});
