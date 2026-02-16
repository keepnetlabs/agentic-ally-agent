import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { LANDING_PAGE } from '../../constants';
import { buildLandingPagePrompts } from './phishing-prompts';

describe('phishing-prompts landing sizing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('MINIMAL Layout (index 2)', () => {
    it('should include MINIMAL body + form max-width constants', () => {
      // LAYOUT_OPTIONS length is 4; index 2 is MINIMAL. STYLE_OPTIONS can be anything.
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.51) // layout -> floor(0.51*4)=2 (MINIMAL)
        .mockImplementationOnce(() => 0.0); // style -> floor(0*3)=0

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(
        `body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`
      );
    });

    it('should work with minimum random value for MINIMAL (0.50)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // layout -> floor(0.50*4)=2 (MINIMAL)
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(
        `body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`
      );
    });

    it('should work with maximum random value for MINIMAL (0.749...)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.749) // layout -> floor(0.749*4)=2 (MINIMAL)
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(
        `body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`
      );
    });

    it('should work with different style options', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.99); // style -> floor(0.99*3)=2

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(
        `body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px, form max-width: ${LANDING_PAGE.FORM_MAX_WIDTH_PX}px`
      );
    });
  });

  describe('HERO Layout (index 3)', () => {
    it('should include HERO main container max-width + margin constants', () => {
      // index 3 is HERO
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.99) // layout -> floor(0.99*4)=3 (HERO)
        .mockImplementationOnce(() => 0.0); // style

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
      expect(systemPrompt).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
    });

    it('should work with minimum random value for HERO (0.75)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // layout -> floor(0.75*4)=3 (HERO)
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
      expect(systemPrompt).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
    });

    it('should work with mid-range random value for HERO (0.87)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.87) // layout -> floor(0.87*4)=3 (HERO)
        .mockImplementationOnce(() => 0.5);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
      expect(systemPrompt).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
    });

    it('should work with different style options', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.66); // style -> floor(0.66*3)=1

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
      expect(systemPrompt).toContain(`margin: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px auto 0;`);
    });
  });

  describe('Layout Index 0', () => {
    it('should work with zero random value (index 0)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.0) // layout -> floor(0.0*4)=0
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      // Should not include MINIMAL or HERO constants
      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with mid-range value for index 0 (0.12)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.12) // layout -> floor(0.12*4)=0
        .mockImplementationOnce(() => 0.5);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with maximum value for index 0 (0.249)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.249) // layout -> floor(0.249*4)=0
        .mockImplementationOnce(() => 0.99);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });
  });

  describe('Layout Index 1', () => {
    it('should work with minimum value for index 1 (0.25)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.25) // layout -> floor(0.25*4)=1
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with mid-range value for index 1 (0.37)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.37) // layout -> floor(0.37*4)=1
        .mockImplementationOnce(() => 0.33);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with maximum value for index 1 (0.499)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.499) // layout -> floor(0.499*4)=1
        .mockImplementationOnce(() => 0.66);

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
      expect(systemPrompt).not.toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });
  });

  describe('Style Options (index 0, 1, 2)', () => {
    it('should work with style index 0 (random: 0.0)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.0); // style -> floor(0*3)=0

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      // Should still include MINIMAL constants regardless of style
      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with style index 0 (random: 0.33)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.33); // style -> floor(0.33*3)=0

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with style index 1 (random: 0.334)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.334); // style -> floor(0.334*3)=1

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with style index 1 (random: 0.5)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.5); // style -> floor(0.5*3)=1

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with style index 2 (random: 0.667)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.667); // style -> floor(0.667*3)=2

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with style index 2 (random: 0.99)', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.99); // style -> floor(0.99*3)=2

      const { systemPrompt } = buildLandingPagePrompts(makeBaseParams());

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });
  });

  describe('Parameter Variations', () => {
    it('should work with different fromName', () => {
      const params = makeBaseParams();
      params.fromName = 'Different Company';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with different language', () => {
      const params = makeBaseParams();
      params.language = 'fr-fr';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with different industry', () => {
      const params = makeBaseParams();
      params.industryDesign.industry = 'Finance';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with different colors', () => {
      const params = makeBaseParams();
      params.industryDesign.colors = { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff' };

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should work with isQuishing true', () => {
      const params = makeBaseParams();
      params.isQuishing = true;

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should work with additionalContext', () => {
      const params = makeBaseParams();
      params.additionalContext = 'Some additional context for testing';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.0);

      const { systemPrompt } = buildLandingPagePrompts(params);

      expect(systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with systemPrompt property', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result = buildLandingPagePrompts(makeBaseParams());

      expect(result).toHaveProperty('systemPrompt');
      expect(typeof result.systemPrompt).toBe('string');
    });

    it('should return non-empty systemPrompt', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75)
        .mockImplementationOnce(() => 0.0);

      const result = buildLandingPagePrompts(makeBaseParams());

      expect(result.systemPrompt).toBeTruthy();
      expect(result.systemPrompt.length).toBeGreaterThan(0);
    });

    it('should include fromName in systemPrompt', () => {
      const params = makeBaseParams();
      params.fromName = 'TestCompany';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result = buildLandingPagePrompts(params);

      expect(result.systemPrompt).toContain('TestCompany');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary between index 2 and 3 correctly (0.749 vs 0.75)', () => {
      // 0.749 -> MINIMAL (index 2)
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.749)
        .mockImplementationOnce(() => 0.0);

      const result1 = buildLandingPagePrompts(makeBaseParams());
      expect(result1.systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);

      vi.clearAllMocks();

      // 0.75 -> HERO (index 3)
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75)
        .mockImplementationOnce(() => 0.0);

      const result2 = buildLandingPagePrompts(makeBaseParams());
      expect(result2.systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });

    it('should handle boundary between index 1 and 2 correctly (0.499 vs 0.50)', () => {
      // 0.499 -> index 1
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.499)
        .mockImplementationOnce(() => 0.0);

      const result1 = buildLandingPagePrompts(makeBaseParams());
      expect(result1.systemPrompt).not.toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);

      vi.clearAllMocks();

      // 0.50 -> MINIMAL (index 2)
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result2 = buildLandingPagePrompts(makeBaseParams());
      expect(result2.systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should handle empty fromName', () => {
      const params = makeBaseParams();
      params.fromName = '';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result = buildLandingPagePrompts(params);

      expect(result.systemPrompt).toContain(`body max-width: ${LANDING_PAGE.MINIMAL_BODY_MAX_WIDTH_PX}px`);
    });

    it('should handle empty template', () => {
      const params = makeBaseParams();
      params.template = '';

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75)
        .mockImplementationOnce(() => 0.0);

      const result = buildLandingPagePrompts(params);

      expect(result.systemPrompt).toContain(`max-width: ${LANDING_PAGE.HERO_MAIN_CONTAINER_MAX_WIDTH_PX}px;`);
    });
  });

  describe('Consistency', () => {
    it('should produce consistent results with same random values', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result1 = buildLandingPagePrompts(makeBaseParams());

      vi.clearAllMocks();

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5)
        .mockImplementationOnce(() => 0.0);

      const result2 = buildLandingPagePrompts(makeBaseParams());

      expect(result1.systemPrompt).toBe(result2.systemPrompt);
    });

    it('should produce different layouts with different random values', () => {
      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.5) // MINIMAL
        .mockImplementationOnce(() => 0.0);

      const result1 = buildLandingPagePrompts(makeBaseParams());

      vi.clearAllMocks();

      vi.spyOn(Math, 'random')
        .mockImplementationOnce(() => 0.75) // HERO
        .mockImplementationOnce(() => 0.0);

      const result2 = buildLandingPagePrompts(makeBaseParams());

      expect(result1.systemPrompt).not.toBe(result2.systemPrompt);
    });
  });
});
