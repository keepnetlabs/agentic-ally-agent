import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bodyIntentAnalysisTool } from './body-intent-analysis';

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
  loggerIntent: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'intent-analysis', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

describe('bodyIntentAnalysisTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include insufficient_data guidance in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          intent: 'benign',
          financial_request: false,
          credential_request: false,
          authority_impersonation: false,
          financial_request_details: 'insufficient_data',
          credential_request_details: 'insufficient_data',
          authority_claimed: 'insufficient_data',
          intent_summary: 'summary',
        },
      });
    });

    await (bodyIntentAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        htmlBody: '',
      },
    });

    expect(capturedPrompt).toContain('insufficient_data');
  });
});
