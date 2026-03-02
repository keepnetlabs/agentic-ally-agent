import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bodyIntentAnalysisTool, bodyIntentAnalysisOutputSchema } from './body-intent-analysis';

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

vi.mock('./email-body-sanitizer', () => ({
  sanitizeEmailBody: vi.fn((s: string) => s || ''),
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

  it('should throw when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM error'));

    await expect(
      (bodyIntentAnalysisTool as any).execute({
        context: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      })
    ).rejects.toThrow('LLM error');
  });

  it('should set error code on thrown error when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM timeout'));

    try {
      await (bodyIntentAnalysisTool as any).execute({
        context: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      });
    } catch (e: any) {
      expect(e.message).toBe('LLM timeout');
      expect(e.code).toBeDefined();
    }
  });

  it('should return object with original_email when LLM succeeds', async () => {
    const email = { from: 'user@example.com', subject: 'Test', htmlBody: '<p>Hello</p>' };
    generateMock.mockResolvedValue({
      object: {
        intent: 'benign',
        financial_request: false,
        credential_request: false,
        authority_impersonation: false,
        financial_request_details: 'insufficient_data',
        credential_request_details: 'insufficient_data',
        authority_claimed: 'insufficient_data',
        intent_summary: 'Informational',
        original_email: email,
      },
    });

    const result = await (bodyIntentAnalysisTool as any).execute({ context: email });
    expect(result.intent).toBe('benign');
    expect(result.original_email).toEqual(email);
  });

  it('should use subject as body when htmlBody is empty', async () => {
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
          intent_summary: 'OK',
        },
      });
    });

    await (bodyIntentAnalysisTool as any).execute({
      context: { from: 'a@b.com', subject: 'Urgent: Verify Account', htmlBody: '' },
    });

    expect(capturedPrompt).toContain('Urgent: Verify Account');
  });

  it('should use No body content when htmlBody and subject are empty', async () => {
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
          intent_summary: 'OK',
        },
      });
    });

    await (bodyIntentAnalysisTool as any).execute({
      context: { from: 'a@b.com', subject: '', htmlBody: '' },
    });

    expect(capturedPrompt).toContain('No body content');
  });

  it('should use from when senderName is absent', async () => {
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
          intent_summary: 'OK',
        },
      });
    });

    await (bodyIntentAnalysisTool as any).execute({
      context: {
        from: 'support@company.com',
        subject: 'Test',
        htmlBody: '',
        // senderName intentionally omitted
      },
    });

    expect(capturedPrompt).toContain('support@company.com');
  });

  it('should use senderName in prompt when present', async () => {
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
          intent_summary: 'OK',
        },
      });
    });

    await (bodyIntentAnalysisTool as any).execute({
      context: {
        from: 'ceo@company.com',
        senderName: 'John CEO',
        subject: 'Test',
        htmlBody: '',
      },
    });

    expect(capturedPrompt).toContain('John CEO');
  });
});

describe('bodyIntentAnalysisOutputSchema', () => {
  const validEmail = { from: 'a@b.com', subject: 'Test', htmlBody: '' };

  it('accepts valid benign intent output', () => {
    const result = bodyIntentAnalysisOutputSchema.safeParse({
      intent: 'benign',
      financial_request: false,
      credential_request: false,
      authority_impersonation: false,
      financial_request_details: 'insufficient_data',
      credential_request_details: 'insufficient_data',
      authority_claimed: 'insufficient_data',
      intent_summary: 'Informational email',
      original_email: validEmail,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid phishing intent output', () => {
    const result = bodyIntentAnalysisOutputSchema.safeParse({
      intent: 'phishing',
      financial_request: false,
      credential_request: true,
      authority_impersonation: true,
      financial_request_details: 'insufficient_data',
      credential_request_details: 'password reset link',
      authority_claimed: 'IT Support',
      intent_summary: 'Asks for credentials',
      original_email: validEmail,
    });
    expect(result.success).toBe(true);
  });

  it('accepts all intent enum values', () => {
    for (const intent of ['benign', 'phishing', 'sextortion', 'impersonation', 'fraud'] as const) {
      const result = bodyIntentAnalysisOutputSchema.safeParse({
        intent,
        financial_request: false,
        credential_request: false,
        authority_impersonation: false,
        financial_request_details: 'insufficient_data',
        credential_request_details: 'insufficient_data',
        authority_claimed: 'insufficient_data',
        intent_summary: 'Test',
        original_email: validEmail,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid intent', () => {
    const result = bodyIntentAnalysisOutputSchema.safeParse({
      intent: 'invalid',
      financial_request: false,
      credential_request: false,
      authority_impersonation: false,
      financial_request_details: 'insufficient_data',
      credential_request_details: 'insufficient_data',
      authority_claimed: 'insufficient_data',
      intent_summary: 'Test',
      original_email: validEmail,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing original_email', () => {
    const result = bodyIntentAnalysisOutputSchema.safeParse({
      intent: 'benign',
      financial_request: false,
      credential_request: false,
      authority_impersonation: false,
      financial_request_details: 'insufficient_data',
      credential_request_details: 'insufficient_data',
      authority_claimed: 'insufficient_data',
      intent_summary: 'Test',
    });
    expect(result.success).toBe(false);
  });
});
