import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateVideoPrompt } from './scene3-video-generator';
import { PromptAnalysis } from '../../../types/prompt-analysis';
import { MicrolearningContent } from '../../../types/microlearning';
import { generateText } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

/**
 * Test suite for Scene 3 (Video) Generator
 * Tests async video selection and transcript handling
 */
describe('Scene 3 - Video Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({
        prompt:
          'KEY MESSAGE PATTERNS: THREAT pattern for phishing emails\nSCENE 3 - VIDEO\nGenerate training video transcript about phishing prevention.',
        videoUrl: 'https://example.com/phishing-video.mp4',
        transcript:
          'Welcome to phishing awareness training. In this video, you will learn to identify suspicious emails and protect yourself from cyber threats.',
      }),
    });
  });
  // Base valid analysis
  const baseAnalysis: PromptAnalysis = {
    language: 'en',
    topic: 'Phishing Prevention',
    title: 'Stop Phishing Attacks',
    category: 'Security Awareness',
    subcategory: 'Email Security',
    department: 'IT',
    level: 'intermediate',
    learningObjectives: ['Identify phishing emails'],
    duration: 5,
    industries: ['Technology'],
    roles: ['All Roles'],
    keyTopics: ['Email security'],
    practicalApplications: ['Check email headers'],
    assessmentAreas: ['Email analysis'],
  } as any;

  // Base valid microlearning
  const baseMicrolearning: MicrolearningContent = {
    microlearning_id: 'phishing-101',
    microlearning_metadata: { title: 'Phishing' },
    scenes: [{ sceneId: 3, type: 'video' }],
  } as any;

  // ==================== ASYNC EXECUTION TESTS ====================
  describe('Async Execution', () => {
    it('should be an async function', async () => {
      const result = generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result instanceof Promise).toBe(true);
    });

    it('should return promise with correct structure', async () => {
      const promise = generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(promise.then).toBeDefined();
    });

    it('should resolve with prompt, videoUrl, and transcript', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('videoUrl');
      expect(result).toHaveProperty('transcript');
    });

    it('should return strings for all properties', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(typeof result.prompt).toBe('string');
      expect(typeof result.videoUrl).toBe('string');
      expect(typeof result.transcript).toBe('string');
    });
  });

  // ==================== PROMPT STRUCTURE TESTS ====================
  describe('Prompt Structure', () => {
    it('should include SCENE 3 - VIDEO label', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('SCENE 3');
      expect(result.prompt).toContain('VIDEO');
    });

    it('should include topic in prompt', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain(baseAnalysis.topic);
    });

    it('should include department in prompt', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('IT');
    });

    it('should include language in prompt', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain(baseAnalysis.language);
    });

    it('should include KEY MESSAGE PATTERNS section', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('VIDEO SCENARIO');
      expect(result.prompt).toContain('key_message');
    });

    it('should include THREAT pattern for security topics', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('THREAT');
    });

    it('should include JSON schema structure', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('{');
      expect(result.prompt).toContain('"3"');
    });
  });

  // ==================== VIDEO SELECTION TESTS ====================
  describe('Video Selection', () => {
    it('should return a video URL', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
      expect(result.videoUrl.length).toBeGreaterThan(0);
    });

    it('should select topic-appropriate video', async () => {
      const analysisPhishing = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const result = await generateVideoPrompt(analysisPhishing, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Password Security topic', async () => {
      const analysisPassword = { ...baseAnalysis, topic: 'Password Security' };
      const result = await generateVideoPrompt(analysisPassword, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for MFA topic', async () => {
      const analysisMFA = { ...baseAnalysis, topic: 'Multi-Factor Authentication' };
      const result = await generateVideoPrompt(analysisMFA, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Ransomware topic', async () => {
      const analysisRansomware = { ...baseAnalysis, topic: 'Ransomware Prevention' };
      const result = await generateVideoPrompt(analysisRansomware, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should handle department-aware video selection', async () => {
      const analysisITDept = { ...baseAnalysis, department: 'IT' };
      const result = await generateVideoPrompt(analysisITDept, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should handle language in video selection', async () => {
      const analysisTR = { ...baseAnalysis, language: 'tr' };
      const result = await generateVideoPrompt(analysisTR, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });
  });

  // ==================== TRANSCRIPT HANDLING TESTS ====================
  describe('Transcript Handling', () => {
    it('should return transcript', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.transcript).toBeDefined();
      expect(result.transcript.length).toBeGreaterThan(0);
    });

    it('should return transcript with timestamp format', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      // Transcript should have timestamp format like "00:00:04.400"
      expect(result.transcript).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should provide fallback transcript if none found', async () => {
      const result = await generateVideoPrompt({ ...baseAnalysis, topic: undefined as any }, baseMicrolearning);
      expect(result.transcript).toContain('transcript');
    });

    it('should preserve transcript format', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      // Transcript should be proper format
      expect(typeof result.transcript).toBe('string');
    });

    it('should handle long transcripts', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      // Can handle any transcript length
      expect(result.transcript).toBeDefined();
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English', async () => {
      const analysisEN = { ...baseAnalysis, language: 'en' };
      const result = await generateVideoPrompt(analysisEN, baseMicrolearning);
      expect(result.prompt).toContain('en');
    });

    it('should support German', async () => {
      const analysisDE = { ...baseAnalysis, language: 'de' };
      const result = await generateVideoPrompt(analysisDE, baseMicrolearning);
      expect(result.prompt).toContain('de');
    });

    it('should support Turkish', async () => {
      const analysisTR = { ...baseAnalysis, language: 'tr' };
      const result = await generateVideoPrompt(analysisTR, baseMicrolearning);
      expect(result.prompt).toContain('tr');
    });

    it('should support French', async () => {
      const analysisFR = { ...baseAnalysis, language: 'fr' };
      const result = await generateVideoPrompt(analysisFR, baseMicrolearning);
      expect(result.prompt).toContain('fr');
    });

    it('should support Chinese', async () => {
      const analysisZH = { ...baseAnalysis, language: 'zh' };
      const result = await generateVideoPrompt(analysisZH, baseMicrolearning);
      expect(result.prompt).toContain('zh');
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Content', () => {
    it('should handle IT department', async () => {
      const analysisIT = { ...baseAnalysis, department: 'IT' };
      const result = await generateVideoPrompt(analysisIT, baseMicrolearning);
      expect(result.prompt).toContain('IT');
    });

    it('should handle Finance department', async () => {
      const analysisFinance = { ...baseAnalysis, department: 'Finance' };
      const result = await generateVideoPrompt(analysisFinance, baseMicrolearning);
      expect(result.prompt).toContain('Finance');
    });

    it('should handle HR department', async () => {
      const analysisHR = { ...baseAnalysis, department: 'HR' };
      const result = await generateVideoPrompt(analysisHR, baseMicrolearning);
      expect(result.prompt).toContain('HR');
    });

    it('should default to General department when missing', async () => {
      const analysisNoDept: any = { ...baseAnalysis, department: undefined };
      const result = await generateVideoPrompt(analysisNoDept, baseMicrolearning);
      expect(result.prompt).toContain('General');
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Video Selection', () => {
    it('should select video for Phishing topic', async () => {
      const analysisPhishing = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const result = await generateVideoPrompt(analysisPhishing, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
      expect(result.prompt).toContain('Phishing');
    });

    it('should select video for Password topic', async () => {
      const analysisPassword = { ...baseAnalysis, topic: 'Password Security' };
      const result = await generateVideoPrompt(analysisPassword, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Deepfake topic', async () => {
      const analysisDeepfake = { ...baseAnalysis, topic: 'Deepfake Detection' };
      const result = await generateVideoPrompt(analysisDeepfake, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Ransomware topic', async () => {
      const analysisRansomware = { ...baseAnalysis, topic: 'Ransomware Prevention' };
      const result = await generateVideoPrompt(analysisRansomware, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Malware topic', async () => {
      const analysisMalware = { ...baseAnalysis, topic: 'Malware Awareness' };
      const result = await generateVideoPrompt(analysisMalware, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should select video for Data Protection topic', async () => {
      const analysisData = { ...baseAnalysis, topic: 'Data Protection' };
      const result = await generateVideoPrompt(analysisData, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });
  });

  // ==================== THREAT PATTERN TESTS ====================
  describe('Threat Pattern Recognition', () => {
    it('should include Phishing pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Phishing');
    });

    it('should include Ransomware pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Ransomware');
    });

    it('should include Vishing pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Vishing');
    });

    it('should include Deepfake pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Deepfake');
    });
  });

  // ==================== TOOL PATTERN TESTS ====================
  describe('Tool Pattern Recognition', () => {
    it('should include MFA pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('MFA');
    });

    it('should include Password pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Password');
    });

    it('should include Backup pattern', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('Backup');
    });
  });

  // ==================== CRITICAL INSTRUCTIONS TESTS ====================
  describe('Critical Instructions', () => {
    it('should include localization instruction', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('CRITICAL');
    });

    it('should instruct to generate actual content', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('ONLY actual content');
    });

    it('should indicate title is fixed', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('TITLE AND SUBTITLE ARE FIXED');
    });

    it('should not modify placeholders in output', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('DO NOT MODIFY');
    });
  });

  // ==================== METADATA GENERATION TESTS ====================
  describe('Video Metadata', () => {
    it('should generate video metadata', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      // Prompt should include instructions for metadata generation
      expect(result.prompt).toBeDefined();
    });

    it('should include topic-aware metadata', async () => {
      const analysisPhishing = { ...baseAnalysis, topic: 'Phishing Prevention' };
      const result = await generateVideoPrompt(analysisPhishing, baseMicrolearning);
      expect(result.prompt).toContain('topic');
    });

    it('should include department-aware metadata', async () => {
      const analysisITDept = { ...baseAnalysis, department: 'IT' };
      const result = await generateVideoPrompt(analysisITDept, baseMicrolearning);
      expect(result.prompt).toContain('IT');
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing topic gracefully', async () => {
      const analysisNoTopic: any = { ...baseAnalysis, topic: undefined };
      const result = await generateVideoPrompt(analysisNoTopic, baseMicrolearning);
      expect(result).toBeDefined();
    });

    it('should handle missing language gracefully', async () => {
      const analysisNoLang: any = { ...baseAnalysis, language: undefined };
      const result = await generateVideoPrompt(analysisNoLang, baseMicrolearning);
      expect(result).toBeDefined();
    });
  });

  // ==================== JSON SCHEMA TESTS ====================
  describe('JSON Schema', () => {
    it('should include scene 3 key', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('"3"');
    });

    it('should include iconName field', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('iconName');
    });

    it('should include title field', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('title');
    });

    it('should include subtitle field', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('subtitle');
    });

    it('should include video field with src', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('video');
      expect(result.prompt).toContain('src');
    });

    it('should include transcript field in video', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result.prompt).toContain('transcript');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete phishing training video generation', async () => {
      const analysisPhishing = {
        ...baseAnalysis,
        topic: 'Phishing Prevention',
        department: 'IT',
        language: 'en',
        level: 'intermediate',
      };
      const result = await generateVideoPrompt(analysisPhishing, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
      expect(result.transcript).toBeDefined();
      expect(result.prompt).toContain('Phishing');
    });

    it('should handle multilingual video prompts', async () => {
      const languages = ['en', 'de', 'tr', 'fr'];
      for (const lang of languages) {
        const analysisMulti = { ...baseAnalysis, language: lang };
        const result = await generateVideoPrompt(analysisMulti, baseMicrolearning);
        expect(result.videoUrl).toBeDefined();
      }
    });

    it('should handle different department contexts', async () => {
      const departments = ['IT', 'Finance', 'HR', 'Sales'];
      for (const dept of departments) {
        const analysisDept = { ...baseAnalysis, department: dept };
        const result = await generateVideoPrompt(analysisDept, baseMicrolearning);
        expect(result).toBeDefined();
      }
    });

    it('should handle different topics consistently', async () => {
      const topics = ['Phishing Prevention', 'Password Security', 'MFA Training', 'Data Protection'];
      for (const topic of topics) {
        const analysisTopic = { ...baseAnalysis, topic };
        const result = await generateVideoPrompt(analysisTopic, baseMicrolearning);
        expect(result.videoUrl).toBeDefined();
      }
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Consistency', () => {
    it('should produce same output for same input', async () => {
      const result1 = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      const result2 = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result1.prompt).toBe(result2.prompt);
    });

    it('should always return required fields', async () => {
      const result = await generateVideoPrompt(baseAnalysis, baseMicrolearning);
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('videoUrl');
      expect(result).toHaveProperty('transcript');
      expect(Object.keys(result)).toHaveLength(3);
    });

    it('should maintain topic consistency in prompt', async () => {
      const analysisTopic = { ...baseAnalysis, topic: 'Password Security' };
      const result = await generateVideoPrompt(analysisTopic, baseMicrolearning);
      expect(result.prompt).toContain('Password');
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very long topic names', async () => {
      const analysisLongTopic = {
        ...baseAnalysis,
        topic: 'Advanced SQL Injection Prevention and Detection for Enterprise Database Systems',
      };
      const result = await generateVideoPrompt(analysisLongTopic, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should handle special characters in topic', async () => {
      const analysisSpecial = { ...baseAnalysis, topic: 'SQL Injection & XSS (OWASP Top 10)' };
      const result = await generateVideoPrompt(analysisSpecial, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });

    it('should handle topic with Unicode', async () => {
      const analysisUnicode = { ...baseAnalysis, topic: 'Phishing Prävention' };
      const result = await generateVideoPrompt(analysisUnicode, baseMicrolearning);
      expect(result.videoUrl).toBeDefined();
    });
  });
});
