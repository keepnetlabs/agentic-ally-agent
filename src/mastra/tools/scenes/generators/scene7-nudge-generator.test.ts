import { describe, it, expect } from 'vitest';
import { generateScene7Prompt } from './scene7-nudge-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 7 (Nudge) Generator
 * Tests prompt generation for behavioral implementation intention reminders
 */
describe('Scene 7 - Nudge Generator', () => {
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
        'Implementation Intentions': {
          description: 'Concrete plans improve behavior change',
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
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
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
        keyTopics: [],
        learningObjectives: [],
      };
      const prompt = generateScene7Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include SCENE 7 - NUDGE label', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCENE 7');
      expect(prompt).toContain('NUDGE');
      expect(prompt).toContain('Implementation Intention Reminder');
    });

    it('should include topic in context', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Topic: ' + baseAnalysis.topic);
    });

    it('should include key topics hint', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Key Topics:');
      expect(prompt).toContain('Email security');
    });

    it('should include category information', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Category: ' + baseAnalysis.category);
    });

    it('should include language specification', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Language: ' + baseAnalysis.language);
    });
  });

  // ==================== JSON OUTPUT RULES TESTS ====================
  describe('JSON Output Rules', () => {
    it('should require only key "7"', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Return ONLY key "7"');
      expect(prompt).toContain('NEVER "1", "2", etc.');
    });

    it('should require scene_type as nudge', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene_type MUST be "nudge"');
      expect(prompt).toContain('NEVER other types');
    });

    it('should prohibit extra fields', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Do NOT add extra fields');
      expect(prompt).toContain('or change field names');
    });

    it('should require valid JSON output', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Output ONLY valid JSON');
    });
  });

  // ==================== PRODUCTION EXAMPLE TESTS ====================
  describe('Production Example (Phishing)', () => {
    it('should include Phishing example subtitle', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Next time a suspicious email appears');
    });

    it('should include Phishing key message examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Recognise a suspicious email');
      expect(prompt).toContain("Don't click links or open unknown attachments");
      expect(prompt).toContain('Use the report button');
    });

    it('should explain how to adapt pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ADAPT THIS EXACT PATTERN');
    });
  });

  // ==================== SUBTITLE PATTERN TESTS ====================
  describe('Subtitle Pattern', () => {
    it('should explain subtitle structure', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SUBTITLE PATTERN');
      expect(prompt).toContain('Next time [specific situation');
      expect(prompt).toContain('you will [concrete action]');
    });

    it('should require specific observable trigger', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Situation: Must be specific');
      expect(prompt).toContain('observable trigger');
    });

    it('should require concrete actionable step', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action: Concrete');
      expect(prompt).toContain('immediately actionable step');
    });

    it('should specify subtitle format', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Format: Question/directive style');
      expect(prompt).toContain('ending with colon (:)');
    });

    it('should specify subtitle word limit', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 15 words');
    });

    it('should provide category-specific examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IF THREAT');
      expect(prompt).toContain('IF TOOL');
      expect(prompt).toContain('IF PROCESS');
    });
  });

  // ==================== KEY MESSAGE STRUCTURE TESTS ====================
  describe('Key Message Structure (3-Step)', () => {
    it('should explain 3-step dynamic framework', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('KEY MESSAGE STRUCTURE');
      expect(prompt).toContain('3-Step Dynamic Framework');
    });

    it('should include STEP 1 - RECOGNIZE', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('STEP 1 - RECOGNIZE');
      expect(prompt).toContain('Action verb + topic-specific indicator');
    });

    it('should include STEP 2 - PROTECT', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('STEP 2 - PROTECT');
      expect(prompt).toContain('Category-specific pattern');
    });

    it('should include STEP 3 - VERIFY', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('STEP 3 - VERIFY');
      expect(prompt).toContain('Escalation or confirmation action');
    });
  });

  // ==================== STEP 1 RECOGNIZE TESTS ====================
  describe('Step 1 - Recognize', () => {
    it('should specify RECOGNIZE pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('[Action verb] [specific indicator');
    });

    it('should include RECOGNIZE examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Recognise a suspicious email');
      expect(prompt).toContain('Recognise a suspicious caller');
      expect(prompt).toContain('Recognise a suspicious QR code');
    });

    it('should specify RECOGNIZE word limit', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('RECOGNIZE');
      expect(prompt).toContain('Max 6 words');
    });

    it('should include generic RECOGNIZE fallback', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('FOR ANY TOPIC NOT LISTED');
      expect(prompt).toContain('Generate');
      expect(prompt).toContain('Recognise [observable threat indicator');
    });
  });

  // ==================== STEP 2 PROTECT TESTS ====================
  describe('Step 2 - Protect', () => {
    it('should include THREAT category PROTECT pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IF category is THREAT:');
      expect(prompt).toContain('Pattern: "Don\'t [harmful action to avoid]"');
    });

    it('should include THREAT PROTECT examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Phishing: \"Don't click links");
      expect(prompt).toContain("Vishing: \"Don't confirm credentials");
      expect(prompt).toContain("Ransomware: \"Don't pay ransom");
      expect(prompt).toContain("Deepfake: \"Don't trust unusual media");
    });

    it('should include TOOL category PROTECT pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IF category is TOOL:');
      expect(prompt).toContain('Pattern: "[Enable/Use/Setup]');
    });

    it('should include TOOL PROTECT example', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Enable MFA before accessing');
    });

    it('should include PROCESS category PROTECT pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IF category is PROCESS:');
      expect(prompt).toContain('Pattern: "[Follow/Use/Apply]');
    });

    it('should include PROCESS PROTECT example', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Follow incident response procedures');
    });

    it('should specify PROTECT word limit', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROTECT');
      expect(prompt).toContain('Max 8 words');
    });

    it('should show category context in PROTECT', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('YOUR TOPIC CATEGORY:');
      expect(prompt).toContain('Apply the');
      expect(prompt).toContain('pattern above for');
    });
  });

  // ==================== STEP 3 VERIFY TESTS ====================
  describe('Step 3 - Verify', () => {
    it('should specify VERIFY pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('STEP 3 - VERIFY');
      expect(prompt).toContain('[Action verb] [escalation/reporting/verification method]');
    });

    it('should include VERIFY examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Use the report button');
      expect(prompt).toContain('Report to security team');
      expect(prompt).toContain('Report to IT team');
      expect(prompt).toContain('Report to IT immediately');
    });

    it('should include more VERIFY examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Report suspicious content to security');
      expect(prompt).toContain('Report to compliance officer');
      expect(prompt).toContain('Alert procurement team');
    });

    it('should specify VERIFY word limit', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('VERIFY');
      expect(prompt).toContain('Max 5 words');
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 7 JSON structure', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"7":');
    });

    it('should include iconName field', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('iconName');
      expect(prompt).toContain('topic-appropriate icon');
    });

    it('should specify icon examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("phishing->'mail-warning'");
      expect(prompt).toContain("vishing->'phone'");
      expect(prompt).toContain("quishing->'qr-code'");
      expect(prompt).toContain("ransomware->'alert-circle'");
      expect(prompt).toContain("deepfake->'video'");
      expect(prompt).toContain("malware->'shield-alert'");
    });

    it('should include subtitle field', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"subtitle":');
      expect(prompt).toContain('Your action plan to stay safe');
    });

    it('should include callToActionText field', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('callToActionText');
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('Continue');
    });

    it('should include texts object', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
      expect(prompt).toContain('"title":');
      expect(prompt).toContain('"subtitle":');
      expect(prompt).toContain('"actionsTitle":');
    });

    it('should include key_message array with 3 items', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"key_message":');
      expect((prompt.match(/Step [1-3]/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Implementation Intentions');
      expect(prompt).toContain('behavior change');
    });

    it('should include scene_type as nudge', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "nudge"');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene7Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene7Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene7Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support French', () => {
      const frAnalysis: any = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene7Prompt(frAnalysis, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese', () => {
      const zhAnalysis: any = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene7Prompt(zhAnalysis, baseMicrolearning);
      expect(prompt).toContain('zh');
    });

    it('should support Japanese', () => {
      const jaAnalysis: any = { ...baseAnalysis, language: 'ja' };
      const prompt = generateScene7Prompt(jaAnalysis, baseMicrolearning);
      expect(prompt).toContain('ja');
    });

    it('should localize title', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('Action Plan');
    });

    it('should localize actionsTitle', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Your next steps');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene7Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const finAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene7Prompt(finAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene7Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });

    it('should customize for Sales department', () => {
      const salesAnalysis: any = { ...baseAnalysis, department: 'Sales' };
      const prompt = generateScene7Prompt(salesAnalysis, baseMicrolearning);
      expect(prompt).toContain('Sales');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene7Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Vishing topic', () => {
      const vishingAnalysis: any = {
        ...baseAnalysis,
        topic: 'Vishing Prevention',
        keyTopics: ['Call verification', 'Credential protection'],
      };
      const prompt = generateScene7Prompt(vishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Prevention');
      expect(prompt).toContain('Vishing=');
    });

    it('should customize for Quishing topic', () => {
      const quishingAnalysis: any = {
        ...baseAnalysis,
        topic: 'Quishing Prevention',
        keyTopics: ['QR code', 'URL verification'],
      };
      const prompt = generateScene7Prompt(quishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Quishing Prevention');
      expect(prompt).toContain('Quishing=');
    });

    it('should customize for Ransomware topic', () => {
      const ransomAnalysis: any = {
        ...baseAnalysis,
        topic: 'Ransomware Recovery',
        keyTopics: ['Encryption signs', 'File locks'],
      };
      const prompt = generateScene7Prompt(ransomAnalysis, baseMicrolearning);
      expect(prompt).toContain('Ransomware Recovery');
    });

    it('should customize for Deepfake topic', () => {
      const deepfakeAnalysis: any = {
        ...baseAnalysis,
        topic: 'Deepfake Detection',
        keyTopics: ['Media quality', 'Voice sync'],
      };
      const prompt = generateScene7Prompt(deepfakeAnalysis, baseMicrolearning);
      expect(prompt).toContain('Deepfake Detection');
    });
  });

  // ==================== CATEGORY-SPECIFIC TESTS ====================
  describe('Category-Specific Patterns', () => {
    it('should adapt for THREAT category', () => {
      const threatAnalysis: any = { ...baseAnalysis, category: 'THREAT' };
      const prompt = generateScene7Prompt(threatAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain("Don't");
    });

    it('should adapt for TOOL category', () => {
      const toolAnalysis: any = {
        ...baseAnalysis,
        category: 'TOOL',
        keyTopics: ['MFA', 'Authentication'],
      };
      const prompt = generateScene7Prompt(toolAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOL');
      expect(prompt).toContain('Enable/Use/Setup');
    });

    it('should adapt for PROCESS category', () => {
      const processAnalysis: any = {
        ...baseAnalysis,
        category: 'PROCESS',
        keyTopics: ['Incident response', 'Procedures'],
      };
      const prompt = generateScene7Prompt(processAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESS');
      expect(prompt).toContain('Follow/Use/Apply');
    });
  });

  // ==================== KEY TOPICS HINT TESTS ====================
  describe('Key Topics Hint', () => {
    it('should include first 3 key topics', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Key Topics:');
      expect(prompt).toContain('Email security');
    });

    it('should handle missing key topics', () => {
      const noTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: undefined,
      };
      const prompt = generateScene7Prompt(noTopicsAnalysis, baseMicrolearning);
      expect(prompt).toContain('general security practice');
    });

    it('should handle empty key topics array', () => {
      const emptyTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: [],
      };
      const prompt = generateScene7Prompt(emptyTopicsAnalysis, baseMicrolearning);
      expect(prompt).toContain('general security practice');
    });

    it('should use keyTopicsHint for TOOL pattern', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('[feature from');
      expect(prompt).toContain('Key Topics');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace category placeholder', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.category);
      expect(prompt).not.toContain('${analysis.category}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
      expect(prompt).not.toContain('${analysis.language}');
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(2000);
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'Phishing & Email Security (2024)',
      };
      const prompt = generateScene7Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols',
      };
      const prompt = generateScene7Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(2000);
    });

    it('should handle short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Phishing' };
      const prompt = generateScene7Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should handle many key topics', () => {
      const manyTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: ['Topic1', 'Topic2', 'Topic3', 'Topic4', 'Topic5'],
      };
      const prompt = generateScene7Prompt(manyTopicsAnalysis, baseMicrolearning);
      expect(prompt).toContain('Topic1');
      expect(prompt).toContain('Topic2');
      expect(prompt).toContain('Topic3');
    });

    it('should handle single key topic', () => {
      const singleTopicAnalysis: any = {
        ...baseAnalysis,
        keyTopics: ['Email verification'],
      };
      const prompt = generateScene7Prompt(singleTopicAnalysis, baseMicrolearning);
      expect(prompt).toContain('Email verification');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete Phishing nudge', () => {
      const phishingAnalysis: PromptAnalysis = {
        language: 'en',
        topic: 'Phishing Prevention',
        title: 'Protect Against Phishing',
        description: 'Learn to identify phishing',
        category: 'THREAT',
        subcategory: 'Email Security',
        department: 'IT',
        level: 'intermediate',
        learningObjectives: ['Identify phishing'],
        duration: 5,
        industries: ['Technology'],
        roles: ['All Roles'],
        keyTopics: ['Email security', 'Red flags'],
        practicalApplications: ['Check headers'],
        assessmentAreas: ['Email analysis'],
      } as any;

      const prompt = generateScene7Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('suspicious email');
    });

    it('should handle Vishing threat nudge', () => {
      const vishingAnalysis: any = {
        ...baseAnalysis,
        topic: 'Vishing Prevention',
        category: 'THREAT',
        keyTopics: ['Call verification', 'Voice authentication'],
      };

      const prompt = generateScene7Prompt(vishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Prevention');
      expect(prompt).toContain('THREAT');
    });

    it('should handle MFA tool nudge', () => {
      const mfaAnalysis: any = {
        ...baseAnalysis,
        topic: 'Multi-Factor Authentication',
        category: 'TOOL',
        keyTopics: ['Authentication', 'Account security'],
      };

      const prompt = generateScene7Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
      expect(prompt).toContain('TOOL');
      expect(prompt).toContain('Enable/Use/Setup');
    });

    it('should handle process nudge', () => {
      const processAnalysis: any = {
        ...baseAnalysis,
        topic: 'Incident Response',
        category: 'PROCESS',
        keyTopics: ['Incident handling', 'Escalation'],
      };

      const prompt = generateScene7Prompt(processAnalysis, baseMicrolearning);
      expect(prompt).toContain('Incident Response');
      expect(prompt).toContain('PROCESS');
      expect(prompt).toContain('Follow/Use/Apply');
    });

    it('should handle German language nudge', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prevention',
      };

      const prompt = generateScene7Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prevention');
    });

    it('should handle Turkish language nudge', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avi Engelleme',
      };

      const prompt = generateScene7Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avi Engelleme');
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should maintain JSON structure markers', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain scene_type as nudge', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "nudge"');
    });

    it('should always include topic in key messages', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      const topicMatches = prompt.match(new RegExp(baseAnalysis.topic, 'g')) || [];
      expect(topicMatches.length).toBeGreaterThan(5);
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should reference Implementation Intentions theory', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Implementation Intentions');
    });

    it('should explain behavior change benefit', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Concrete plans improve behavior change');
    });
  });

  // ==================== THREAT EXAMPLES TESTS ====================
  describe('Threat-Specific Examples', () => {
    it('should include insider threat examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Insider-Threat');
      expect(prompt).toContain('unusual access requests');
      expect(prompt).toContain("Don't share credentials");
    });

    it('should include social engineering examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Social-Engineering');
      expect(prompt).toContain('manipulation attempts');
    });

    it('should include supply chain examples', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Supply-Chain');
      expect(prompt).toContain('unexpected vendor communications');
      expect(prompt).toContain('Alert procurement team');
    });
  });

  // ==================== WORD LIMIT ENFORCEMENT TESTS ====================
  describe('Word Limit Enforcement', () => {
    it('should specify subtitle max 15 words', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 15 words');
    });

    it('should specify RECOGNIZE max 6 words', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 6 words');
    });

    it('should specify PROTECT max 8 words', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 8 words');
    });

    it('should specify VERIFY max 5 words', () => {
      const prompt = generateScene7Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 5 words');
    });
  });
});
