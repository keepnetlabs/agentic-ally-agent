import { describe, it, expect, vi, beforeEach } from 'vitest';
import { riskAssessmentTool } from './risk-assessment';

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
  loggerRiskAssessment: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'risk-assessment', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

const validContext = {
  original_email: { from: 'alert@example.com', subject: 'Test', urls: [], attachments: [] },
  triage_result: { category: 'Benign', reason: 'ok', confidence: 0.5 },
  header_analysis: {
    spf_pass: true,
    dkim_pass: true,
    dmarc_pass: true,
    domain_similarity: 'insufficient_data',
    sender_ip_reputation: 'insufficient_data',
    geolocation_anomaly: 'insufficient_data',
    routing_anomaly: 'insufficient_data',
    threat_intel_findings: 'insufficient_data',
    header_summary: 'summary',
    security_awareness_detected: false,
    list_unsubscribe_present: false,
  },
  behavioral_analysis: {
    urgency_level: 'insufficient_data',
    emotional_pressure: 'insufficient_data',
    social_engineering_pattern: 'insufficient_data',
    verification_avoidance: false,
    verification_avoidance_tactics: 'insufficient_data',
    urgency_indicators: 'insufficient_data',
    emotional_pressure_indicators: 'insufficient_data',
    behavioral_summary: 'summary',
  },
  intent_analysis: {
    intent: 'benign',
    financial_request: false,
    credential_request: false,
    authority_impersonation: false,
    financial_request_details: 'insufficient_data',
    credential_request_details: 'insufficient_data',
    authority_claimed: 'insufficient_data',
    intent_summary: 'summary',
  },
  intent: 'benign',
  urgency: 'insufficient_data',
  authority_impersonation: false,
  financial_request: false,
  credential_request: false,
  emotional_pressure: 'insufficient_data',
  social_engineering_pattern: 'insufficient_data',
  engine_indicators_present: false,
  analysis_summary: 'All checks pass',
};

describe('riskAssessmentTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return risk assessment when LLM succeeds', async () => {
    generateMock.mockResolvedValue({
      object: {
        risk_level: 'Low',
        confidence: 0.95,
        justification: 'Email passes all authentication checks and shows no malicious intent',
      },
    });

    const result = await (riskAssessmentTool as any).execute({
      context: validContext,
    });

    expect(result).toMatchObject({
      risk_level: 'Low',
      confidence: 0.95,
      justification: expect.any(String),
    });
    expect(result.original_email).toEqual(validContext.original_email);
    expect(result.triage_result).toEqual(validContext.triage_result);
  });

  it('should include feature_result in output', async () => {
    generateMock.mockResolvedValue({
      object: {
        risk_level: 'Medium',
        confidence: 0.65,
        justification: 'Mixed signals detected',
      },
    });

    const result = await (riskAssessmentTool as any).execute({
      context: validContext,
    });

    expect(result.feature_result).toBeDefined();
    expect(result.feature_result.intent).toBe('benign');
    expect(result.feature_result.header_analysis).toBeDefined();
  });

  it('should throw when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM timeout'));

    await expect(
      (riskAssessmentTool as any).execute({ context: validContext })
    ).rejects.toThrow('LLM timeout');
  });

  it('should use unknown-sender when original_email.from is empty', async () => {
    generateMock.mockResolvedValue({
      object: {
        risk_level: 'Low',
        confidence: 0.95,
        justification: 'Benign email',
      },
    });

    const ctxWithEmptyFrom = {
      ...validContext,
      original_email: { ...validContext.original_email, from: '' },
    };

    const result = await (riskAssessmentTool as any).execute({ context: ctxWithEmptyFrom });

    expect(result.risk_level).toBe('Low');
    expect(result.original_email.from).toBe('');
  });

  it('should use threat_intel_findings fallback when empty string', async () => {
    generateMock.mockResolvedValue({
      object: {
        risk_level: 'Medium',
        confidence: 0.65,
        justification: 'Mixed signals',
      },
    });

    const ctxWithEmptyThreatIntel = {
      ...validContext,
      header_analysis: {
        ...validContext.header_analysis,
        threat_intel_findings: '',
      },
    };

    const result = await (riskAssessmentTool as any).execute({ context: ctxWithEmptyThreatIntel });

    expect(result.risk_level).toBe('Medium');
  });
});
