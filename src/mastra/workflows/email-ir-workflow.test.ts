import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emailIRWorkflow,
  fetchStep,
  multiAnalysisStep,
  triageStep,
  featureExtractionStep,
  riskAssessmentStep,
  reportingStep,
} from './email-ir-workflow';

const mocks = vi.hoisted(() => ({
  fetchExecute: vi.fn(),
  headerExecute: vi.fn(),
  behavioralExecute: vi.fn(),
  intentExecute: vi.fn(),
  triageExecute: vi.fn(),
  featureExecute: vi.fn(),
  riskExecute: vi.fn(),
  reportExecute: vi.fn(),
}));

vi.mock('../tools/email-ir/fetch-email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/fetch-email')>();
  return {
    ...actual,
    fetchEmailTool: {
      execute: mocks.fetchExecute,
    },
  };
});

vi.mock('../tools/email-ir/header-analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/header-analysis')>();
  return {
    ...actual,
    headerAnalysisTool: {
      execute: mocks.headerExecute,
    },
  };
});

vi.mock('../tools/email-ir/body-behavioral-analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/body-behavioral-analysis')>();
  return {
    ...actual,
    bodyBehavioralAnalysisTool: {
      execute: mocks.behavioralExecute,
    },
  };
});

vi.mock('../tools/email-ir/body-intent-analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/body-intent-analysis')>();
  return {
    ...actual,
    bodyIntentAnalysisTool: {
      execute: mocks.intentExecute,
    },
  };
});

vi.mock('../tools/email-ir/triage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/triage')>();
  return {
    ...actual,
    triageTool: {
      execute: mocks.triageExecute,
    },
  };
});

vi.mock('../tools/email-ir/feature-extraction', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/feature-extraction')>();
  return {
    ...actual,
    featureExtractionTool: {
      execute: mocks.featureExecute,
    },
  };
});

vi.mock('../tools/email-ir/risk-assessment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/risk-assessment')>();
  return {
    ...actual,
    riskAssessmentTool: {
      execute: mocks.riskExecute,
    },
  };
});

vi.mock('../tools/email-ir/reporting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/email-ir/reporting')>();
  return {
    ...actual,
    reportingTool: {
      execute: mocks.reportExecute,
    },
  };
});

const baseEmail = {
  from: 'attacker@example.com',
  subject: 'Urgent action needed',
  htmlBody: '<p>Please click the secure login link now.</p>',
  result: 'Malicious',
  to: ['victim@company.com'],
};

const headerAnalysis = {
  spf_pass: false,
  dkim_pass: false,
  dmarc_pass: false,
  domain_similarity: 'keepnetlabss.com vs keepnetlabs.com',
  sender_ip_reputation: 'suspicious',
  geolocation_anomaly: 'sender_ip_country_mismatch',
  routing_anomaly: 'unexpected_relay',
  threat_intel_findings: 'malicious_url_detected',
  header_summary: 'Authentication failed and spoofing indicators are present.',
  security_awareness_detected: false,
  list_unsubscribe_present: false,
  original_email: baseEmail,
};

const behavioralAnalysis = {
  urgency_level: 'high' as const,
  emotional_pressure: 'fear' as const,
  social_engineering_pattern: 'pretexting' as const,
  verification_avoidance: true,
  verification_avoidance_tactics: 'Do not verify via official channel',
  urgency_indicators: 'act now, immediate action',
  emotional_pressure_indicators: 'account suspension threat',
  behavioral_summary: 'Strong urgency and fear framing are used to manipulate the recipient.',
  original_email: baseEmail,
};

const intentAnalysis = {
  intent: 'phishing' as const,
  financial_request: false,
  credential_request: true,
  authority_impersonation: true,
  financial_request_details: 'insufficient_data',
  credential_request_details: 'asks for portal credentials',
  authority_claimed: 'IT Security Team',
  intent_summary: 'Email attempts to harvest credentials via urgency framing.',
  original_email: baseEmail,
};

