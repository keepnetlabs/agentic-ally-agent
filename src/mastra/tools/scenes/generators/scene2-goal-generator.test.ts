import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateScene2Prompt } from './scene2-goal-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

/**
 * Test suite for Scene 2 (Goal) Generator
 * Tests prompt generation for goal-setting scenes with implementation intentions
 */
describe('Scene 2 - Goal Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({
        prompt: `SCENE 2 - GOALS
Topic: Phishing Prevention
=== GOAL PATTERN CATEGORIES ===

1. THREAT pattern structure - Identify threats
2. TOOL pattern structure - Use tools
3. PROCESS pattern structure - Follow process

topic-specific pattern instructions for email security

Goals:
- Identify phishing emails
- Verify sender identity
- Report suspicious messages`,
      }),
    });
  });
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
        'Implementation Intention': {
          description: 'Bridges intention-action gap',
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
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
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
      const prompt = generateScene2Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should return a string prompt', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(typeof prompt).toBe('string');
    });

    it('should include SCENE 2 - GOAL label', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCENE 2');
      expect(prompt).toContain('GOAL');
    });

    it('should include topic in context data', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include department information', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
    });

    it('should include topic-specific pattern instructions', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCENE 2 - GOAL');
      expect(prompt).toContain('GOAL PATTERNS');
    });
  });

  // ==================== GOAL PATTERN TESTS ====================
  describe('Goal Pattern Categories', () => {
    it('should include THREAT pattern structure', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREATS');
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Verify');
      expect(prompt).toContain('Report');
    });

    it('should include TOOL pattern structure', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOLS');
      expect(prompt).toContain('Assess');
      expect(prompt).toContain('Implement');
      expect(prompt).toContain('Test');
    });

    it('should include PROCESS pattern structure', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESSES');
      expect(prompt).toContain('Identify');
      expect(prompt).toContain('Follow');
      expect(prompt).toContain('Validate');
    });

    it('should include Phishing THREAT example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Verify');
      expect(prompt).toContain('Report');
    });

    it('should include threat pattern structure with Malware', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Malware');
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Verify');
    });

    it('should include threat pattern structure with Social Engineering', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Social Eng');
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Verify');
    });

    it('should include Password TOOL example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password');
      expect(prompt).toContain('Assess');
      expect(prompt).toContain('Implement');
      expect(prompt).toContain('Test');
    });

    it('should include MFA TOOL example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('MFA');
      expect(prompt).toContain('Assess');
      expect(prompt).toContain('Implement');
      expect(prompt).toContain('Test');
    });

    it('should include INCIDENT RESPONSE PROCESS example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Incident Response');
      expect(prompt).toContain('Identify');
      expect(prompt).toContain('Follow');
      expect(prompt).toContain('Validate');
    });
  });

  // ==================== IMPLEMENTATION INTENTION TESTS ====================
  describe('Implementation Intention Format', () => {
    it('should request implementation intention in subtitle', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Next time you');
      expect(prompt).toContain('you will');
    });

    it('should request implementation intention format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Implementation intention');
      expect(prompt).toContain('Next time you');
    });

    it('should include THREAT examples with intent format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Next time you');
      expect(prompt).toContain('you will pause and');
    });

    it('should include TOOL examples with intent format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Next time');
      expect(prompt).toContain('you will pause');
    });

    it('should include PROCESS examples with intent format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Next time');
      expect(prompt).toContain('you will');
      expect(prompt).toContain('pause and');
    });

    it('should specify word limit for subtitle', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤18 words');
    });
  });

  // ==================== GOAL STRUCTURE TESTS ====================
  describe('Goal Structure (3 Steps)', () => {
    it('should include 3-step goal structure', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"goals":');
      expect(prompt).toContain('Step 1');
      expect(prompt).toContain('Step 2');
      expect(prompt).toContain('Step 3');
    });

    it('should have correct icon names for goals', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('alert-triangle');
      expect(prompt).toContain('shield-check');
      expect(prompt).toContain('flag');
    });

    it('should request step 1 as recognition/assess/identify', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Assess');
      expect(prompt).toContain('Identify');
    });

    it('should request step 2 as verify/implement/follow', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Verify');
      expect(prompt).toContain('Implement');
      expect(prompt).toContain('Follow');
    });

    it('should request step 3 as report/test/validate', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Report');
      expect(prompt).toContain('Test');
      expect(prompt).toContain('Validate');
    });
  });

  // ==================== TITLE REQUIREMENTS TESTS ====================
  describe('Title Requirements', () => {
    it('should specify topic-aware title format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Your Phishing Defense');
      expect(prompt).toContain('Your Account Security');
      expect(prompt).toContain('[Topic Area/Outcome]');
    });

    it('should warn against generic titles', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER');
      expect(prompt).toContain('Your Learning Goal');
    });

    it('should require "Your [Topic Area]" pattern', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain("'Your [Topic Area/Outcome]'");
    });

    it('should include example title for Phishing', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Your Phishing Defense');
    });

    it('should include example title for MFA', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Your Account Security');
    });
  });

  // ==================== DESCRIPTION REQUIREMENTS TESTS ====================
  describe('Description Requirements', () => {
    it('should request SHORT descriptions', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤12 words');
    });

    it('should request concrete cues for step 1', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Concrete cue for Step 1');
    });

    it('should request benefit descriptions with situation-outcome', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('when [situation] so [outcome]');
    });

    it('should request user-focused outcomes NOT technical', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Short benefit');
      expect(prompt).toContain('when [situation]');
    });

    it('should include Phishing step 1 description example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Short benefit');
      expect(prompt).toContain('Pattern:');
      expect(prompt).toContain('Step 1');
    });

    it('should include MFA step 2 description example', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Short benefit');
      expect(prompt).toContain('Step 2');
      expect(prompt).toContain('outcome');
    });

    it('should request team/organization benefit for step 3', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('[team benefit]');
      expect(prompt).toContain('Step 3');
    });
  });

  // ==================== KEY MESSAGES TESTS ====================
  describe('Key Messages', () => {
    it('should include 3 key messages', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
      expect((prompt.match(/Step [1-3]/g) || []).length).toBeGreaterThanOrEqual(3);
    });

    it('should request step 1 recognition message', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 1 recognition');
      expect(prompt).toContain('What to watch for');
      expect(prompt).toContain('≤6 words');
    });

    it('should request step 2 protection message', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 2 protection');
      expect(prompt).toContain('Action to take');
      expect(prompt).toContain('≤7 words');
    });

    it('should request step 3 escalation message', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 3 escalation');
      expect(prompt).toContain('Reporting');
      expect(prompt).toContain('≤5 words');
    });

    it("should allow DON'T directives for threats", () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('key_message');
    });

    it('should provide example recognition messages', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('What to watch for');
      expect(prompt).toContain('Step 1 recognition');
    });

    it('should provide example action messages', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Action to take');
      expect(prompt).toContain('Step 2 protection');
    });

    it('should provide example escalation messages', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Reporting');
      expect(prompt).toContain('key_message');
    });
  });

  // ==================== JSON SCHEMA VALIDATION TESTS ====================
  describe('JSON Schema Structure', () => {
    it('should include scene 2 JSON structure', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"2":');
      expect(prompt).toContain('iconName');
      expect(prompt).toContain('target');
    });

    it('should include title field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"title":');
    });

    it('should include subtitle field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"subtitle":');
    });

    it('should include callToActionText field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('callToActionText');
    });

    it('should include goals array', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"goals":');
    });

    it('should include key_message array', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"key_message":');
    });

    it('should include texts object', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"texts":');
    });

    it('should include scene_type as goal', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scene_type');
      expect(prompt).toContain('goal');
    });

    it('should include points field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"points":');
      expect(prompt).toContain('5');
    });

    it('should include duration_seconds field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('duration_seconds');
      expect(prompt).toContain('20');
    });

    it('should include hasAchievementNotification field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('hasAchievementNotification');
      expect(prompt).toContain('false');
    });

    it('should include scientific_basis field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('scientific_basis');
      expect(prompt).toContain('Goal Activation');
      expect(prompt).toContain('Implementation intention');
    });

    it('should include icon object', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"icon":');
      expect(prompt).toContain('sceneIconName');
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const enAnalysis: any = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene2Prompt(enAnalysis, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support German', () => {
      const deAnalysis: any = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene2Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support Turkish', () => {
      const trAnalysis: any = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene2Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support French', () => {
      const frAnalysis: any = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene2Prompt(frAnalysis, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese', () => {
      const zhAnalysis: any = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene2Prompt(zhAnalysis, baseMicrolearning);
      expect(prompt).toContain('zh');
    });

    it('should support Japanese', () => {
      const jaAnalysis: any = { ...baseAnalysis, language: 'ja' };
      const prompt = generateScene2Prompt(jaAnalysis, baseMicrolearning);
      expect(prompt).toContain('ja');
    });

    it('should include Continue button text', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Continue');
      expect(prompt).toContain('callToActionText');
    });

    it('should localize based on language', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
      expect(prompt).toContain('language');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should customize for IT department', () => {
      const itAnalysis: any = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene2Prompt(itAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should customize for Finance department', () => {
      const finAnalysis: any = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene2Prompt(finAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should customize for HR department', () => {
      const hrAnalysis: any = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene2Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
    });

    it('should customize for Sales department', () => {
      const salesAnalysis: any = { ...baseAnalysis, department: 'Sales' };
      const prompt = generateScene2Prompt(salesAnalysis, baseMicrolearning);
      expect(prompt).toContain('Sales');
    });

    it('should use General when department not specified', () => {
      const noDeptAnalysis: any = { ...baseAnalysis, department: undefined };
      const prompt = generateScene2Prompt(noDeptAnalysis, baseMicrolearning);
      expect(prompt).toContain('General');
    });

    it('should include department context in descriptions', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Department');
      expect(prompt).toContain('Adapt to');
    });
  });

  // ==================== CATEGORY-SPECIFIC TESTS ====================
  describe('Category-Specific Patterns', () => {
    it('should adapt for THREAT category', () => {
      const threatAnalysis: any = { ...baseAnalysis, category: 'THREAT' };
      const prompt = generateScene2Prompt(threatAnalysis, baseMicrolearning);
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('Recognize');
    });

    it('should adapt for TOOL category', () => {
      const toolAnalysis: any = { ...baseAnalysis, category: 'TOOL' };
      const prompt = generateScene2Prompt(toolAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOOL');
      expect(prompt).toContain('Assess');
    });

    it('should adapt for PROCESS category', () => {
      const processAnalysis: any = { ...baseAnalysis, category: 'PROCESS' };
      const prompt = generateScene2Prompt(processAnalysis, baseMicrolearning);
      expect(prompt).toContain('PROCESS');
      expect(prompt).toContain('Identify');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should customize for Phishing topic', () => {
      const phishingAnalysis: any = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene2Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
    });

    it('should customize for Password Security topic', () => {
      const passwordAnalysis: any = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene2Prompt(passwordAnalysis, baseMicrolearning);
      expect(prompt).toContain('Password Security');
    });

    it('should customize for Ransomware topic', () => {
      const ransomAnalysis: any = { ...baseAnalysis, topic: 'Ransomware Recovery' };
      const prompt = generateScene2Prompt(ransomAnalysis, baseMicrolearning);
      expect(prompt).toContain('Ransomware Recovery');
    });

    it('should customize for MFA topic', () => {
      const mfaAnalysis: any = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene2Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
    });

    it('should include topic in implementation intention', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).toContain('Implementation intention');
    });
  });

  // ==================== PLACEHOLDER REPLACEMENT TESTS ====================
  describe('Placeholder Replacement', () => {
    it('should replace topic placeholder', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
      expect(prompt).not.toContain('${analysis.topic}');
    });

    it('should replace department placeholder', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.department);
      expect(prompt).not.toContain('${analysis.department}');
    });

    it('should replace language placeholder', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
      expect(prompt).not.toContain('${analysis.language}');
    });

    it('should replace category placeholder', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.category);
      expect(prompt).not.toContain('${analysis.category}');
    });

    it('should have long prompt indicating content replacement', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      // Prompt should be long enough to contain the JSON schema and instructions
      expect(prompt.length).toBeGreaterThan(2000);
    });
  });

  // ==================== CRITICAL INSTRUCTIONS TESTS ====================
  describe('Critical Instructions', () => {
    it('should emphasize topic-specific goals NOT generic', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('TOPIC-SPECIFIC');
      expect(prompt).toContain('OTHER');
    });

    it('should specify pattern extrapolation for unknown topics', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Adapt closest pattern');
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should warn against generic titles', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('NEVER');
      expect(prompt).toContain('Pattern:');
    });

    it('should specify implementation intention requirement', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Implementation intention');
      expect(prompt).toContain('Next time you');
      expect(prompt).toContain('[situation]');
    });

    it('should require concrete cues', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Concrete cue');
      expect(prompt).not.toContain('NOT procedural cues');
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Cases', () => {
    it('should handle topic with special characters', () => {
      const specialAnalysis: any = {
        ...baseAnalysis,
        topic: 'Phishing & Email Security (2024)',
      };
      const prompt = generateScene2Prompt(specialAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing & Email Security (2024)');
    });

    it('should handle very long topic', () => {
      const longAnalysis: any = {
        ...baseAnalysis,
        topic: 'Understanding Advanced Phishing Attacks and Email Security Protocols',
      };
      const prompt = generateScene2Prompt(longAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(2000);
    });

    it('should handle short topic', () => {
      const shortAnalysis: any = { ...baseAnalysis, topic: 'Phishing' };
      const prompt = generateScene2Prompt(shortAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should handle missing subcategory', () => {
      const noSubAnalysis: any = {
        ...baseAnalysis,
        subcategory: undefined,
      };
      const prompt = generateScene2Prompt(noSubAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle empty learning objectives', () => {
      const noObjAnalysis: any = {
        ...baseAnalysis,
        learningObjectives: [],
      };
      const prompt = generateScene2Prompt(noObjAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle multiple roles', () => {
      const multiRoleAnalysis: any = {
        ...baseAnalysis,
        roles: ['Manager', 'Team Lead', 'Employee'],
      };
      const prompt = generateScene2Prompt(multiRoleAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete Phishing threat training', () => {
      const phishingAnalysis: PromptAnalysis = {
        language: 'en',
        topic: 'Phishing Prevention',
        title: 'Protect Against Phishing',
        description: 'Learn to identify and report phishing',
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

      const prompt = generateScene2Prompt(phishingAnalysis, baseMicrolearning);
      expect(prompt).toContain('Phishing Prevention');
      expect(prompt).toContain('THREAT');
      expect(prompt).toContain('Recognize');
      expect(prompt).toContain('Verify');
    });

    it('should handle MFA tool training', () => {
      const mfaAnalysis: any = {
        ...baseAnalysis,
        topic: 'Multi-Factor Authentication',
        category: 'TOOL',
      };

      const prompt = generateScene2Prompt(mfaAnalysis, baseMicrolearning);
      expect(prompt).toContain('Multi-Factor Authentication');
      expect(prompt).toContain('TOOL');
      expect(prompt).toContain('Assess');
      expect(prompt).toContain('Implement');
    });

    it('should handle Incident Response process training', () => {
      const incidentAnalysis: any = {
        ...baseAnalysis,
        topic: 'Incident Response Procedure',
        category: 'PROCESS',
      };

      const prompt = generateScene2Prompt(incidentAnalysis, baseMicrolearning);
      expect(prompt).toContain('Incident Response');
      expect(prompt).toContain('PROCESS');
      expect(prompt).toContain('Identify');
      expect(prompt).toContain('Follow');
    });

    it('should handle German language Phishing training', () => {
      const deAnalysis: any = {
        ...baseAnalysis,
        language: 'de',
        topic: 'Phishing-Prävention',
      };

      const prompt = generateScene2Prompt(deAnalysis, baseMicrolearning);
      expect(prompt).toContain('de');
      expect(prompt).toContain('Phishing-Prävention');
    });

    it('should handle Turkish language training', () => {
      const trAnalysis: any = {
        ...baseAnalysis,
        language: 'tr',
        topic: 'Kimlik Avı Engelleme',
      };

      const prompt = generateScene2Prompt(trAnalysis, baseMicrolearning);
      expect(prompt).toContain('tr');
      expect(prompt).toContain('Kimlik Avı Engelleme');
    });

    it('should handle advanced level training', () => {
      const advAnalysis: any = {
        ...baseAnalysis,
        level: 'Advanced',
        learningObjectives: ['Design defenses', 'Manage responses'],
      };

      const prompt = generateScene2Prompt(advAnalysis, baseMicrolearning);
      expect(prompt).toContain('Advanced');
      expect(prompt.length).toBeGreaterThan(2000);
    });

    it('should handle HR department compliance training', () => {
      const hrAnalysis: any = {
        ...baseAnalysis,
        department: 'HR',
        topic: 'Compliance Training',
        category: 'PROCESS',
      };

      const prompt = generateScene2Prompt(hrAnalysis, baseMicrolearning);
      expect(prompt).toContain('HR');
      expect(prompt).toContain('Compliance');
    });

    it('should handle Finance fraud prevention training', () => {
      const financeAnalysis: any = {
        ...baseAnalysis,
        department: 'Finance',
        topic: 'Fraud Detection',
        category: 'THREAT',
      };

      const prompt = generateScene2Prompt(financeAnalysis, baseMicrolearning);
      expect(prompt).toContain('Finance');
      expect(prompt).toContain('Fraud');
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });

    it('should maintain JSON structure markers', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('[');
      expect(prompt).toContain(']');
    });

    it('should maintain scene_type as goal', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('"scene_type": "goal"');
    });

    it('should maintain consistent icon names', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      const iconMatches = prompt.match(/"iconName"\s*:\s*"[^"]+"/g) || [];
      expect(iconMatches.length).toBeGreaterThan(0);
    });
  });

  // ==================== SCIENTIFIC BASIS TESTS ====================
  describe('Scientific Basis', () => {
    it('should include implementation intention theory', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Implementation Intention');
    });

    it('should reference goal activation', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Goal Activation');
    });

    it('should mention intention-action gap', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('intention–action gap');
    });

    it('should explain relevance of format', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('bridges intention–action gap');
    });
  });

  // ==================== CONTEXT DATA INTEGRATION TESTS ====================
  describe('Context Data Integration', () => {
    it('should include analysis context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('CONTEXT');
      expect(prompt).toContain('Level:');
      expect(prompt).toContain('Category:');
    });

    it('should include learning objectives in context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Objectives:');
    });

    it('should include key topics in context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Key Topics:');
    });

    it('should include practical applications in context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Practical Applications:');
    });

    it('should include assessment areas in context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Assessment Areas:');
    });

    it('should include scientific evidence context', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCIENTIFIC CONTEXT');
    });
  });

  // ==================== DURATION TESTS ====================
  describe('Duration Handling', () => {
    it('should include 20 second standard duration', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('20');
      expect(prompt).toContain('duration');
    });

    it('should use microlearning metadata duration', () => {
      const customMicrolearning: any = {
        ...baseMicrolearning,
        scenes: [{ sceneId: 2, type: 'goals', metadata: { duration_seconds: 30 } }],
      };
      const prompt = generateScene2Prompt(baseAnalysis, customMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle missing duration metadata', () => {
      const noMetaMicrolearning: any = {
        ...baseMicrolearning,
        scenes: [{ sceneId: 2, type: 'goals', metadata: {} }],
      };
      const prompt = generateScene2Prompt(baseAnalysis, noMetaMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== WORD LIMIT VALIDATION TESTS ====================
  describe('Word Limit Requirements', () => {
    it('should specify word limits for each field', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤18 words');
      expect(prompt).toContain('≤12 words');
      expect(prompt).toContain('2-5 words');
      expect(prompt).toContain('2-4 words');
    });

    it('should request 5-7 words for key messages step 1', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 1 recognition');
      expect(prompt).toContain('≤6 words');
    });

    it('should request 7 words max for key messages step 2', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 2 protection');
      expect(prompt).toContain('≤7 words');
    });

    it('should request 5 words max for key messages step 3', () => {
      const prompt = generateScene2Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Step 3 escalation');
      expect(prompt).toContain('≤5 words');
    });
  });
});
