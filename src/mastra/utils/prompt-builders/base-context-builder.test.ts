/**
 * Unit tests for base-context-builder
 * Covers buildSystemPrompt, buildContextData, LearnerLevel vocabulary adaptation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSystemPrompt, buildContextData } from './base-context-builder';
import type { PromptAnalysis } from '../../types/prompt-analysis';
import type { MicrolearningContent } from '../../types/microlearning';

vi.mock('../language/localization-language-rules', () => ({
  getLanguagePrompt: vi.fn((lang: string) => `[Language rules for ${lang}]`),
}));

describe('base-context-builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildSystemPrompt', () => {
    it('should include language in identity section', () => {
      const result = buildSystemPrompt('tr');
      expect(result).toContain('native tr microlearning content generator');
      expect(result).toContain('Pedagogical Specialist in tr');
    });

    it('should include language rules from localization', async () => {
      const { getLanguagePrompt } = await import('../language/localization-language-rules');
      const result = buildSystemPrompt('en');
      expect(result).toContain('[Language rules for en]');
      expect(getLanguagePrompt).toHaveBeenCalledWith('en');
    });

    it('should include Beginner vocabulary guidance when level is Beginner', () => {
      const result = buildSystemPrompt('de', 'Beginner');
      expect(result).toContain('Avoid ALL technical jargon');
      expect(result).toContain('completely new to the topic');
    });

    it('should include Intermediate vocabulary guidance when level is Intermediate', () => {
      const result = buildSystemPrompt('fr', 'Intermediate');
      expect(result).toContain('Simplify technical jargon');
      expect(result).toContain('non-expert would use in casual conversation');
    });

    it('should include Advanced vocabulary guidance when level is Advanced', () => {
      const result = buildSystemPrompt('es', 'Advanced');
      expect(result).toContain('professional technical vocabulary');
      expect(result).toContain('experienced practitioners');
    });

    it('should default to Beginner when level is undefined', () => {
      const result = buildSystemPrompt('en');
      expect(result).toContain('Avoid ALL technical jargon');
    });

    it('should normalize level case (intermediate -> Intermediate)', () => {
      const result = buildSystemPrompt('en', 'intermediate');
      expect(result).toContain('Simplify technical jargon');
    });

    it('should include OUTPUT FORMAT section', () => {
      const result = buildSystemPrompt('tr');
      expect(result).toContain('=== OUTPUT FORMAT (STRICT) ===');
      expect(result).toContain('Return ONLY valid JSON');
      expect(result).toContain('Start directly with {');
    });

    it('should include global acronyms exception (MFA, SPF, DMARC, DKIM)', () => {
      const result = buildSystemPrompt('de');
      expect(result).toContain('MFA');
      expect(result).toContain('SPF');
      expect(result).toContain('DMARC');
      expect(result).toContain('DKIM');
    });

    it('should include scene_type values', () => {
      const result = buildSystemPrompt('en');
      expect(result).toContain('intro');
      expect(result).toContain('quiz');
      expect(result).toContain('summary');
    });
  });

  describe('buildContextData', () => {
    const minimalAnalysis: PromptAnalysis = {
      language: 'en-gb',
      topic: 'Phishing Awareness',
      description: 'Test',
      title: 'Test',
      department: 'IT',
      level: 'Intermediate',
      category: 'Security',
      subcategory: '',
      learningObjectives: ['Identify phishing'],
      duration: 5,
      industries: ['Tech'],
      roles: ['Developer'],
      keyTopics: ['phishing'],
      practicalApplications: [],
      assessmentAreas: [],
      regulationCompliance: [],
    };

    it('should include topic and language', () => {
      const result = buildContextData(minimalAnalysis, {} as MicrolearningContent);
      expect(result).toContain('Phishing Awareness');
      expect(result).toContain('en-gb');
    });

    it('should include level and department', () => {
      const result = buildContextData(minimalAnalysis, {} as MicrolearningContent);
      expect(result).toContain('Intermediate');
      expect(result).toContain('IT');
    });

    it('should include learning objectives', () => {
      const result = buildContextData(minimalAnalysis, {} as MicrolearningContent);
      expect(result).toContain('Identify phishing');
    });

    it('should include subcategory when present', () => {
      const analysis = { ...minimalAnalysis, subcategory: 'Email Security' };
      const result = buildContextData(analysis, {} as MicrolearningContent);
      expect(result).toContain('Email Security');
    });

    it('should use metadata from microlearning when provided', () => {
      const microlearning: MicrolearningContent = {
        microlearning_metadata: {
          category: 'Cybersecurity',
          subcategory: 'Phishing',
          risk_area: 'Social Engineering',
          title: '',
          description: '',
          industry_relevance: [],
          department_relevance: [],
          role_relevance: [],
          regulation_compliance: [],
          content_provider: '',
          level: 'Intermediate',
          ethical_inclusive_language_policy: {} as any,
          language: 'en-gb',
          language_availability: [],
          gamification_enabled: false,
          total_points: 0,
        },
      } as MicrolearningContent;
      const result = buildContextData(minimalAnalysis, microlearning);
      expect(result).toContain('Cybersecurity');
      expect(result).toContain('Phishing');
      expect(result).toContain('Social Engineering');
    });

    it('should use scientific evidence learning theories when provided', () => {
      const microlearning: MicrolearningContent = {
        scientific_evidence: {
          learning_theories: {
            clt: { theory: 'CLT', application: 'a', evidence: 'e' },
            spaced: { theory: 'Spaced', application: 'a', evidence: 'e' },
          },
        },
      } as MicrolearningContent;
      const result = buildContextData(minimalAnalysis, microlearning);
      expect(result).toContain('clt');
      expect(result).toContain('spaced');
    });

    it('should include Topic Consistency rules', () => {
      const result = buildContextData(minimalAnalysis, {} as MicrolearningContent);
      expect(result).toContain('Topic Consistency');
      expect(result).toContain('Content must align with category/subcategory');
    });

    it('should include practical applications when provided', () => {
      const analysis = {
        ...minimalAnalysis,
        practicalApplications: ['Report suspicious emails'],
      };
      const result = buildContextData(analysis, {} as MicrolearningContent);
      expect(result).toContain('Report suspicious emails');
    });

    it('should include assessment areas when provided', () => {
      const analysis = {
        ...minimalAnalysis,
        assessmentAreas: ['Phishing detection'],
      };
      const result = buildContextData(analysis, {} as MicrolearningContent);
      expect(result).toContain('Phishing detection');
    });
  });
});
