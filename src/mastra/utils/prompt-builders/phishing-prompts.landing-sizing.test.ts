import { describe, it, expect, vi, afterEach } from 'vitest';
import { LANDING_PAGE } from '../../constants';
import { buildLandingPagePrompts } from './phishing-prompts';

describe('phishing-prompts landing sizing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeBaseParams(): Parameters<typeof buildLandingPagePrompts>[0] {
    return {
      fromName: 'Acme',
      fromAddress: 'security@acme.test',
      scenario: 'Test scenario',
      language: 'en-gb',
      industryDesign: {
        industry: 'SaaS',
        colors: { primary: '#2563eb', secondary: '#0ea5e9', accent: '#f59e0b' },
        patterns: {
          cardStyle: 'max-width: 480px; margin: 0 auto; background: #fff; padding: 32px;',
          buttonStyle: 'width: 100%; padding: 12px; border-radius: 10px; background: #2563eb; color: #fff;',
          inputStyle: 'width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff;',
        },
      },
      requiredPages: ['login'] as const,
      subject: 'Test subject',
      template: '<html><body>Test</body></html>',
      additionalContext: '',
      isQuishing: false,
    };
  }

  it('MINIMAL layout prompt should include MINIMAL body + form max-width constants', () => {
    // LAYOUT_OPTIONS length is 4; index 2 is MINIMAL. STYLE_OPTIONS can be anything.
    vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.51) // layout -> floor(0.51*4)=2 (MINIMAL)
      .mockImplementationOnce(() => 0.0); // style -> floor(0*3)=0

    const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

    expect(systemPrompt).toContain(
      `body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`
    );
  });

  it('HERO layout prompt should include HERO main container max-width + margin constants', () => {
    // index 3 is HERO
    vi.spyOn(Math, 'random')
      .mockImplementationOnce(() => 0.99) // layout -> floor(0.99*4)=3 (HERO)
      .mockImplementationOnce(() => 0.0); // style

    const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

    expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    expect(systemPrompt).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
  });
});