const triageResult = {
  category: 'Phishing' as const,
  reason: 'Credential harvest indicators with spoofing and urgency.',
  confidence: 0.93,
  original_email: baseEmail,
};

const featureResult = {
  intent: 'phishing' as const,
  urgency: 'high' as const,
  authority_impersonation: true,
  financial_request: false,
  credential_request: true,
  emotional_pressure: 'fear' as const,
  social_engineering_pattern: 'pretexting' as const,
  engine_indicators_present: true,
  analysis_summary: 'Combined technical, behavioral, and intent signals indicate phishing.',
  original_email: baseEmail,
  triage_result: {
    category: 'Phishing' as const,
    reason: 'Credential harvest indicators with spoofing and urgency.',
    confidence: 0.93,
  },
  header_analysis: {
    spf_pass: false,
    dkim_pass: false,
    dmarc_pass: false,
    domain_similarity: 'keepnetlabss.com vs keepnetlabs.com',
    sender_ip_reputation: 'suspicious',
    geolocation_anomaly: 'sender_ip_country_mismatch',
    routing_anomaly: 'unexpected_relay',
    threat_intel_findings: 'malicious_url_detected',
    header_summary: 'Authentication failed and spoofing indicators are present.',
    security_awareness_detected: false,
    list_unsubscribe_present: false,
  },
  behavioral_analysis: {
    urgency_level: 'high' as const,
    emotional_pressure: 'fear' as const,
    social_engineering_pattern: 'pretexting' as const,
    verification_avoidance: true,
    verification_avoidance_tactics: 'Do not verify via official channel',
    urgency_indicators: 'act now, immediate action',
    emotional_pressure_indicators: 'account suspension threat',
    behavioral_summary: 'Strong urgency and fear framing are used to manipulate the recipient.',
  },
  intent_analysis: {
    intent: 'phishing' as const,
    financial_request: false,
    credential_request: true,
    authority_impersonation: true,
    financial_request_details: 'insufficient_data',
    credential_request_details: 'asks for portal credentials',
    authority_claimed: 'IT Security Team',
    intent_summary: 'Email attempts to harvest credentials via urgency framing.',
  },
};

const riskResult = {
  risk_level: 'High' as const,
  confidence: 0.91,
  justification: 'Multiple converging phishing indicators with clear credential harvesting intent.',
  original_email: baseEmail,
  triage_result: {
    category: 'Phishing' as const,
    reason: 'Credential harvest indicators with spoofing and urgency.',
    confidence: 0.93,
  },
  feature_result: {
    intent: 'phishing' as const,
    urgency: 'high' as const,
    authority_impersonation: true,
    financial_request: false,
    credential_request: true,
    emotional_pressure: 'fear' as const,
    social_engineering_pattern: 'pretexting' as const,
    engine_indicators_present: true,
    analysis_summary: 'Combined technical, behavioral, and intent signals indicate phishing.',
    header_analysis: {
      spf_pass: false,
      dkim_pass: false,
      dmarc_pass: false,
      domain_similarity: 'keepnetlabss.com vs keepnetlabs.com',
      sender_ip_reputation: 'suspicious',
      geolocation_anomaly: 'sender_ip_country_mismatch',
      routing_anomaly: 'unexpected_relay',
      threat_intel_findings: 'malicious_url_detected',
      header_summary: 'Authentication failed and spoofing indicators are present.',
      security_awareness_detected: false,
      list_unsubscribe_present: false,
    },
    behavioral_analysis: {
      urgency_level: 'high' as const,
      emotional_pressure: 'fear' as const,
      social_engineering_pattern: 'pretexting' as const,
      verification_avoidance: true,
      verification_avoidance_tactics: 'Do not verify via official channel',
      urgency_indicators: 'act now, immediate action',
      emotional_pressure_indicators: 'account suspension threat',
      behavioral_summary: 'Strong urgency and fear framing are used to manipulate the recipient.',
    },
    intent_analysis: {
      intent: 'phishing' as const,
      financial_request: false,
      credential_request: true,
      authority_impersonation: true,
      financial_request_details: 'insufficient_data',
      credential_request_details: 'asks for portal credentials',
      authority_claimed: 'IT Security Team',
      intent_summary: 'Email attempts to harvest credentials via urgency framing.',
    },
  },
};

