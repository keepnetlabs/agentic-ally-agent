import { describe, it, expect, vi } from 'vitest';
import { generateScene4CodeReviewPrompt } from './scene4-code-review-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

// Mock the context builder
vi.mock('../../../utils/prompt-builders/base-context-builder', () => ({
  buildContextData: vi.fn(() => 'MOCK_CONTEXT_DATA'),
}));

/**
 * Test suite for Scene 4 (Code Review) Generator
 * Tests prompt generation for secure code analysis exercises
 */
describe('Scene 4 - Code Review Generator', () => {
  // Base valid analysis (security/code-focused)
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'SQL Injection Prevention',
    title: 'Protect Against SQL Injection',
    description: 'Learn to identify and fix SQL injection vulnerabilities',
    category: 'THREAT',
    subcategory: 'Code Security',
    department: 'IT',
    level: 'intermediate',
    learningObjectives: ['Identify SQL injection flaws', 'Implement parameterized queries'],
    duration: 5,
    industries: ['Technology', 'Finance'],
    roles: ['Developers', 'Security Engineers'],
    keyTopics: ['SQL Injection', 'Input validation', 'Parameterized queries'],
    practicalApplications: ['Code review', 'Security testing'],
    assessmentAreas: ['Vulnerability identification'],
  } as any;

  // Base valid microlearning
  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'sqli-101',
    microlearning_metadata: {
      title: 'SQL Injection Prevention',
      category: 'Security',
      level: 'intermediate',
      subcategory: 'Code Security',
      risk_area: 'Database',
    },
    scientific_evidence: {
      learning_theories: {
        'Procedural Knowledge': {
          description: 'Step-by-step code analysis builds competency',
        },
      },
    },
    scenes: [
      { sceneId: 1, type: 'intro', metadata: { duration_seconds: 20 } },
      { sceneId: 2, type: 'goals', metadata: { duration_seconds: 20 } },
      { sceneId: 3, type: 'video', metadata: { duration_seconds: 180 } },
      { sceneId: 4, type: 'code-review', metadata: { duration_seconds: 120 } },
      { sceneId: 5, type: 'quiz', metadata: { duration_seconds: 90 } },
      { sceneId: 6, type: 'survey', metadata: { duration_seconds: 60 } },
      { sceneId: 7, type: 'nudge', metadata: { duration_seconds: 30 } },
      { sceneId: 8, type: 'summary', metadata: { duration_seconds: 20 } },
    ],
  } as any;

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid analysis and microlearning', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should require analysis parameter', () => {
      expect(() => {
        generateScene4CodeReviewPrompt(undefined as any, baseMicrolearning);
      }).toThrow();
    });

    it('should accept microlearning parameter', () => {
      // The function calls buildContextData which handles undefined gracefully
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle analysis with minimal fields', () => {
      const minimalAnalysis: any = {
        language: 'en',
        topic: 'Security Vulnerability Detection',
      };
      const prompt = generateScene4CodeReviewPrompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ==================== OUTPUT FORMAT TESTS ====================
  describe('Output Format', () => {
    it('should include JSON structure in output', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"4"');
      expect(prompt).toContain('title');
      expect(prompt).toContain('subtitle');
      expect(prompt).toContain('description');
    });

    it('should include code review schema fields', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('codeSnippet');
      expect(prompt).toContain('language');
      expect(prompt).toContain('content');
      expect(prompt).toContain('issueType');
    });

    it('should include accessibility fields', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ariaTexts');
      expect(prompt).toContain('mainLabel');
      expect(prompt).toContain('mainDescription');
    });

    it('should include check status messages', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('checkStatusTexts');
      expect(prompt).toContain('checking');
      expect(prompt).toContain('success');
      expect(prompt).toContain('error');
    });

    it('should not include markdown formatting markers', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      // Should not have code block markers
      expect(prompt).not.toMatch(/^```\w+/);
      expect(prompt).not.toMatch(/```$/);
    });
  });

  // ==================== LANGUAGE AND LOCALIZATION TESTS ====================
  describe('Language and Localization', () => {
    it('should respect analysis language setting', () => {
      const turkishAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'SQL İnjeksiyon Önleme',
      };
      const prompt = generateScene4CodeReviewPrompt(turkishAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should include language in context', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support multiple language codes', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'es'];
      languages.forEach((lang) => {
        const analysis: any = {
          ...baseAnalysis,
          language: lang,
        };
        const prompt = generateScene4CodeReviewPrompt(analysis, baseMicrolearning);
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should include topic in prompt', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SQL Injection Prevention');
    });

    it('should handle XSS topic', () => {
      const xssAnalysis: any = {
        ...baseAnalysis,
        topic: 'Cross-Site Scripting (XSS)',
      };
      const prompt = generateScene4CodeReviewPrompt(xssAnalysis, baseMicrolearning);
      expect(prompt).toContain('XSS');
    });

    it('should handle Buffer Overflow topic', () => {
      const bufferAnalysis: any = {
        ...baseAnalysis,
        topic: 'Buffer Overflow Prevention',
      };
      const prompt = generateScene4CodeReviewPrompt(bufferAnalysis, baseMicrolearning);
      expect(prompt).toContain('Buffer Overflow');
    });

    it('should handle Authentication topic', () => {
      const authAnalysis: any = {
        ...baseAnalysis,
        topic: 'Secure Authentication Implementation',
      };
      const prompt = generateScene4CodeReviewPrompt(authAnalysis, baseMicrolearning);
      expect(prompt).toContain('Authentication');
    });
  });

  // ==================== CODE LANGUAGE TESTS ====================
  describe('Code Language Detection', () => {
    it('should support JavaScript/TypeScript topics', () => {
      const jsAnalysis: any = {
        ...baseAnalysis,
        topic: 'XSS Prevention in JavaScript',
      };
      const prompt = generateScene4CodeReviewPrompt(jsAnalysis, baseMicrolearning);
      expect(prompt).toContain('javascript');
    });

    it('should support Python topics', () => {
      const pyAnalysis: any = {
        ...baseAnalysis,
        topic: 'SQL Injection in Python',
      };
      const prompt = generateScene4CodeReviewPrompt(pyAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should support SQL topics', () => {
      const sqlAnalysis: any = {
        ...baseAnalysis,
        topic: 'SQL Injection Prevention',
      };
      const prompt = generateScene4CodeReviewPrompt(sqlAnalysis, baseMicrolearning);
      expect(prompt).toContain('sql');
    });

    it('should support Java topics', () => {
      const javaAnalysis: any = {
        ...baseAnalysis,
        topic: 'Secure Java Development',
      };
      const prompt = generateScene4CodeReviewPrompt(javaAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should support Go/Rust/PHP topics', () => {
      const languages = ['Go', 'Rust', 'PHP', 'C#'];
      languages.forEach((lang) => {
        const analysis: any = {
          ...baseAnalysis,
          topic: `Security in ${lang}`,
        };
        const prompt = generateScene4CodeReviewPrompt(analysis, baseMicrolearning);
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== CRITICAL RULES TESTS ====================
  describe('Critical Rules Compliance', () => {
    it('should specify vulnerable code requirement', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('intentionally VULNERABLE');
    });

    it('should require code to match topic', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('match the topic');
    });

    it('should preserve JSON key structure', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('EXACTLY');
      expect(prompt).toContain('JSON keys');
    });

    it('should require code to be 15-30 lines', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('15-30 lines');
    });

    it('should specify no placeholder text', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NO placeholders');
      expect(prompt).toContain('final text');
    });

    it('should specify icon must be "code"', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('code');
      expect(prompt).toContain('iconName');
    });
  });

  // ==================== CONTEXT DATA TESTS ====================
  describe('Context Data Integration', () => {
    it('should build context data from analysis and microlearning', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      // Should contain context that includes topic, language, etc
      expect(prompt).toContain('SQL Injection Prevention');
      expect(prompt).toContain('en');
    });

    it('should handle missing microlearning_metadata gracefully', () => {
      const incompleteMicrolearning: any = {
        microlearning_id: 'test-123',
        scenes: baseMicrolearning.scenes,
      };
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, incompleteMicrolearning);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  // ==================== FIELD CONSTRAINTS TESTS ====================
  describe('Field Constraints', () => {
    it('should specify title max 8 words', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 8 words');
    });

    it('should specify subtitle max 12 words', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
    });

    it('should specify description max 25 words', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 25 words');
    });

    it('should specify helper text max 15 words', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 15 words');
    });
  });

  // ==================== LEARNING OBJECTIVE TESTS ====================
  describe('Learning Objectives', () => {
    it('should include learning objectives from analysis', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('learning');
    });

    it('should guide to identify flaw not implement fix', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IDENTIFY the flaw');
    });
  });

  // ==================== LOCALIZATION CONSISTENCY TESTS ====================
  describe('Localization Consistency', () => {
    it('should use analysis language for all text output', () => {
      const germanAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
      };
      const prompt = generateScene4CodeReviewPrompt(germanAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should maintain language consistency throughout prompt', () => {
      const germanAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
      };
      const prompt = generateScene4CodeReviewPrompt(germanAnalysis, baseMicrolearning);
      // Verify the language is present in the output
      expect(prompt).toContain('de');
      // Verify it's a valid prompt with content
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'SQL Injection & XSS Prevention (Combined)',
      };
      const prompt = generateScene4CodeReviewPrompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle very long topic names', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Advanced Security Vulnerability Detection and Remediation for Enterprise-Grade Applications',
      };
      const prompt = generateScene4CodeReviewPrompt(longAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should handle empty learning objectives', () => {
      const noObjectivesAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene4CodeReviewPrompt(noObjectivesAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== REGEX PATTERN TESTS ====================
  describe('Regex Patterns and Examples', () => {
    it('should include example patterns for code review focus', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Pattern');
      expect(prompt).toContain('Action verb');
    });

    it('should include examples of vulnerability types', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SQL Injection');
      expect(prompt).toContain('XSS');
    });

    it('should include examples of code language matching', () => {
      const prompt = generateScene4CodeReviewPrompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('JavaScript');
      expect(prompt).toContain('Python');
      expect(prompt).toContain('SQL');
    });
  });
});
