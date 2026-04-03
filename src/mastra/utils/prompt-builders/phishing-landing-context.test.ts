import { describe, expect, it } from 'vitest';
import { buildLandingEmailSummary } from './phishing-landing-context';

describe('phishing-landing-context', () => {
  it('summarizes sign-in flows with the correct promised action', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Security Alert - Reset your password',
      fromName: 'IT Support',
      fromAddress: 'it@example.com',
      template:
        "<html><body><a href='{PHISHINGURL}'>Reset Password</a><p>Please sign in to continue securely.</p></body></html>",
      isQuishing: false,
      emailUsesLogoTag: true,
    });

    expect(summary).toContain('Promised next step: sign-in or credential entry');
    expect(summary).toContain('CTA wording: Reset Password');
    expect(summary).toContain('Visual cue: email uses shared logo tag');
  });

  it('ignores footer links when inferring CTA wording', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Document available',
      fromName: 'HR Team',
      fromAddress: 'hr@example.com',
      template:
        "<html><body><p>Please review the document.</p><a href='{PHISHINGURL}'>Privacy</a><a href='{PHISHINGURL}'>Terms</a></body></html>",
      isQuishing: false,
      emailUsesLogoTag: false,
    });

    expect(summary).not.toContain('CTA wording: Privacy');
    expect(summary).not.toContain('CTA wording: Terms');
  });

  it('prefers the primary PHISHINGURL CTA over weaker links', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Review document access',
      fromName: 'Security Team',
      fromAddress: 'security@example.com',
      template: `<html><body>
        <a href='https://example.com/help'>Help Center</a>
        <a href='{PHISHINGURL}'>Review Secure Document</a>
        <a href='{PHISHINGURL}'>Privacy</a>
      </body></html>`,
      isQuishing: false,
      emailUsesLogoTag: false,
    });

    expect(summary).toContain('CTA wording: Review Secure Document');
    expect(summary).not.toContain('CTA wording: Help Center');
  });

  it('uses quishing-specific summary language', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Scan the code to continue',
      fromName: 'Security Team',
      fromAddress: 'security@example.com',
      template: '<html><body><p>Scan the QR code from your email.</p></body></html>',
      isQuishing: true,
      emailUsesLogoTag: false,
    });

    expect(summary).toContain('Promised next step: standard sign-in after QR-triggered email');
  });

  it('infers promised action from Turkish billing language', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Fatura odemenizi guncelleyin',
      fromName: 'Finans Ekibi',
      fromAddress: 'finans@example.com',
      template:
        "<html><body><a href='{PHISHINGURL}'>Odemeyi Goruntule</a><p>Fatura detaylarinizi inceleyin.</p></body></html>",
      isQuishing: false,
      emailUsesLogoTag: false,
    });

    expect(summary).toContain('Promised next step: billing or payment review');
  });

  it('prefers the PHISHINGURL CTA even when a non-primary button looks stronger visually', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Cuenta protegida',
      fromName: 'Soporte de Seguridad',
      fromAddress: 'seguridad@example.com',
      template: `<html><body>
        <button class='btn btn-secondary'>Help Center</button>
        <a href='{PHISHINGURL}' role='button' class='cta-primary'><span>Verificar Cuenta</span></a>
      </body></html>`,
      isQuishing: false,
      emailUsesLogoTag: false,
    });

    expect(summary).toContain('CTA wording: Verificar Cuenta');
    expect(summary).toContain('Promised next step: sign-in or credential entry');
  });

  it('infers promised action from French document review language', () => {
    const summary = buildLandingEmailSummary({
      subject: 'Document a revoir',
      fromName: 'Equipe RH',
      fromAddress: 'rh@example.com',
      template:
        "<html><body><a href='{PHISHINGURL}'>Reviser le document</a><p>Veuillez consulter le document joint.</p></body></html>",
      isQuishing: false,
      emailUsesLogoTag: false,
    });

    expect(summary).toContain('Promised next step: document review');
    expect(summary).toContain('CTA wording: Reviser le document');
  });
});
