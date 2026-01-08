import { describe, it, expect } from 'vitest';
import { EmailVariant, variantDeltaBuilder, diversityPlan, DiversityHints } from './inbox-email-variants';

/**
 * Test suite for Inbox Email Variants
 * Tests email variant types and diversity planning for phishing simulations
 */
describe('Inbox Email Variants', () => {
  describe('EmailVariant Enum', () => {
    it('should define ObviousPhishing variant', () => {
      expect(EmailVariant.ObviousPhishing).toBe('ObviousPhishing');
    });

    it('should define SophisticatedPhishing variant', () => {
      expect(EmailVariant.SophisticatedPhishing).toBe('SophisticatedPhishing');
    });

    it('should define CasualLegit variant', () => {
      expect(EmailVariant.CasualLegit).toBe('CasualLegit');
    });

    it('should define FormalLegit variant', () => {
      expect(EmailVariant.FormalLegit).toBe('FormalLegit');
    });

    it('should have 4 variants total', () => {
      const variants = Object.keys(EmailVariant);
      expect(variants.length).toBe(4);
    });
  });

  describe('variantDeltaBuilder', () => {
    const baseHints: DiversityHints = {
      domainHint: 'example.com, fake.com',
      attachmentHint: 'PDF',
      greetingHint: 'Dear Sir/Madam',
      headerHint: 'authentic headers',
      topicHint: 'phishing prevention',
    };

    describe('ObviousPhishing', () => {
      it('should build obvious phishing variant', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        expect(builder).toBeDefined();
      });

      it('should include obvious phishing label', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(baseHints);
        expect(result).toContain('OBVIOUS PHISHING');
      });

      it('should include domain hints', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(baseHints);
        expect(result).toContain('SENDER DOMAIN');
        expect(result).toContain('example.com');
      });

      it('should include red flags for obvious phishing', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(baseHints);
        expect(result).toContain('red flags');
        expect(result).toContain('EXTERNAL');
      });

      it('should include greeting hint', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(baseHints);
        expect(result).toContain('Dear Sir/Madam');
      });

      it('should include attachment hint', () => {
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(baseHints);
        expect(result).toContain('PDF');
      });

      it('should handle missing topicHint', () => {
        const hints = { ...baseHints, topicHint: undefined };
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(hints);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should include impersonation hint for executive topics', () => {
        const hints = { ...baseHints, topicHint: 'CEO impersonation' };
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(hints);
        expect(result).toContain('impersonation');
      });

      it('should handle department hints', () => {
        const hints = { ...baseHints, departmentHint: 'Finance' };
        const builder = variantDeltaBuilder[EmailVariant.ObviousPhishing];
        const result = builder(hints);
        expect(result).toContain('Finance');
      });
    });

    describe('SophisticatedPhishing', () => {
      it('should build sophisticated phishing variant', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        expect(builder).toBeDefined();
      });

      it('should include sophisticated phishing label', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(baseHints);
        expect(result).toContain('SOPHISTICATED PHISHING');
      });

      it('should require realistic-looking fake domains', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(baseHints);
        expect(result).toContain('REALISTIC-LOOKING');
        expect(result).toContain('legitimate and corporate');
      });

      it('should include domain matching threat type', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(baseHints);
        expect(result).toContain('Department matches threat type');
      });

      it('should emphasize Return-Path matching', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(baseHints);
        expect(result).toContain('Return-Path MUST match sender domain');
      });

      it('should describe as harder to detect', () => {
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(baseHints);
        expect(result).toContain('harder to detect');
      });

      it('should include colleague impersonation for executive topics', () => {
        const hints = { ...baseHints, topicHint: 'colleague request' };
        const builder = variantDeltaBuilder[EmailVariant.SophisticatedPhishing];
        const result = builder(hints);
        expect(result).toContain('colleague');
      });
    });

    describe('CasualLegit', () => {
      it('should build casual legitimate variant', () => {
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        expect(builder).toBeDefined();
      });

      it('should include casual legit label', () => {
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(baseHints);
        expect(result).toContain('CASUAL LEGIT');
      });

      it('should use internal company domain', () => {
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(baseHints);
        expect(result).toContain('@company.com');
      });

      it('should include friendly tone', () => {
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(baseHints);
        expect(result).toContain('Friendly');
        expect(result).toContain('informal');
      });

      it('should direct to portal for security alerts', () => {
        const hints = { ...baseHints, topicHint: 'account verification' };
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(hints);
        expect(result).toContain('PORTAL');
        expect(result).toContain('NOT asking for sensitive data');
      });

      it('should not request passwords via email', () => {
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(baseHints);
        expect(result).toContain('Never ask for passwords');
      });

      it('should use legitimate IT support for IT topics', () => {
        const hints = { ...baseHints, topicHint: 'IT support' };
        const builder = variantDeltaBuilder[EmailVariant.CasualLegit];
        const result = builder(hints);
        expect(result).toContain('IT support');
        expect(result).toContain('ticket');
      });
    });

    describe('FormalLegit', () => {
      it('should build formal legitimate variant', () => {
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        expect(builder).toBeDefined();
      });

      it('should include formal legit label', () => {
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        const result = builder(baseHints);
        expect(result).toContain('FORMAL LEGIT');
      });

      it('should use official internal domain', () => {
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        const result = builder(baseHints);
        expect(result).toContain('@company.com');
      });

      it('should use corporate communication style', () => {
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        const result = builder(baseHints);
        expect(result).toContain('Corporate communication');
        expect(result).toContain('formal, professional');
      });

      it('should include executive announcement context', () => {
        const hints = { ...baseHints, topicHint: 'CEO announcement' };
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        const result = builder(hints);
        expect(result).toContain('executive');
      });

      it('should match department to topic', () => {
        const builder = variantDeltaBuilder[EmailVariant.FormalLegit];
        const result = builder(baseHints);
        expect(result).toContain('department automatically matches topic');
      });
    });
  });

  describe('diversityPlan', () => {
    it('should generate diversity hints for index 0', () => {
      const hints = diversityPlan(0);
      expect(hints).toBeDefined();
      expect(typeof hints).toBe('object');
    });

    it('should have domainHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('domainHint');
      expect(typeof hints.domainHint).toBe('string');
    });

    it('should have attachmentHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('attachmentHint');
      expect(typeof hints.attachmentHint).toBe('string');
    });

    it('should have greetingHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('greetingHint');
      expect(typeof hints.greetingHint).toBe('string');
    });

    it('should have headerHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('headerHint');
      expect(typeof hints.headerHint).toBe('string');
    });

    it('should have optional topicHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('topicHint');
    });

    it('should have optional departmentHint property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('departmentHint');
    });

    it('should have optional additionalContext property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('additionalContext');
    });

    it('should have optional mustInclude property', () => {
      const hints = diversityPlan(0);
      expect(hints).toHaveProperty('mustInclude');
    });

    it('should provide different hints for different indices', () => {
      const hints0 = diversityPlan(0);
      const hints1 = diversityPlan(1);
      expect(hints0).not.toEqual(hints1);
    });

    it('should generate consistent hints for same index', () => {
      const hints1 = diversityPlan(0);
      const hints2 = diversityPlan(0);
      expect(hints1).toEqual(hints2);
    });

    it('should handle higher indices', () => {
      const hints = diversityPlan(5);
      expect(hints).toBeDefined();
      expect(hints.domainHint).toBeDefined();
    });

    it('should return DiversityHints with all required fields', () => {
      const hints = diversityPlan(0);
      expect(hints.domainHint).toBeTruthy();
      expect(hints.attachmentHint).toBeTruthy();
      expect(hints.greetingHint).toBeTruthy();
      expect(hints.headerHint).toBeTruthy();
    });

    it('should include varied greetings', () => {
      const greetings = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const hints = diversityPlan(i);
        greetings.add(hints.greetingHint);
      }
      expect(greetings.size).toBeGreaterThan(1);
    });

    it('should include varied attachments', () => {
      const attachments = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const hints = diversityPlan(i);
        attachments.add(hints.attachmentHint);
      }
      expect(attachments.size).toBeGreaterThan(1);
    });

    it('should include varied domains', () => {
      const domains = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const hints = diversityPlan(i);
        domains.add(hints.domainHint);
      }
      expect(domains.size).toBeGreaterThan(1);
    });

    it('should include varied headers', () => {
      const headers = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const hints = diversityPlan(i);
        headers.add(hints.headerHint);
      }
      expect(headers.size).toBeGreaterThan(1);
    });
  });

  describe('DiversityHints Type', () => {
    it('should create valid DiversityHints object', () => {
      const hints: DiversityHints = {
        domainHint: 'example.com',
        attachmentHint: 'PDF',
        greetingHint: 'Hello',
        headerHint: 'auth headers',
        topicHint: 'phishing',
        departmentHint: 'IT',
        additionalContext: 'context',
        mustInclude: ['urgent'],
      };
      expect(hints).toBeDefined();
      expect(hints.domainHint).toBe('example.com');
    });

    it('should allow optional topicHint', () => {
      const hints: DiversityHints = {
        domainHint: 'example.com',
        attachmentHint: 'PDF',
        greetingHint: 'Hello',
        headerHint: 'headers',
      };
      expect(hints.topicHint).toBeUndefined();
    });

    it('should allow optional departmentHint', () => {
      const hints: DiversityHints = {
        domainHint: 'example.com',
        attachmentHint: 'PDF',
        greetingHint: 'Hello',
        headerHint: 'headers',
      };
      expect(hints.departmentHint).toBeUndefined();
    });
  });
});
