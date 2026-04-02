import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildLandingContinuityGuidance, inferLandingScenarioBucket, selectLandingDesign } from './phishing-landing-design';

describe('phishing-landing-design', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies quishing as login-portal', () => {
    const bucket = inferLandingScenarioBucket({
      scenario: 'QR verification',
      subject: 'Scan to continue',
      fromName: 'Security Team',
      requiredPages: ['login'],
      isQuishing: true,
    });

    expect(bucket).toBe('login-portal');
  });

  it('classifies policy scenarios as policy-ack', () => {
    const bucket = inferLandingScenarioBucket({
      scenario: 'Remote work policy acknowledgement',
      subject: 'Please review the updated handbook',
      fromName: 'HR Team',
      requiredPages: ['info'],
      isQuishing: false,
    });

    expect(bucket).toBe('policy-ack');
  });

  it('classifies delivery scenarios as consumer-notice', () => {
    const bucket = inferLandingScenarioBucket({
      scenario: 'Package delivery update',
      subject: 'Track your shipment',
      fromName: 'Delivery Desk',
      requiredPages: ['info'],
      isQuishing: false,
    });

    expect(bucket).toBe('consumer-notice');
  });

  it('selects only allowed layouts and styles for login-portal bucket', () => {
    vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.99)
      .mockImplementationOnce(() => 0.99);

    const result = selectLandingDesign({
      scenario: 'SSO login verification',
      subject: 'Sign in to continue',
      fromName: 'Microsoft',
      requiredPages: ['login'],
      isQuishing: false,
    });

    expect(result.bucket).toBe('login-portal');
    expect(['CENTERED', 'SPLIT']).toContain(result.layout.id);
    expect(['SHARP', 'FLAT']).toContain(result.style.id);
  });

  it('returns focused continuity guidance by bucket', () => {
    expect(buildLandingContinuityGuidance('consumer-notice')).toContain('customer-facing brand workflow');
    expect(buildLandingContinuityGuidance('policy-ack')).toContain('internal employee workflow');
  });
});