const reportResult = {
  executive_summary: {
    email_category: 'Phishing' as const,
    verdict: 'High-Risk Phishing - Immediate Action Required',
    risk_level: 'High' as const,
    confidence: 0.91,
    confidence_level: 'High' as const,
    confidence_basis: 'Based on behavioral and contextual indicators.',
    status: 'Analysis Complete',
    why_this_matters: 'Potential credential compromise and lateral movement risk.',
  },
  agent_determination: 'The email shows clear phishing indicators and social engineering behavior.',
  risk_indicators: {
    observed: ['Credential request present', 'SPF failure', 'Urgency framing'],
    not_observed: ['No confirmed malware attachment'],
  },
  evidence_flow: [
    { step: 1, title: 'Ingestion', description: 'Email fetched from incident source.' },
    { step: 2, title: 'Analysis', description: 'Header, behavioral, and intent signals evaluated.' },
    { step: 3, title: 'Verdict', description: 'Classified as phishing with high risk.' },
  ],
  actions_recommended: {
    p1_immediate: ['Remove from inbox', 'Block sender domain'],
    p2_follow_up: ['Notify affected user'],
    p3_hardening: ['Monitor for similar emails'],
  },
  confidence_limitations: 'High confidence in determination. Multiple independent signals converge on this verdict.',
};

