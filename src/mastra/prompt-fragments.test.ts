import { describe, it, expect } from 'vitest';
import {
  NO_TECH_JARGON_FRAGMENT,
  NO_TECH_JARGON_FRAGMENT_ORCHESTRATOR,
  NO_TECH_JARGON_FRAGMENT_DEEPFAKE,
  buildLanguageRulesFragment,
} from './prompt-fragments';
import { microlearningAgent } from './agents/microlearning-agent';
import { phishingEmailAgent } from './agents/phishing-email-agent';
import { smishingSmsAgent } from './agents/smishing-sms-agent';
import { deepfakeVideoAgent } from './agents/deepfake-video-agent';
import { vishingCallAgent } from './agents/vishing-call-agent';
import { orchestratorAgent } from './agents/orchestrator-agent';

describe('prompt-fragments', () => {
  describe('NO_TECH_JARGON_FRAGMENT', () => {
    it('should prohibit exposing technical details', () => {
      expect(NO_TECH_JARGON_FRAGMENT).toContain('No Tech Jargon');
      expect(NO_TECH_JARGON_FRAGMENT).toContain('model names');
      expect(NO_TECH_JARGON_FRAGMENT).toContain('providers');
      expect(NO_TECH_JARGON_FRAGMENT).toContain('tool IDs');
    });

    it('should focus on user intent and business logic', () => {
      expect(NO_TECH_JARGON_FRAGMENT).toContain('user intent');
      expect(NO_TECH_JARGON_FRAGMENT).toContain('business logic');
    });
  });

  describe('NO_TECH_JARGON_FRAGMENT_ORCHESTRATOR', () => {
    it('should be uppercase for orchestrator style', () => {
      expect(NO_TECH_JARGON_FRAGMENT_ORCHESTRATOR).toContain('NO TECH JARGON');
    });

    it('should prohibit architecture references', () => {
      expect(NO_TECH_JARGON_FRAGMENT_ORCHESTRATOR).toContain('architecture');
    });
  });

  describe('NO_TECH_JARGON_FRAGMENT_DEEPFAKE', () => {
    it('should not mention HeyGen', () => {
      expect(NO_TECH_JARGON_FRAGMENT_DEEPFAKE).not.toContain('HeyGen');
    });

    it('should prohibit API details', () => {
      expect(NO_TECH_JARGON_FRAGMENT_DEEPFAKE).toContain('API details');
    });
  });

  describe('buildLanguageRulesFragment', () => {
    it('should include INTERACTION and CONTENT language sections', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
      });
      expect(result).toContain('## Language Rules');
      expect(result).toContain('INTERACTION LANGUAGE');
      expect(result).toContain('CONTENT LANGUAGE');
    });

    it('should include Explicit, Context, Implicit rules', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
      });
      expect(result).toContain('Explicit');
      expect(result).toContain('Context');
      expect(result).toContain('Implicit');
    });

    it('should include Preferred Language in context', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
      });
      expect(result).toContain('Preferred Language');
    });

    it('should include BCP-47 codes', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
      });
      expect(result).toContain('BCP-47');
      expect(result).toContain('en-gb');
    });

    it('should add SCENARIO block when workflowRef and scenarioExample provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
        workflowRef: 'workflow-executor',
        scenarioExample: 'Create Turkish training',
      });
      expect(result).toContain('SCENARIO');
      expect(result).toContain('Create Turkish training');
      expect(result).toContain('workflow-executor');
    });

    it('should add default line when interactionClarification is default', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'SCRIPT',
        artifactType: 'voice script',
        interactionClarification: 'default',
      });
      expect(result).toContain('All visible text must be in that language');
    });

    it('should use custom bcp47Codes when provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training',
        bcp47Codes: 'tr-TR, en-US',
      });
      expect(result).toContain('tr-TR, en-US');
    });

    it('should use custom exampleEn and exampleTr when provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training',
        exampleEn: 'Create Phishing',
        exampleTr: 'Oltama yap',
      });
      expect(result).toContain('Create Phishing');
      expect(result).toContain('Oltama yap');
    });

    it('should add vishing-specific line when interactionClarification is vishing', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CALL',
        artifactType: 'voice agent',
        interactionClarification: 'vishing',
      });
      expect(result).toContain('Do NOT mix languages');
      expect(result).toContain('transitions, lists, questions, confirmations');
    });

    it('should add All visible text when interactionClarification is default', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'VIDEO SCRIPT',
        artifactType: 'spoken script',
        interactionClarification: 'default',
      });
      expect(result).toContain('All visible text must be in that language');
    });

    it('should use custom exampleEn and exampleTr when provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'simulation',
        exampleEn: 'User asks "Create Phishing"',
        exampleTr: 'User asks "Oltama yap"',
      });
      expect(result).toContain('Create Phishing');
      expect(result).toContain('Oltama yap');
    });

    it('should include scenarioContentLanguage in scenario when provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'simulation',
        workflowRef: 'phishingExecutor',
        scenarioExample: 'Create Turkish CEO Fraud email',
        scenarioContentLanguage: 'Turkish (tr-tr)',
      });
      expect(result).toContain('Turkish (tr-tr)');
      expect(result).toContain('Pass this to');
    });

    it('should omit SCENARIO block when workflowRef and scenarioExample not provided', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'simulation',
      });
      expect(result).not.toContain('SCENARIO');
      expect(result).not.toContain('Pass this to');
    });

    it('should omit SCENARIO block when only workflowRef provided without scenarioExample', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'simulation',
        workflowRef: 'someExecutor',
      });
      expect(result).not.toContain('SCENARIO');
    });

    it('should never return undefined or invalid output', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'training module',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
      expect(result).not.toContain('undefined');
    });

    it('should include default BCP-47 examples when not overridden', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'module',
      });
      expect(result).toContain('en-gb');
      expect(result).toContain('tr-tr');
    });

    it('should work with minimal options (contentLabel, artifactType only)', () => {
      const result = buildLanguageRulesFragment({
        contentLabel: 'CONTENT',
        artifactType: 'artifact',
      });
      expect(result).toContain('## Language Rules');
      expect(result).toContain('INTERACTION LANGUAGE');
      expect(result).toContain('CONTENT LANGUAGE');
    });
  });

  describe('Fragment integration in agents', () => {
    it('microlearning agent should include NO_TECH_JARGON and Language Rules', () => {
      const instructions = microlearningAgent.instructions;
      expect(instructions).toContain('No Tech Jargon');
      expect(instructions).toContain('## Language Rules');
      expect(instructions).toContain('INTERACTION LANGUAGE');
      expect(instructions).toContain('CONTENT LANGUAGE');
    });

    it('phishing agent should include NO_TECH_JARGON and Language Rules', () => {
      const instructions = phishingEmailAgent.instructions;
      expect(instructions).toContain('No Tech Jargon');
      expect(instructions).toContain('## Language Rules');
    });

    it('smishing agent should include NO_TECH_JARGON and Language Rules', () => {
      const instructions = smishingSmsAgent.instructions;
      expect(instructions).toContain('No Tech Jargon');
      expect(instructions).toContain('## Language Rules');
    });

    it('deepfake agent should include NO_TECH_JARGON_DEEPFAKE and Language Rules', () => {
      const instructions = deepfakeVideoAgent.instructions;
      expect(instructions).toContain('No Tech Jargon');
      expect(instructions).toContain('VIDEO SCRIPT');
      expect(instructions).toContain('## Language Rules');
    });

    it('vishing agent should include NO_TECH_JARGON and vishing-specific language rules', () => {
      const instructions = vishingCallAgent.instructions;
      expect(instructions).toContain('No Tech Jargon');
      expect(instructions).toContain('Do NOT mix languages');
      expect(instructions).toContain('transitions, lists, questions, confirmations');
    });

    it('orchestrator agent should include NO_TECH_JARGON_ORCHESTRATOR', () => {
      const instructions = orchestratorAgent.instructions;
      expect(instructions).toContain('NO TECH JARGON');
      expect(instructions).toContain('architecture');
    });
  });
});
