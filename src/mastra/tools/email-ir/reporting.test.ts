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

  it.each([
    [0.92, 'Strong'],
    [0.8, 'Strong'],
    [0.7, 'Moderate'],
    [0.55, 'Moderate'],
    [0.5, 'Limited'],
    [0.3, 'Limited'],
  ] as const)('when confidence is %s, evidence_strength should be %s', async (confidence, expectedStrength) => {
    const validReport = {
      executive_summary: {
        email_category: 'Benign' as const,
        verdict: 'No Threat Detected',
        risk_level: 'Low' as const,
        confidence,
        evidence_strength: expectedStrength as const,
        confidence_basis: 'Based on behavioral and contextual indicators.',
        status: 'Analysis Complete',
        why_this_matters: 'Low risk.',
      },
      agent_determination: 'Benign.',
      risk_indicators: { observed: [], not_observed: [] },
      evidence_flow: [
        { step: 1, title: 'Triage', description: 'OK', finding_label: 'PASS' as const },
        { step: 2, title: 'Verdict', description: 'Benign', finding_label: 'Benign' as const },
      ],
      actions_recommended: { p1_immediate: [], p2_follow_up: [], p3_hardening: [] },
      confidence_limitations: 'OK',
    };
    generateMock.mockResolvedValue({ object: validReport });

    await (reportingTool as any).execute({
      context: {
        original_email: { from: 'a@b.com', subject: 'Test' },
        triage_result: { category: 'Benign', reason: 'ok', confidence },
        feature_result: {
          intent: 'benign',
          urgency: 'none',
          authority_impersonation: false,
          financial_request: false,
          credential_request: false,
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          engine_indicators_present: false,
          analysis_summary: 'OK',
          header_analysis: {
            spf_pass: true,
            dkim_pass: true,
            dmarc_pass: true,
            domain_similarity: 'none',
            sender_ip_reputation: 'clean',
            geolocation_anomaly: 'none',
            routing_anomaly: 'none',
            threat_intel_findings: 'none',
            header_summary: 'OK',
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
        },
        risk_level: 'Low',
        confidence,
        justification: 'OK',
      },
    });

    const prompt = generateMock.mock.calls[0][0] as string;
    expect(prompt).toContain(`**Evidence Strength** | ${expectedStrength}`);
    expect(prompt).toContain(`executive_summary.evidence_strength | "${expectedStrength}"`);
  });

  it('should use unknown-sender when original_email.from has no @', async () => {
    const validReport = {
      executive_summary: {
        email_category: 'Benign' as const,
        verdict: 'OK',
        risk_level: 'Low' as const,
        confidence: 0.9,
        evidence_strength: 'Strong' as const,
        confidence_basis: 'OK',
        status: 'Analysis Complete',
      },
      agent_determination: 'Benign.',
      risk_indicators: { observed: [], not_observed: [] },
      evidence_flow: [
        { step: 1, title: 'Triage', description: 'OK', finding_label: 'Benign' as const },
      ],
      actions_recommended: { p1_immediate: [], p2_follow_up: [], p3_hardening: [] },
      confidence_limitations: 'OK',
    };
    generateMock.mockResolvedValue({ object: validReport });

    const { createLogContext } = await import('./logger-setup');
    await (reportingTool as any).execute({
      context: {
        original_email: { from: 'invalid-no-at-sign', subject: 'Test' },
        triage_result: { category: 'Benign', reason: 'ok', confidence: 0.9 },
        feature_result: {
          intent: 'benign',
          urgency: 'none',
          authority_impersonation: false,
          financial_request: false,
          credential_request: false,
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          engine_indicators_present: false,
          analysis_summary: 'OK',
          header_analysis: {
            spf_pass: true,
            dkim_pass: true,
            dmarc_pass: true,
            domain_similarity: 'none',
            sender_ip_reputation: 'clean',
            geolocation_anomaly: 'none',
            routing_anomaly: 'none',
            threat_intel_findings: 'none',
            header_summary: 'OK',
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
        },
        risk_level: 'Low',
        confidence: 0.9,
        justification: 'OK',
      },
    });

    expect(createLogContext).toHaveBeenCalledWith('invalid-no-at-sign', 'reporting');
  });

  it('should use unknown-sender when original_email.from is empty string', async () => {
    const validReport = {
      executive_summary: {
        email_category: 'Benign' as const,
        verdict: 'OK',
        risk_level: 'Low' as const,
        confidence: 0.9,
        evidence_strength: 'Strong' as const,
        confidence_basis: 'OK',
        status: 'Analysis Complete',
      },
      agent_determination: 'Benign.',
      risk_indicators: { observed: [], not_observed: [] },
      evidence_flow: [
        { step: 1, title: 'Triage', description: 'OK', finding_label: 'Benign' as const },
      ],
      actions_recommended: { p1_immediate: [], p2_follow_up: [], p3_hardening: [] },
      confidence_limitations: 'OK',
    };
    generateMock.mockResolvedValue({ object: validReport });

    const { createLogContext } = await import('./logger-setup');
    await (reportingTool as any).execute({
      context: {
        original_email: { from: '', subject: 'Test' },
        triage_result: { category: 'Benign', reason: 'ok', confidence: 0.9 },
        feature_result: {
          intent: 'benign',
          urgency: 'none',
          authority_impersonation: false,
          financial_request: false,
          credential_request: false,
          emotional_pressure: 'none',
          social_engineering_pattern: 'none',
          engine_indicators_present: false,
          analysis_summary: 'OK',
          header_analysis: {
            spf_pass: true,
            dkim_pass: true,
            dmarc_pass: true,
            domain_similarity: 'none',
            sender_ip_reputation: 'clean',
            geolocation_anomaly: 'none',
            routing_anomaly: 'none',
            threat_intel_findings: 'none',
            header_summary: 'OK',
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
        },
        risk_level: 'Low',
        confidence: 0.9,
        justification: 'OK',
      },
    });

    expect(createLogContext).toHaveBeenCalledWith('unknown-sender', 'reporting');
  });

  it('should throw when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM timeout'));

    await expect(
      (reportingTool as any).execute({
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
            analysis_summary: 'No risk.',
            header_analysis: {
              spf_pass: true,
              dkim_pass: true,
              dmarc_pass: true,
              domain_similarity: 'none',
              sender_ip_reputation: 'clean',
              geolocation_anomaly: 'none',
              routing_anomaly: 'none',
              threat_intel_findings: 'none',
              header_summary: 'OK',
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
          },
          risk_level: 'Low',
          confidence: 0.9,
          justification: 'No risk.',
        },
      })
    ).rejects.toThrow('LLM timeout');
  });
});
