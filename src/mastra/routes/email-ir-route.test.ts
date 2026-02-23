import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailIRAnalyzeHandler } from './email-ir-route';
import { Context } from 'hono';

const { validReport } = vi.hoisted(() => ({
  validReport: {
    executive_summary: {
      email_category: 'Benign' as const,
      verdict: 'No Threat Detected - Benign Email',
      risk_level: 'Low' as const,
      confidence: 0.95,
      status: 'Analysis Complete',
    },
    agent_determination: 'Message appears informational with no malicious indicators.',
    risk_indicators: {
      observed: [],
      not_observed: ['No credential request', 'No financial request'],
    },
    evidence_flow: [
      {
        step: 1,
        title: 'Final Verdict',
        description: 'Classified as benign.',
        finding_label: 'Benign' as const,
      },
    ],
    actions_recommended: {
      p1_immediate: [],
      p2_follow_up: [],
      p3_hardening: [],
    },
    confidence_limitations: 'High confidence in determination. Multiple independent signals converge on this verdict.',
  },
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: any) => ({
    message: err?.message || 'Unknown error',
    code: 'UNKNOWN',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../workflows/email-ir-workflow', () => ({
  emailIRWorkflow: {
    createRunAsync: vi.fn().mockResolvedValue({
      runId: 'run-123',
      start: vi.fn().mockResolvedValue({
        status: 'completed',
        steps: {
          'email-ir-reporting-step': {
            status: 'success',
            output: validReport,
          },
        },
      }),
    }),
  },
}));

describe('emailIRAnalyzeHandler', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      req: {
        json: vi.fn(),
      },
      json: vi.fn().mockReturnValue('response'),
    };
  });

  it('should successfully process valid email analysis request', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-123',
      accessToken: 'bearer-token',
      apiBaseUrl: 'https://api.example.com',
    });

    const response = await emailIRAnalyzeHandler(mockContext as unknown as Context);

    expect(response).toBe('response');
    expect(mockContext.json).toHaveBeenCalled();
  });

  it('should normalize dash.keepnetlabs.com to api.keepnetlabs.com in apiBaseUrl', async () => {
    const { emailIRWorkflow } = await import('../workflows/email-ir-workflow');
    const mockStart = vi.fn().mockResolvedValue({
      status: 'completed',
      steps: {
        'email-ir-reporting-step': {
          status: 'success',
          output: validReport,
        },
      },
    });
    (emailIRWorkflow.createRunAsync as any).mockResolvedValue({
      runId: 'run-123',
      start: mockStart,
    });

    mockContext.req.json.mockResolvedValue({
      id: 'email-123',
      accessToken: 'bearer-token',
      apiBaseUrl: 'https://dash.keepnetlabs.com/v1',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    expect(mockStart).toHaveBeenCalledWith({
      inputData: expect.objectContaining({
        apiBaseUrl: 'https://api.keepnetlabs.com/v1',
      }),
    });
  });

  it('should handle JSON parse errors', async () => {
    mockContext.req.json.mockRejectedValue(new Error('Invalid JSON'));

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalled();
    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
  });

  it('should extract and return report from workflow', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-456',
      accessToken: 'token',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[0].success).toBe(true);
  });

  it('should include run ID in response', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-789',
      accessToken: 'token',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[0].runId).toBeDefined();
  });

  it('should handle workflow failures gracefully', async () => {
    const { emailIRWorkflow } = await import('../workflows/email-ir-workflow');
    (emailIRWorkflow.createRunAsync as any).mockResolvedValue({
      runId: 'run-fail',
      start: vi.fn().mockResolvedValue({
        status: 'failed',
        error: 'Workflow failed',
      }),
    });

    mockContext.req.json.mockResolvedValue({
      id: 'email-fail',
      accessToken: 'token',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
  });

  it('should return 500 when reporting step output is missing', async () => {
    const { emailIRWorkflow } = await import('../workflows/email-ir-workflow');
    (emailIRWorkflow.createRunAsync as any).mockResolvedValue({
      runId: 'run-missing-report',
      start: vi.fn().mockResolvedValue({
        status: 'completed',
        steps: {
          'email-ir-reporting-step': {
            status: 'failed',
          },
        },
      }),
    });

    mockContext.req.json.mockResolvedValue({
      id: 'email-missing-report',
      accessToken: 'token',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
    expect(lastCall[0].success).toBe(false);
  });

  it('should return 500 when reporting step output is schema-invalid', async () => {
    const { emailIRWorkflow } = await import('../workflows/email-ir-workflow');
    (emailIRWorkflow.createRunAsync as any).mockResolvedValue({
      runId: 'run-invalid-report',
      start: vi.fn().mockResolvedValue({
        status: 'completed',
        steps: {
          'email-ir-reporting-step': {
            status: 'success',
            output: { verdict: 'invalid-shape' },
          },
        },
      }),
    });

    mockContext.req.json.mockResolvedValue({
      id: 'email-invalid-report',
      accessToken: 'token',
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
    expect(lastCall[0].success).toBe(false);
  });
});
