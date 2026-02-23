import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bodyBehavioralAnalysisTool, bodyBehavioralAnalysisOutputSchema } from './body-behavioral-analysis';

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
  createLogContext: vi.fn(() => ({
    email_id: 'test',
    step: 'behavioral-analysis',
    timestamp: new Date().toISOString(),
  })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

vi.mock('./email-body-sanitizer', () => ({
  sanitizeEmailBody: vi.fn((s: string) => s || ''),
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

  it('should throw when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM error'));

    await expect(
      (bodyBehavioralAnalysisTool as any).execute({
        context: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      })
    ).rejects.toThrow('LLM error');
  });

  it('should return object with original_email when LLM succeeds', async () => {
    const email = { from: 'user@example.com', subject: 'Test', htmlBody: '<p>Hello</p>' };
    generateMock.mockResolvedValue({
      object: {
        urgency_level: 'none',
        emotional_pressure: 'none',
        social_engineering_pattern: 'none',
        verification_avoidance: false,
        verification_avoidance_tactics: 'insufficient_data',
        urgency_indicators: 'insufficient_data',
        emotional_pressure_indicators: 'insufficient_data',
        behavioral_summary: 'No pressure',
        original_email: email,
      },
    });

    const result = await (bodyBehavioralAnalysisTool as any).execute({ context: email });
    expect(result.urgency_level).toBe('none');
    expect(result.original_email).toEqual(email);
  });

  it('should use subject as body when htmlBody is empty', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          urgency_level: 'none',
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          verification_avoidance: false,
          verification_avoidance_tactics: 'insufficient_data',
          urgency_indicators: 'insufficient_data',
          emotional_pressure_indicators: 'insufficient_data',
          behavioral_summary: 'OK',
        },
      });
    });

    await (bodyBehavioralAnalysisTool as any).execute({
      context: { from: 'a@b.com', subject: 'Urgent Action Required', htmlBody: '' },
    });

    expect(capturedPrompt).toContain('Urgent Action Required');
  });

  it('should use No body content when htmlBody and subject are empty', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          urgency_level: 'none',
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          verification_avoidance: false,
          verification_avoidance_tactics: 'insufficient_data',
          urgency_indicators: 'insufficient_data',
          emotional_pressure_indicators: 'insufficient_data',
          behavioral_summary: 'OK',
        },
      });
    });

    await (bodyBehavioralAnalysisTool as any).execute({
      context: { from: 'a@b.com', subject: '', htmlBody: '' },
    });

    expect(capturedPrompt).toContain('No body content');
  });
});

describe('bodyBehavioralAnalysisOutputSchema', () => {
  const validEmail = { from: 'a@b.com', subject: 'Test', htmlBody: '' };

  it('accepts valid output with insufficient_data', () => {
    const result = bodyBehavioralAnalysisOutputSchema.safeParse({
      urgency_level: 'insufficient_data',
      emotional_pressure: 'insufficient_data',
      social_engineering_pattern: 'insufficient_data',
      verification_avoidance: false,
      verification_avoidance_tactics: 'insufficient_data',
      urgency_indicators: 'insufficient_data',
      emotional_pressure_indicators: 'insufficient_data',
      behavioral_summary: 'No manipulation detected',
      original_email: validEmail,
    });
    expect(result.success).toBe(true);
  });

  it('accepts urgency_level enum values', () => {
    for (const level of ['insufficient_data', 'none', 'low', 'medium', 'high'] as const) {
      const result = bodyBehavioralAnalysisOutputSchema.safeParse({
        urgency_level: level,
        emotional_pressure: 'none',
        social_engineering_pattern: 'none',
        verification_avoidance: false,
        verification_avoidance_tactics: 'insufficient_data',
        urgency_indicators: 'insufficient_data',
        emotional_pressure_indicators: 'insufficient_data',
        behavioral_summary: 'Test',
        original_email: validEmail,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts emotional_pressure enum values', () => {
    for (const pressure of ['insufficient_data', 'none', 'fear', 'urgency', 'reward'] as const) {
      const result = bodyBehavioralAnalysisOutputSchema.safeParse({
        urgency_level: 'none',
        emotional_pressure: pressure,
        social_engineering_pattern: 'none',
        verification_avoidance: false,
        verification_avoidance_tactics: 'insufficient_data',
        urgency_indicators: 'insufficient_data',
        emotional_pressure_indicators: 'insufficient_data',
        behavioral_summary: 'Test',
        original_email: validEmail,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid urgency_level', () => {
    const result = bodyBehavioralAnalysisOutputSchema.safeParse({
      urgency_level: 'invalid',
      emotional_pressure: 'none',
      social_engineering_pattern: 'none',
      verification_avoidance: false,
      verification_avoidance_tactics: 'insufficient_data',
      urgency_indicators: 'insufficient_data',
      emotional_pressure_indicators: 'insufficient_data',
      behavioral_summary: 'Test',
      original_email: validEmail,
    });
    expect(result.success).toBe(false);
  });
});
