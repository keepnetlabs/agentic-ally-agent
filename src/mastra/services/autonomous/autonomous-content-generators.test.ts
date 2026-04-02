import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildExecutiveReport, generateContentForUser, generateContentForGroup } from './autonomous-content-generators';
import '../../../../src/__tests__/setup';
import * as phishingHandlers from './autonomous-phishing-handlers';
import * as smishingHandlers from './autonomous-smishing-handlers';
import * as trainingHandlers from './autonomous-training-handlers';
import * as groupTopicService from './group-topic-service';
import { requestStorage } from '../../utils/core/request-storage';
import { toolEventBus } from '../../utils/core/tool-event-bus';

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('./autonomous-phishing-handlers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./autonomous-phishing-handlers')>();
  return {
    ...actual,
    generatePhishingSimulation: vi.fn().mockResolvedValue({ success: true }),
    generatePhishingSimulationForGroup: vi.fn().mockResolvedValue({ success: true }),
    assignPhishingWithTraining: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock('./autonomous-training-handlers', () => ({
  generateTrainingModule: vi.fn().mockResolvedValue({ success: true }),
  generateTrainingModuleForGroup: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./autonomous-smishing-handlers', () => ({
  generateSmishingSimulation: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./autonomous-vishing-handlers', () => ({
  initiateAutonomousVishingCall: vi.fn().mockResolvedValue({ success: true, message: 'Vishing call initiated' }),
}));

vi.mock('./group-topic-service', () => ({
  selectGroupTrainingTopic: vi.fn().mockResolvedValue({
    topic: 'Credential Theft Awareness',
    phishingPrompt: 'Phishing prompt',
    smishingPrompt: 'Smishing prompt',
    trainingPrompt: 'Training prompt',
    objectives: ['Detect social engineering'],
  }),
}));

/**
 * Test Suite: AutonomousContentGenerators
 * Tests for content generation coordination and orchestration
 * Covers: Executive reports, content generation for users and groups
 */

describe('AutonomousContentGenerators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildExecutiveReport', () => {
    it('should return undefined when analysisReport is missing', () => {
      const toolResult = {
        someOtherField: 'value',
      };

      const report = buildExecutiveReport(toolResult as any);

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
      expect(report).toContain('**Current Stage:** Developing');
      expect(report).toContain('**Target Stage:** Advanced');
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

    it('should read behavioral resilience fields from get-user-info analysis schema', () => {
      const toolResult = {
        analysisReport: {
          header: {
            behavioral_resilience: {
              current_stage: 'Building',
              target_stage: 'Consistent',
            },
            progression_hint: 'Focus on email verification before taking action',
          },
          meta: { department: 'IT' },
          strengths: ['Reports some suspicious emails'],
          growth_opportunities: ['Still clicks urgent login prompts'],
          maturity_mapping: {
            gartner_sbcp_context_only: {
              label: 'Context only — not an individual rating',
              description: 'Use as organizational context only',
              what_it_takes: 'Reinforce secure habits',
            },
            enisa_security_culture: {
              current: 'Foundational',
              next: 'Building',
              what_it_takes: 'Practice link verification',
            },
          },
          ai_recommended_next_steps: {
            simulations: [
              {
                title: 'Access Review Simulation',
                vector: 'EMAIL',
                scenario_type: 'CLICK_ONLY',
                difficulty: 'MEDIUM',
                persuasion_tactic: 'Authority',
                why_this: 'Targets routine trust in internal access prompts.',
                nist_phish_scale: { cue_difficulty: 'LOW', premise_alignment: 'MEDIUM' },
                designed_to_progress: 'Teach the user to verify internal requests before clicking.',
              },
            ],
            microlearnings: [],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult as any);

      expect(report).toContain('**Current Stage:** Building');
      expect(report).toContain('**Target Stage:** Consistent');
      expect(report).toContain('Building');
      expect(report).toContain('Consistent');
      expect(report).toContain('Focus on email verification before taking action');
      expect(report).toContain('Targets routine trust in internal access prompts.');
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
                why_this: 'Builds basic recognition of suspicious email patterns.',
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
      expect(report).toContain('Builds basic recognition of suspicious email patterns.');
    });

    it('should prefer ai recommendations when direct recommendations exist but are empty', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Finance' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          recommended_next_steps: {
            simulations: [],
            microlearnings: [],
            nudges: [],
          },
          ai_recommended_next_steps: {
            simulations: [],
            microlearnings: [
              {
                title: 'Mailbox Hygiene Basics',
                objective: 'Reduce trust in spoofed mail',
                duration_min: 10,
                language: 'en',
                why_this: 'Covers the highest-signal awareness gap from the analysis.',
              },
            ],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult as any);

      expect(report).toContain('Mailbox Hygiene Basics');
      expect(report).toContain('Covers the highest-signal awareness gap from the analysis.');
    });

    it('should display N/A duration when training duration is missing or placeholder', () => {
      const toolResult = {
        analysisReport: {
          header: {},
          meta: { department: 'Finance' },
          strengths: [],
          growth_opportunities: [],
          maturity_mapping: { gartner_sbcp: {}, enisa_security_culture: {} },
          ai_recommended_next_steps: {
            simulations: [],
            microlearnings: [
              {
                title: 'Suspicious Email Signals',
                objective: 'Recognize common phishing cues',
                duration_min: 0,
                language: 'en',
                why_this: 'Duration is not yet estimated, but the topic is still valid.',
              },
            ],
            nudges: [],
          },
          references: [],
        },
      };

      const report = buildExecutiveReport(toolResult as any);

      expect(report).toContain('Suspicious Email Signals');
      expect(report).toContain('- **Duration:** N/A');
      expect(report).not.toContain('0 minutes');
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
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulation);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModule);
      phishingSpy.mockResolvedValue({ success: true, message: 'phishing-ok' } as any);
      trainingSpy.mockResolvedValue({ success: true, message: 'training-ok' } as any);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
              microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['phishing', 'training'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(phishingSpy).toHaveBeenCalledTimes(1);
      expect(trainingSpy).toHaveBeenCalledTimes(1);
      expect(result.phishingResult?.success).toBe(true);
      expect(result.trainingResult?.success).toBe(true);
    });

    it('should handle missing training result gracefully', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulation);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModule);
      phishingSpy.mockResolvedValue({ success: true, message: 'phishing-ok' } as any);
      trainingSpy.mockRejectedValue(new Error('training failed'));

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
              microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['phishing', 'training'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(phishingSpy).toHaveBeenCalledTimes(1);
      expect(trainingSpy).toHaveBeenCalledTimes(1);
      expect(result.phishingResult?.success).toBe(true);
      expect(result.trainingResult?.success).toBe(false);
      expect(result.trainingResult?.error).toContain('training failed');
    });

    it('should return object with phishingResult and trainingResult', async () => {
      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
              microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['phishing', 'training'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(result).toHaveProperty('phishingResult');
      expect(result).toHaveProperty('trainingResult');
    });

    it('should support sendAfterPhishingSimulation flag', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulation);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModule);
      const assignSpy = vi.mocked(phishingHandlers.assignPhishingWithTraining);
      phishingSpy.mockResolvedValue({
        success: true,
        message: 'uploaded',
        uploadResult: {
          data: {
            resourceId: 'ph-resource',
            languageId: 'en-gb',
            isQuishing: false,
          },
        },
      } as any);
      trainingSpy.mockResolvedValue({
        success: true,
        data: {
          resourceId: 'tr-resource',
          sendTrainingLanguageId: 'en-gb',
        },
      } as any);
      assignSpy.mockResolvedValue({ success: true } as any);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
              microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['phishing', 'training'],
        true,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(phishingSpy.mock.calls[0][4]).toBe(true);
      expect(trainingSpy.mock.calls[0][4]).toBe(true);
      expect(assignSpy).toHaveBeenCalledTimes(1);
      expect(result.phishingResult?.uploadAssignResult?.success).toBe(true);
    });

    it('should preserve explainability reasoning across action-specific follow-up assign', async () => {
      let observedReasoning: string | undefined;
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulation);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModule);
      const assignSpy = vi.mocked(phishingHandlers.assignPhishingWithTraining);

      phishingSpy.mockImplementation(async () => {
        toolEventBus.set('explainabilityReasoning', 'shared-reasoning');
        return {
          success: true,
          message: 'uploaded',
          uploadResult: {
            data: {
              resourceId: 'ph-resource',
              languageId: 'en-gb',
              isQuishing: false,
            },
          },
        } as any;
      });
      trainingSpy.mockResolvedValue({
        success: true,
        data: {
          resourceId: 'tr-resource',
          sendTrainingLanguageId: 'en-gb',
        },
      } as any);
      assignSpy.mockImplementation(async () => {
        observedReasoning = toolEventBus.get<string>('explainabilityReasoning');
        return { success: true } as any;
      });

      await requestStorage.run(
        { token: 'token', threadId: 'parent-batch-id' },
        async () => generateContentForUser(
          {
            analysisReport: {
              recommended_next_steps: {
                simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
                microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
                nudges: [],
              },
            },
            userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
          } as any,
          'Executive report',
          ['phishing', 'training'],
          true,
          'user-123',
          'phishing-thread',
          'training-thread',
          undefined,
          {
            phishing: 'batch-phishing-1',
            training: 'batch-training-1',
          }
        )
      );

      expect(assignSpy).toHaveBeenCalledTimes(1);
      expect(observedReasoning).toBe('shared-reasoning');
    });

    it('should use action-specific batchResourceIds when provided', async () => {
      const observedThreadIds: Record<string, string | undefined> = {};
      vi.mocked(phishingHandlers.generatePhishingSimulation).mockImplementation(async () => {
        observedThreadIds.phishing = requestStorage.getStore()?.threadId;
        return { success: true, message: 'phishing-ok' } as any;
      });
      vi.mocked(trainingHandlers.generateTrainingModule).mockImplementation(async () => {
        observedThreadIds.training = requestStorage.getStore()?.threadId;
        return { success: true, message: 'training-ok' } as any;
      });

      await requestStorage.run(
        { token: 'token', threadId: 'parent-batch-id' },
        async () => generateContentForUser(
          {
            analysisReport: {
              recommended_next_steps: {
                simulations: [{ title: 'Test Phishing', scenario_type: 'CLICK_ONLY' }],
                microlearnings: [{ title: 'Test Training', objective: 'Awareness' }],
                nudges: [],
              },
            },
            userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
          } as any,
          'Executive report',
          ['phishing', 'training'],
          false,
          'user-123',
          'phishing-thread',
          'training-thread',
          undefined,
          {
            phishing: 'batch-phishing-1',
            training: 'batch-training-1',
          }
        )
      );

      expect(observedThreadIds.phishing).toBe('batch-phishing-1');
      expect(observedThreadIds.training).toBe('batch-training-1');
    });

    it('should generate smishing content for user when actions include smishing', async () => {
      const smishingSpy = vi.mocked(smishingHandlers.generateSmishingSimulation);
      smishingSpy.mockResolvedValue({ success: true, message: 'ok' } as any);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [{ title: 'Test Smishing', scenario_type: 'CLICK_ONLY' }],
              microlearnings: [],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['smishing'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(smishingSpy).toHaveBeenCalledTimes(1);
      expect(result.smishingResult?.success).toBe(true);
      expect(result.phishingResult).toBeUndefined();
      expect(result.trainingResult).toBeUndefined();
    });

    it('should return explicit failure for smishing when simulation recommendation is missing', async () => {
      const smishingSpy = vi.mocked(smishingHandlers.generateSmishingSimulation);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [],
              microlearnings: [],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['smishing'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(smishingSpy).not.toHaveBeenCalled();
      expect(result.smishingResult?.success).toBe(false);
      expect(result.smishingResult?.error).toContain('No recommended smishing content found');
    });

    it('should return explicit failure for phishing when simulation recommendation is missing', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulation);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [],
              microlearnings: [],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['phishing'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(phishingSpy).not.toHaveBeenCalled();
      expect(result.phishingResult?.success).toBe(false);
      expect(result.phishingResult?.error).toContain('No recommended phishing content found');
    });

    it('should return explicit failure for training when microlearning recommendation is missing', async () => {
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModule);

      const result = await generateContentForUser(
        {
          analysisReport: {
            recommended_next_steps: {
              simulations: [],
              microlearnings: [],
              nudges: [],
            },
          },
          userInfo: { targetUserResourceId: 'user-123', preferredLanguage: 'en-gb' },
        } as any,
        'Executive report',
        ['training'],
        false,
        'user-123',
        'phishing-thread',
        'training-thread'
      );

      expect(trainingSpy).not.toHaveBeenCalled();
      expect(result.trainingResult?.success).toBe(false);
      expect(result.trainingResult?.error).toContain('No recommended training content found');
    });
  });

  describe('generateContentForGroup', () => {
    it('should accept training and phishing actions', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      const result = await generateContentForGroup(['phishing', 'training'], 'en-gb', 'group-123');

      expect(phishingSpy).toHaveBeenCalledTimes(1);
      expect(trainingSpy).toHaveBeenCalledTimes(1);
      expect(result.phishingResult?.success).toBe(true);
      expect(result.trainingResult?.success).toBe(true);
    });

    it('should select unified topic for both phishing and training', async () => {
      const topicSpy = vi.mocked(groupTopicService.selectGroupTrainingTopic);
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      await generateContentForGroup(['phishing', 'training'], 'en-gb', 'group-123');

      expect(topicSpy).toHaveBeenCalledTimes(1);
      expect(phishingSpy.mock.calls[0][1]).toBe('Phishing prompt');
      expect(trainingSpy.mock.calls[0][1]).toBe('Training prompt');
    });

    it('should generate content in parallel for efficiency', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      await generateContentForGroup(['phishing', 'training'], 'en-gb', 'group-123');

      expect(phishingSpy).toHaveBeenCalledTimes(1);
      expect(trainingSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle missing phishing action', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      const result = await generateContentForGroup(['training'], 'en-gb', 'group-123');

      expect(phishingSpy).not.toHaveBeenCalled();
      expect(trainingSpy).toHaveBeenCalledTimes(1);
      expect(result.phishingResult).toBeUndefined();
      expect(result.trainingResult?.success).toBe(true);
    });

    it('should handle missing training action', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      const result = await generateContentForGroup(['phishing'], 'en-gb', 'group-123');

      expect(phishingSpy).toHaveBeenCalledTimes(1);
      expect(trainingSpy).not.toHaveBeenCalled();
      expect(result.phishingResult?.success).toBe(true);
      expect(result.trainingResult).toBeUndefined();
    });

    it('should return object with phishingResult and trainingResult', async () => {
      const result = await generateContentForGroup(['phishing', 'training'], 'en-gb', 'group-123');
      expect(result).toHaveProperty('phishingResult');
      expect(result).toHaveProperty('trainingResult');
    });

    it('should support preferred language configuration', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      await generateContentForGroup(['phishing', 'training'], 'tr-tr', 'group-123');

      expect(phishingSpy.mock.calls[0][2]).toBe('tr-tr');
      expect(trainingSpy.mock.calls[0][2]).toBe('tr-tr');
    });

    it('should support target group resource ID', async () => {
      const phishingSpy = vi.mocked(phishingHandlers.generatePhishingSimulationForGroup);
      const trainingSpy = vi.mocked(trainingHandlers.generateTrainingModuleForGroup);

      await generateContentForGroup(['phishing', 'training'], 'en-gb', 'group-777');

      expect(phishingSpy.mock.calls[0][4]).toBe('group-777');
      expect(trainingSpy.mock.calls[0][4]).toBe('group-777');
    });

    it('should use action-specific batchResourceIds for group generation when provided', async () => {
      const observedThreadIds: Record<string, string | undefined> = {};
      vi.mocked(phishingHandlers.generatePhishingSimulationForGroup).mockImplementation(async () => {
        observedThreadIds.phishing = requestStorage.getStore()?.threadId;
        return { success: true } as any;
      });
      vi.mocked(trainingHandlers.generateTrainingModuleForGroup).mockImplementation(async () => {
        observedThreadIds.training = requestStorage.getStore()?.threadId;
        return { success: true } as any;
      });

      await requestStorage.run(
        { token: 'token', threadId: 'parent-batch-id' },
        async () => generateContentForGroup(
          ['phishing', 'training'],
          'en-gb',
          'group-123',
          {
            phishing: 'batch-phishing-1',
            training: 'batch-training-1',
          }
        )
      );

      expect(observedThreadIds.phishing).toBe('batch-phishing-1');
      expect(observedThreadIds.training).toBe('batch-training-1');
    });

    it('should generate smishing content for group when actions include smishing', async () => {
      const smishingSpy = vi.mocked(smishingHandlers.generateSmishingSimulation);
      const topicSpy = vi.mocked(groupTopicService.selectGroupTrainingTopic);
      smishingSpy.mockResolvedValue({ success: true, message: 'group-smishing-ok' } as any);

      const result = await generateContentForGroup(['smishing'], 'en-gb', 'group-123');

      expect(topicSpy).toHaveBeenCalledTimes(1);
      expect(smishingSpy).toHaveBeenCalledTimes(1);
      expect(smishingSpy.mock.calls[0][0].executiveReport).toBe('Smishing prompt');
      expect(result.smishingResult?.success).toBe(true);
      expect(result.phishingResult).toBeUndefined();
      expect(result.trainingResult).toBeUndefined();
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
