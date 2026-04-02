import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generatePhishingSimulation,
  generatePhishingSimulationForGroup,
  uploadAndAssignPhishing,
  uploadAndAssignPhishingForGroup,
  assignPhishingWithTraining,
} from './autonomous-phishing-handlers';
import '../../../../src/__tests__/setup';
import * as orchestrationModule from '../../tools/orchestration';
import * as userManagementModule from '../../tools/user-management';

vi.mock('../../tools/orchestration', () => ({
  phishingWorkflowExecutorTool: {
    execute: vi.fn(),
  },
}));

vi.mock('../../tools/user-management', () => ({
  uploadPhishingTool: { execute: vi.fn() },
  assignPhishingTool: { execute: vi.fn() },
}));

const mockPhishingAgentGenerate = vi.fn();
vi.mock('../../agents/phishing-email-agent', () => ({
  phishingEmailAgent: {
    generate: (...args: unknown[]) => mockPhishingAgentGenerate(...args),
  },
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../error-service', () => ({
  errorService: {
    external: vi.fn((msg: string) => ({ message: msg })),
  },
}));

describe('autonomous-phishing-handlers', () => {
  const mockPhishingExecute = vi.mocked((orchestrationModule as any).phishingWorkflowExecutorTool.execute);
  const mockUploadExecute = vi.mocked((userManagementModule as any).uploadPhishingTool.execute);
  const mockAssignExecute = vi.mocked((userManagementModule as any).assignPhishingTool.execute);

  const baseSimulation = {
    title: 'Phishing Test',
    difficulty: 'Medium',
    scenario_type: 'CLICK_ONLY',
  };

  const baseToolResult = {
    userInfo: {
      targetUserResourceId: 'user-123',
      department: 'IT',
      preferredLanguage: 'en-gb',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPhishingAgentGenerate.mockResolvedValue({ text: 'Agent response' });

    mockPhishingExecute.mockResolvedValue({
      success: true,
      data: { phishingId: 'phish-abc-123' },
    });

    mockUploadExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-456',
        languageId: 'en-gb',
        isQuishing: false,
      },
    });

    mockAssignExecute.mockResolvedValue({
      success: true,
    });
  });

  describe('generatePhishingSimulation (tool-first path)', () => {
    it('returns success when all tools succeed (upload + assign)', async () => {
      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-1',
        false
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('generated, uploaded and assigned');
      expect(mockPhishingExecute).toHaveBeenCalled();
      expect(mockUploadExecute).toHaveBeenCalledWith(
        expect.objectContaining({ phishingId: 'phish-abc-123' }),
        expect.anything()
      );
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'res-456',
          targetUserResourceId: 'user-123',
        }),
        expect.anything()
      );
    });

    it('returns success for uploadOnly without assignment', async () => {
      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-2',
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded');
      expect(mockAssignExecute).not.toHaveBeenCalled();
    });

    it('passes analysis-driven behavioral guidance into tool-first context', async () => {
      const simulation = {
        ...baseSimulation,
        why_this: 'User clicks urgent account links quickly under authority pressure',
        designed_to_progress: 'Teach the user to pause and verify account requests before clicking',
        persuasion_tactic: 'Authority',
      };

      await generatePhishingSimulation(
        simulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-guidance-1',
        true
      );

      expect(mockPhishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalContext: expect.stringContaining('Behavioral Recommendation:'),
        }),
        expect.anything()
      );
      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).toContain(
        'Behavioral Focus: User clicks urgent account links quickly under authority pressure'
      );
      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).toContain(
        'Progression Goal: Teach the user to pause and verify account requests before clicking'
      );
    });

    it('passes structured behavioral profile into tool-first workflow input when analysis report provides it', async () => {
      const toolResult = {
        ...baseToolResult,
        analysisReport: {
          header: {
            behavioral_resilience: {
              current_stage: 'Building',
              target_stage: 'Consistent',
            },
            progression_hint: 'Verify internal requests before clicking',
          },
          internal: {
            evidence_summary: {
              key_signals_used: ['Clicked phishing link', 'No reporting events observed'],
              data_gaps: ['No QR simulation evidence'],
            },
            behavior_science_engine: {
              fogg_trigger_type: 'FACILITATOR',
            },
          },
        },
      };

      await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        toolResult as any,
        'thread-phish-guidance-structured',
        true
      );

      expect(mockPhishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          behavioralProfile: expect.objectContaining({
            currentStage: 'Building',
            targetStage: 'Consistent',
            progressionHint: 'Verify internal requests before clicking',
            foggTriggerType: 'FACILITATOR',
          }),
        }),
        expect.anything()
      );
    });

    it('falls back to foundational behavioral defaults when report signals are weak', async () => {
      await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-guidance-2',
        true
      );

      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).toContain(
        'Source: foundational-default'
      );
      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).toContain(
        'Behavioral Focus: credential hygiene and cautious account-access verification'
      );
    });

    it('treats rationale-only simulations as foundational defaults', async () => {
      const simulation = {
        ...baseSimulation,
        rationale: 'Generic security awareness recommendation without behavioral next-step fields',
      };

      await generatePhishingSimulation(
        simulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-guidance-3',
        true
      );

      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).toContain(
        'Source: foundational-default'
      );
      expect(mockPhishingExecute.mock.calls[0]?.[0]?.additionalContext).not.toContain(
        'Source: analysis-report'
      );
    });
  });

  describe('uploadAndAssignPhishing', () => {
    it('returns success when agent completes upload and assign', async () => {
      const result = await uploadAndAssignPhishing('user-789', 'thread-upload-1', 'phish-xyz');

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('returns failure when targetUserResourceId is missing', async () => {
      const result = await uploadAndAssignPhishing(undefined as any, 'thread-upload-2', 'phish-xyz');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetUserResourceId');
    });
  });

  describe('uploadAndAssignPhishingForGroup', () => {
    it('returns failure when targetGroupResourceId is missing', async () => {
      const result = await uploadAndAssignPhishingForGroup(undefined as any, 'thread-group-1', 'phish-xyz');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetGroupResourceId');
    });

    it('returns success when agent completes upload and assign for group', async () => {
      const result = await uploadAndAssignPhishingForGroup('group-456', 'thread-group-2', 'phish-xyz');

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('assignPhishingWithTraining', () => {
    it('uses tool-first path when phishingResourceId is provided', async () => {
      const result = await assignPhishingWithTraining(
        'user-999',
        'thread-assign-1',
        'training-res-1',
        'en-gb',
        'res-999',
        'en-gb',
        false
      );

      expect(result.success).toBe(true);
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'res-999',
          targetUserResourceId: 'user-999',
          trainingId: 'training-res-1',
        }),
        expect.anything()
      );
    });

    it('returns failure when targetUserResourceId is missing', async () => {
      const result = await assignPhishingWithTraining(undefined as any, 'thread-assign-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetUserResourceId');
    });

    it('uses agent path when phishingResourceId is not provided', async () => {
      mockPhishingAgentGenerate.mockResolvedValue({ text: 'Agent assigned phishing with training' });

      const result = await assignPhishingWithTraining('user-888', 'thread-assign-3', 'training-1', 'en-gb');

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('generatePhishingSimulation (agent fallback when tool-first fails)', () => {
    it('falls back to agent when tool generation fails', async () => {
      mockPhishingExecute.mockResolvedValue({
        success: false,
        error: 'Generation failed',
        data: null,
      });
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent response with "phishingId":"phish-agent-123"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-fallback-1',
        false
      );

      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('returns recommendedParams when all fallbacks fail', async () => {
      mockPhishingExecute.mockResolvedValue({ success: false, error: 'Tool failed' });
      mockPhishingAgentGenerate.mockRejectedValue(new Error('Agent failed'));

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-fail-1',
        false
      );

      expect(result.success).toBe(false);
      expect(result.recommendedParams).toBeDefined();
      expect(result.recommendedParams?.topic).toBeDefined();
    });
  });

  describe('generatePhishingSimulation (tool-first edge cases)', () => {
    it('falls back to agent when tool returns invalid phishingId (agent succeeds)', async () => {
      mockPhishingExecute.mockResolvedValue({
        success: true,
        data: { phishingId: '../evil-id' },
      });
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent with "phishingId":"phish-valid"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-invalid-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
      expect(mockUploadExecute).not.toHaveBeenCalled();
    });

    it('falls back to agent when tool returns no phishingId', async () => {
      mockPhishingExecute.mockResolvedValue({ success: true, data: {} });
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent with "phishingId":"phish-valid"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-no-id-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('falls back to agent when upload fails in tool-first', async () => {
      mockUploadExecute.mockResolvedValue({ success: false, error: 'Upload API error' });
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent with "phishingId":"phish-valid"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-upload-fail-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('falls back to agent when assign fails in tool-first', async () => {
      mockAssignExecute.mockResolvedValue({ success: false, error: 'Assign failed' });
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent with "phishingId":"phish-valid"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-assign-fail-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('uses Data-Submission method when scenario_type includes DATA', async () => {
      const result = await generatePhishingSimulation(
        { ...baseSimulation, scenario_type: 'DATA_SUBMISSION' } as any,
        undefined,
        baseToolResult as any,
        'thread-data-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'Data-Submission',
        }),
        expect.anything()
      );
    });

    it('falls back to agent when tool-first throws', async () => {
      mockPhishingExecute.mockRejectedValue(new Error('Network timeout'));
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent response with "phishingId":"phish-catch-1"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-throw-1',
        false
      );

      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('uses Data-Submission method when scenario_type includes SUBMISSION', async () => {
      const result = await generatePhishingSimulation(
        { ...baseSimulation, scenario_type: 'FORM_SUBMISSION' } as any,
        undefined,
        baseToolResult as any,
        'thread-submission-1',
        false
      );

      expect(result.success).toBe(true);
      expect(mockPhishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'Data-Submission',
        }),
        expect.anything()
      );
    });

    it('falls back to agent when tool-first succeeds upload but missing target for assign', async () => {
      const toolResultNoUser = {
        userInfo: {
          targetUserResourceId: undefined,
          department: 'IT',
          preferredLanguage: 'en-gb',
        },
      };
      mockPhishingAgentGenerate
        .mockResolvedValueOnce({ text: 'Agent with "phishingId":"phish-fallback"' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Upload and assign done' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        toolResultNoUser as any,
        'thread-no-target-1',
        false
      );

      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('generatePhishingSimulationForGroup', () => {
    it('returns success when tool-first path succeeds for group', async () => {
      const result = await generatePhishingSimulationForGroup(
        baseSimulation as any,
        'Custom topic prompt',
        'en-gb',
        'thread-group-phish-1',
        'group-789'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('assigned');
      expect(mockPhishingExecute).toHaveBeenCalled();
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          targetGroupResourceId: 'group-789',
        }),
        expect.anything()
      );
    });

    it('falls back to agent when tool-first fails for group', async () => {
      mockPhishingExecute.mockResolvedValue({ success: false, error: 'Tool failed' });
      mockPhishingAgentGenerate.mockResolvedValue({
        text: 'Agent response with "phishingId":"phish-group-agent"',
      });

      const result = await generatePhishingSimulationForGroup(
        baseSimulation as any,
        'Custom prompt',
        'en-gb',
        'thread-group-fallback-1',
        'group-999'
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('explanationJson propagation', () => {
    it('passes explanationJson to assign tool when upload returns explanationReasoningText', async () => {
      mockUploadExecute.mockResolvedValue({
        success: true,
        data: {
          resourceId: 'res-456',
          languageId: 'en-gb',
          isQuishing: false,
          explanationReasoningText: 'User in finance dept with no recent phishing test.',
        },
      });

      await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-explain-1',
        false
      );

      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          explanationJson: { reasoningText: 'User in finance dept with no recent phishing test.' },
        }),
        expect.anything()
      );
    });

    it('does NOT pass explanationJson when upload returns no explanationReasoningText', async () => {
      mockUploadExecute.mockResolvedValue({
        success: true,
        data: {
          resourceId: 'res-456',
          languageId: 'en-gb',
          isQuishing: false,
        },
      });

      await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-explain-2',
        false
      );

      const assignCall = mockAssignExecute.mock.calls[0][0] as any;
      expect(assignCall).not.toHaveProperty('explanationJson');
    });
  });
});
