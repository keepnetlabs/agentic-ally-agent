import { describe, it, expect, vi } from 'vitest';
import { generateScene5Prompt } from './scene5-quiz-generator';

vi.mock('../../../utils/prompt-builders/base-context-builder', () => ({
  buildContextData: (analysis: any, microlearning: any) => {
    const theories = microlearning?.scientific_evidence?.learning_theories
      ? Object.keys(microlearning.scientific_evidence.learning_theories).join(', ')
      : 'Active Recall';

    return `
Generate ${analysis.language} training content for "${analysis.topic}" in STRICT JSON only.
=== CONTEXT ===
Level: ${analysis.level} | Department: ${analysis.department}
Category: ${analysis.category}
Objectives: ${analysis.learningObjectives?.join(', ') || 'General'}
Roles: ${analysis.roles?.join(', ')}
Industries: ${analysis.industries?.join(', ')}
Key Topics: ${analysis.keyTopics?.join(', ')}
Practical Applications: ${analysis.practicalApplications?.join(', ') || ''}
Assessment Areas: ${analysis.assessmentAreas?.join(', ') || ''}
Custom Requirements: ${analysis.customRequirements || 'None'}
Compliance: ${analysis.regulationCompliance?.join(', ') || 'General'}

SCIENTIFIC CONTEXT:
Risk Area: ${microlearning?.microlearning_metadata?.risk_area || 'General'}
Learning Theories: ${theories}

SCIENTIFIC_EVIDENCE
`;
  },
}));
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 5 (Quiz) Generator
 * Tests prompt generation for knowledge assessment quizzes
 */