describe('EmailIRWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.fetchExecute.mockResolvedValue(baseEmail);
    mocks.headerExecute.mockResolvedValue(headerAnalysis);
    mocks.behavioralExecute.mockResolvedValue(behavioralAnalysis);
    mocks.intentExecute.mockResolvedValue(intentAnalysis);
    mocks.triageExecute.mockResolvedValue(triageResult);
    mocks.featureExecute.mockResolvedValue(featureResult);
    mocks.riskExecute.mockResolvedValue(riskResult);
    mocks.reportExecute.mockResolvedValue(reportResult);
  });

  it('executes end-to-end and returns final report', async () => {
    const run = await emailIRWorkflow.createRunAsync();
    const result = await run.start({
      inputData: {
        id: 'incident-123',
        accessToken: 'token-xyz',
      },
    });

    expect(result.status).toBe('success');
    expect(mocks.fetchExecute).toHaveBeenCalledTimes(1);
    expect(mocks.headerExecute).toHaveBeenCalledTimes(1);
    expect(mocks.behavioralExecute).toHaveBeenCalledTimes(1);
    expect(mocks.intentExecute).toHaveBeenCalledTimes(1);
    expect(mocks.triageExecute).toHaveBeenCalledTimes(1);
    expect(mocks.featureExecute).toHaveBeenCalledTimes(1);
    expect(mocks.riskExecute).toHaveBeenCalledTimes(1);
    expect(mocks.reportExecute).toHaveBeenCalledTimes(1);
    expect((result as any).result.executive_summary.email_category).toBe('Phishing');
  });

  it('fetchStep forwards context and runtimeContext to fetch tool', async () => {
    const runtimeContext = { traceId: 'trace-1' } as any;
    await (fetchStep as any).execute({
      inputData: { id: 'e-1', accessToken: 'abc', apiBaseUrl: 'https://api.example.com' },
      runtimeContext,
    });

    expect(mocks.fetchExecute).toHaveBeenCalledWith({
      context: { id: 'e-1', accessToken: 'abc', apiBaseUrl: 'https://api.example.com' },
      runtimeContext,
    });
  });

  it('fetchStep continues workflow with synthetic email when fetch tool fails', async () => {
    mocks.fetchExecute.mockRejectedValueOnce(new Error('invalid-json-response'));
    const output = await (fetchStep as any).execute({
      inputData: { id: 'e-2', accessToken: 'abc', apiBaseUrl: 'https://api.example.com' },
      runtimeContext: { traceId: 'trace-fetch-fail' },
    });

    expect(output.from).toBe('unknown@unavailable.local');
    expect(output.subject).toContain('e-2');
    expect(output.htmlBody).toContain('invalid-json-response');
    expect(output.result).toBe('insufficient_data');
    expect(output.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'x-email-ir-fetch-status', value: 'failed' }),
      ])
    );
  });

  it('multiAnalysisStep maps tool outputs to combined schema shape', async () => {
    const runtimeContext = { traceId: 'trace-2' } as any;
    const output = await (multiAnalysisStep as any).execute({
      inputData: baseEmail,
      runtimeContext,
    });

    expect(mocks.headerExecute).toHaveBeenCalledWith({ context: baseEmail, runtimeContext });
    expect(mocks.behavioralExecute).toHaveBeenCalledWith({ context: baseEmail, runtimeContext });
    expect(mocks.intentExecute).toHaveBeenCalledWith({ context: baseEmail, runtimeContext });
    expect(output.original_email).toEqual(baseEmail);
    expect(output.header_analysis.spf_pass).toBe(false);
    expect(output.behavioral_analysis.urgency_level).toBe('high');
    expect(output.intent_analysis.intent).toBe('phishing');
    expect(output.header_analysis.original_email).toBeUndefined();
  });

  it('triageStep returns triage result while preserving previous analyses', async () => {
    const inputData = {
      original_email: baseEmail,
      header_analysis: featureResult.header_analysis,
      behavioral_analysis: featureResult.behavioral_analysis,
      intent_analysis: featureResult.intent_analysis,
    };

    const output = await (triageStep as any).execute({ inputData });
    expect(mocks.triageExecute).toHaveBeenCalledWith({ context: inputData, runtimeContext: undefined });
    expect(output.original_email).toEqual(baseEmail);
    expect(output.triage_result.category).toBe('Phishing');
  });

  it('featureExtractionStep builds expected input payload for extraction tool', async () => {
    const inputData = {
      original_email: baseEmail,
      header_analysis: featureResult.header_analysis,
      behavioral_analysis: featureResult.behavioral_analysis,
      intent_analysis: featureResult.intent_analysis,
      triage_result: triageResult,
    };

    await (featureExtractionStep as any).execute({ inputData, runtimeContext: { traceId: 'trace-3' } });
    expect(mocks.featureExecute).toHaveBeenCalledWith({
      context: inputData,
      runtimeContext: { traceId: 'trace-3' },
    });
  });

  it('riskAssessmentStep passes feature output directly to risk tool', async () => {
    await (riskAssessmentStep as any).execute({ inputData: featureResult, runtimeContext: { traceId: 'trace-4' } });
    expect(mocks.riskExecute).toHaveBeenCalledWith({
      context: featureResult,
      runtimeContext: { traceId: 'trace-4' },
    });
  });

  it('reportingStep passes risk output directly to reporting tool', async () => {
    await (reportingStep as any).execute({ inputData: riskResult, runtimeContext: { traceId: 'trace-5' } });
    expect(mocks.reportExecute).toHaveBeenCalledWith({
      context: riskResult,
      runtimeContext: { traceId: 'trace-5' },
    });
  });

  it('fails when one of multi-analysis tools rejects', async () => {
    mocks.intentExecute.mockRejectedValueOnce(new Error('intent crashed'));
    await expect((multiAnalysisStep as any).execute({ inputData: baseEmail }))
      .rejects.toThrow('intent crashed');
  });
});
