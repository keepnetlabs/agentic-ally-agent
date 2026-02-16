import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triageTool } from './triage';

const generateMock = vi.fn();

vi.mock('../../agents/email-ir-analyst', () => ({
  emailIRAnalyst: {
    generate: async (...args: any[]) => generateMock(...args),
  },
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: any) => await fn()),
}));

vi.mock('./email-body-sanitizer', () => ({
  sanitizeEmailBody: vi.fn((s: string) => s || ''),
}));

vi.mock('./logger-setup', () => ({
  loggerTriage: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'triage', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
}));

describe('triageTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute successfully with security_awareness_detected', async () => {
    generateMock.mockResolvedValue({
      object: {
        category: 'Security Awareness',
        reason: 'ok',
        confidence: 0.95,
      },
    });

    const input = {
      original_email: { from: 'alert@example.com', subject: 'Test' },
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
        security_awareness_detected: true,
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
    };
    const result = await (triageTool as any).execute({ context: input });
    expect(result).toBeDefined();
    expect(result.category).toBe('Security Awareness');
    expect(result.original_email).toEqual(input.original_email);
  });

  it('should return Phishing category when LLM classifies as Phishing', async () => {
    generateMock.mockResolvedValue({
      object: {
        category: 'Phishing',
        reason: 'Credential harvesting attempt detected',
        confidence: 0.92,
      },
    });

    const input = {
      original_email: { from: 'phish@evil.com', subject: 'Verify your account' },
      header_analysis: {
        spf_pass: false,
        dkim_pass: false,
        dmarc_pass: false,
        domain_similarity: 'suspicious',
        sender_ip_reputation: 'insufficient_data',
        geolocation_anomaly: 'insufficient_data',
        routing_anomaly: 'insufficient_data',
        threat_intel_findings: 'insufficient_data',
        header_summary: 'Suspicious',
        security_awareness_detected: false,
        list_unsubscribe_present: false,
      },
      behavioral_analysis: {
        urgency_level: 'high',
        emotional_pressure: 'insufficient_data',
        social_engineering_pattern: 'insufficient_data',
        verification_avoidance: true,
        verification_avoidance_tactics: 'insufficient_data',
        urgency_indicators: 'insufficient_data',
        emotional_pressure_indicators: 'insufficient_data',
        behavioral_summary: 'Urgency',
      },
      intent_analysis: {
        intent: 'phishing',
        financial_request: false,
        credential_request: true,
        authority_impersonation: false,
        financial_request_details: 'insufficient_data',
        credential_request_details: 'insufficient_data',
        authority_claimed: 'insufficient_data',
        intent_summary: 'Credential request',
      },
    };
    const result = await (triageTool as any).execute({ context: input });
    expect(result.category).toBe('Phishing');
    expect(result.confidence).toBe(0.92);
    expect(result.original_email).toEqual(input.original_email);
  });

  it('should throw when LLM generate fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM API error'));

    const input = {
      original_email: { from: 'test@x.com', subject: 'Test' },
      header_analysis: {
        spf_pass: true,
        dkim_pass: true,
        dmarc_pass: true,
        domain_similarity: 'insufficient_data',
        sender_ip_reputation: 'insufficient_data',
        geolocation_anomaly: 'insufficient_data',
        routing_anomaly: 'insufficient_data',
        threat_intel_findings: 'insufficient_data',
        header_summary: 'OK',
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
        behavioral_summary: 'OK',
      },
      intent_analysis: {
        intent: 'benign',
        financial_request: false,
        credential_request: false,
        authority_impersonation: false,
        financial_request_details: 'insufficient_data',
        credential_request_details: 'insufficient_data',
        authority_claimed: 'insufficient_data',
        intent_summary: 'OK',
      },
    };

    await expect((triageTool as any).execute({ context: input })).rejects.toThrow('LLM API error');
  });
});
