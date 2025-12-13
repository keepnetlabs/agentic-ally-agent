import { describe, it, expect } from 'vitest';
import { generateScene4Prompt } from './scene4-actionable-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 4 (Actionable) Generator
 * Tests prompt generation for email inbox practice scenarios
 */
describe('Scene 4 - Actionable Generator', () => {
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
        'Procedural Knowledge': {
          description: 'Step-by-step guidance builds competency',
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
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should require analysis parameter', () => {
      expect(() => {
        generateScene4Prompt(undefined as any, baseMicrolearning);
      }).toThrow();
    });

    it('should require microlearning parameter', () => {
      expect(() => {
        generateScene4Prompt(baseAnalysis, undefined as any);
      }).toThrow();
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
      const prompt = generateScene4Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include ACTIONABLE SCENE label', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ACTIONABLE SCENE');
    });

    it('should include inbox-based format requirement', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Always inbox-based');
      expect(prompt).toContain('email inbox simulation');
    });

    it('should include topic in context data', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include department information', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
    });
  });

  // ==================== INBOX FORMAT REQUIREMENT TESTS ====================
  describe('Inbox Format Requirement', () => {
    it('should enforce email format regardless of topic', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ALWAYS an email inbox simulation');
      expect(prompt).toContain('regardless of topic');
    });

    it('should handle vishing with email format', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('vishing');
      expect(prompt).toContain('email');
      expect(prompt).toContain('callback');
    });

    it('should handle physical topics with email format', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('tailgating');
      expect(prompt).toContain('USB');
      expect(prompt).toContain('EMAIL format');
    });

    it('should warn against non-mail icons', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER use');
      expect(prompt).toContain('phone');
      expect(prompt).toContain('message-square');
      expect(prompt).toContain('usb');
    });

    it('should require mail-check icon for scene', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mail-check');
      expect(prompt).toContain('MUST always be "mail-check"');
    });
  });

  // ==================== TITLE REQUIREMENT TESTS ====================
  describe('Title Requirements', () => {
    it('should request topic-aware action-oriented title', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Topic-aware, action-oriented practice title');
      expect(prompt).toContain('INBOX FORMAT ALWAYS');
    });

    it('should provide Phishing title example', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Phishing→'Practice Phishing Detection'");
    });

    it('should provide Ransomware title example', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Ransomware→'Spot Ransomware Emails'");
    });

    it('should provide Vishing title example', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Vishing→'Practice Email Callback Scams'");
    });

    it('should specify title pattern', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREATS/TOOLS→"[Practice/Spot/Check]');
      expect(prompt).toContain('[Topic] [Detection/Emails]"');
    });

    it('should warn against generic titles', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER generic like "Spot Suspicious Emails"');
    });
  });

  // ==================== SUBTITLE REQUIREMENT TESTS ====================
  describe('Subtitle Requirements', () => {
    it('should request 3 action verbs', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('3 verbs + objects');
      expect(prompt).toContain('max 12 words');
    });

    it('should provide threat subtitle pattern', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Check [sender/content]');
      expect(prompt).toContain('spot [threats/risks]');
      expect(prompt).toContain('report/verify safely');
    });

    it('should provide process subtitle pattern', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Review [practices]');
      expect(prompt).toContain('identify [gaps]');
      expect(prompt).toContain('verify [compliance]');
    });

    it('should provide production examples', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Check emails, spot threats, and report safely');
      expect(prompt).toContain('Review practices, identify risks, verify compliance');
    });

    it('should emphasize action verbs', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CHECK, SPOT, REPORT, PRESS');
      expect(prompt).toContain('avoid');
      expect(prompt).toContain('understand');
      expect(prompt).toContain('learn');
    });
  });

  // ==================== KEY MESSAGES REQUIREMENT TESTS ====================
  describe('Key Messages Requirements', () => {
    it('should request 3 key messages', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect(prompt).toContain('Step 1');
      expect(prompt).toContain('Step 2');
      expect(prompt).toContain('Step 3');
    });

    it('should request step 1 check action', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 1 - Check action');
      expect(prompt).toContain('Check the email');
      expect(prompt).toContain('Review sender source');
    });

    it('should request step 2 protective directive', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 2 - Protective directive');
      expect(prompt).toContain("Don't click links");
      expect(prompt).toContain('Spot warning signs');
    });

    it('should request step 3 action outcome', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 3 - Action outcome');
      expect(prompt).toContain('Press Report');
      expect(prompt).toContain('Report if suspicious');
    });

    it('should specify word limits for key messages', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('3-5 words');
    });

    it('should provide production examples', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("phishing→['Check the email', 'Don't click links', 'Press Report']");
      expect(prompt).toContain("Security Protocols→['Review practices', 'Identify violations', 'Verify compliance']");
    });
  });

  // ==================== ACTIONS STRUCTURE TESTS ====================
  describe('Actions Structure', () => {
    it('should include 3 actions (email inspection steps)', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Actions: 3 cards');
      expect(prompt).toContain('email inspection steps');
    });

    it('should have action 1 for checking sender', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action 1: Check sender/source');
      expect(prompt).toContain('Check the Sender');
      expect(prompt).toContain('Review Email Source');
    });

    it('should have action 2 for spotting threats', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action 2: Spot threats/warnings');
      expect(prompt).toContain('Spot Warning Signs');
      expect(prompt).toContain('Identify Threats');
    });

    it('should have action 3 for reporting', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action 3: Report/verify');
      expect(prompt).toContain('Report It Safely');
      expect(prompt).toContain('Report Suspicious Emails');
    });

    it('should specify action structure with title, description, tip', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Titles: 3-5 words');
      expect(prompt).toContain('Descriptions: max 15 words');
      expect(prompt).toContain('Tips: max 12 words');
    });

    it('should require correct icon names for actions', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action 1 iconName: MUST be "mail"');
      expect(prompt).toContain('Action 2 iconName: MUST be "alert-triangle"');
      expect(prompt).toContain('Action 3 iconName: MUST be "flag"');
    });
  });

  // ==================== ACTION DESCRIPTIONS TESTS ====================
  describe('Action Descriptions', () => {
    it('should request specific warning signs for action 1', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Mismatched URLs and urgent requests');
      expect(prompt).toContain('warning signs');
    });

    it('should request protective action for action 2', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("Avoid clicking suspicious links");
      expect(prompt).toContain('opening unknown attachments');
    });

    it('should request outcome/impact for action 3', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Use Report button');
      expect(prompt).toContain('IT can investigate');
    });

    it('should include example descriptions', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Review the sender, subject and content');
      expect(prompt).toContain('Hover over links to preview');
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 4 JSON structure', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"4":');
      expect(prompt).toContain('iconName');
      expect(prompt).toContain('mail-check');
    });

    it('should include title field', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"title":');
    });

    it('should include subtitle field', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"subtitle":');
    });

    it('should include callToActionText field', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('callToActionText');
      expect(prompt).toContain('Start Practice');
    });

    it('should include successCallToActionText field', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('successCallToActionText');
      expect(prompt).toContain('Continue');
    });

    it('should include key_message array', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"key_message":');
    });

    it('should include actions array with 3 items', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"actions":');
      expect((prompt.match(/"title":/g) || []).length).toBeGreaterThan(3);
    });

    it('should include tipConfig object', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('tipConfig');
      expect(prompt).toContain('info');
    });

    it('should include texts object', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
      expect(prompt).toContain('mobileHint');
      expect(prompt).toContain('feedbackCorrect');
      expect(prompt).toContain('feedbackWrong');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Procedural Knowledge');
    });

    it('should include scene_type as actionable_content', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene_type');
      expect(prompt).toContain('actionable_content');
    });
  });

  // ==================== FEEDBACK MESSAGES TESTS ====================
  describe('Feedback Messages', () => {
    it('should request mobile hint with action steps', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mobileHint');
      expect(prompt).toContain('Open each email');
      expect(prompt).toContain('Press Report');
      expect(prompt).toContain('max 12 words');
    });

    it('should request success feedback with team impact', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackCorrect');
      expect(prompt).toContain('Success message');
      expect(prompt).toContain('reporting helps protect everyone');
      expect(prompt).toContain('Emphasize team impact');
    });

    it('should request error feedback guiding retry', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('feedbackWrong');
      expect(prompt).toContain('Error message');
      expect(prompt).toContain('email looks safe');
      expect(prompt).toContain('check the sender carefully');
    });

    it('should specify emoji requirements for feedback', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('💡');
      expect(prompt).toContain('✅');
      expect(prompt).toContain('⚠️');
    });

    it('should include feedback examples', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('reporting helps protect everyone');
      expect(prompt).toContain('email was suspicious');
      expect(prompt).toContain('email looks safe');
      expect(prompt).toContain('check the sender carefully');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene4Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene4Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene4Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should request localization for Start Practice', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('Start Practice');
    });

    it('should request localization for Continue', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Localize');
      expect(prompt).toContain('Continue');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene4Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const finAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene4Prompt(finAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene4Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene4Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Ransomware topic', () => {
      const ransomAnalysis: any = { ...baseAnalysis, topic: 'Ransomware Recovery' };
      const prompt = generateScene4Prompt(ransomAnalysis, baseMicrolearning);
      expect(prompt).toContain('Ransomware Recovery');
    });

    it('should customize for Password Security topic', () => {
      const passwordAnalysis: any = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene4Prompt(passwordAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password Security');
    });

    it('should match examples style for topic', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Match examples style but adapt to');
    });
  });

  // ==================== CRITICAL INSTRUCTION TESTS ====================
  describe('Critical Instructions', () => {
    it('should emphasize INBOX FORMAT ONLY', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('INBOX FORMAT ONLY (CRITICAL)');
      expect(prompt).toContain('iconName MUST ALWAYS be "mail-check"');
    });

    it('should enforce email-focused title', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Title MUST be topic-aware action-oriented');
      expect(prompt).toContain('NOT generic');
    });

    it('should handle vishing as email callback scams', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('vishing/smishing/phone topics');
      expect(prompt).toContain('Title/content still about EMAILS');
      expect(prompt).toContain('NOT phone calls');
    });

    it('should require learner inbox checking format', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Learner always checks inbox');
      expect(prompt).toContain('never makes calls');
    });

    it('should prohibit placeholder text', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NO placeholders');
      expect(prompt).toContain('NO "Return..."');
      expect(prompt).toContain('NO "Other examples"');
    });

    it('should require exact JSON keys', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Use EXACTLY these JSON keys');
      expect(prompt).toContain('do not add or remove any');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
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
      const prompt = generateScene4Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols',
      };
      const prompt = generateScene4Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(2000);
    });

    it('should handle short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Phishing' };
      const prompt = generateScene4Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should handle missing learning objectives', () => {
      const noObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene4Prompt(noObjAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete Phishing inbox training', () => {
      const phishingAnalysis: PromptAnalysis = {
        language: 'en',
        topic: 'Phishing Prevention',
        title: 'Protect Against Phishing',
        description: 'Learn to identify phishing emails',
        category: 'THREAT',
        subcategory: 'Email Security',
        department: 'IT',
        level: 'intermediate',
        learningObjectives: ['Identify phishing', 'Report safely'],
        duration: 5,
        industries: ['Technology'],
        roles: ['All Roles'],
        keyTopics: ['Email security', 'Red flags'],
        practicalApplications: ['Check headers', 'Verify sender'],
        assessmentAreas: ['Email analysis'],
      } as any;

      const prompt = generateScene4Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('mail-check');
      expect(prompt).toContain('Practice Phishing Detection');
    });

    it('should handle Vishing with email format', () => {
      const vishingAnalysis: any = {
        ...baseAnalysis,
        topic: 'Vishing Prevention',
        category: 'THREAT',
      };

      const prompt = generateScene4Prompt(vishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Vishing Prevention');
      expect(prompt).toContain('email');
      expect(prompt).toContain('callback');
    });

    it('should handle German language training', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prävention',
      };

      const prompt = generateScene4Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prävention');
    });

    it('should handle Turkish language training', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avı Engelleme',
      };

      const prompt = generateScene4Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avı Engelleme');
    });

    it('should handle Finance fraud training', () => {
      const fraudAnalysis: any = {
        ...baseAnalysis,
        department: 'Finance',
        topic: 'Fraud Detection',
        category: 'THREAT',
      };

      const prompt = generateScene4Prompt(fraudAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
      expect(prompt).toContain('Fraud Detection');
    });

    it('should handle compliance process training', () => {
      const complianceAnalysis: any = {
        ...baseAnalysis,
        topic: 'Security Compliance Review',
        category: 'PROCESS',
      };

      const prompt = generateScene4Prompt(complianceAnalysis, baseMicrolearning);
      expect(prompt).toContain('Compliance');
      expect(prompt).toContain('PROCESS');
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should maintain JSON structure markers', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain scene_type as actionable_content', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "actionable_content"');
    });

    it('should always use mail-check icon', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"iconName": "mail-check"');
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should reference Procedural Knowledge', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Procedural Knowledge');
    });

    it('should explain competency building', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step-by-step guidance builds competency');
    });
  });

  // ==================== WORD LIMIT TESTS ====================
  describe('Word Limits', () => {
    it('should specify subtitle max 12 words', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
    });

    it('should specify action titles 3-5 words', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('3-5 words');
    });

    it('should specify descriptions max 15 words', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 15 words');
    });

    it('should specify tips max 12 words', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Tips: max 12 words');
    });

    it('should specify feedback max limits', () => {
      const prompt = generateScene4Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('max 12 words');
      expect(prompt).toContain('max 15 words');
    });
  });
});
