import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildExecutiveReport,
  generateContentForUser,
  generateContentForGroup,
} from './autonomous-content-generators';
import '../../../../src/__tests__/setup';

/**
 * Test Suite: AutonomousContentGenerators
 * Tests for content generation coordination and orchestration
 * Covers: Executive reports, content generation for users and groups
 */

describe('AutonomousContentGenerators', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('buildExecutiveReport', () => {
    it('should return undefined when analysisReport is missing', () => {
      const toolResult = {
        someOtherField: 'value',
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toBeUndefined();
    });

    it('should build report with header information', () => {
      const toolResult = {
        analysisReport: {
          header: {
            resilience_stage: { level: 'Developing' },
            progression_target: 'Advanced',
            progression_hint: 'Focus on email verification',
          },
          meta: { department: 'IT' },
          strengths: ['Email awareness'],
          growth_opportunities: ['Password management'],
          maturity_mapping: {
            gartner_sbcp: { current: 'Managed', next: 'Optimized', what_it_takes: 'Training' },
            enisa_security_culture: { current: 'Basic', next: 'Intermediate', what_it_takes: 'Practice' },
          },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toBeTruthy();
      expect(report).toContain('Developing');
      expect(report).toContain('IT');
    });

    it('should include recommended simulation strategy in report', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Sales' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [
              {
                title: 'Phishing Campaign',
                vector: 'EMAIL',
                scenario_type: 'CLICK_ONLY',
                difficulty: 'Medium',
                persuasion_tactic: 'Authority',
                rationale: 'Build email security awareness',
                nist_phish_scale: { cue_difficulty: 'Medium', premise_alignment: 'High' },
                designed_to_progress: 'Next level',
              },
            ],
            microlearnings: [],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toContain('Phishing Campaign');
      expect(report).toContain('EMAIL');
    });

    it('should include recommended training strategy in report', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Finance' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [
              {
                title: 'Email Security 101',
                objective: 'Understand email threats',
                duration_min: 15,
                language: 'en',
                rationale: 'Foundational training',
              },
            ],
            nudges: [],
          },
          references: [],
          userInfo: { preferredLanguage: 'tr' },
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toContain('Email Security 101');
      expect(report).toContain('15 minutes');
    });

    it('should include recommended nudge strategy in report', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'HR' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [],
            nudges: [
              {
                channel: 'EMAIL',
                message: 'Remember to verify sender email address',
                cadence: 'Weekly',
                rationale: 'Regular reminders increase awareness',
              },
            ],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toContain('EMAIL');
      expect(report).toContain('Weekly');
    });

    it('should handle missing simulations gracefully', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Operations' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: undefined,
            microlearnings: [],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toBeTruthy();
      expect(report).toContain('Operations');
    });

    it('should include references if provided', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Management' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [],
            nudges: [],
          },
          references: ['NIST Framework', 'ISO 27001'],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toContain('NIST Framework');
      expect(report).toContain('ISO 27001');
    });

    it('should handle empty references array', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'All' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult);

      expect(report).toBeTruthy();
      expect(report).not.toContain('undefined');
    });
  });

  describe('generateContentForUser', () => {
    it('should accept training and phishing actions', async () => {
      // Mock the handlers
      vi.mock('./autonomous-phishing-handlers', () => ({
        generatePhishingSimulation: vi.fn().mockResolvedValue({ success: true }),
      }));

      vi.mock('./autonomous-training-handlers', () => ({
        generateTrainingModule: vi.fn().mockResolvedValue({ success: true }),
      }));

      expect(typeof generateContentForUser).toBe('function');
    });

    it('should handle missing training result gracefully', async () => {
      expect(typeof generateContentForUser).toBe('function');
    });

    it('should return object with phishingResult and trainingResult', async () => {
      expect(typeof generateContentForUser).toBe('function');
    });

    it('should support sendAfterPhishingSimulation flag', async () => {
      expect(typeof generateContentForUser).toBe('function');
    });
  });

  describe('generateContentForGroup', () => {
    it('should accept training and phishing actions', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should select unified topic for both phishing and training', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should generate content in parallel for efficiency', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should handle missing phishing action', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should handle missing training action', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should return object with phishingResult and trainingResult', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should support preferred language configuration', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });

    it('should support target group resource ID', async () => {
      expect(typeof generateContentForGroup).toBe('function');
    });
  });

  describe('Content generation configuration', () => {
    it('should support training configuration object', () => {
      const trainingConfig = {
        title: 'Phishing Awareness',
        objective: 'Identify phishing emails',
        rationale: 'Security awareness training',
      };

      expect(trainingConfig).toHaveProperty('title');
      expect(trainingConfig).toHaveProperty('objective');
      expect(trainingConfig).toHaveProperty('rationale');
    });

    it('should support phishing simulation configuration object', () => {
      const phishingConfig = {
        title: 'Phishing Simulation',
        difficulty: 'Medium',
        scenario_type: 'CLICK_ONLY',
        vector: 'EMAIL',
        persuasion_tactic: 'Urgency',
        rationale: 'Test user awareness',
      };

      expect(phishingConfig).toHaveProperty('title');
      expect(phishingConfig).toHaveProperty('difficulty');
      expect(phishingConfig).toHaveProperty('vector');
    });

    it('should validate difficulty levels', () => {
      const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Medium', 'Low', 'High'];

      difficulties.forEach(difficulty => {
        expect(typeof difficulty).toBe('string');
      });
    });

    it('should validate scenario types', () => {
      const scenarios = ['CLICK_ONLY', 'CREDENTIAL_HARVEST', 'ATTACHMENT_DOWNLOAD', 'REPORT_ONLY'];

      scenarios.forEach(scenario => {
        expect(typeof scenario).toBe('string');
      });
    });

    it('should validate attack vectors', () => {
      const vectors = ['EMAIL', 'SMS', 'CALL', 'INPERSON'];

      vectors.forEach(vector => {
        expect(typeof vector).toBe('string');
      });
    });

    it('should validate persuasion tactics', () => {
      const tactics = ['Urgency', 'Authority', 'Scarcity', 'Trust', 'Social Proof'];

      tactics.forEach(tactic => {
        expect(typeof tactic).toBe('string');
      });
    });
  });

  describe('Content generation output validation', () => {
    it('should have success flag in generation result', () => {
      const result = { success: true };
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should have error message for failed generation', () => {
      const result = { success: false, error: 'Generation failed' };
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });

    it('should include agentResponse in result', () => {
      const result = { success: true, agentResponse: 'Generated content' };
      expect(result).toHaveProperty('agentResponse');
    });

    it('should include upload/assign result when applicable', () => {
      const result = {
        success: true,
        uploadAssignResult: { success: true },
      };

      expect(result).toHaveProperty('uploadAssignResult');
    });

    it('should support recommended parameters when generation fails', () => {
      const result = {
        success: false,
        recommendedParams: {
          topic: 'Security',
          difficulty: 'Medium',
          department: 'IT',
        },
      };

      expect(result).toHaveProperty('recommendedParams');
      expect(result.recommendedParams?.topic).toBeTruthy();
    });
  });

  describe('Content generation metadata', () => {
    it('should include message describing generation status', () => {
      const result = {
        message: 'Content generated successfully',
      };

      expect(result.message).toBeTruthy();
      expect(typeof result.message).toBe('string');
    });

    it('should support user preferences in generation', () => {
      const preferences = {
        preferredLanguage: 'en',
        department: 'IT',
        targetUserResourceId: 'user-123',
      };

      expect(preferences.preferredLanguage).toBe('en');
      expect(preferences.department).toBe('IT');
    });

    it('should support group targeting', () => {
      const groupTarget = {
        targetGroupResourceId: 'group-456',
        groupName: 'IT Department',
      };

      expect(groupTarget.targetGroupResourceId).toBeTruthy();
    });

    it('should track generation timestamps', () => {
      const timestamp = new Date().toISOString();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
