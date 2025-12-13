import { describe, it, expect } from 'vitest';
import { generateScene8Prompt } from './scene8-summary-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 8 (Summary) Generator
 * Tests prompt generation for training completion and consolidation
 */
describe('Scene 8 - Summary Generator', () => {
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
    isCodeTopic: false,
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
        'Consolidation': {
          description: 'Review reinforces learning and provides closure',
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
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should require analysis parameter', () => {
      expect(() => {
        generateScene8Prompt(undefined as any, baseMicrolearning);
      }).toThrow();
    });

    it('should require microlearning parameter', () => {
      expect(() => {
        generateScene8Prompt(baseAnalysis, undefined as any);
      }).toThrow();
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
      const prompt = generateScene8Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include scene 8 label', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene 8');
      expect(prompt).toContain('summary');
    });

    it('should include critical rules', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CRITICAL RULES');
    });

    it('should include topic in context data', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include language specification', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Language: ' + baseAnalysis.language);
    });

    it('should include isCodeTopic flag', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('isCodeTopic:');
    });
  });

  // ==================== CRITICAL RULES TESTS ====================
  describe('Critical Rules', () => {
    it('should prohibit generating or inventing resources', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Use ONLY the resources provided below');
      expect(prompt).toContain('NEVER generate, invent, or suggest alternatives');
    });

    it('should require keeping resource titles as provided', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Keep resource titles as provided');
      expect(prompt).toContain('from database');
    });

    it('should specify translation rules', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Translate only if explicitly needed');
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 8 JSON structure', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"8":');
      expect(prompt).toContain('trophy');
    });

    it('should include texts object', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
    });

    it('should include immediateActions array', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"immediateActions":');
    });

    it('should include key_message array', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"key_message":');
    });

    it('should include resources array', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"resources":');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Summary');
      expect(prompt).toContain('Consolidation');
    });

    it('should include scene_type as summary', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "summary"');
    });
  });

  // ==================== COMPLETION TITLE TESTS ====================
  describe('Completion Title', () => {
    it('should request completion title', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('completionTitle');
      expect(prompt).toContain("Well done — you've completed the training");
    });

    it('should specify word limit for completion title', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 8 words');
    });

    it('should include completion title examples', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing=');
      expect(prompt).toContain('Well done');
    });
  });

  // ==================== COMPLETION SUBTITLE TESTS ====================
  describe('Completion Subtitle', () => {
    it('should request completion subtitle', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('completionSubtitle');
      expect(prompt).toContain('Topic-specific awareness completion');
    });

    it('should provide Phishing example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Phishing='You've refreshed your phishing awareness'");
    });

    it('should provide Quishing example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Quishing='You've sharpened your QR code detection'");
    });

    it('should provide Ransomware example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Ransomware='You've learned recovery procedures'");
    });

    it('should provide Deepfake example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Deepfake='You've strengthened your verification skills'");
    });

    it('should provide MFA example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("MFA='You've secured your account protection'");
    });

    it('should specify subtitle word limit', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 8 words');
    });

    it('should include pattern guidance', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("'You've [verb] your");
      expect(prompt).toContain('[awareness/skills/knowledge]');
    });
  });

  // ==================== LOCALIZATION FIELDS TESTS ====================
  describe('Localization Fields', () => {
    it('should request Download Training Logs localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('downloadTrainingLogsText');
      expect(prompt).toContain('Download Training Logs');
    });

    it('should request Retry localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('retryText');
      expect(prompt).toContain('Retry');
    });

    it('should request achievements title localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('achievementsTitle');
      expect(prompt).toContain('Your achievements');
    });

    it('should request action plan title localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('actionPlanTitle');
      expect(prompt).toContain('Next steps');
    });

    it('should request resources title localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('resourcesTitle');
      expect(prompt).toContain('Additional resources');
    });

    it('should request certificate title localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateTitle');
      expect(prompt).toContain('Certificate of Completion');
    });

    it('should request Save and Finish localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('saveAndFinish');
      expect(prompt).toContain('Save and Finish');
    });

    it('should request certificate awarded text localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateAwardedText');
      expect(prompt).toContain('This certificate is awarded to');
    });

    it('should request certificate completion text localization', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateCompletionText');
      expect(prompt).toContain('for successful completion of');
    });
  });

  // ==================== MOTIVATIONAL MESSAGE TESTS ====================
  describe('Motivational Messages', () => {
    it('should request motivational title', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('motivationalTitle');
      expect(prompt).toContain('max 3 words');
    });

    it('should provide motivational title examples', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Stay alert');
      expect(prompt).toContain('Stay vigilant');
      expect(prompt).toContain('Keep safe');
    });

    it('should request motivational message', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('motivationalMessage');
      expect(prompt).toContain('Organizational benefit message');
    });

    it('should specify motivational message is generic', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('generic, works for ANY topic');
    });

    it('should provide motivational message pattern', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Pattern: '[Action/Training] helps keep");
      expect(prompt).toContain('[safer/secure/protected]');
    });

    it('should include motivational message example', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Completing this training helps keep your organisation safer');
    });

    it('should specify motivational message word limit', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Max 12 words');
    });
  });

  // ==================== IMMEDIATE ACTIONS TESTS ====================
  describe('Immediate Actions', () => {
    it('should include "Do now" immediate action', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("'Do now'");
    });

    it('should include "This week" immediate action', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("'This week'");
    });

    it('should request tool-specific immediate action pattern', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Tool-specific immediate action');
      expect(prompt).toContain("Pattern: 'Use [tool/button]");
    });

    it('should provide tool action examples', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Use the Report button');
      expect(prompt).toContain('something looks suspicious');
    });

    it('should request social/behavioral action pattern', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Social/behavioral action');
      expect(prompt).toContain("Pattern: 'Encourage [audience]");
    });

    it('should provide social action examples', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Encourage your team to report suspicious emails');
      expect(prompt).toContain('Teach colleagues');
    });

    it('should specify tool action word limit', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      const matches = prompt.match(/Max 12 words/g) || [];
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should specify social action word limit', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      const matches = prompt.match(/Max 10 words/g) || [];
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  // ==================== KEY MESSAGES TESTS ====================
  describe('Key Messages (Meta-Level)', () => {
    it('should include 3 key messages', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"key_message":');
      const keyMatches = prompt.match(/Meta-level/g) || [];
      expect(keyMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('should include completion message', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Meta-level completion message');
      expect(prompt).toContain('Training completed');
    });

    it('should include application message', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Meta-level application message');
      expect(prompt).toContain("Apply what you've practised");
    });

    it('should include social message', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Meta-level social message');
      expect(prompt).toContain('Share and encourage others');
    });

    it('should specify messages are generic', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('generic, same for ALL topics');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene8Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene8Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene8Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support French', () => {
      const frAnalysis: any = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene8Prompt(frAnalysis, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese', () => {
      const zhAnalysis: any = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene8Prompt(zhAnalysis, baseMicrolearning);
      expect(prompt).toContain('zh');
    });

    it('should support Japanese', () => {
      const jaAnalysis: any = { ...baseAnalysis, language: 'ja' };
      const prompt = generateScene8Prompt(jaAnalysis, baseMicrolearning);
      expect(prompt).toContain('ja');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene8Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const finAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene8Prompt(finAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene8Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene8Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Password Security topic', () => {
      const passwordAnalysis: any = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene8Prompt(passwordAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password Security');
    });

    it('should customize for Ransomware topic', () => {
      const ransomAnalysis: any = { ...baseAnalysis, topic: 'Ransomware Recovery' };
      const prompt = generateScene8Prompt(ransomAnalysis, baseMicrolearning);
      expect(prompt).toContain('Ransomware Recovery');
    });

    it('should customize for MFA topic', () => {
      const mfaAnalysis: any = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene8Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
    });
  });

  // ==================== CODE TOPIC TESTS ====================
  describe('Code Topic Handling', () => {
    it('should detect non-code topics', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('isCodeTopic: false');
    });

    it('should handle code topics', () => {
      const codeAnalysis: any = {
        ...baseAnalysis,
        topic: 'SQL Injection Prevention',
        isCodeTopic: true,
      };
      const prompt = generateScene8Prompt(codeAnalysis, baseMicrolearning);
      expect(prompt).toContain('isCodeTopic: true');
    });
  });

  // ==================== RESOURCE HANDLING TESTS ====================
  describe('Resource Handling', () => {
    it('should include resources array in JSON', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"resources":');
    });

    it('should format resources with title, type, and url', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"title":');
      expect(prompt).toContain('"type":');
      expect(prompt).toContain('"url":');
    });

    it('should embed resources as JSON not instructions', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"resources":');
      expect(prompt).toContain('"title":');
      expect(prompt).toContain('"url":');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
      expect(prompt).not.toContain('${analysis.language}');
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
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
      const prompt = generateScene8Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols',
      };
      const prompt = generateScene8Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(2000);
    });

    it('should handle short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Phishing' };
      const prompt = generateScene8Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should handle missing key topics', () => {
      const noTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: undefined,
      };
      const prompt = generateScene8Prompt(noTopicsAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle empty key topics array', () => {
      const emptyTopicsAnalysis: any = {
        ...baseAnalysis,
        keyTopics: [],
      };
      const prompt = generateScene8Prompt(emptyTopicsAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete Phishing summary', () => {
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
        isCodeTopic: false,
      } as any;

      const prompt = generateScene8Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('certificate');
      expect(prompt).toContain('resources');
    });

    it('should handle German language summary', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prävention',
      };

      const prompt = generateScene8Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prävention');
    });

    it('should handle Turkish language summary', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avı Engelleme',
      };

      const prompt = generateScene8Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avı Engelleme');
    });

    it('should handle code topic summary', () => {
      const codeAnalysis: any = {
        ...baseAnalysis,
        topic: 'SQL Injection Prevention',
        isCodeTopic: true,
      };

      const prompt = generateScene8Prompt(codeAnalysis, baseMicrolearning);
      expect(prompt).toContain('SQL Injection Prevention');
      expect(prompt).toContain('isCodeTopic: true');
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should maintain JSON structure markers', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain scene_type as summary', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "summary"');
    });

    it('should always use trophy icon', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"iconName": "trophy"');
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should reference Summary learning principle', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Summary');
      expect(prompt).toContain('Consolidation');
    });

    it('should explain review benefit', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Review reinforces learning');
      expect(prompt).toContain('provides closure');
    });
  });

  // ==================== CERTIFICATE FIELDS TESTS ====================
  describe('Certificate Fields', () => {
    it('should include certificate title', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateTitle');
    });

    it('should include certificate awarded text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateAwardedText');
    });

    it('should include certificate completion text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateCompletionText');
    });

    it('should include certificate date text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('certificateDateText');
    });

    it('should include download certificate button', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('downloadButton');
      expect(prompt).toContain('Download certificate');
    });
  });

  // ==================== STATUS MESSAGE FIELDS TESTS ====================
  describe('Status Message Fields', () => {
    it('should include saving text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('savingText');
      expect(prompt).toContain('Saving…');
    });

    it('should include finished text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('finishedText');
      expect(prompt).toContain('Saved');
    });

    it('should include finish error text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('finishErrorText');
      expect(prompt).toContain('LMS connection failed');
    });

    it('should include downloading text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('downloadingText');
      expect(prompt).toContain('Downloading…');
    });

    it('should include downloaded text', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('downloadedText');
      expect(prompt).toContain('Downloaded');
    });
  });

  // ==================== LABEL FIELDS TESTS ====================
  describe('Label Fields', () => {
    it('should include urgent label', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('urgentLabel');
      expect(prompt).toContain('Urgent');
    });

    it('should include points label', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('pointsLabel');
      expect(prompt).toContain('Points');
    });

    it('should include time label', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('timeLabel');
      expect(prompt).toContain('Time');
    });

    it('should include completion label', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('completionLabel');
      expect(prompt).toContain('Completion');
    });
  });

  // ==================== WORD LIMIT TESTS ====================
  describe('Word Limits', () => {
    it('should specify completion title max 8 words', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('completion');
      expect(prompt).toContain('max 8 words');
    });

    it('should specify completion subtitle max 8 words', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('completionSubtitle');
      expect(prompt).toContain('max 8 words');
    });

    it('should specify motivational title max 3 words', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('motivationalTitle');
      expect(prompt).toContain('max 3 words');
    });

    it('should specify motivational message max 12 words', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('motivationalMessage');
      expect(prompt).toContain('Max 12 words');
    });

    it('should specify key message word limits', () => {
      const prompt = generateScene8Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect(prompt).toContain('Max 3 words');
      expect(prompt).toContain('Max 5 words');
      expect(prompt).toContain('Max 4 words');
    });
  });
});
