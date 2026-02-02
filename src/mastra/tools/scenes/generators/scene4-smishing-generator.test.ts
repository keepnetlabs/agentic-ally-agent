import { describe, it, expect, vi } from 'vitest';
import { generateScene4SmishingPrompt } from './scene4-smishing-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

// Mock the context builder
vi.mock('../../../utils/prompt-builders/base-context-builder', () => ({
  buildContextData: vi.fn(() => 'MOCK_CONTEXT_DATA'),
}));

describe('Scene 4 - Smishing Simulation Generator', () => {
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Smishing Awareness',
    title: 'Stop SMS Scams',
    description: 'Learn to handle suspicious SMS safely',
    category: 'Social Engineering',
    subcategory: 'Smishing',
    department: 'All',
    level: 'intermediate',
    learningObjectives: ['Verify sender identity', 'Refuse risky requests'],
    duration: 5,
    industries: ['General Business'],
    roles: ['All Employees'],
    keyTopics: ['Sender impersonation'],
    practicalApplications: ['Handle urgent SMS'],
    assessmentAreas: ['Message response'],
  } as any;

  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'smishing-101',
    microlearning_metadata: {
      title: 'Smishing Awareness',
      category: 'Security',
      level: 'intermediate',
      subcategory: 'Smishing',
      risk_area: 'SMS Phishing',
    },
    scientific_evidence: {},
    scenes: [] as any,
  } as any;

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid analysis and microlearning', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should require analysis parameter', () => {
      expect(() => {
        generateScene4SmishingPrompt(undefined as any, baseMicrolearning);
      }).toThrow();
    });
  });

  // ==================== OUTPUT FORMAT TESTS ====================
  describe('Output Format', () => {
    it('should include JSON structure in output', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('\"4\"');
      expect(prompt).toContain('title');
      expect(prompt).toContain('subtitle');
    });

    it('should include smishing-specific fields', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('senderName');
      expect(prompt).toContain('senderNumber');
      expect(prompt).toContain('firstMessage');
      expect(prompt).toContain('prompt');
    });

    it('should specify smishing_simulation scene type', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('\"scene_type\": \"smishing_simulation\"');
    });

    it('should specify message-square icon', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('\"iconName\": \"message-square\"');
    });

    it('should include key_message array', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect(prompt).toContain('text');
      expect(prompt).toContain('verify');
      expect(prompt).toContain('refuse');
      expect(prompt).toContain('safely');
    });
  });

  // ==================== CRITICAL CONSISTENCY TESTS ====================
  describe('Sender Name Consistency (NEW FIX)', () => {
    it('should enforce senderName consistency in firstMessage', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CRITICAL: Sender must introduce themselves by the exact name from the senderName field above');
    });

    it('should require senderName field to be used in firstMessage', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('senderName');
      expect(prompt).toContain('firstMessage');
      // Both should be present for consistency checking
      expect(prompt.indexOf('senderName') < prompt.indexOf('firstMessage')).toBe(true);
    });
  });

  // ==================== PHONE NUMBER FORMAT TESTS ====================
  describe('Phone Number Formatting (NEW FIX)', () => {
    it('should include phone number format examples', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Examples');
      expect(prompt).toContain('+90 555');
      expect(prompt).toContain('+44 844');
    });

    it('should specify obviously fake prefixes', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('fake prefixes');
      expect(prompt).toContain('non-realistic');
    });

    it('should require locale-specific phone format', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('locale format');
    });
  });

  // ==================== LANGUAGE AND LOCALIZATION TESTS ====================
  describe('Language and Localization', () => {
    it('should respect analysis language setting', () => {
      const turkishAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Sesli Dolandırıcılık Önleme',
      };
      const prompt = generateScene4SmishingPrompt(turkishAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should include language in context', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support multiple language codes', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];
      languages.forEach((lang) => {
        const analysis: any = {
          ...baseAnalysis,
          language: lang,
        };
        const prompt = generateScene4SmishingPrompt(analysis, baseMicrolearning);
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('should localize callToActionText', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Localize 'Start Chat Practice'");
    });
  });

  // ==================== SMS-SPECIFIC TESTS ====================
  describe('SMS-Specific Requirements', () => {
    it('should enforce SMS-only focus', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SMS/chat focused');
      expect(prompt).toContain('no email/inbox language');
    });

    it('should specify conversational SMS tone', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('conversational');
      expect(prompt).toContain('short');
    });

    it('should require reply question at end', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('question');
      expect(prompt).toContain('reply');
    });

    it('should limit SMS replies to short format', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('short');
      expect(prompt).toContain('SMS');
    });
  });

  // ==================== SAFETY AND ETHICS TESTS ====================
  describe('Safety and Ethics', () => {
    it('should prohibit real credential requests', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NOT ask for real passwords');
      expect(prompt).toContain('OTPs');
    });

    it('should prohibit financial requests', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('money, gift cards');
    });

    it('should prohibit personal data requests', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('personal data');
    });

    it('should require polite conclusion', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('end politely');
    });

    it('should keep requests fictional', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('fictional');
      expect(prompt).toContain('safe');
    });
  });

  // ==================== FIELD CONSTRAINTS TESTS ====================
  describe('Field Constraints', () => {
    it('should specify title max 6 words', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 6 words');
    });

    it('should specify subtitle max 12 words', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
    });

    it('should specify firstMessage as 1-2 sentences', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('1-2 sentences');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'SMS Phishing & Security (Advanced)',
      };
      const prompt = generateScene4SmishingPrompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should handle empty learning objectives', () => {
      const noObjectivesAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene4SmishingPrompt(noObjectivesAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should include topic in prompt', () => {
      const prompt = generateScene4SmishingPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Smishing Awareness');
    });

    it('should handle bank SMS topic', () => {
      const bankAnalysis: any = {
        ...baseAnalysis,
        topic: 'Bank SMS Scams',
      };
      const prompt = generateScene4SmishingPrompt(bankAnalysis, baseMicrolearning);
      expect(prompt).toContain('Bank');
    });

    it('should handle IT support SMS topic', () => {
      const itAnalysis: any = {
        ...baseAnalysis,
        topic: 'Fake IT Support SMS',
      };
      const prompt = generateScene4SmishingPrompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT Support');
    });
  });
});
