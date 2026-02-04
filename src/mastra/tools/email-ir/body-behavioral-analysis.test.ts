import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bodyBehavioralAnalysisTool } from './body-behavioral-analysis';

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
  loggerBehavioral: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'behavioral-analysis', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

describe('bodyBehavioralAnalysisTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include insufficient_data guidance in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          urgency_level: 'insufficient_data',
          emotional_pressure: 'insufficient_data',
          social_engineering_pattern: 'insufficient_data',
          verification_avoidance: false,
          verification_avoidance_tactics: 'insufficient_data',
          urgency_indicators: 'insufficient_data',
          emotional_pressure_indicators: 'insufficient_data',
          behavioral_summary: 'summary',
        },
      });
    });

    await (bodyBehavioralAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        htmlBody: '',
      },
    });

    expect(capturedPrompt).toContain('insufficient_data');
  });
});
