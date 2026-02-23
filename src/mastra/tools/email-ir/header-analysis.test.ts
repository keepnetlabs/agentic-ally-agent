import { describe, it, expect, vi, beforeEach } from 'vitest';
import { headerAnalysisTool } from './header-analysis';

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
  loggerHeader: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogContext: vi.fn(() => ({ email_id: 'test', step: 'header-analysis', timestamp: new Date().toISOString() })),
  logStepStart: vi.fn(),
  logStepComplete: vi.fn(),
  logStepError: vi.fn(),
  logSignalDetected: vi.fn(),
  logAuthResults: vi.fn(),
  logPerformance: vi.fn(),
  TimingTracker: class {
    mark() {}
    getTotal() {
      return 0;
    }
  },
}));

describe('headerAnalysisTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should surface security awareness header even if model says false', async () => {
    generateMock.mockResolvedValue({
      object: {
        spf_pass: false,
        dkim_pass: false,
        dmarc_pass: false,
        domain_similarity: 'insufficient_data',
        sender_ip_reputation: 'insufficient_data',
        geolocation_anomaly: 'insufficient_data',
        routing_anomaly: 'insufficient_data',
        threat_intel_findings: 'insufficient_data',
        header_summary: 'summary',
        security_awareness_detected: false,
      },
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        headers: [{ key: 'X-Phish-Test', value: 'true' }],
      },
    });

    expect(result.security_awareness_detected).toBe(true);
  });

  it('should include insufficient_data standard in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
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
      });
    });

    await (headerAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        headers: [{ key: 'Authentication-Results', value: 'spf=pass dkim=pass dmarc=pass' }],
      },
    });

    expect(capturedPrompt).toContain('insufficient_data');
  });

  it('should override list_unsubscribe_present when header exists', async () => {
    generateMock.mockResolvedValue({
      object: {
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
        original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      },
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: 'newsletter@example.com',
        subject: 'Newsletter',
        headers: [{ key: 'List-Unsubscribe', value: '<mailto:unsubscribe@example.com>' }],
      },
    });

    expect(result.list_unsubscribe_present).toBe(true);
  });

  it('should override security_awareness_detected when result is Simulation', async () => {
    generateMock.mockResolvedValue({
      object: {
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
        original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      },
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        result: 'Simulation',
      },
    });

    expect(result.security_awareness_detected).toBe(true);
  });

  it('should throw when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM error'));

    await expect(
      (headerAnalysisTool as any).execute({
        context: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      })
    ).rejects.toThrow('LLM error');
  });

  it('should call logSignalDetected when SPF/DKIM/DMARC fail', async () => {
    const { logSignalDetected } = await import('./logger-setup');
    generateMock.mockResolvedValue({
      object: {
        spf_pass: false,
        dkim_pass: false,
        dmarc_pass: false,
        domain_similarity: 'typosquatting detected',
        geolocation_anomaly: 'IP from Nigeria',
        sender_ip_reputation: 'insufficient_data',
        routing_anomaly: 'insufficient_data',
        threat_intel_findings: 'insufficient_data',
        header_summary: 'summary',
        security_awareness_detected: false,
        list_unsubscribe_present: false,
        original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      },
    });

    await (headerAnalysisTool as any).execute({
      context: { from: 'a@b.com', subject: 'Test', headers: [] },
    });

    expect(logSignalDetected).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'authentication',
      'SPF_FAILED',
      'high'
    );
    expect(logSignalDetected).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'authentication',
      'DKIM_FAILED',
      'high'
    );
    expect(logSignalDetected).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'domain',
      'TYPOSQUATTING_DETECTED',
      'high'
    );
    expect(logSignalDetected).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      'geolocation',
      'IP from Nigeria',
      'medium'
    );
  });

  it('should include threat intel from urls/ips/attachments in prompt', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
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
          original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
        },
      });
    });

    await (headerAnalysisTool as any).execute({
      context: {
        from: 'a@b.com',
        subject: 'Test',
        headers: [],
        urls: [
          {
            url: 'https://evil.com',
            analysisList: [
              { result: 'Malicious', analysisEngineType: 'VirusTotal' },
              { result: 'Phishing', analysisEngineType: 'Google' },
            ],
          },
          {
            url: 'https://safe.com',
            analysisList: [{ result: 'Clean', analysisEngineType: 'VirusTotal' }],
          },
        ],
        ips: [
          {
            ip: '1.2.3.4',
            analysisList: [{ result: 'Clean', analysisEngineType: 'AbuseIPDB' }],
          },
        ],
      },
    });

    expect(capturedPrompt).toContain('MALICIOUS');
    expect(capturedPrompt).toContain('CLEAN');
    expect(capturedPrompt).toContain('evil.com');
    expect(capturedPrompt).toContain('1.2.3.4');
  });

  it('should skip items with only Error results in analysisList', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
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
          original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
        },
      });
    });

    await (headerAnalysisTool as any).execute({
      context: {
        from: 'a@b.com',
        subject: 'Test',
        headers: [],
        urls: [
          {
            url: 'https://unknown.com',
            analysisList: [{ result: 'Error', analysisEngineType: 'VT' }],
          },
        ],
      },
    });

    expect(capturedPrompt).toContain('[]');
  });

  it('should detect List-Unsubscribe-Post header', async () => {
    generateMock.mockResolvedValue({
      object: {
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
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: 'marketing@example.com',
        subject: 'Newsletter',
        headers: [{ key: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' }],
      },
    });

    expect(result.list_unsubscribe_present).toBe(true);
  });

  it('should detect security awareness via header value containing phishing-test', async () => {
    generateMock.mockResolvedValue({
      object: {
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
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: 'alert@example.com',
        subject: 'Test',
        headers: [{ key: 'X-Custom-Header', value: 'phishing-test-simulation' }],
      },
    });

    expect(result.security_awareness_detected).toBe(true);
  });

  it('should handle empty from with unknown-sender', async () => {
    generateMock.mockResolvedValue({
      object: {
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
    });

    const result = await (headerAnalysisTool as any).execute({
      context: {
        from: '',
        subject: 'Test',
        headers: [],
      },
    });

    expect(result).toBeDefined();
    expect(result.header_summary).toBe('summary');
  });

  it('should set error code on thrown error when LLM fails', async () => {
    generateMock.mockRejectedValue(new Error('LLM timeout'));

    try {
      await (headerAnalysisTool as any).execute({
        context: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
      });
    } catch (e: any) {
      expect(e.message).toBe('LLM timeout');
      expect(e.code).toBeDefined();
    }
  });

  it('should include attachments with analysisList in prompt when provided', async () => {
    let capturedPrompt = '';
    generateMock.mockImplementation((prompt: string) => {
      capturedPrompt = prompt;
      return Promise.resolve({
        object: {
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
          original_email: { from: 'a@b.com', subject: 'Test', htmlBody: '' },
        },
      });
    });

    await (headerAnalysisTool as any).execute({
      context: {
        from: 'a@b.com',
        subject: 'Test',
        headers: [],
        attachments: [
          {
            name: 'invoice.pdf',
            contentType: 'application/pdf',
            analysisList: [{ result: 'Clean', analysisEngineType: 'VT' }],
          },
        ],
      },
    });

    expect(capturedPrompt).toContain('invoice.pdf');
  });
});
