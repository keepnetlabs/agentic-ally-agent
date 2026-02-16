import { describe, expect, it } from 'vitest';
import { phishingEditorSchema, emailResponseSchema, landingPageResponseSchema } from './phishing-editor-schemas';

describe('phishing-editor-schemas', () => {
  it('applies defaults for optional fields', () => {
    const parsed = phishingEditorSchema.parse({
      phishingId: 'phish-1',
      editInstruction: 'Increase urgency',
    });

    expect(parsed.mode).toBe('edit');
    expect(parsed.hasBrandUpdate).toBe(false);
    expect(parsed.language).toBe('en-gb');
  });

  it('keeps provided optional values', () => {
    const parsed = phishingEditorSchema.parse({
      phishingId: 'phish-2',
      editInstruction: 'Translate to German',
      mode: 'translate',
      hasBrandUpdate: true,
      language: 'de-de',
      modelProvider: 'openai',
      model: 'gpt-4o-mini',
    });

    expect(parsed.mode).toBe('translate');
    expect(parsed.hasBrandUpdate).toBe(true);
    expect(parsed.language).toBe('de-de');
    expect(parsed.modelProvider).toBe('openai');
    expect(parsed.model).toBe('gpt-4o-mini');
  });

  it('validates email response schema', () => {
    const parsed = emailResponseSchema.parse({
      subject: 'Payment update required',
      template: '<html><body><p>This is a complete phishing template body.</p></body></html>',
      summary: 'Updated urgency and CTA copy.',
    });

    expect(parsed.subject).toContain('Payment');
    expect(parsed.template).toContain('<html>');
  });

  it('rejects invalid landing page response values', () => {
    expect(() =>
      landingPageResponseSchema.parse({
        type: 'invalid',
        template: '<html><body></body></html>',
        edited: true,
        summary: 'ok',
      })
    ).toThrow();
  });
});
