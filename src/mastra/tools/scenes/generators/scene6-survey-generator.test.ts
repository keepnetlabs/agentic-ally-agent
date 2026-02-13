import { describe, it, expect } from 'vitest';
import { generateScene6Prompt } from './scene6-survey-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 6 (Survey) Generator
 * Tests prompt generation for feedback and self-assessment surveys
 */
describe('Scene 6 - Survey Generator', () => {
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
        Metacognition: {
          description: 'Self-assessment promotes learning awareness',
        },
      },
    },
    scenes: [
      { sceneId: 1, type: 'intro', metadata: { duration_seconds: 20 } },
      { sceneId: 2, type: 'goals', metadata: { duration_seconds: 20 } },
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
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
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
      const prompt = generateScene6Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include scene 6 label', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene 6');
      expect(prompt).toContain('survey');
    });

    it('should include topic in context data', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include department information', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 6 JSON structure', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"6":');
      expect(prompt).toContain('iconName');
    });

    it('should include list-checks icon', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('list-checks');
      expect(prompt).toContain('MUST be "list-checks"');
    });

    it('should warn against topic-specific icons', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER use topic-specific icons');
    });

    it('should include title field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"title":');
    });

    it('should include subtitle field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"subtitle":');
    });

    it('should include texts object', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
    });

    it('should include ariaTexts object', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"ariaTexts":');
    });

    it('should include topics array', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"topics":');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Metacognition');
    });

    it('should include scene_type as survey', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "survey"');
    });
  });

  // ==================== TITLE AND SUBTITLE TESTS ====================
  describe('Title and Subtitle Localization', () => {
    it('should request localization for title', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('Share Your Experience');
    });

    it('should specify title must be generic', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Title format: 'Share Your Experience' (generic) OR 'Share Your [Topic] Experience'");
    });

    it('should request localization for subtitle', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Help us improve your training experience');
    });

    it('should request direct text output', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Output localized text directly');
      expect(prompt).toContain('not instructions');
    });
  });

  // ==================== SURVEY QUESTIONS TESTS ====================
  describe('Survey Questions', () => {
    it('should include ratingQuestion field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ratingQuestion');
      expect(prompt).toContain('Confidence question');
      expect(prompt).toContain('max 12 words');
    });

    it('should include topicsQuestion field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('topicsQuestion');
      expect(prompt).toContain('Practice areas question');
      expect(prompt).toContain('max 10 words');
    });

    it('should include feedbackQuestion field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackQuestion');
      expect(prompt).toContain('Feedback question');
      expect(prompt).toContain('max 8 words');
    });

    it('should request generic questions', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Questions (ratingQuestion, topicsQuestion, feedbackQuestion) must be generic');
      expect(prompt).toContain('applicable to any topic');
    });

    it('should include department context in questions', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('for ' + baseAnalysis.topic);
      expect(prompt).toContain('(' + baseAnalysis.department + ')');
    });
  });

  // ==================== UI TEXT LOCALIZATION TESTS ====================
  describe('UI Text Localization', () => {
    it('should localize feedback placeholder', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackPlaceholder');
      expect(prompt).toContain('Type your thoughts here...');
    });

    it('should localize submit button', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submitButton');
      expect(prompt).toContain('Submit');
    });

    it('should localize submitting text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submittingText');
      expect(prompt).toContain('Submitting...');
    });

    it('should localize submitted text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submittedText');
      expect(prompt).toContain('Submitted');
    });

    it('should localize rating required message', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ratingRequiredText');
      expect(prompt).toContain('Please select a rating');
    });

    it('should localize data security notice', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('dataSecurityNotice');
      expect(prompt).toContain('anonymous and protected');
    });
  });

  // ==================== SUCCESS MESSAGE TESTS ====================
  describe('Success Messages', () => {
    it('should include successTitle field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('successTitle');
      expect(prompt).toContain('Thank you');
    });

    it('should include thankYouMessage field', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('thankYouMessage');
      expect(prompt).toContain('Stay safe');
    });
  });

  // ==================== TOPICS ARRAY TESTS ====================
  describe('Topics Array (Topic-Specific)', () => {
    it('should include topics array with 2 skills', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"topics":');
      const topicsMatches = prompt.match(/skill for/gi) || [];
      expect(topicsMatches.length).toBeGreaterThanOrEqual(2);
    });

    it('should request topic-specific skills', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Skill for ' + baseAnalysis.topic);
    });

    it('should include category context for skills', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('(' + baseAnalysis.category + ')');
    });

    it('should specify word limit for skills', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('3-5 words');
    });

    it('should specify language for skills', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('in ' + baseAnalysis.language);
    });

    it('should note topics are only topic-specific part', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ONLY topics array should be topic-specific');
    });
  });

  // ==================== ACCESSIBILITY (ARIA) TESTS ====================
  describe('Accessibility (ARIA) Requirements', () => {
    it('should include mainLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mainLabel');
      expect(prompt).toContain('Confidence and feedback form');
    });

    it('should include successDescription aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('successDescription');
      expect(prompt).toContain('Form submitted successfully');
    });

    it('should include successRegionLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('successRegionLabel');
      expect(prompt).toContain('Success message');
    });

    it('should include successIconLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('successIconLabel');
      expect(prompt).toContain('Checkmark icon');
    });

    it('should include formDescription aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('formDescription');
      expect(prompt).toContain('Confidence rating');
    });

    it('should include headerLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('headerLabel');
      expect(prompt).toContain('Form title');
    });

    it('should include ratingDescription aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ratingDescription');
      expect(prompt).toContain('Confidence rating description');
      expect(prompt).toContain('max 8 words');
    });

    it('should include starLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('starLabel');
      expect(prompt).toContain('star');
    });

    it('should include topicsDescription aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('topicsDescription');
      expect(prompt).toContain('Practice areas description');
    });

    it('should include topicLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('topicLabel');
      expect(prompt).toContain('Topic checkbox');
    });

    it('should include feedbackDescription aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackDescription');
      expect(prompt).toContain('Text area for additional comments');
    });

    it('should include feedbackLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackLabel');
      expect(prompt).toContain('Feedback field');
    });

    it('should include submitSectionLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submitSectionLabel');
      expect(prompt).toContain('Submission section');
    });

    it('should include submittingLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submittingLabel');
      expect(prompt).toContain('Submitting status');
    });

    it('should include submitLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submitLabel');
      expect(prompt).toContain('Submit button');
    });

    it('should include securityNoticeLabel aria text', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('securityNoticeLabel');
      expect(prompt).toContain('Data privacy note');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene6Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene6Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene6Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support French', () => {
      const frAnalysis: any = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene6Prompt(frAnalysis, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese', () => {
      const zhAnalysis: any = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene6Prompt(zhAnalysis, baseMicrolearning);
      expect(prompt).toContain('zh');
    });

    it('should support Japanese', () => {
      const jaAnalysis: any = { ...baseAnalysis, language: 'ja' };
      const prompt = generateScene6Prompt(jaAnalysis, baseMicrolearning);
      expect(prompt).toContain('ja');
    });

    it('should localize all texts in target language', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain(baseAnalysis.language);
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene6Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const finAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene6Prompt(finAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene6Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });

    it('should customize for Sales department', () => {
      const salesAnalysis: any = { ...baseAnalysis, department: 'Sales' };
      const prompt = generateScene6Prompt(salesAnalysis, baseMicrolearning);
      expect(prompt).toContain('Sales');
    });

    it('should customize for Operations department', () => {
      const opsAnalysis: any = { ...baseAnalysis, department: 'Operations' };
      const prompt = generateScene6Prompt(opsAnalysis, baseMicrolearning);
      expect(prompt).toContain('Operations');
    });

    it('should customize for Management department', () => {
      const mgmtAnalysis: any = { ...baseAnalysis, department: 'Management' };
      const prompt = generateScene6Prompt(mgmtAnalysis, baseMicrolearning);
      expect(prompt).toContain('Management');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene6Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Password Security topic', () => {
      const passwordAnalysis: any = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene6Prompt(passwordAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password Security');
    });

    it('should customize for Ransomware topic', () => {
      const ransomAnalysis: any = { ...baseAnalysis, topic: 'Ransomware Recovery' };
      const prompt = generateScene6Prompt(ransomAnalysis, baseMicrolearning);
      expect(prompt).toContain('Ransomware Recovery');
    });

    it('should customize for MFA topic', () => {
      const mfaAnalysis: any = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene6Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
    });
  });

  // ==================== CATEGORY-SPECIFIC TESTS ====================
  describe('Category-Specific Content', () => {
    it('should adapt for THREAT category', () => {
      const threatAnalysis: any = { ...baseAnalysis, category: 'THREAT' };
      const prompt = generateScene6Prompt(threatAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT');
    });

    it('should adapt for TOOL category', () => {
      const toolAnalysis: any = { ...baseAnalysis, category: 'TOOL' };
      const prompt = generateScene6Prompt(toolAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOL');
    });

    it('should adapt for PROCESS category', () => {
      const processAnalysis: any = { ...baseAnalysis, category: 'PROCESS' };
      const prompt = generateScene6Prompt(processAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESS');
    });
  });

  // ==================== CRITICAL INSTRUCTION TESTS ====================
  describe('Critical Instructions', () => {
    it('should emphasize iconName must be list-checks', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('iconName MUST be "list-checks"');
      expect(prompt).toContain('NEVER use topic-specific icons');
    });

    it('should emphasize generic title requirement', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Title format: 'Share Your Experience' (generic) OR 'Share Your [Topic] Experience'");
    });

    it('should specify generic questions requirement', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Questions');
      expect(prompt).toContain('must be generic');
      expect(prompt).toContain('applicable to any topic');
    });

    it('should specify topic-specific topics array only', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ONLY topics array should be topic-specific');
    });

    it('should specify scene_type must be survey', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCENE_TYPE MUST ALWAYS BE "survey"');
      expect(prompt).toContain('NEVER "summary" or anything else');
    });

    it('should request text similar to examples', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Return like 'example'");
      expect(prompt).toContain('text SIMILAR to example');
      expect(prompt).toContain('NOT the instruction itself');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
      expect(prompt).not.toContain('${analysis.language}');
    });

    it('should replace category placeholder', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.category);
      expect(prompt).not.toContain('${analysis.category}');
    });

    it('should replace department placeholder', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
      expect(prompt).not.toContain('${analysis.department}');
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(1500);
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'Phishing & Email Security (2024)',
      };
      const prompt = generateScene6Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols',
      };
      const prompt = generateScene6Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(1500);
    });

    it('should handle short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Phishing' };
      const prompt = generateScene6Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should handle missing subcategory', () => {
      const noSubAnalysis: any = {
        ...baseAnalysis,
        subcategory: undefined,
      };
      const prompt = generateScene6Prompt(noSubAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle empty learning objectives', () => {
      const noObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene6Prompt(noObjAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete Phishing survey training', () => {
      const phishingAnalysis: PromptAnalysis = {
        language: 'en',
        topic: 'Phishing Prevention',
        title: 'Protect Against Phishing',
        description: 'Learn to identify phishing',
        category: 'THREAT',
        subcategory: 'Email Security',
        department: 'IT',
        level: 'intermediate',
        learningObjectives: ['Identify phishing', 'Report safely'],
        duration: 5,
        industries: ['Technology'],
        roles: ['All Roles'],
        keyTopics: ['Email security', 'Red flags'],
        practicalApplications: ['Check headers'],
        assessmentAreas: ['Email analysis'],
      } as any;

      const prompt = generateScene6Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('list-checks');
      expect(prompt).toContain('Share Your Experience');
    });

    it('should handle German language survey', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prevention',
      };

      const prompt = generateScene6Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prevention');
    });

    it('should handle Turkish language survey', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avi Engelleme',
      };

      const prompt = generateScene6Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avi Engelleme');
    });

    it('should handle Finance fraud survey', () => {
      const fraudAnalysis: any = {
        ...baseAnalysis,
        department: 'Finance',
        topic: 'Fraud Detection',
        category: 'THREAT',
      };

      const prompt = generateScene6Prompt(fraudAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
      expect(prompt).toContain('Fraud Detection');
    });

    it('should handle HR compliance survey', () => {
      const complianceAnalysis: any = {
        ...baseAnalysis,
        department: 'HR',
        topic: 'Workplace Compliance',
        category: 'PROCESS',
      };

      const prompt = generateScene6Prompt(complianceAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
      expect(prompt).toContain('Workplace Compliance');
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should maintain JSON structure markers', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain scene_type as survey', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "survey"');
    });

    it('should always use list-checks icon', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"iconName": "list-checks"');
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should reference Metacognition theory', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Metacognition');
    });

    it('should explain self-assessment benefit', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Self-assessment promotes learning awareness');
    });
  });

  // ==================== DATA PRIVACY TESTS ====================
  describe('Data Privacy and Security', () => {
    it('should include data security notice', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('dataSecurityNotice');
      expect(prompt).toContain('anonymous');
      expect(prompt).toContain('protected');
    });

    it('should reassure anonymity', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Your responses are anonymous');
    });

    it('should include security label in aria', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('securityNoticeLabel');
      expect(prompt).toContain('Data privacy note');
    });
  });

  // ==================== WORD LIMIT TESTS ====================
  describe('Word Limits', () => {
    it('should specify ratingQuestion max 12 words', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
    });

    it('should specify topicsQuestion max 10 words', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 10 words');
    });

    it('should specify feedbackQuestion max 8 words', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 8 words');
    });

    it('should specify aria text word limits', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ratingDescription');
      expect(prompt).toContain('max 8 words');
    });
  });

  // ==================== FORM STRUCTURE TESTS ====================
  describe('Form Structure', () => {
    it('should specify confidence rating component', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('star');
      expect(prompt).toContain('rating');
    });

    it('should specify topic checkboxes', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('topicLabel');
      expect(prompt).toContain('checkbox');
    });

    it('should specify feedback text area', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackLabel');
      expect(prompt).toContain('Text area');
    });

    it('should specify submit button in form', () => {
      const prompt = generateScene6Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('submitButton');
      expect(prompt).toContain('Submit');
    });
  });
});
