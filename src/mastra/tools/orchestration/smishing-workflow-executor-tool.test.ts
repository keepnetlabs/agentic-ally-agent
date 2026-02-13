import { beforeEach, describe, expect, it, vi } from 'vitest';
import { smishingWorkflowExecutorTool } from './smishing-workflow-executor-tool';
import { ERROR_MESSAGES, SMISHING } from '../../constants';
import '../../../../src/__tests__/setup';
import * as workflowModule from '../../workflows/create-smishing-workflow';
import { buildRoutingContext, extractArtifactIdsFromRoutingContext } from '../../utils/chat-request-helpers';

vi.mock('../../workflows/create-smishing-workflow', () => {
  const mockCreateRunAsync = vi.fn();
  return {
    createSmishingWorkflow: {
      createRunAsync: mockCreateRunAsync,
    },
  };
});

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: vi.fn(async () => 'MOCK_POLICY_SUMMARY'),
}));

describe('smishingWorkflowExecutorTool', () => {
  const mockWorkflowRun = {
    start: vi.fn(),
  };

  const mockWorkflowResult = {
    status: 'success' as const,
    result: {
      smishingId: 'smishing-123',
      messages: [
        'Hi from IT support, verify now: https://example.test/verify',
      ],
      analysis: {
        method: 'Click-Only',
        scenario: 'IT verification',
        category: 'Credential Harvesting',
        psychologicalTriggers: ['urgency'],
        keyRedFlags: ['unexpected-link'],
        targetAudienceAnalysis: {
          department: 'IT',
        },
      },
      landingPage: {
        name: 'IT Verify',
        description: 'Test page',
        method: 'Click-Only',
        difficulty: 'Medium',
        pages: [
          {
            type: 'login',
            template: '<html>Landing</html>',
          },
        ],
      },
    },
  };

  const mockWriter = {
    write: vi.fn().mockResolvedValue(undefined),
  };

  let mockCreateRunAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRunAsync = workflowModule.createSmishingWorkflow.createRunAsync as any;
    mockCreateRunAsync.mockResolvedValue(mockWorkflowRun);
    mockWorkflowRun.start.mockResolvedValue(mockWorkflowResult);
  });

  it('should execute workflow and return success result', async () => {
    const input = {
      workflowType: SMISHING.WORKFLOW_TYPE,
      topic: 'IT verification',
      language: 'en-gb',
      difficulty: 'medium',
    };

    const result = await smishingWorkflowExecutorTool.execute({ context: input } as any);
    expect(result.success).toBe(true);
    expect(result.data?.smishingId).toBe('smishing-123');
    expect(result.data?.scenario).toBe('IT verification');
  });

  it('should stream smishing sms and landing payloads with ui signals', async () => {
    const input = {
      workflowType: SMISHING.WORKFLOW_TYPE,
      topic: 'IT verification',
      language: 'en-gb',
    };

    await smishingWorkflowExecutorTool.execute({ context: input, writer: mockWriter } as any);

    const calls = mockWriter.write.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(4);

    const smsCall = calls.find((call) =>
      call[0]?.type === 'text-delta' && typeof call[0]?.delta === 'string' && call[0].delta.includes('::ui:smishing_sms::')
    );
    const landingCall = calls.find((call) =>
      call[0]?.type === 'text-delta' && typeof call[0]?.delta === 'string' && call[0].delta.includes('::ui:smishing_landing_page::')
    );

    expect(smsCall).toBeDefined();
    expect(landingCall).toBeDefined();

    const smsDelta = (smsCall as NonNullable<typeof smsCall>)[0].delta as string;
    const smsPayload = smsDelta.split('::ui:smishing_sms::')[1].split('::/ui:smishing_sms::')[0];
    const smsDecoded = JSON.parse(Buffer.from(smsPayload, 'base64').toString('utf-8'));
    expect(smsDecoded.smishingId).toBe('smishing-123');
    expect(smsDecoded.smsKey).toBe('smishing:smishing-123:sms:en-gb');
    expect(smsDecoded.messages).toHaveLength(1);

    const landingDelta = (landingCall as NonNullable<typeof landingCall>)[0].delta as string;
    const landingPayload = landingDelta.split('::ui:smishing_landing_page::')[1].split('::/ui:smishing_landing_page::')[0];
    const landingDecoded = JSON.parse(Buffer.from(landingPayload, 'base64').toString('utf-8'));
    expect(landingDecoded.smishingId).toBe('smishing-123');
    expect(landingDecoded.landingKey).toBe('smishing:smishing-123:landing:en-gb');
    expect(Array.isArray(landingDecoded.pages)).toBe(true);
  });

  it('should handle streaming failure without failing tool result', async () => {
    const badWriter = {
      write: vi.fn().mockRejectedValue(new Error('stream failed')),
    };

    const input = {
      workflowType: SMISHING.WORKFLOW_TYPE,
      topic: 'IT verification',
    };

    const result = await smishingWorkflowExecutorTool.execute({ context: input, writer: badWriter } as any);
    expect(result.success).toBe(true);
  });

  it('should preserve ui-signal contract with chat-request-helpers', async () => {
    const input = {
      workflowType: SMISHING.WORKFLOW_TYPE,
      topic: 'IT verification',
      language: 'en-gb',
    };

    await smishingWorkflowExecutorTool.execute({ context: input, writer: mockWriter } as any);

    const uiDeltas = mockWriter.write.mock.calls
      .map((call) => call[0])
      .filter((event) => event?.type === 'text-delta' && typeof event?.delta === 'string')
      .map((event) => event.delta as string);

    expect(uiDeltas.length).toBeGreaterThan(0);

    const routingContext = buildRoutingContext([
      {
        role: 'assistant',
        content: uiDeltas.join('\n'),
      } as any,
    ]);

    const ids = extractArtifactIdsFromRoutingContext(routingContext);
    expect(ids.smishingId).toBe('smishing-123');
  });

  it('should return standardized error response when workflow has no output', async () => {
    mockWorkflowRun.start.mockResolvedValue({
      status: 'success',
      result: null,
    });

    const result = await smishingWorkflowExecutorTool.execute({
      context: {
        workflowType: SMISHING.WORKFLOW_TYPE,
        topic: 'IT verification',
      },
    } as any);

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.message).toBe(ERROR_MESSAGES.SMISHING.NO_OUTPUT);
  });

  it('should return standardized error response when output schema validation fails', async () => {
    mockWorkflowRun.start.mockResolvedValue({
      status: 'success',
      result: {
        // missing smishingId -> should fail output schema validation
        messages: ['test'],
        analysis: {},
      },
    });

    const result = await smishingWorkflowExecutorTool.execute({
      context: {
        workflowType: SMISHING.WORKFLOW_TYPE,
        topic: 'IT verification',
      },
    } as any);

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
    expect(result.message).toBe(ERROR_MESSAGES.SMISHING.GENERIC);
  });
});
