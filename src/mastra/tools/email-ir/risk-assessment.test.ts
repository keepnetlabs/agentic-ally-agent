import { describe, it, expect, vi, beforeEach } from 'vitest';
import { riskAssessmentTool } from './risk-assessment';

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

describe('riskAssessmentTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include summarized key risk signals in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
          risk_level: 'low',
          confidence: 90,
          justification: 'ok',
        },
      });
    });

    await (riskAssessmentTool as any).execute({
      context: {
        original_email: { from: 'alert@example.com', subject: 'Test' },
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
      },
    });

    expect(capturedPrompt).toContain('Key Risk Signals (summarized)');
    expect(capturedPrompt).toContain('threat_intel_findings');
    expect(capturedPrompt).not.toContain('Extracted Features:');
  });
});
