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

    // Note: ZERO_PRIVACY_POLICY constant removed (policy text no longer embedded in prompts)

    it('should define LOGO_TAG_RULE with CUSTOMMAINLOGO requirement', () => {
      expect(LOGO_TAG_RULE).toBeDefined();
      expect(LOGO_TAG_RULE).toContain('CUSTOMMAINLOGO');
      expect(LOGO_TAG_RULE).toContain('merge tag');
      expect(LOGO_TAG_RULE).toContain('Company Logo');
    });

    it('should define NO_DISCLAIMERS_RULE', () => {
      expect(NO_DISCLAIMERS_RULE).toBeDefined();
      expect(NO_DISCLAIMERS_RULE).toContain('NO DISCLAIMERS');
      expect(NO_DISCLAIMERS_RULE).toContain('RAW email content');
      expect(NO_DISCLAIMERS_RULE).toContain('phishing link');
    });

    it('should define EMAIL_SIGNATURE_RULES with forbidden/required patterns', () => {
      expect(EMAIL_SIGNATURE_RULES).toBeDefined();
      expect(EMAIL_SIGNATURE_RULES).toContain('Never use personal names');
      expect(EMAIL_SIGNATURE_RULES).toContain('Security Notifications Team');
      expect(EMAIL_SIGNATURE_RULES).toContain('department/team/system names');
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
    });

    it('should define LAYOUT_STRATEGY_RULES with Card and Letter options', () => {
      expect(LAYOUT_STRATEGY_RULES).toBeDefined();
      expect(LAYOUT_STRATEGY_RULES).toContain('OPTION A');
      expect(LAYOUT_STRATEGY_RULES).toContain('OPTION B');
      expect(LAYOUT_STRATEGY_RULES).toContain('Card');
      expect(LAYOUT_STRATEGY_RULES).toContain('Letter');
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
      expect(GREETING_RULES).toContain('Never use');
      expect(GREETING_RULES).toContain('Dear Employee');
    });

    it('should define MOBILE_OPTIMIZATION_RULES with tap target size', () => {
      expect(MOBILE_OPTIMIZATION_RULES).toBeDefined();
      expect(MOBILE_OPTIMIZATION_RULES).toContain('Mobile Optimization');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('tappable');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('32px');
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

    it('should define FOOTER_RULES with PHISHINGURL requirement', () => {
      expect(FOOTER_RULES).toBeDefined();
      expect(FOOTER_RULES).toContain('Footer');
      expect(FOOTER_RULES).toContain('PHISHINGURL');
      expect(FOOTER_RULES).toContain('support');
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
      // QRCODE tag can exist in the Available list; ensure it's not REQUIRED by default
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

      // Both should contain core merge tag rules
      expect(rulesWithoutQR).toContain('Required');
      expect(rulesWithQR).toContain('Required');

      // Difference should be minimal (just QR tag inclusion)
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

    // Note: ZERO_PRIVACY_POLICY constant removed (policy text no longer embedded in prompts)

    it('EMAIL_SIGNATURE_RULES should explicitly forbid personal names', () => {
      expect(EMAIL_SIGNATURE_RULES).toContain('Never use personal names');
      expect(EMAIL_SIGNATURE_RULES).toContain('personal names in signature');
    });

    it('NO_DISCLAIMERS_RULE should ensure output is raw content', () => {
      expect(NO_DISCLAIMERS_RULE).toContain('RAW email content');
      expect(NO_DISCLAIMERS_RULE).toContain('no meta-commentary');
    });

    it('FOOTER_RULES should require PHISHINGURL for link safety', () => {
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
      expect(FOOTER_RULES).toContain('footer links');
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

    it('MOBILE_OPTIMIZATION_RULES should specify max-width 600px', () => {
      expect(MOBILE_OPTIMIZATION_RULES).toContain('600px');
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
      expect(LAYOUT_STRATEGY_RULES).toContain('shadow');
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

    it('EMAIL_SIGNATURE_RULES should show correct and incorrect examples', () => {
      expect(EMAIL_SIGNATURE_RULES).toContain('✅');
      expect(EMAIL_SIGNATURE_RULES).toContain('❌');
    });
  });

  // ==================== MERGE TAGS SPECIFICITY ====================
  describe('Merge Tags Integration', () => {
    it('should reference constants for mandatory tags', () => {
      const rules = getMergeTagsRules();

      // Should contain references to tag lists
      expect(rules).toContain('Required');
      expect(rules).toContain('Recommended');
      expect(rules).toContain('Available');
    });

    it('should mention PHISHINGURL for all links', () => {
      const rules = getMergeTagsRules();

      expect(rules).toContain('All links/buttons MUST use {PHISHINGURL}');
    });

    it('should forbid hardcoded URLs', () => {
      const rules = getMergeTagsRules();

      expect(rules).toContain('never hardcode URLs');
    });

    it('should specify FIRSTNAME for personalization', () => {
      const rules = getMergeTagsRules();

      expect(rules).toContain('{FIRSTNAME}');
    });
  });

  // ==================== FORMATTING AND CLARITY ====================
  describe('Formatting and Readability', () => {
    it('all rules should use markdown formatting', () => {
      const allRules = [
        AUTH_CONTEXT,
        LOGO_TAG_RULE,
        NO_DISCLAIMERS_RULE,
        EMAIL_SIGNATURE_RULES,
        TABLE_LAYOUT_RULES,
        LAYOUT_STRATEGY_RULES,
        PREHEADER_RULE,
        GREETING_RULES,
        MOBILE_OPTIMIZATION_RULES,
        BRAND_AWARENESS_RULES,
        SYNTAX_RULE,
        FOOTER_RULES,
      ];

      allRules.forEach(rule => {
        expect(rule).toMatch(/\*\*|^-|^`/m);
      });
    });

    it('rules should use consistent bullet point format', () => {
      const rulesWithBullets = [EMAIL_SIGNATURE_RULES, TABLE_LAYOUT_RULES, GREETING_RULES];

      rulesWithBullets.forEach(rule => {
        expect(rule).toContain('- ');
      });
    });

    it('rules should use emphasis (bold) for critical points', () => {
      const rulesWithEmphasis = [EMAIL_SIGNATURE_RULES, TABLE_LAYOUT_RULES, GREETING_RULES];

      rulesWithEmphasis.forEach(rule => {
        expect(rule).toContain('**');
      });
    });

    it('should include code examples in appropriate rules', () => {
      expect(LOGO_TAG_RULE).toContain('<img');
      expect(SYNTAX_RULE).toContain("style='");
      expect(TABLE_LAYOUT_RULES).toContain('<table');
    });
  });

  // ==================== CONTENT VALIDATION ====================
  describe('Content Validation', () => {
    // Note: ZERO_PRIVACY_POLICY constant removed (policy text no longer embedded in prompts)

    it('EMAIL_SIGNATURE_RULES should list examples of correct teams', () => {
      expect(EMAIL_SIGNATURE_RULES).toContain('Security Notifications Team');
      expect(EMAIL_SIGNATURE_RULES).toContain('IT Support Team');
      expect(EMAIL_SIGNATURE_RULES).toContain('Customer Service');
    });

    it('EMAIL_SIGNATURE_RULES should list examples of incorrect signatures', () => {
      expect(EMAIL_SIGNATURE_RULES).toContain('Emily Clarke');
      expect(EMAIL_SIGNATURE_RULES).toContain('John from IT');
    });

    it('BRAND_AWARENESS_RULES should mention brand authenticity', () => {
      expect(BRAND_AWARENESS_RULES).toContain('authentic');
      expect(BRAND_AWARENESS_RULES).toContain('terminology');
      expect(BRAND_AWARENESS_RULES).toContain('services');
    });

    it('MOBILE_OPTIMIZATION_RULES should emphasize tappable size', () => {
      expect(MOBILE_OPTIMIZATION_RULES).toContain('tappable');
      expect(MOBILE_OPTIMIZATION_RULES).toContain('user experience');
    });
  });

  // ==================== CONSISTENCY ACROSS RULES ====================
  describe('Consistency and Cross-References', () => {
    it('all signature-related rules should align', () => {
      // Signature rules should forbid personal names
      expect(EMAIL_SIGNATURE_RULES).toContain('personal names');
    });

    it('GREETING_RULES should allow merge tags', () => {
      expect(GREETING_RULES).toContain('{FIRSTNAME}');
    });

    it('footer and greeting should both require merge tags not hardcoding', () => {
      expect(GREETING_RULES).toContain('{FIRSTNAME}');
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
    });

    it('logo and image styling should be consistent', () => {
      expect(LOGO_TAG_RULE).toContain('CUSTOMMAINLOGO');
      expect(TABLE_LAYOUT_RULES).not.toContain('img');
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
        AUTH_CONTEXT,
        LOGO_TAG_RULE,
        NO_DISCLAIMERS_RULE,
        EMAIL_SIGNATURE_RULES,
        TABLE_LAYOUT_RULES,
        LAYOUT_STRATEGY_RULES,
        PREHEADER_RULE,
        GREETING_RULES,
        MOBILE_OPTIMIZATION_RULES,
        BRAND_AWARENESS_RULES,
        SYNTAX_RULE,
        FOOTER_RULES,
      ];

      allConstants.forEach(constant => {
        expect(constant).toBeTruthy();
        expect(typeof constant).toBe('string');
        expect(constant.length).toBeGreaterThan(0);
      });
    });

    it('getMergeTagsRules should return non-empty string', () => {
      const rules1 = getMergeTagsRules();
      const rules2 = getMergeTagsRules(true);

      expect(rules1.length).toBeGreaterThan(0);
      expect(rules2.length).toBeGreaterThan(0);
    });

    it('constants should handle markdown rendering', () => {
      const allConstants = [AUTH_CONTEXT, EMAIL_SIGNATURE_RULES];

      allConstants.forEach(constant => {
        // Should not have unmatched markdown
        const boldCount = (constant.match(/\*\*/g) || []).length;
        expect(boldCount % 2).toBe(0); // Pairs of **
      });
    });
  });

  // ==================== PHISHING-SPECIFIC RULES ====================
  describe('Phishing Context Rules', () => {
    it('AUTH_CONTEXT should appear suitable for security training', () => {
      expect(AUTH_CONTEXT).toContain('AUTHORIZED');
      expect(AUTH_CONTEXT).toContain('LEGAL');
    });

    // Note: ZERO_PRIVACY_POLICY constant removed (policy text no longer embedded in prompts)

    it('NO_DISCLAIMERS_RULE ensures emails look authentic', () => {
      expect(NO_DISCLAIMERS_RULE).toContain('RAW email content');
      expect(NO_DISCLAIMERS_RULE).toContain('meta-commentary');
    });

    it('FOOTER_RULES should include realistic footer link', () => {
      expect(FOOTER_RULES).toContain('support');
      expect(FOOTER_RULES).toContain('legal');
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
    });
  });

  // ==================== OUTPUT SAFETY ====================
  describe('Output Safety and Validation', () => {
    it('EMAIL_SIGNATURE_RULES should forbid real employee names', () => {
      const wrongExamples = ['Emily Clarke', 'John from IT', 'Sarah Johnson'];

      wrongExamples.forEach(example => {
        expect(EMAIL_SIGNATURE_RULES).toContain(example);
      });
    });

    it('getMergeTagsRules should warn against custom tags', () => {
      const rules = getMergeTagsRules();

      expect(rules).toContain('ONLY use tags');
      expect(rules).toContain('DO NOT invent');
    });

    it('GREETING_RULES should require merge tag validation', () => {
      expect(GREETING_RULES).toContain('Validate');
    });

    it('FOOTER_RULES should ensure all links are safe', () => {
      expect(FOOTER_RULES).toContain('{PHISHINGURL}');
      expect(FOOTER_RULES).toContain('All footer links must use');
    });
  });
});
