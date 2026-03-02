import { describe, it, expect } from 'vitest';
import { featureExtractionTool } from './feature-extraction';

const baseInput = {
  original_email: {
    from: 'sender@example.com',
    subject: 'Action required',
    urls: [{ url: 'https://example.com/login', result: 'clean' }],
    attachments: [{ name: 'invoice.pdf', result: 'clean' }],
  },
  triage_result: {
    category: 'Phishing' as const,
    reason: 'Credential request with urgency signals',
    confidence: 0.91,
  },
  header_analysis: {
    spf_pass: false,
    dkim_pass: false,
    dmarc_pass: false,
    domain_similarity: 'example.co vs example.com',
    sender_ip_reputation: 'suspicious',
    geolocation_anomaly: 'insufficient_data',
    routing_anomaly: 'insufficient_data',
    threat_intel_findings: 'malicious_url_detected',
    header_summary: 'Authentication checks failed.',
    security_awareness_detected: false,
    list_unsubscribe_present: false,
  },
  behavioral_analysis: {
    urgency_level: 'high' as const,
    emotional_pressure: 'fear' as const,
    social_engineering_pattern: 'pretexting' as const,
    verification_avoidance: true,
    verification_avoidance_tactics: 'Do not contact IT directly',
    urgency_indicators: 'immediately, urgent',
    emotional_pressure_indicators: 'account suspension',
    behavioral_summary: 'Sender uses urgency and fear-based pressure.',
  },
  intent_analysis: {
    intent: 'phishing' as const,
    financial_request: false,
    credential_request: true,
    authority_impersonation: true,
    financial_request_details: 'insufficient_data',
    credential_request_details: 'asks for credentials',
    authority_claimed: 'IT Security Team',
    intent_summary: 'Email asks recipient to verify credentials.',
  },
};

describe('featureExtractionTool', () => {
  it('sets engine_indicators_present=true when any URL result is not clean', async () => {
    const input = {
      ...baseInput,
      original_email: {
        ...baseInput.original_email,
        urls: [{ url: 'https://evil.test', result: 'Malicious' }],
      },
    };

    const result = await (featureExtractionTool as any).execute({ context: input });
    expect(result.engine_indicators_present).toBe(true);
  });

  it('sets engine_indicators_present=true from attachment when urls are clean', async () => {
    const input = {
      ...baseInput,
      original_email: {
        ...baseInput.original_email,
        urls: [{ url: 'https://example.com', result: 'clean' }],
        attachments: [{ name: 'payload.exe', result: 'Phishing' }],
      },
    };

    const result = await (featureExtractionTool as any).execute({ context: input });
    expect(result.engine_indicators_present).toBe(true);
  });

  it('sets engine_indicators_present=false when URL and attachment results are clean', async () => {
    const result = await (featureExtractionTool as any).execute({ context: baseInput });
    expect(result.engine_indicators_present).toBe(false);
  });

  it('sets engine_indicators_present=true from attachment when urls is empty array', async () => {
    const input = {
      ...baseInput,
      original_email: {
        ...baseInput.original_email,
        urls: [],
        attachments: [{ name: 'malware.exe', result: 'Malicious' }],
      },
    };

    const result = await (featureExtractionTool as any).execute({ context: input });
    expect(result.engine_indicators_present).toBe(true);
  });

  it('sets engine_indicators_present=true from attachment when urls are absent', async () => {
    const input = {
      ...baseInput,
      original_email: {
        ...baseInput.original_email,
        urls: undefined,
        attachments: [{ name: 'malware.exe', result: 'Malicious' }],
      },
    };

    const result = await (featureExtractionTool as any).execute({ context: input });
    expect(result.engine_indicators_present).toBe(true);
  });

  it('returns composed summary and preserves pass-through objects', async () => {
    const result = await (featureExtractionTool as any).execute({ context: baseInput });

    expect(result.analysis_summary).toContain('Header authentication: Authentication checks failed.');
    expect(result.analysis_summary).toContain('Body behavioral signals: Sender uses urgency and fear-based pressure.');
    expect(result.analysis_summary).toContain('Intent analysis: Email asks recipient to verify credentials.');
    expect(result.triage_result).toEqual(baseInput.triage_result);
    expect(result.header_analysis).toEqual(baseInput.header_analysis);
    expect(result.behavioral_analysis).toEqual(baseInput.behavioral_analysis);
    expect(result.intent_analysis).toEqual(baseInput.intent_analysis);
  });
});
