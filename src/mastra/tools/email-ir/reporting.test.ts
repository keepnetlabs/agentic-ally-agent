import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportingTool } from './reporting';
import { EmailIRCanvasSchema } from '../../schemas/email-ir';

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

  it('should execute successfully and return schema-valid report', async () => {
    const validReport = {
      executive_summary: {
        email_category: 'Phishing' as const,
        verdict: 'Phishing Confirmed - Immediate Action Required',
        risk_level: 'High' as const,
        confidence: 0.92,
        evidence_strength: 'Strong' as const,
        confidence_basis: 'Signals converge across authentication, intent, and behavior.',
        status: 'Analysis Complete',
        why_this_matters: 'Potential credential compromise and lateral movement risk.',
      },
      agent_determination: 'The message is a phishing attempt with clear credential-harvest indicators.',
      risk_indicators: {
        observed: ['Credential request present', 'Urgency framing present'],
        not_observed: ['No confirmed malware attachment'],
      },
      evidence_flow: [
        { step: 1, title: 'Email Triage', description: 'Classified as suspicious.', finding_label: 'FLAG' as const },
        { step: 2, title: 'Final Verdict', description: 'Classified as phishing.', finding_label: 'Phishing' as const },
      ],
      actions_recommended: {
        p1_immediate: ['Remove and quarantine message'],
        p2_follow_up: ['Notify targeted user'],
        p3_hardening: ['Reinforce phishing awareness training'],
      },
      confidence_limitations:
        'High confidence in determination. Multiple independent signals converge on this verdict.',
    };

    generateMock.mockResolvedValue({
      object: validReport,
    });

    const result = await (reportingTool as any).execute({
      context: {
        original_email: { from: 'alert@example.com', subject: 'Test' },
        triage_result: { category: 'Benign', reason: 'ok', confidence: 0.5 },
        feature_result: {
          intent: 'benign',
          urgency: 'none',
          authority_impersonation: false,
          financial_request: false,
          credential_request: false,
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          engine_indicators_present: false,
          analysis_summary: 'No significant risk indicators.',
          header_analysis: {
            spf_pass: true,
            dkim_pass: true,
            dmarc_pass: true,
            domain_similarity: 'none',
            sender_ip_reputation: 'clean',
            geolocation_anomaly: 'none',
            routing_anomaly: 'none',
            threat_intel_findings: 'none',
            header_summary: 'Authentication checks passed.',
            security_awareness_detected: false,
            list_unsubscribe_present: false,
          },
          behavioral_analysis: {
            urgency_level: 'none',
            emotional_pressure: 'none',
            social_engineering_pattern: 'none',
            verification_avoidance: false,
            verification_avoidance_tactics: 'insufficient_data',
            urgency_indicators: 'insufficient_data',
            emotional_pressure_indicators: 'insufficient_data',
            behavioral_summary: 'No manipulation patterns detected.',
          },
          intent_analysis: {
            intent: 'benign',
            financial_request: false,
            credential_request: false,
            authority_impersonation: false,
            financial_request_details: 'insufficient_data',
            credential_request_details: 'insufficient_data',
            authority_claimed: 'insufficient_data',
            intent_summary: 'Informational message with no malicious intent.',
          },
        },
        risk_level: 'Low',
        confidence: 0.9,
        justification: 'No material risk indicators.',
      },
    });

    expect(EmailIRCanvasSchema.safeParse(result).success).toBe(true);
  });
});
