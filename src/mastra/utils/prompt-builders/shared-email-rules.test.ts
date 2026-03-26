import { describe, it, expect } from 'vitest';
import {
  AUTH_CONTEXT,
  LOGO_TAG_RULE,
  NO_DISCLAIMERS_RULE,
  EMAIL_SIGNATURE_RULES,
  NO_FAKE_PERSONAL_IDENTITIES_RULES,
  TABLE_LAYOUT_RULES,
  LAYOUT_STRATEGY_RULES,
  PREHEADER_RULE,
  GREETING_RULES,
  MOBILE_OPTIMIZATION_RULES,
  getMergeTagsRules,
  BRAND_AWARENESS_RULES,
  SYNTAX_RULE,
  FOOTER_RULES,
} from './shared-email-rules';

describe('shared-email-rules', () => {
  // ==================== CONSTANT VALIDATION ====================
  describe('Rule Constants - Structure and Content', () => {
    it('should define AUTH_CONTEXT with legal/educational disclaimer', () => {
      expect(AUTH_CONTEXT).toBeDefined();
      expect(AUTH_CONTEXT).toContain('AUTHORIZED');
      expect(AUTH_CONTEXT).toContain('EDUCATIONAL');
      expect(AUTH_CONTEXT).toContain('defensive security');
    });

    it('should define LOGO_TAG_RULE with CUSTOMMAINLOGO requirement', () => {
      expect(LOGO_TAG_RULE).toBeDefined();
      expect(LOGO_TAG_RULE).toContain('CUSTOMMAINLOGO');
      expect(LOGO_TAG_RULE).toContain('Company Logo');
    });

    it('should define NO_DISCLAIMERS_RULE', () => {
      expect(NO_DISCLAIMERS_RULE).toBeDefined();
      expect(NO_DISCLAIMERS_RULE).toContain('NO DISCLAIMERS');
      expect(NO_DISCLAIMERS_RULE).toContain('RAW email content');
      expect(NO_DISCLAIMERS_RULE).toContain('phishing link');
    });

    it('should define EMAIL_SIGNATURE_RULES with format and padding', () => {
      expect(EMAIL_SIGNATURE_RULES).toBeDefined();
      expect(EMAIL_SIGNATURE_RULES).toContain('Team/Department Name');
      expect(EMAIL_SIGNATURE_RULES).toContain('Outlook-critical');
      expect(EMAIL_SIGNATURE_RULES).toContain('output language');
    });

    it('should define NO_FAKE_PERSONAL_IDENTITIES_RULES to prevent invented names', () => {
      expect(NO_FAKE_PERSONAL_IDENTITIES_RULES).toBeDefined();
      expect(NO_FAKE_PERSONAL_IDENTITIES_RULES).toContain('No Fake Personal Identities');
      expect(NO_FAKE_PERSONAL_IDENTITIES_RULES).toContain('Do not invent');
      expect(NO_FAKE_PERSONAL_IDENTITIES_RULES).toContain('{FIRSTNAME}');
    });

    it('should define TABLE_LAYOUT_RULES for Outlook compatibility', () => {
      expect(TABLE_LAYOUT_RULES).toBeDefined();
      expect(TABLE_LAYOUT_RULES).toContain('TABLE-BASED layout');
      expect(TABLE_LAYOUT_RULES).toContain('border-collapse');
      expect(TABLE_LAYOUT_RULES).toContain('Outlook');
      expect(TABLE_LAYOUT_RULES).toContain('PADDING RULE');
      expect(TABLE_LAYOUT_RULES).toContain('TYPOGRAPHY');
      expect(TABLE_LAYOUT_RULES).toContain('CARD STYLING');
      expect(TABLE_LAYOUT_RULES).toContain('box-shadow');
      expect(TABLE_LAYOUT_RULES).toContain('border-radius: 8px');
    });

    it('should define LAYOUT_STRATEGY_RULES with Card and Letter options', () => {
      expect(LAYOUT_STRATEGY_RULES).toBeDefined();
      expect(LAYOUT_STRATEGY_RULES).toContain('OPTION A');
      expect(LAYOUT_STRATEGY_RULES).toContain('OPTION B');
      expect(LAYOUT_STRATEGY_RULES).toContain('Card');
      expect(LAYOUT_STRATEGY_RULES).toContain('Letter');
      expect(LAYOUT_STRATEGY_RULES).toContain('subtle border');
      expect(LAYOUT_STRATEGY_RULES).not.toContain('shadow');
    });

    it('should define PREHEADER_RULE with hidden div requirement', () => {
      expect(PREHEADER_RULE).toBeDefined();
      expect(PREHEADER_RULE).toContain('Preheader');
      expect(PREHEADER_RULE).toContain('display:none');
      expect(PREHEADER_RULE).toContain('inbox preview');
    });

    it('should define GREETING_RULES with FIRSTNAME merge tag', () => {
      expect(GREETING_RULES).toBeDefined();
      expect(GREETING_RULES).toContain('Greeting');
      expect(GREETING_RULES).toContain('{FIRSTNAME}');
      expect(GREETING_RULES).toContain('{FULLNAME}');
      expect(GREETING_RULES).toContain('Dear Employee');
    });

    it('should define MOBILE_OPTIMIZATION_RULES with tap target size', () => {
      expect(MOBILE_OPTIMIZATION_RULES).toBeDefined();
      expect(MOBILE_OPTIMIZATION_RULES).toContain('Mobile');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('tappable');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('32px');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('600px');
    });

    it('should define BRAND_AWARENESS_RULES', () => {
      expect(BRAND_AWARENESS_RULES).toBeDefined();
      expect(BRAND_AWARENESS_RULES).toContain('Brand Awareness');
      expect(BRAND_AWARENESS_RULES).toContain('authentic');
      expect(BRAND_AWARENESS_RULES).toContain('Amazon');
    });

    it('should define SYNTAX_RULE with SINGLE QUOTES requirement', () => {
      expect(SYNTAX_RULE).toBeDefined();
      expect(SYNTAX_RULE).toContain('SINGLE QUOTES');
      expect(SYNTAX_RULE).toContain('HTML attributes');
      expect(SYNTAX_RULE).toContain("style='");
    });

    it('should define FOOTER_RULES with PHISHINGURL and unsubscribe', () => {
      expect(FOOTER_RULES).toBeDefined();
      expect(FOOTER_RULES).toContain('Footer');
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
      expect(FOOTER_RULES).toContain('Unsubscribe');
      expect(FOOTER_RULES).toContain('Privacy Policy');
      expect(FOOTER_RULES).toContain('text-align: center');
    });
  });

  // ==================== MERGE TAGS FUNCTION ====================
  describe('getMergeTagsRules Function', () => {
    it('should return merge tag rules without QR code by default', () => {
      const rules = getMergeTagsRules();
      const requiredLine = rules.split('\n').find(l => l.includes('**Required:**')) || '';

      expect(rules).toBeDefined();
      expect(rules).toContain('Merge Tags');
      expect(rules).toContain('{FIRSTNAME}');
      expect(requiredLine).not.toContain('{QRCODEURLIMAGE}');
    });

    it('should include QR code tag when includeQRCode is true', () => {
      const rules = getMergeTagsRules(true);
      const requiredLine = rules.split('\n').find(l => l.includes('**Required:**')) || '';

      expect(requiredLine).toContain('{QRCODEURLIMAGE}');
    });

    it('should not include QR code tag when includeQRCode is false', () => {
      const rules = getMergeTagsRules(false);
      const requiredLine = rules.split('\n').find(l => l.includes('**Required:**')) || '';

      expect(requiredLine).not.toContain('{QRCODEURLIMAGE}');
    });

    it('should include FIRSTNAME as required tag', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('{FIRSTNAME}');
      expect(rules).toContain('Required');
    });

    it('should include PHISHINGURL requirement', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('{PHISHINGURL}');
    });

    it('should warn against inventing new tags', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('ONLY use tags');
      expect(rules).toContain('DO NOT invent');
    });

    it('should provide list of available tags', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('Available');
    });

    it('should mention no real names in personalization', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('Never use real names');
      expect(rules).toContain('merge tags');
    });

    it('should be consistent with and without QR code except for QR line', () => {
      const rulesWithoutQR = getMergeTagsRules(false);
      const rulesWithQR = getMergeTagsRules(true);

      expect(rulesWithoutQR).toContain('Required');
      expect(rulesWithQR).toContain('Required');
      expect(rulesWithQR.length).toBeGreaterThan(rulesWithoutQR.length);
    });

    it('should include recommended tags instruction', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('Recommended');
    });

    it('should mention that all links must use PHISHINGURL', () => {
      const rules = getMergeTagsRules();
      expect(rules).toContain('All links/buttons MUST use {PHISHINGURL}');
      expect(rules).toContain('href');
      expect(rules).toContain('never hardcode URLs');
    });
  });

  // ==================== SECURITY AND COMPLIANCE ====================
  describe('Security and Compliance Requirements', () => {
    it('AUTH_CONTEXT should emphasize legal/authorized nature', () => {
      expect(AUTH_CONTEXT).toMatch(/AUTHORIZED|LEGAL|EDUCATIONAL/);
    });

    it('EMAIL_SIGNATURE_RULES should reference No Fake Personal Identities rule', () => {
      expect(EMAIL_SIGNATURE_RULES).toContain('No Fake Personal Identities');
    });

    it('NO_DISCLAIMERS_RULE should ensure output is raw content', () => {
      expect(NO_DISCLAIMERS_RULE).toContain('RAW email content');
      expect(NO_DISCLAIMERS_RULE).toContain('no meta-commentary');
    });

    it('FOOTER_RULES should require PHISHINGURL for link safety', () => {
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
      expect(FOOTER_RULES).toContain('All links use');
    });

    it('GREETING_RULES should enforce personalization with merge tags', () => {
      expect(GREETING_RULES).toContain('{FIRSTNAME}');
      expect(GREETING_RULES).toContain('{FULLNAME}');
    });
  });

  // ==================== HTML AND EMAIL STANDARDS ====================
  describe('HTML and Email Standards', () => {
    it('TABLE_LAYOUT_RULES should specify table-based layout for compatibility', () => {
      expect(TABLE_LAYOUT_RULES).toContain('TABLE-BASED');
      expect(TABLE_LAYOUT_RULES).toContain('Outlook');
    });

    it('TABLE_LAYOUT_RULES should explicitly forbid Flexbox and Grid', () => {
      expect(TABLE_LAYOUT_RULES).toContain('Flexbox');
      expect(TABLE_LAYOUT_RULES).toContain('Grid');
      expect(TABLE_LAYOUT_RULES).toContain('breaks Outlook');
    });

    it('TABLE_LAYOUT_RULES should specify padding on td not table', () => {
      expect(TABLE_LAYOUT_RULES).toContain('<td>');
      expect(TABLE_LAYOUT_RULES).toContain('padding');
      expect(TABLE_LAYOUT_RULES).toContain('NEVER put padding on <table>');
    });

    it('SYNTAX_RULE should enforce single quotes for JSON compatibility', () => {
      expect(SYNTAX_RULE).toContain('SINGLE QUOTES');
      expect(SYNTAX_RULE).toContain('JSON');
      expect(SYNTAX_RULE).toContain("style='");
    });

    it('PREHEADER_RULE should specify display:none for hidden text', () => {
      expect(PREHEADER_RULE).toContain('display:none');
    });

    it('LOGO_TAG_RULE should provide complete img tag example', () => {
      expect(LOGO_TAG_RULE).toContain('<img');
      expect(LOGO_TAG_RULE).toContain('CUSTOMMAINLOGO');
      expect(LOGO_TAG_RULE).toContain('width');
      expect(LOGO_TAG_RULE).toContain('height');
    });
  });

  // ==================== DESIGN AND LAYOUT OPTIONS ====================
  describe('Design and Layout Options', () => {
    it('LAYOUT_STRATEGY_RULES should define Card layout option', () => {
      expect(LAYOUT_STRATEGY_RULES).toContain('Card');
      expect(LAYOUT_STRATEGY_RULES).toContain('#f3f4f6');
      expect(LAYOUT_STRATEGY_RULES).toContain('subtle border');
    });

    it('LAYOUT_STRATEGY_RULES should define Letter layout option', () => {
      expect(LAYOUT_STRATEGY_RULES).toContain('Letter');
      expect(LAYOUT_STRATEGY_RULES).toContain('left-aligned');
    });

    it('LAYOUT_STRATEGY_RULES should specify Card as DEFAULT', () => {
      expect(LAYOUT_STRATEGY_RULES).toContain('DEFAULT');
    });

    it('LAYOUT_STRATEGY_RULES should indicate use cases for each layout', () => {
      expect(LAYOUT_STRATEGY_RULES).toContain('Best for');
      expect(LAYOUT_STRATEGY_RULES).toContain('Password Reset');
      expect(LAYOUT_STRATEGY_RULES).toContain('Policy Update');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases and Special Scenarios', () => {
    it('getMergeTagsRules should handle multiple calls consistently', () => {
      const call1 = getMergeTagsRules(true);
      const call2 = getMergeTagsRules(true);
      expect(call1).toBe(call2);
    });

    it('getMergeTagsRules(false) and getMergeTagsRules() should be identical', () => {
      const rules1 = getMergeTagsRules(false);
      const rules2 = getMergeTagsRules();
      expect(rules1).toBe(rules2);
    });

    it('all constants should be non-empty strings', () => {
      const allConstants = [
        AUTH_CONTEXT, LOGO_TAG_RULE, NO_DISCLAIMERS_RULE, EMAIL_SIGNATURE_RULES,
        TABLE_LAYOUT_RULES, LAYOUT_STRATEGY_RULES, PREHEADER_RULE, GREETING_RULES,
        MOBILE_OPTIMIZATION_RULES, BRAND_AWARENESS_RULES, SYNTAX_RULE, FOOTER_RULES,
      ];
      allConstants.forEach(constant => {
        expect(constant).toBeTruthy();
        expect(typeof constant).toBe('string');
        expect(constant.length).toBeGreaterThan(0);
      });
    });

    it('all rules should use markdown formatting', () => {
      const allRules = [
        AUTH_CONTEXT, LOGO_TAG_RULE, NO_DISCLAIMERS_RULE, EMAIL_SIGNATURE_RULES,
        TABLE_LAYOUT_RULES, LAYOUT_STRATEGY_RULES, PREHEADER_RULE, GREETING_RULES,
        MOBILE_OPTIMIZATION_RULES, BRAND_AWARENESS_RULES, SYNTAX_RULE, FOOTER_RULES,
      ];
      allRules.forEach(rule => {
        expect(rule).toMatch(/\*\*|^-|^`/m);
      });
    });
  });
});
