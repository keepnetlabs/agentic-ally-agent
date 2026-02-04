import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportingTool } from './reporting';

const generateMock = vi.fn();

vi.mock('../../agents/email-ir-analyst', () => ({
  emailIRAnalyst: {
    generate: (...args: any[]) => generateMock(...args),
  },
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: any) => fn()),
}));

vi.mock('./logger-setup', () => ({
  loggerReporting: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'reporting', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

describe('reportingTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include executive reporting instructions in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          agent_determination: 'ok',
          remediation_steps: ['step 1'],
          investigation_log: 'log',
        },
      });
    });

    await (reportingTool as any).execute({
      context: {
        original_email: { from: 'alert@example.com', subject: 'Test' },
        triage_result: { category: 'Benign', reason: 'ok', confidence: 0.5 },
        feature_result: {},
        risk_level: 'low',
        justification: 'ok',
      },
    });

    expect(capturedPrompt).toContain('Incident Response Reporting');
    expect(capturedPrompt).toContain('Executive Report');
    expect(capturedPrompt).toContain('REPORTING INSTRUCTIONS');
  });
});