describe('Scene 5 - Quiz Generator', () => {
  // Base valid analysis
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Phishing Prevention',
    title: 'Stop Phishing Attacks',
    description: 'Learn to identify and report phishing emails',
    category: 'THREAT',
    subcategory: 'Email Security',
    department: 'IT',
    level: 'intermediate',
    learningObjectives: ['Identify phishing emails', 'Report suspicious messages'],
    duration: 5,
    industries: ['Technology'],
    roles: ['All Roles'],
    keyTopics: ['Email security', 'Red flags', 'Reporting'],
    practicalApplications: ['Check email headers', 'Verify sender identity'],
    assessmentAreas: ['Email analysis'],
  } as any;

  // Base valid microlearning
  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'phishing-101',
    microlearning_metadata: {
      title: 'Phishing Prevention',
      category: 'Security',
      level: 'intermediate',
      subcategory: 'Email Security',
      risk_area: 'Email',
    },
    scientific_evidence: {
      learning_theories: {
        'Active Recall': {
          description: 'Testing enhances retention',
        },
      },
    },
    scenes: [
      { sceneId: 1, type: 'intro', metadata: { duration_seconds: 20 } },
      { sceneId: 2, type: 'goals', metadata: { duration_seconds: 30 } },
      { sceneId: 3, type: 'video', metadata: { duration_seconds: 180 } },
      { sceneId: 4, type: 'actionable', metadata: { duration_seconds: 120 } },
      { sceneId: 5, type: 'quiz', metadata: { duration_seconds: 90 } },
      { sceneId: 6, type: 'survey', metadata: { duration_seconds: 60 } },
      { sceneId: 7, type: 'nudge', metadata: { duration_seconds: 30 } },
      { sceneId: 8, type: 'summary', metadata: { duration_seconds: 20 } },
    ],
  } as any;

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid analysis and microlearning', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle analysis with minimal fields', () => {
      const minimalAnalysis: any = {
        language: 'en',
        topic: 'Security',
        department: 'IT',
        level: 'intermediate',
        category: 'THREAT',
        learningObjectives: [],
        keyTopics: [],
      };
      const prompt = generateScene5Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include QUESTION PATTERNS section', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('QUESTION PATTERNS');
      expect(prompt).toContain('Adapt structure to');
    });

    it('should include topic in context data', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include department information', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
    });

    it('should include learning objectives', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Identify phishing emails');
    });

    it('should include language specification', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
    });

    it('should include category in prompt', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.category);
    });
  });

  // ==================== QUESTION PATTERN TESTS ====================
  describe('Question Patterns', () => {
    it('should include THREAT pattern template', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT Pattern');
      expect(prompt).toContain('Template:');
      expect(prompt).toContain('Decision?');
    });

    it('should include TOOL pattern template', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOL Pattern');
      expect(prompt).toContain('Template:');
      expect(prompt).toContain('Action?');
    });

    it('should include PROCESS pattern template', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESS Pattern');
      expect(prompt).toContain('Template:');
      expect(prompt).toContain('Choice?');
    });

    it('should have pattern examples', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('GOOD:');
    });

    it('should include distractor system', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('DISTRACTOR" SYSTEM');
      expect(prompt).toContain('IMPULSIVE MISTAKE');
      expect(prompt).toContain('NEAR-MISS');
      expect(prompt).toContain('FALSE SECURITY');
    });

    it('should specify distractor types', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IMPULSIVE MISTAKE');
      expect(prompt).toContain('NEAR-MISS');
      expect(prompt).toContain('FALSE SECURITY');
    });

    it('should include sequence markers', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('1.');
      expect(prompt).toContain('2.');
      expect(prompt).toContain('3.');
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 5 JSON structure', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"5":');
      expect(prompt).toContain('iconName');
      expect(prompt).toContain('brain');
    });

    it('should include required title localization instructions', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize \'Test Your Knowledge\'');
    });

    it('should include subtitle localization instructions', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize \'Make the right decision');
    });

    it('should include quiz completion texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('quizCompletionCallToActionText');
      expect(prompt).toContain('callToActionText');
    });

    it('should include key_message array with 3 items', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect((prompt.match(/Action message/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    it('should include questions object with structure', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('questions');
      expect(prompt).toContain('totalCount');
      expect(prompt).toContain('maxAttempts');
      expect(prompt).toContain('list');
    });

    it('should include multiple question types', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('multiple_choice');
      expect(prompt).toContain('true_false');
    });

    it('should include multiple choice question structure', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('report-scenario');
      expect(prompt).toContain('options');
      expect(prompt).toContain('isCorrect');
    });

    it('should include true/false question structure', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('belief-test');
      expect(prompt).toContain('correctAnswer');
      expect(prompt).toContain('statement');
    });

    it('should include texts object for localization', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
      expect(prompt).toContain('"question":');
      expect(prompt).toContain('"nextQuestion":');
      expect(prompt).toContain('"checkAnswer":');
    });

    it('should include ariaTexts object for accessibility', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"ariaTexts":');
      expect(prompt).toContain('mainLabel');
      expect(prompt).toContain('mainDescription');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Active Recall');
      expect(prompt).toContain('retention');
    });

    it('should include scene_type as quiz', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene_type');
      expect(prompt).toContain('quiz');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene5Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene5Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene5Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support French', () => {
      const frAnalysis: any = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene5Prompt(frAnalysis, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese (simplified)', () => {
      const zhAnalysis: any = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene5Prompt(zhAnalysis, baseMicrolearning);
      expect(prompt).toContain('zh');
    });

    it('should support Japanese', () => {
      const jaAnalysis: any = { ...baseAnalysis, language: 'ja' };
      const prompt = generateScene5Prompt(jaAnalysis, baseMicrolearning);
      expect(prompt).toContain('ja');
    });

    it('should support Spanish', () => {
      const esAnalysis: any = { ...baseAnalysis, language: 'es' };
      const prompt = generateScene5Prompt(esAnalysis, baseMicrolearning);
      expect(prompt).toContain('es');
    });

    it('should include localization instructions in prompt', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('language');
    });

    it('should request native language text outputs', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('directly');
      expect(prompt).toContain('instructions');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene5Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const financeAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene5Prompt(financeAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene5Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });

    it('should customize for Sales department', () => {
      const salesAnalysis: any = { ...baseAnalysis, department: 'Sales' };
      const prompt = generateScene5Prompt(salesAnalysis, baseMicrolearning);
      expect(prompt).toContain('Sales');
    });

    it('should customize for Operations department', () => {
      const opsAnalysis: any = { ...baseAnalysis, department: 'Operations' };
      const prompt = generateScene5Prompt(opsAnalysis, baseMicrolearning);
      expect(prompt).toContain('Operations');
    });

    it('should customize for Management department', () => {
      const mgmtAnalysis: any = { ...baseAnalysis, department: 'Management' };
      const prompt = generateScene5Prompt(mgmtAnalysis, baseMicrolearning);
      expect(prompt).toContain('Management');
    });

    it('should work with All departments designation', () => {
      const allAnalysis: any = { ...baseAnalysis, department: 'All' };
      const prompt = generateScene5Prompt(allAnalysis, baseMicrolearning);
      expect(prompt).toContain('All');
    });
  });

  // ==================== CATEGORY-BASED TESTS ====================
  describe('Category-Based Question Generation', () => {
    it('should generate THREAT category questions', () => {
      const threatAnalysis: any = { ...baseAnalysis, category: 'THREAT' };
      const prompt = generateScene5Prompt(threatAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('safest response');
    });

    it('should generate TOOL category questions', () => {
      const toolAnalysis: any = { ...baseAnalysis, category: 'TOOL' };
      const prompt = generateScene5Prompt(toolAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOL');
      expect(prompt).toContain('correct approach');
    });

    it('should generate PROCESS category questions', () => {
      const processAnalysis: any = { ...baseAnalysis, category: 'PROCESS' };
      const prompt = generateScene5Prompt(processAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESS');
      expect(prompt).toContain('appropriate action');
    });

    it('should include category-specific question format', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('QUESTION FORMAT');
    });

    it('should specify correct question format for category', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT category ask');
      expect(prompt).toContain('TOOL category ask');
      expect(prompt).toContain('PROCESS category ask');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene5Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Password Security topic', () => {
      const passwordAnalysis: any = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene5Prompt(passwordAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password Security');
    });

    it('should customize for MFA topic', () => {
      const mfaAnalysis: any = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene5Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
    });

    it('should request topic-consistent content', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOPIC CONSISTENCY');
      expect(prompt).toContain('Keep all quiz content focused strictly on');
    });

    it('should include topic in key messages', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('for ' + baseAnalysis.topic);
    });
  });

  // ==================== LEARNING OBJECTIVES TESTS ====================
  describe('Learning Objectives Integration', () => {
    it('should include learning objectives in context', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Objectives');
      expect(prompt).toContain('Identify phishing emails');
    });

    it('should work with single objective', () => {
      const singleObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: ['Identify threats'],
      };
      const prompt = generateScene5Prompt(singleObjAnalysis, baseMicrolearning);
      expect(prompt).toContain('Identify threats');
    });

    it('should work with multiple objectives', () => {
      const multiObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: ['Identify threats', 'Report incidents', 'Prevent breaches'],
      };
      const prompt = generateScene5Prompt(multiObjAnalysis, baseMicrolearning);
      expect(prompt).toContain('Identify threats');
      expect(prompt).toContain('Report incidents');
      expect(prompt).toContain('Prevent breaches');
    });

    it('should work with empty objectives array', () => {
      const noObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene5Prompt(noObjAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== LEVEL ADAPTATION TESTS ====================
  describe('Level Adaptation', () => {
    it('should include context level information', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Level:');
      expect(prompt).toContain(baseAnalysis.level);
    });

    it('should work with Beginner level', () => {
      const beginnerAnalysis: any = { ...baseAnalysis, level: 'Beginner' };
      const prompt = generateScene5Prompt(beginnerAnalysis, baseMicrolearning);
      expect(prompt).toContain('Beginner');
    });

    it('should work with Intermediate level', () => {
      const intAnalysis: any = { ...baseAnalysis, level: 'Intermediate' };
      const prompt = generateScene5Prompt(intAnalysis, baseMicrolearning);
      expect(prompt).toContain('Intermediate');
    });

    it('should work with Advanced level', () => {
      const advAnalysis: any = { ...baseAnalysis, level: 'Advanced' };
      const prompt = generateScene5Prompt(advAnalysis, baseMicrolearning);
      expect(prompt).toContain('Advanced');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder in context', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      // Should contain actual topic, not placeholder
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
      expect(prompt).not.toContain('${analysis.language}');
    });

    it('should replace department placeholder', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
      expect(prompt).not.toContain('${analysis.department}');
    });

    it('should replace category placeholder', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT');
      expect(prompt).not.toContain('${analysis.category}');
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      // Prompt should be long enough to contain the JSON schema and instructions
      expect(prompt.length).toBeGreaterThan(1500);
    });
  });

  // ==================== CRITICAL INSTRUCTIONS TESTS ====================
  describe('Critical Instructions', () => {
    it('should include instruction to never use placeholders', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER use placeholder');
      expect(prompt).toContain('Replace ALL content');
    });

    it('should emphasize topic consistency requirement', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOPIC CONSISTENCY');
    });

    it('should include category-based question instruction', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CATEGORY-BASED QUESTIONS');
    });

    it('should specify question format rules', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('QUESTION FORMAT');
    });

    it('should explain scalability approach', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCALABILITY');
    });
  });

  // ==================== LOCALIZATION REQUIREMENTS TESTS ====================
  describe('Localization Requirements', () => {
    it('should request translations for callToActionText', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('callToActionText');
      expect(prompt).toContain('Localize');
    });

    it('should request translations for all UI texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('question');
      expect(prompt).toContain('nextQuestion');
      expect(prompt).toContain('checkAnswer');
      expect(prompt).toContain('Localize');
    });

    it('should require localization for accessibility texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ariaTexts');
    });

    it('should request direct language output', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Output localized text directly');
      expect(prompt).toContain('not instructions');
    });
  });

  // ==================== QUESTION STRUCTURE VALIDATION TESTS ====================
  describe('Question Structure Details', () => {
    it('should specify totalCount as 2', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('totalCount');
      expect(prompt).toContain('2');
    });

    it('should specify maxAttempts as 2', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('maxAttempts');
    });

    it('should include multiple choice question with 4 options', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mistake1');
      expect(prompt).toContain('mistake2');
      expect(prompt).toContain('mistake3');
      expect(prompt).toContain('correct');
    });

    it('should specify correct answer count for multiple choice', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"isCorrect": true');
      expect(prompt).toContain('"isCorrect": false');
    });

    it('should include true/false question with options structure', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('true');
      expect(prompt).toContain('false');
      expect(prompt).toContain('check');
      expect(prompt).toContain('icon');
    });

    it('should include explanation for each question', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('explanation');
      expect(prompt).toContain('Why correct');
      expect(prompt).toContain('benefit');
    });

    it('should limit explanations to 25 words', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 25 words');
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  describe('Accessibility (ARIA) Requirements', () => {
    it('should include mainLabel aria text', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mainLabel');
      expect(prompt).toContain('Quiz interface');
    });

    it('should include mainDescription aria text', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mainDescription');
      expect(prompt).toContain('Interactive quiz');
    });

    it('should include question-related aria texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('questionLabel');
      expect(prompt).toContain('questionDescription');
    });

    it('should include option type aria texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('multipleChoiceLabel');
      expect(prompt).toContain('trueFalseLabel');
    });

    it('should include result panel aria texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('resultPanelLabel');
      expect(prompt).toContain('resultPanelDescription');
    });

    it('should include navigation aria texts', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('navigationLabel');
      expect(prompt).toContain('previousQuestionLabel');
      expect(prompt).toContain('nextQuestionLabel');
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'Phishing & Email Security (2024)',
      };
      const prompt = generateScene5Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security (2024)');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols in Enterprise Environments',
      };
      const prompt = generateScene5Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(1500);
    });

    it('should handle special department name', () => {
      const specialDeptAnalysis: any = {
        ...baseAnalysis,
        department: 'IT & Security',
      };
      const prompt = generateScene5Prompt(specialDeptAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT & Security');
    });

    it('should handle empty key topics array', () => {
      const noTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: [],
      };
      const prompt = generateScene5Prompt(noTopicsAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle missing subcategory', () => {
      const noSubcategoryAnalysis: any = {
        ...baseAnalysis,
        subcategory: undefined,
      };
      const prompt = generateScene5Prompt(noSubcategoryAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle very short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Spam' };
      const prompt = generateScene5Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Spam');
    });

    it('should handle multiple roles', () => {
      const multiRoleAnalysis: any = {
        ...baseAnalysis,
        roles: ['Manager', 'Team Lead', 'Employee'],
      };
      const prompt = generateScene5Prompt(multiRoleAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle multiple industries', () => {
      const multiIndAnalysis: any = {
        ...baseAnalysis,
        industries: ['Technology', 'Finance', 'Healthcare'],
      };
      const prompt = generateScene5Prompt(multiIndAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete IT Phishing training', () => {
      const itPhishingAnalysis: PromptAnalysis = {
        language: 'en',
        topic: 'Phishing Prevention',
        title: 'Protect Against Phishing',
        description: 'Learn to identify and report phishing attempts',
        category: 'THREAT',
        subcategory: 'Email Security',
        department: 'IT',
        level: 'intermediate',
        learningObjectives: [
          'Identify phishing emails',
          'Report suspicious messages',
          'Prevent credential theft',
        ],
        duration: 5,
        industries: ['Technology', 'Finance'],
        roles: ['All Roles'],
        keyTopics: ['Email security', 'Red flags', 'Reporting procedures'],
        practicalApplications: ['Check email headers', 'Verify sender identity', 'Use secure reporting'],
        assessmentAreas: ['Email analysis', 'Threat recognition'],
      } as any;

      const prompt = generateScene5Prompt(itPhishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('IT');
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('en');
    });

    it('should handle Finance fraud training', () => {
      const fraudAnalysis: any = {
        ...baseAnalysis,
        topic: 'Fraud Detection',
        department: 'Finance',
        category: 'THREAT',
        learningObjectives: ['Spot fraud patterns', 'Report anomalies'],
      };

      const prompt = generateScene5Prompt(fraudAnalysis, baseMicrolearning);
      expect(prompt).toContain('Fraud Detection');
      expect(prompt).toContain('Finance');
      expect(prompt).toContain('THREAT');
    });

    it('should handle HR training on compliance', () => {
      const complianceAnalysis: any = {
        ...baseAnalysis,
        topic: 'Compliance Training',
        department: 'HR',
        category: 'PROCESS',
        learningObjectives: ['Follow procedures', 'Document correctly'],
      };

      const prompt = generateScene5Prompt(complianceAnalysis, baseMicrolearning);
      expect(prompt).toContain('Compliance Training');
      expect(prompt).toContain('HR');
      expect(prompt).toContain('PROCESS');
    });

    it('should handle MFA tool training', () => {
      const mfaAnalysis: any = {
        ...baseAnalysis,
        topic: 'Multi-Factor Authentication Setup',
        department: 'IT',
        category: 'TOOL',
        learningObjectives: ['Enable MFA', 'Backup codes'],
      };

      const prompt = generateScene5Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
      expect(prompt).toContain('IT');
      expect(prompt).toContain('TOOL');
    });

    it('should handle German language Phishing training', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prävention',
      };

      const prompt = generateScene5Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prävention');
    });

    it('should handle Turkish language training', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avı Engelleme',
      };

      const prompt = generateScene5Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avı Engelleme');
    });

    it('should handle advanced level training', () => {
      const advAnalysis: any = {
        ...baseAnalysis,
        level: 'Advanced',
        learningObjectives: [
          'Analyze attack patterns',
          'Design defenses',
          'Train others',
        ],
      };

      const prompt = generateScene5Prompt(advAnalysis, baseMicrolearning);
      expect(prompt).toContain('Advanced');
      expect(prompt.length).toBeGreaterThan(1500);
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should use consistent placeholder format', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      // All placeholders should be replaced, not left as ${...}
      const placeholderMatches = prompt.match(/\$\{[^}]+\}/g) || [];
      expect(placeholderMatches.length).toBe(0);
    });

    it('should maintain JSON structure validity markers', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain consistent scene type naming', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "quiz"');
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should include scientific learning theory reference', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
    });

    it('should reference Active Recall learning theory', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Active Recall');
    });

    it('should explain testing benefit', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('retention');
    });

    it('should reference gap identification', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('identifies knowledge gaps');
    });
  });

  // ==================== CONTEXT DATA INTEGRATION TESTS ====================
  describe('Context Data Integration', () => {
    it('should include analysis context from buildContextData', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CONTEXT');
      expect(prompt).toContain('Level:');
      expect(prompt).toContain('Category:');
    });

    it('should include practical applications in context', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Practical Applications');
    });

    it('should include assessment areas in context', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Assessment Areas');
    });

    it('should include compliance requirements if provided', () => {
      const complianceAnalysis: any = {
        ...baseAnalysis,
        regulationCompliance: ['GDPR', 'HIPAA', 'SOC2'],
      };
      const prompt = generateScene5Prompt(complianceAnalysis, baseMicrolearning);
      expect(prompt).toContain('Compliance:');
      expect(prompt).toContain('GDPR');
    });

    it('should include scientific evidence context', () => {
      const prompt = generateScene5Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCIENTIFIC CONTEXT');
    });
  });
});
