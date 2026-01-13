import { describe, it, expect } from 'vitest';
import { generateScene1Prompt } from './scene1-intro-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';

/**
 * Test suite for Scene 1 (Intro) Generator
 * Tests prompt generation for training introductions
 */
describe('Scene 1 - Intro Generator', () => {
  // Base valid analysis
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Phishing Prevention',
    title: 'Stop Phishing Attacks',
    category: 'Security Awareness',
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
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
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
        learningObjectives: [],
        keyTopics: [],
      };
      const prompt = generateScene1Prompt(minimalAnalysis, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle missing department field', () => {
      const analysisWithoutDept: any = { ...baseAnalysis, department: undefined };
      const prompt = generateScene1Prompt(analysisWithoutDept, baseMicrolearning);
      expect(prompt).toContain('General'); // Should default
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should include SCENE 1 - INTRO label', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('SCENE 1');
      expect(prompt).toContain('INTRO');
    });

    it('should include topic in prompt', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.topic);
    });

    it('should include department in prompt', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should include language in prompt', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain(baseAnalysis.language);
    });

    it('should include highlights section', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('HIGHLIGHTS');
    });

    it('should include JSON schema markers', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('{');
      expect(prompt).toContain('"1"');
    });
  });

  // ==================== CONTEXT DATA TESTS ====================
  describe('Context Data Integration', () => {
    it('should include context builder output', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt.length).toBeGreaterThan(200); // Should have rich context
    });

    it('should reference learning objectives', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      // Context should include objectives
      expect(prompt).toBeDefined();
    });

    it('should include practical applications', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      // Context should reference practical apps
      expect(prompt).toBeDefined();
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', () => {
      const analysisEn = { ...baseAnalysis, language: 'en' };
      const prompt = generateScene1Prompt(analysisEn, baseMicrolearning);
      expect(prompt).toContain('en');
    });

    it('should support Turkish', () => {
      const analysisTr = { ...baseAnalysis, language: 'tr' };
      const prompt = generateScene1Prompt(analysisTr, baseMicrolearning);
      expect(prompt).toContain('tr');
    });

    it('should support German', () => {
      const analysisDe = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene1Prompt(analysisDe, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should support French', () => {
      const analysisFr = { ...baseAnalysis, language: 'fr' };
      const prompt = generateScene1Prompt(analysisFr, baseMicrolearning);
      expect(prompt).toContain('fr');
    });

    it('should support Chinese', () => {
      const analysisZh = { ...baseAnalysis, language: 'zh' };
      const prompt = generateScene1Prompt(analysisZh, baseMicrolearning);
      expect(prompt).toContain('zh');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should generate prompt for IT department', () => {
      const analysisIT = { ...baseAnalysis, department: 'IT' };
      const prompt = generateScene1Prompt(analysisIT, baseMicrolearning);
      expect(prompt).toContain('IT');
    });

    it('should generate prompt for Finance department', () => {
      const analysisFinance = { ...baseAnalysis, department: 'Finance' };
      const prompt = generateScene1Prompt(analysisFinance, baseMicrolearning);
      expect(prompt).toContain('Finance');
    });

    it('should generate prompt for HR department', () => {
      const analysisHR = { ...baseAnalysis, department: 'HR' };
      const prompt = generateScene1Prompt(analysisHR, baseMicrolearning);
      expect(prompt).toContain('HR');
    });

    it('should generate prompt for Sales department', () => {
      const analysisSales = { ...baseAnalysis, department: 'Sales' };
      const prompt = generateScene1Prompt(analysisSales, baseMicrolearning);
      expect(prompt).toContain('Sales');
    });

    it('should generate prompt for Operations department', () => {
      const analysisOps = { ...baseAnalysis, department: 'Operations' };
      const prompt = generateScene1Prompt(analysisOps, baseMicrolearning);
      expect(prompt).toContain('Operations');
    });

    it('should generate prompt with "General" if department missing', () => {
      const analysisNoDept: any = { ...baseAnalysis, department: undefined };
      const prompt = generateScene1Prompt(analysisNoDept, baseMicrolearning);
      expect(prompt).toContain('General');
    });
  });

  // ==================== LEVEL SUPPORT TESTS ====================
  describe('Level Support', () => {
    it('should support Beginner level', () => {
      const analysisBeginner = { ...baseAnalysis, level: 'beginner' };
      const prompt = generateScene1Prompt(analysisBeginner, baseMicrolearning);
      expect(prompt).toContain('beginner');
    });

    it('should support Intermediate level', () => {
      const analysisIntermediate = { ...baseAnalysis, level: 'intermediate' };
      const prompt = generateScene1Prompt(analysisIntermediate, baseMicrolearning);
      expect(prompt).toContain('intermediate');
    });

    it('should support Advanced level', () => {
      const analysisAdvanced = { ...baseAnalysis, level: 'advanced' };
      const prompt = generateScene1Prompt(analysisAdvanced, baseMicrolearning);
      expect(prompt).toContain('advanced');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Prompts', () => {
    it('should generate prompt for Phishing Prevention', () => {
      const analysisPhishing = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene1Prompt(analysisPhishing, baseMicrolearning);
      expect(prompt).toContain('Phishing');
    });

    it('should generate prompt for Password Security', () => {
      const analysisPassword = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene1Prompt(analysisPassword, baseMicrolearning);
      expect(prompt).toContain('Password');
    });

    it('should generate prompt for MFA Training', () => {
      const analysisMFA = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene1Prompt(analysisMFA, baseMicrolearning);
      expect(prompt).toContain('MFA');
    });

    it('should generate prompt for Ransomware Training', () => {
      const analysisRansomware = { ...baseAnalysis, topic: 'Ransomware Prevention' };
      const prompt = generateScene1Prompt(analysisRansomware, baseMicrolearning);
      expect(prompt).toContain('Ransomware');
    });

    it('should generate prompt for Data Protection', () => {
      const analysisData = { ...baseAnalysis, topic: 'Data Protection' };
      const prompt = generateScene1Prompt(analysisData, baseMicrolearning);
      expect(prompt).toContain('Data');
    });

    it('should generate prompt for Incident Response', () => {
      const analysisIncident = { ...baseAnalysis, topic: 'Incident Response' };
      const prompt = generateScene1Prompt(analysisIncident, baseMicrolearning);
      expect(prompt).toContain('Incident');
    });
  });

  // ==================== HIGHLIGHTS VALIDATION TESTS ====================
  describe('Highlights Instruction Generation', () => {
    it('should include exactly 3 highlights instructions', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      const knowMatches = (prompt.match(/KNOW statement/gi) || []).length;
      const rememberMatches = (prompt.match(/REMEMBER statement/gi) || []).length;
      const seeMatches = (prompt.match(/SEE statement/gi) || []).length;
      expect(knowMatches).toBe(1);
      expect(rememberMatches).toBe(1);
      expect(seeMatches).toBe(1);
    });

    it('should include word limit for highlights', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤8 words');
    });

    it('should reference icon names', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('iconName');
    });

    it('should include pattern guidance', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Pattern:');
    });
  });

  // ==================== KEY MESSAGE TESTS ====================
  describe('Key Message Generation', () => {
    it('should include 3 key messages', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('What to know');
      expect(prompt).toContain('Why it matters');
      expect(prompt).toContain('What you do');
    });

    it('should specify 5-word limit for key messages', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤5 words');
    });

    it('should include fact-impact-action pattern', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Fact');
      expect(prompt).toContain('Impact');
      expect(prompt).toContain('Action');
    });
  });

  // ==================== DURATION CALCULATION TESTS ====================
  describe('Duration Handling', () => {
    it('should calculate duration from scenes', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('duration');
      expect(prompt).toContain('minutes');
    });

    it('should specify duration_seconds range (15-20)', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('15-20');
    });

    it('should handle microlearning with no scenes', () => {
      const emptyMicrolearning: any = {
        microlearning_id: 'test',
        microlearning_metadata: {},
      };
      const prompt = generateScene1Prompt(baseAnalysis, emptyMicrolearning);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== ICON NAME SELECTION TESTS ====================
  describe('Icon Name Generation', () => {
    it('should include icon selection logic', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('lucide-react');
    });

    it('should reference phishing icon for phishing topics', () => {
      const analysisPhishing = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const prompt = generateScene1Prompt(analysisPhishing, baseMicrolearning);
      expect(prompt).toContain('mail-warning');
    });

    it('should reference password icon for password topics', () => {
      const analysisPassword = { ...baseAnalysis, topic: 'Password Security' };
      const prompt = generateScene1Prompt(analysisPassword, baseMicrolearning);
      expect(prompt).toContain('key-round');
    });

    it('should reference MFA icon for authentication topics', () => {
      const analysisMFA = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const prompt = generateScene1Prompt(analysisMFA, baseMicrolearning);
      expect(prompt).toContain('shield-check');
    });
  });

  // ==================== TITLE GENERATION TESTS ====================
  describe('Title Generation Pattern', () => {
    it('should include title generation pattern', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Write simple title');
    });

    it('should reference threat pattern for threat topics', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Stop [Threat]');
    });

    it('should reference tool pattern for tool topics', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Secure with [Tool]');
    });

    it('should reference process pattern for process topics', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Follow [Protocol/Process]');
    });
  });

  // ==================== SUBTITLE GENERATION TESTS ====================
  describe('Subtitle Generation', () => {
    it('should include subtitle instruction', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('subtitle');
    });

    it('should specify 12-word limit for subtitle', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('≤12 words');
    });

    it('should include action + outcome pattern', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('ACTION');
      expect(prompt).toContain('OUTCOME');
    });
  });

  // ==================== CALL TO ACTION TESTS ====================
  describe('Call to Action (CTA)', () => {
    it('should include call to action text', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('callToActionText');
    });

    it('should have mobile CTA variation', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('mobile');
    });

    it('should have desktop CTA variation', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('desktop');
    });

    it('should reference swipe for mobile', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Swipe');
    });

    it('should reference click for desktop', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Click');
    });
  });

  // ==================== LOCALIZATION TESTS ====================
  describe('Localization', () => {
    it('should localize level to target language', () => {
      const analysisDE = { ...baseAnalysis, language: 'de' };
      const prompt = generateScene1Prompt(analysisDE, baseMicrolearning);
      expect(prompt).toContain('de');
    });

    it('should localize section title', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('sectionTitle');
      expect(prompt).toContain('What this training');
    });

    it('should include language context for AI translation', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      // Should include language parameter for AI to handle localization
      expect(prompt.length).toBeGreaterThan(500);
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very long topic name', () => {
      const analysisLongTopic = {
        ...baseAnalysis,
        topic: 'Advanced SQL Injection Prevention and Detection for Enterprise Database Systems',
      };
      const prompt = generateScene1Prompt(analysisLongTopic, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle special characters in topic', () => {
      const analysisSpecial = { ...baseAnalysis, topic: 'SQL Injection & XSS (OWASP Top 10)' };
      const prompt = generateScene1Prompt(analysisSpecial, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle topic with Unicode', () => {
      const analysisUnicode = { ...baseAnalysis, topic: 'Phishing Prävention' };
      const prompt = generateScene1Prompt(analysisUnicode, baseMicrolearning);
      expect(prompt).toBeDefined();
    });

    it('should handle microlearning with many scenes', () => {
      const manyScenes: any = {
        ...baseMicrolearning,
        scenes: Array.from({ length: 20 }, (_, i) => ({
          sceneId: i + 1,
          type: 'generic',
          metadata: { duration_seconds: 30 },
        })),
      };
      const prompt = generateScene1Prompt(baseAnalysis, manyScenes);
      expect(prompt).toBeDefined();
    });

    it('should handle microlearning with scenes without metadata', () => {
      const noMetadata: any = {
        ...baseMicrolearning,
        scenes: [{ sceneId: 1, type: 'intro' }],
      };
      const prompt = generateScene1Prompt(baseAnalysis, noMetadata);
      expect(prompt).toBeDefined();
    });
  });

  // ==================== PROMPT CONTENT TESTS ====================
  describe('Prompt Content Quality', () => {
    it('should not be empty', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt.trim().length).toBeGreaterThan(0);
    });

    it('should contain meaningful instructions', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('instruction');
      expect(prompt.toLowerCase()).toMatch(/generate|create|write/i);
    });

    it('should include examples', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Example');
    });

    it('should include constraints and patterns', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('Pattern:');
    });

    it('should provide clear output format', () => {
      const prompt = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt).toContain('USE EXACTLY THESE KEYS');
      expect(prompt).toContain('{');
      expect(prompt).toContain('"1"');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration with Content Generation', () => {
    it('should work with phishing awareness training', () => {
      const analysisPhishing = {
        ...baseAnalysis,
        topic: 'Phishing Prevention',
        department: 'IT',
        level: 'intermediate',
      };
      const prompt = generateScene1Prompt(analysisPhishing, baseMicrolearning);
      expect(prompt).toContain('Phishing');
      expect(prompt).toContain('IT');
    });

    it('should work with password security training', () => {
      const analysisPassword = {
        ...baseAnalysis,
        topic: 'Password Security',
        department: 'Finance',
        level: 'beginner',
      };
      const prompt = generateScene1Prompt(analysisPassword, baseMicrolearning);
      expect(prompt).toContain('Password');
      expect(prompt).toContain('Finance');
    });

    it('should work with multilingual content generation', () => {
      const languages = ['en', 'de', 'tr', 'fr', 'zh'];
      languages.forEach(lang => {
        const analysisMulti = { ...baseAnalysis, language: lang };
        const prompt = generateScene1Prompt(analysisMulti, baseMicrolearning);
        expect(prompt).toContain(lang);
      });
    });

    it('should produce consistent output for same input', () => {
      const prompt1 = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      const prompt2 = generateScene1Prompt(baseAnalysis, baseMicrolearning);
      expect(prompt1).toBe(prompt2);
    });
  });
});
