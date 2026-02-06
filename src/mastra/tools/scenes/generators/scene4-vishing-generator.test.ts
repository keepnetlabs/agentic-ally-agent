import { describe, it, expect, vi } from 'vitest';
import { generateScene4VishingPrompt } from './scene4-vishing-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

// Mock the context builder
vi.mock('../../../utils/prompt-builders/base-context-builder', () => ({
  buildContextData: vi.fn(() => 'MOCK_CONTEXT_DATA'),
}));

/**
 * Test suite for Scene 4 (Vishing Simulation) Generator
 * Tests prompt generation for realistic voice-call scam exercises
 */
describe('Scene 4 - Vishing Simulation Generator', () => {
  // Base valid analysis (vishing-focused)
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Vishing Awareness',
    title: 'Stop Voice Scams',
    description: 'Learn to handle suspicious phone calls safely',
    category: 'Social Engineering',
    subcategory: 'Vishing',
    department: 'All',
    level: 'intermediate',
    learningObjectives: ['Verify caller identity', 'Refuse risky requests'],
    duration: 5,
    industries: ['General Business'],
    roles: ['All Employees'],
    keyTopics: ['Caller impersonation'],
    practicalApplications: ['Handle urgent requests'],
    assessmentAreas: ['Call response'],
  } as any;

  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'vishing-101',
    microlearning_metadata: {
      title: 'Vishing Awareness',
      category: 'Security',
      level: 'intermediate',
      subcategory: 'Vishing',
      risk_area: 'Voice Phishing',
    },
    scientific_evidence: {},
    scenes: [] as any,
  } as any;

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid analysis and microlearning', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should require analysis parameter', () => {
      expect(() => {
        generateScene4VishingPrompt(undefined as any, baseMicrolearning);
      }).toThrow();
    });

    it('should accept microlearning parameter', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle analysis with minimal fields', () => {
      const minimalAnalysis: any = {
        language: 'en',
        topic: 'Voice Call Scam Prevention',
      };
      const prompt = generateScene4VishingPrompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ==================== OUTPUT FORMAT TESTS ====================
  describe('Output Format', () => {
    it('should include JSON structure in output', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"4"');
      expect(prompt).toContain('title');
      expect(prompt).toContain('subtitle');
    });

    it('should include vishing-specific fields', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('prompt');
      expect(prompt).toContain('firstMessage');
      expect(prompt).toContain('callToActionText');
      expect(prompt).toContain('successCallToActionText');
    });

    it('should include key_message array', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect(prompt).toContain('Step 1 - Role-play the call');
      expect(prompt).toContain('Step 2 - Verify and refuse risky requests');
      expect(prompt).toContain('Step 3 - End the call safely');
    });

    it('should include texts object fields', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('texts');
      expect(prompt).toContain('privacyNotice');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Behavioral Rehearsal');
    });

    it('should specify vishing_simulation scene type', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "vishing_simulation"');
    });

    it('should specify phone icon', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"iconName": "phone"');
    });
  });

  // ==================== LANGUAGE AND LOCALIZATION TESTS ====================
  describe('Language and Localization', () => {
    it('should respect analysis language setting', () => {
      const turkishAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Voice Scam Prevention',
      };
      const prompt = generateScene4VishingPrompt(turkishAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should include language in context', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support multiple language codes', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];
      languages.forEach((lang) => {
        const analysis: any = {
          ...baseAnalysis,
          language: lang,
        };
        const prompt = generateScene4VishingPrompt(analysis, baseMicrolearning);
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('should localize callToActionText', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Localize 'Start Call Practice'");
    });

    it('should localize successCallToActionText', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Localize 'Continue'");
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should include topic in prompt', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Awareness');
    });

    it('should handle bank impersonation topic', () => {
      const bankAnalysis: any = {
        ...baseAnalysis,
        topic: 'Bank Impersonation Scams',
      };
      const prompt = generateScene4VishingPrompt(bankAnalysis, baseMicrolearning);
      expect(prompt).toContain('Bank Impersonation');
    });

    it('should handle IT support scam topic', () => {
      const itAnalysis: any = {
        ...baseAnalysis,
        topic: 'Fake IT Support Calls',
      };
      const prompt = generateScene4VishingPrompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT Support');
    });

    it('should handle vendor impersonation topic', () => {
      const vendorAnalysis: any = {
        ...baseAnalysis,
        topic: 'Vendor Verification Best Practices',
      };
      const prompt = generateScene4VishingPrompt(vendorAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vendor');
    });
  });

  // ==================== CRITICAL RULES TESTS ====================
  describe('Critical Rules Compliance', () => {
    it('should specify voice-call focus requirement', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ALWAYS voice-call focused');
      expect(prompt).toContain('no email/inbox language');
    });

    it('should require realistic caller impersonation', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('realistic caller impersonation');
      expect(prompt).toContain('bank, IT, manager, vendor');
    });

    it('should emphasize verification steps', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('verification');
      expect(prompt).toContain('refusal');
    });

    it('should preserve JSON key structure', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('EXACTLY these JSON keys');
      expect(prompt).toContain('do not add or remove');
    });

    it('should specify no placeholder text', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('No placeholders');
      expect(prompt).toContain('final content only');
    });

    it('should specify safe training guidelines', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('never request real passwords');
      expect(prompt).toContain('OTPs');
      expect(prompt).toContain('money, gift cards');
    });

    it('should specify fictional identifiers requirement', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('fictional');
      expect(prompt).toContain('fake identifiers');
    });
  });

  // ==================== CONTEXT DATA TESTS ====================
  describe('Context Data Integration', () => {
    it('should build context data from analysis and microlearning', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Awareness');
      expect(prompt).toContain('en');
    });

    it('should inject roles into prompt', () => {
      const rolesAnalysis: any = {
        ...baseAnalysis,
        roles: ['Managers', 'Finance Team', 'HR'],
      };
      const prompt = generateScene4VishingPrompt(rolesAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should inject department into prompt', () => {
      const deptAnalysis: any = {
        ...baseAnalysis,
        department: 'Finance',
      };
      const prompt = generateScene4VishingPrompt(deptAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should inject industries into prompt', () => {
      const industryAnalysis: any = {
        ...baseAnalysis,
        industries: ['Healthcare', 'Finance', 'Technology'],
      };
      const prompt = generateScene4VishingPrompt(industryAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should handle custom requirements', () => {
      const customAnalysis: any = {
        ...baseAnalysis,
        customRequirements: 'Use CEO impersonation scenario',
      };
      const prompt = generateScene4VishingPrompt(customAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should use default when custom requirements missing', () => {
      const noCustomAnalysis: any = {
        ...baseAnalysis,
        customRequirements: undefined,
      };
      const prompt = generateScene4VishingPrompt(noCustomAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should handle missing roles with default', () => {
      const noRolesAnalysis: any = {
        ...baseAnalysis,
        roles: undefined,
      };
      const prompt = generateScene4VishingPrompt(noRolesAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should handle missing department with default', () => {
      const noDeptAnalysis: any = {
        ...baseAnalysis,
        department: undefined,
      };
      const prompt = generateScene4VishingPrompt(noDeptAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });

    it('should handle missing industries with default', () => {
      const noIndustryAnalysis: any = {
        ...baseAnalysis,
        industries: undefined,
      };
      const prompt = generateScene4VishingPrompt(noIndustryAnalysis, baseMicrolearning);
      expect(prompt).toContain('MOCK_CONTEXT_DATA');
    });
  });

  // ==================== FIELD CONSTRAINTS TESTS ====================
  describe('Field Constraints', () => {
    it('should specify title max 6 words', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 6 words');
    });

    it('should specify subtitle max 12 words', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
    });

    it('should specify prompt is 6-9 sentences', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('6-9 short sentences');
    });

    it('should specify firstMessage is 1-2 sentences', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('1-2 sentences');
    });

  });

  // ==================== LEARNING OBJECTIVES TESTS ====================
  describe('Learning Objectives', () => {
    it('should focus on verification behavior', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('verif');
    });

    it('should focus on refusal behavior', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Verify and refuse risky requests');
    });
  });

  // ==================== LOCALIZATION CONSISTENCY TESTS ====================
  describe('Localization Consistency', () => {
    it('should use analysis language for all text output', () => {
      const germanAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
      };
      const prompt = generateScene4VishingPrompt(germanAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should maintain language consistency throughout prompt', () => {
      const spanishAnalysis: any = {
        ...baseAnalysis,
        language: 'es',
      };
      const prompt = generateScene4VishingPrompt(spanishAnalysis, baseMicrolearning);
      expect(prompt).toContain('es');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'Voice Scams & Phone Security (Advanced)',
      };
      const prompt = generateScene4VishingPrompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle very long topic names', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Advanced Vishing Attack Prevention and Real-Time Caller Verification for Enterprise Security',
      };
      const prompt = generateScene4VishingPrompt(longAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should handle empty learning objectives', () => {
      const noObjectivesAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene4VishingPrompt(noObjectivesAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle empty roles array', () => {
      const emptyRolesAnalysis: any = {
        ...baseAnalysis,
        roles: [],
      };
      const prompt = generateScene4VishingPrompt(emptyRolesAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle empty industries array', () => {
      const emptyIndustriesAnalysis: any = {
        ...baseAnalysis,
        industries: [],
      };
      const prompt = generateScene4VishingPrompt(emptyIndustriesAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== SCENARIO EXAMPLES TESTS ====================
  describe('Scenario Examples', () => {
    it('should include title examples', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Call Role-Play');
      expect(prompt).toContain('Practice the Call');
    });

    it('should include subtitle example', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Act it out, verify, end safely');
    });
  });

  // ==================== SAFETY AND ETHICS TESTS ====================
  describe('Safety and Ethics', () => {
    it('should prohibit real credential requests', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('never request real passwords');
      expect(prompt).toContain('OTPs');
    });

    it('should prohibit financial requests', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('money, gift cards');
    });

    it('should prohibit personal data requests', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('personal/company secrets');
    });

    it('should require polite conclusion', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('end politely');
    });

    it('should keep requests fictional', () => {
      const prompt = generateScene4VishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('fictional');
      expect(prompt).toContain('safe');
    });
  });
});
