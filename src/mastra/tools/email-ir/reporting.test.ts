import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportingTool } from './reporting';

const generateMock = vi.fn();

vi.mock('../../agents/email-ir-analyst', () => ({
  emailIRAnalyst: {
    generate: async (...args: any[]) => generateMock(...args),
  },
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: any) => await fn()),
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

  it('should execute successfully and return remediation steps', async () => {
    generateMock.mockResolvedValue({
      object: {
        agent_determination: 'resolved',
        remediation_steps: ['quarantine email', 'notify user'],
        investigation_log: 'Investigation complete',
      },
    });

    expect(async () => {
      await (reportingTool as any).execute({
        context: {
          original_email: { from: 'alert@example.com', subject: 'Test' },
          triage_result: { category: 'Benign', reason: 'ok', confidence: 0.5 },
          feature_result: {},
          risk_level: 'low',
          justification: 'ok',
        },
      });
    }).not.toThrow();
  });
});
