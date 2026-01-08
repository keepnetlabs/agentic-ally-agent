import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildContextData } from './base-context-builder';
import { PromptAnalysis } from '../../types/prompt-analysis';
import { MicrolearningContent } from '../../types/microlearning';

/**
 * Test suite for Base Context Builder
 * Tests prompt and context building for microlearning generation
 */
describe('Base Context Builder', () => {
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Phishing Prevention',
    title: 'Stop Phishing',
    category: 'Security Awareness',
    subcategory: 'Email Security',
    department: 'IT',
    level: 'intermediate',
    learningObjectives: ['Identify phishing', 'Report suspicious emails'],
    roles: ['IT Staff', 'Managers'],
    industries: ['Technology'],
    keyTopics: ['Email security', 'Phishing indicators'],
    practicalApplications: ['Check email headers'],
    assessmentAreas: ['Email analysis'],
    regulationCompliance: ['GDPR'],
    customRequirements: 'Include real examples',
  } as any;

  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'phishing-101',
    microlearning_metadata: {
      title: 'Phishing Prevention',
      category: 'Security',
      subcategory: 'Email Security',
      level: 'intermediate',
      risk_area: 'Email-based threats',
      language_availability: ['en'],
    },
    scientific_evidence: {
      learning_theories: {
        'Cognitive Load Theory': 'Chunk info into 3-5 items',
        'Spaced Repetition': 'Repeat key points',
      },
    },
    scenes: [],
  } as any;

  describe('buildSystemPrompt', () => {
    describe('Input Validation', () => {
      it('should require language parameter', () => {
        expect(() => {
          buildSystemPrompt('' as any);
        }).toThrow();
      });

      it('should accept valid language codes', () => {
        const languages = ['en', 'tr', 'de', 'fr', 'zh'];
        languages.forEach(lang => {
          const prompt = buildSystemPrompt(lang);
          expect(prompt).toBeDefined();
          expect(typeof prompt).toBe('string');
        });
      });
    });

    describe('Language Support', () => {
      it('should include English in prompt for English language', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('en');
        expect(prompt).toContain('English');
      });

      it('should include Turkish in prompt for Turkish language', () => {
        const prompt = buildSystemPrompt('tr');
        expect(prompt).toContain('tr');
      });

      it('should include German in prompt for German language', () => {
        const prompt = buildSystemPrompt('de');
        expect(prompt).toContain('de');
      });

      it('should include French in prompt for French language', () => {
        const prompt = buildSystemPrompt('fr');
        expect(prompt).toContain('fr');
      });

      it('should include Chinese in prompt for Chinese language', () => {
        const prompt = buildSystemPrompt('zh');
        expect(prompt).toContain('zh');
      });
    });

    describe('Level-Specific Content', () => {
      it('should include Beginner vocabulary guidance for beginner level', () => {
        const prompt = buildSystemPrompt('en', 'Beginner');
        expect(prompt).toContain('Beginner');
        expect(prompt).toContain('avoid ALL technical jargon');
      });

      it('should include Intermediate vocabulary guidance for intermediate level', () => {
        const prompt = buildSystemPrompt('en', 'Intermediate');
        expect(prompt).toContain('Intermediate');
        expect(prompt).toContain('Simplify technical jargon');
      });

      it('should include Advanced vocabulary guidance for advanced level', () => {
        const prompt = buildSystemPrompt('en', 'Advanced');
        expect(prompt).toContain('Advanced');
        expect(prompt).toContain('professional technical vocabulary');
      });

      it('should default to Beginner for invalid level', () => {
        const prompt = buildSystemPrompt('en', 'InvalidLevel');
        expect(prompt).toContain('Beginner');
      });

      it('should default to Beginner for missing level', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('Beginner');
      });
    });

    describe('Prompt Structure', () => {
      it('should return a string', () => {
        const prompt = buildSystemPrompt('en');
        expect(typeof prompt).toBe('string');
      });

      it('should be non-empty', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt.length).toBeGreaterThan(0);
      });

      it('should include system identity section', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('YOUR IDENTITY');
      });

      it('should include language and style section', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('LANGUAGE & STYLE');
      });

      it('should include output format section', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('OUTPUT FORMAT');
      });

      it('should include learning science section', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('LEARNING SCIENCE');
      });

      it('should include JSON output instruction', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('JSON');
      });
    });

    describe('Language Purity Rules', () => {
      it('should enforce language purity rules', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('Language Purity');
        expect(prompt).toContain('ZERO words from other languages');
      });

      it('should allow acronyms like MFA, SPF, DMARC, DKIM', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('MFA');
        expect(prompt).toContain('SPF');
        expect(prompt).toContain('DMARC');
        expect(prompt).toContain('DKIM');
      });
    });

    describe('Native Expression Rules', () => {
      it('should enforce native expression', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('Create, Don\'t Translate');
        expect(prompt).toContain('native professional');
      });

      it('should discourage literal translation', () => {
        const prompt = buildSystemPrompt('en');
        expect(prompt).toContain('WRONG: Literal, mechanical');
        expect(prompt).toContain('RIGHT: Fluent, idiomatic');
      });
    });

    describe('Case Sensitivity Handling', () => {
      it('should normalize level to Beginner (capital)', () => {
        const prompt1 = buildSystemPrompt('en', 'beginner');
        const prompt2 = buildSystemPrompt('en', 'Beginner');
        expect(prompt1).toContain('Beginner');
        expect(prompt2).toContain('Beginner');
      });

      it('should normalize level to Intermediate (capital)', () => {
        const prompt1 = buildSystemPrompt('en', 'intermediate');
        const prompt2 = buildSystemPrompt('en', 'Intermediate');
        expect(prompt1).toContain('Intermediate');
        expect(prompt2).toContain('Intermediate');
      });

      it('should normalize level to Advanced (capital)', () => {
        const prompt1 = buildSystemPrompt('en', 'advanced');
        const prompt2 = buildSystemPrompt('en', 'Advanced');
        expect(prompt1).toContain('Advanced');
        expect(prompt2).toContain('Advanced');
      });
    });
  });

  describe('buildContextData', () => {
    describe('Input Validation', () => {
      it('should require analysis parameter', () => {
        expect(() => {
          buildContextData(undefined as any, baseMicrolearning);
        }).toThrow();
      });

      it('should require microlearning parameter', () => {
        expect(() => {
          buildContextData(baseAnalysis, undefined as any);
        }).toThrow();
      });

      it('should accept valid analysis and microlearning', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toBeDefined();
        expect(typeof context).toBe('string');
      });
    });

    describe('Language Inclusion', () => {
      it('should include language from analysis', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('en');
      });

      it('should support different languages', () => {
        const languages = ['en', 'tr', 'de', 'fr', 'zh'];
        languages.forEach(lang => {
          const analysis = { ...baseAnalysis, language: lang };
          const context = buildContextData(analysis as any, baseMicrolearning);
          expect(context).toContain(lang);
        });
      });
    });

    describe('Topic and Metadata Inclusion', () => {
      it('should include topic from analysis', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain(baseAnalysis.topic);
      });

      it('should include department from analysis', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain(baseAnalysis.department);
      });

      it('should include level from analysis', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain(baseAnalysis.level);
      });

      it('should include category from metadata', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Security');
      });

      it('should include learning objectives', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Identify phishing');
      });

      it('should include roles', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('IT Staff');
      });

      it('should include industries', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Technology');
      });

      it('should include key topics', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Email security');
      });
    });

    describe('Optional Fields Handling', () => {
      it('should handle missing learningObjectives', () => {
        const analysis = { ...baseAnalysis, learningObjectives: undefined };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('General awareness');
      });

      it('should handle missing roles', () => {
        const analysis = { ...baseAnalysis, roles: undefined };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('All Roles');
      });

      it('should handle missing industries', () => {
        const analysis = { ...baseAnalysis, industries: undefined };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('General');
      });

      it('should handle missing practicalApplications', () => {
        const analysis = { ...baseAnalysis, practicalApplications: undefined };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toBeDefined();
      });

      it('should handle missing subcategory', () => {
        const microlearning = { ...baseMicrolearning };
        microlearning.microlearning_metadata = { ...microlearning.microlearning_metadata, subcategory: undefined };
        const context = buildContextData(baseAnalysis, microlearning as any);
        expect(context).toBeDefined();
      });

      it('should handle missing customRequirements', () => {
        const analysis = { ...baseAnalysis, customRequirements: undefined };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toBeDefined();
      });
    });

    describe('Content Rules Inclusion', () => {
      it('should include topic consistency rules', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Topic Consistency');
      });

      it('should include domain guardrails', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Domain Guardrails');
      });

      it('should reference the specific topic in rules', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Phishing Prevention');
      });
    });

    describe('Scientific Context', () => {
      it('should include scientific evidence section', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('SCIENTIFIC CONTEXT');
      });

      it('should include learning theories from metadata', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Cognitive Load Theory');
      });

      it('should include risk area from metadata', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('Email-based threats');
      });

      it('should handle missing scientific evidence', () => {
        const microlearning = { ...baseMicrolearning, scientific_evidence: undefined };
        const context = buildContextData(baseAnalysis, microlearning as any);
        expect(context).toContain('Cognitive Load Theory');
      });
    });

    describe('Context Structure', () => {
      it('should return a string', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(typeof context).toBe('string');
      });

      it('should be non-empty', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context.length).toBeGreaterThan(0);
      });

      it('should include CONTEXT section header', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('=== CONTEXT ===');
      });

      it('should include CONTENT RULES section header', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('=== CONTENT RULES ===');
      });

      it('should include JSON instruction', () => {
        const context = buildContextData(baseAnalysis, baseMicrolearning);
        expect(context).toContain('JSON');
      });
    });

    describe('Multiple Language Support', () => {
      it('should generate context for Turkish', () => {
        const analysis = { ...baseAnalysis, language: 'tr' };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('tr');
      });

      it('should generate context for German', () => {
        const analysis = { ...baseAnalysis, language: 'de' };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('de');
      });

      it('should generate context for multiple languages consistently', () => {
        const languages = ['en', 'tr', 'de', 'fr'];
        const contexts = languages.map(lang => {
          const analysis = { ...baseAnalysis, language: lang };
          return buildContextData(analysis as any, baseMicrolearning);
        });

        contexts.forEach((context, index) => {
          expect(context).toContain('CONTEXT');
          expect(context).toContain('CONTENT RULES');
        });
      });
    });

    describe('Array Handling', () => {
      it('should handle arrays with multiple items', () => {
        const analysis = {
          ...baseAnalysis,
          learningObjectives: ['Obj 1', 'Obj 2', 'Obj 3', 'Obj 4'],
          roles: ['Role 1', 'Role 2', 'Role 3'],
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('Obj 1');
        expect(context).toContain('Role 1');
      });

      it('should handle empty arrays', () => {
        const analysis = {
          ...baseAnalysis,
          learningObjectives: [],
          keyTopics: [],
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toBeDefined();
      });

      it('should join multiple objectives with commas', () => {
        const analysis = {
          ...baseAnalysis,
          learningObjectives: ['Learn A', 'Learn B', 'Learn C'],
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('Learn A, Learn B, Learn C');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long topic name', () => {
        const analysis = {
          ...baseAnalysis,
          topic: 'A'.repeat(500),
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toBeDefined();
      });

      it('should handle special characters in topic', () => {
        const analysis = {
          ...baseAnalysis,
          topic: 'SQL Injection & XSS (OWASP Top 10)',
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('SQL Injection & XSS');
      });

      it('should handle Unicode characters', () => {
        const analysis = {
          ...baseAnalysis,
          topic: 'Phishing Prävention für Sicherheit',
        };
        const context = buildContextData(analysis as any, baseMicrolearning);
        expect(context).toContain('Phishing');
      });
    });
  });
});
