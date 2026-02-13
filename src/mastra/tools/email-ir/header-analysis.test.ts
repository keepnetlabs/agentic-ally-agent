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
});
