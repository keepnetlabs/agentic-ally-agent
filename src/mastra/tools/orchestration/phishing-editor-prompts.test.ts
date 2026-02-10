import { describe, expect, it } from 'vitest';
import {
  getIntentClassificationPrompt,
  getPhishingEditorSystemPrompt,
  getPhishingEmailUserPrompt,
  getLandingPageSystemPrompt,
  getLandingPageUserPrompt,
} from './phishing-editor-prompts';

describe('phishing-editor-prompts', () => {
  it('builds intent classification prompt with instruction', () => {
    const prompt = getIntentClassificationPrompt('Use our company logo');
    expect(prompt).toContain('Use our company logo');
    expect(prompt).toContain('"isInternalBrandRequest"');
  });

  it('includes core safety rules in phishing editor system prompt', () => {
    const prompt = getPhishingEditorSystemPrompt();
    expect(prompt).toContain('{FIRSTNAME}');
    expect(prompt).toContain('{PHISHINGURL}');
    expect(prompt).toContain('Return ONLY a valid JSON object');
  });

  it('adds brand context in phishing email user prompt when provided', () => {
    const prompt = getPhishingEmailUserPrompt(
      {
        subject: 'Original Subject',
        sender: 'Security Team',
        template: '<html><body>hello</body></html>',
      } as any,
      'Make it more urgent',
      'Use ACME logo only'
    );

    expect(prompt).toContain('Original Subject');
    expect(prompt).toContain('Use ACME logo only');
  });

  it('omits brand context section when it is empty', () => {
    const prompt = getPhishingEmailUserPrompt(
      {
        subject: 'Original Subject',
        sender: 'Security Team',
        template: '<html><body>hello</body></html>',
      } as any,
      'Make it concise',
      ''
    );

    expect(prompt).not.toContain('IMPORTANT: You MUST use the logo URL provided above.');
  });

  it('uses fallback sender label when sender is missing', () => {
    const prompt = getPhishingEmailUserPrompt(
      {
        subject: 'Original Subject',
        template: '<html><body>hello</body></html>',
      } as any,
      'Keep format',
      ''
    );

    expect(prompt).toContain('From: Unknown Sender');
  });

  it('returns translate-mode specific instruction for landing page prompt', () => {
    const prompt = getLandingPageSystemPrompt('translate');
    expect(prompt).toContain('TRANSLATE MODE');
  });

  it('returns edit-mode instruction for landing page prompt', () => {
    const prompt = getLandingPageSystemPrompt('edit');
    expect(prompt).toContain('If instruction is translation/localization');
  });

  it('includes brand context constraint in landing page user prompt', () => {
    const prompt = getLandingPageUserPrompt(
      { type: 'login', template: '<html><body>login</body></html>' },
      'Change logo',
      'Use only https://assets.example/logo.png'
    );

    expect(prompt).toContain('Use only https://assets.example/logo.png');
    expect(prompt).toContain('IMPORTANT: You MUST use the logo URL provided above.');
  });

  it('omits brand context constraint in landing page prompt when not provided', () => {
    const prompt = getLandingPageUserPrompt(
      { type: 'info', template: '<html><body>info</body></html>' },
      'Edit text',
      ''
    );

    expect(prompt).not.toContain('IMPORTANT: You MUST use the logo URL provided above.');
  });

  it('uses fallback type/template when landing page fields are missing', () => {
    const prompt = getLandingPageUserPrompt({}, 'Edit copy', '');
    expect(prompt).toContain('Type: unknown');
    expect(prompt).toContain('TEMPLATE:');
  });
});
