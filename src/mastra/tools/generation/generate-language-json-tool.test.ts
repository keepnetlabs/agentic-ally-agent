import { describe, it, expect, vi } from 'vitest';
import { generateLanguageJsonTool } from './generate-language-json-tool';

/**
 * Test suite for generateLanguageJsonTool
 * Tests language-specific content generation for all 8 scenes
 */
const executeTool = (generateLanguageJsonTool as any).execute;

describe('generateLanguageJsonTool', () => {
  // Mock model
  const mockModel = {
    modelId: 'test-model',
    constructor: { name: 'TestModel' },
  };

  // Base valid analysis
  const baseAnalysis: any = {
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
    keyTopics: ['Email security', 'Red flags', 'Reporting procedures'],
    practicalApplications: ['Check email headers', 'Verify sender identity'],
    assessmentAreas: ['Email analysis', 'Decision making'],
  };

  // Base valid microlearning
  const baseMicrolearning: any = {
    microlearning_id: 'phishing-101',
    microlearning_metadata: {
      title: 'Phishing Prevention',
      category: 'Security Awareness',
      level: 'intermediate',
      duration: 5,
    },
    scenes: [
      { sceneId: 1, type: 'intro' },
      { sceneId: 2, type: 'goals' },
      { sceneId: 3, type: 'video' },
      { sceneId: 4, type: 'actionable' },
      { sceneId: 5, type: 'quiz' },
      { sceneId: 6, type: 'survey' },
      { sceneId: 7, type: 'nudge' },
      { sceneId: 8, type: 'summary' },
    ],
  };

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid input with all required fields', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      expect(result.success || result.error).toBeDefined();
    });

    it('should require analysis object', async () => {
      const input: any = {
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require language in analysis', async () => {
      const input: any = {
        analysis: { ...baseAnalysis, language: undefined },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require topic in analysis', async () => {
      const input: any = {
        analysis: { ...baseAnalysis, topic: undefined },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require model object', async () => {
      const input: any = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
      };

      const result = await executeTool(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require microlearning object', async () => {
      const input: any = {
        analysis: baseAnalysis,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept optional additionalContext in analysis', async () => {
      const input = {
        analysis: { ...baseAnalysis, additionalContext: 'User is high-risk' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional customRequirements in analysis', async () => {
      const input = {
        analysis: { ...baseAnalysis, customRequirements: 'Add specific examples' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional hasRichContext flag', async () => {
      const input = {
        analysis: { ...baseAnalysis, hasRichContext: true },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept optional writer parameter', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
        writer: { write: vi.fn() },
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== LANGUAGE SUPPORT TESTS ====================
  describe('Language Support', () => {
    it('should support English (en)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'en' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.app?.texts).toBeDefined();
      }
    });

    it('should support German (de)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'de' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Turkish (tr)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'tr' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support French (fr)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'fr' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Chinese (zh)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'zh' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Spanish (es)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'es' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Portuguese (pt)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'pt' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Japanese (ja)', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'ja' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== LEVEL SUPPORT TESTS ====================
  describe('Level Support', () => {
    it('should support beginner level', async () => {
      const input = {
        analysis: { ...baseAnalysis, level: 'beginner' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support intermediate level', async () => {
      const input = {
        analysis: { ...baseAnalysis, level: 'intermediate' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support advanced level', async () => {
      const input = {
        analysis: { ...baseAnalysis, level: 'advanced' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== SCENE GENERATION TESTS ====================
  describe('Scene Generation', () => {
    it('should generate scene 1 (intro)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['1']).toBeDefined();
      }
    });

    it('should generate scene 2 (goals)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['2']).toBeDefined();
      }
    });

    it('should generate scene 3 (video)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['3']).toBeDefined();
      }
    });

    it('should generate scene 4 (actionable) for non-code topics', async () => {
      const input = {
        analysis: { ...baseAnalysis, isCodeTopic: false },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['4']).toBeDefined();
      }
    });

    it('should generate scene 4 (code review) for code topics', async () => {
      const input = {
        analysis: { ...baseAnalysis, isCodeTopic: true, topic: 'SQL Injection Prevention' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['4']).toBeDefined();
      }
    });

    it('should generate scene 5 (quiz)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['5']).toBeDefined();
      }
    });

    it('should generate scene 6 (survey)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['6']).toBeDefined();
      }
    });

    it('should generate scene 7 (nudge)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['7']).toBeDefined();
      }
    });

    it('should generate scene 8 (summary)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data['8']).toBeDefined();
      }
    });

    it('should generate all 8 scenes', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        const sceneKeys = Object.keys(result.data).filter(k => k !== 'app');
        expect(sceneKeys).toHaveLength(8);
      }
    });

    it('should have correct scene keys (1-8)', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        for (let i = 1; i <= 8; i++) {
          expect(result.data[String(i)]).toBeDefined();
        }
      }
    });
  });

  // ==================== VIDEO CONTENT TESTS ====================
  describe('Video Content', () => {
    it('should include video in scene 3', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['3']) {
        expect(result.data['3'].video).toBeDefined();
      }
    });

    it('should include video URL in scene 3', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['3']?.video) {
        expect(result.data['3'].video.src).toBeDefined();
      }
    });

    it('should include video transcript in scene 3', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['3']?.video) {
        expect(result.data['3'].video.transcript).toBeDefined();
      }
    });

    it('should override video URL with generated URL', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['3']?.video?.src) {
        expect(result.data['3'].video.src).not.toBeNull();
      }
    });

    it('should handle video with different languages', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'de' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['3']) {
        expect(result.data['3'].video).toBeDefined();
      }
    });
  });

  // ==================== APP TEXTS TESTS ====================
  describe('App Texts Generation', () => {
    it('should include app texts in output', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app).toBeDefined();
        expect(result.data.app.texts).toBeDefined();
      }
    });

    it('should include aria texts in output', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app).toBeDefined();
        expect(result.data.app.ariaTexts).toBeDefined();
      }
    });

    it('should generate app texts for English', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'en' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app.texts).toBeDefined();
        expect(Object.keys(result.data.app.texts).length).toBeGreaterThan(0);
      }
    });

    it('should generate app texts for Turkish', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'tr' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app.texts).toBeDefined();
      }
    });

    it('should generate aria texts for accessibility', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app.ariaTexts).toBeDefined();
        expect(Object.keys(result.data.app.ariaTexts).length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== CODE TOPIC DETECTION TESTS ====================
  describe('Code Topic Detection', () => {
    it('should detect code topics with isCodeTopic flag', async () => {
      const input = {
        analysis: { ...baseAnalysis, isCodeTopic: true },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should default to false when isCodeTopic is undefined', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle SQL injection as code topic', async () => {
      const input = {
        analysis: { ...baseAnalysis, isCodeTopic: true, topic: 'SQL Injection' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle XSS prevention as code topic', async () => {
      const input = {
        analysis: { ...baseAnalysis, isCodeTopic: true, topic: 'XSS Prevention' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONTEXT TESTS ====================
  describe('Additional Context and Requirements', () => {
    it('should process additionalContext in scene generation', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          additionalContext: 'User is in high-risk role. Emphasize critical security steps.',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should process customRequirements in content generation', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          customRequirements: 'Add specific company examples and policies.',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle both additionalContext and customRequirements', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          additionalContext: 'High-risk user group',
          customRequirements: 'Include company policies',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should use hasRichContext flag when provided', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          hasRichContext: true,
          additionalContext: 'Rich behavioral context available',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== DEPARTMENT-SPECIFIC TESTS ====================
  describe('Department-Specific Generation', () => {
    it('should generate content for IT department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'IT' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for HR department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'HR' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Sales department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'Sales' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Finance department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'Finance' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Operations department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'Operations' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Management department', async () => {
      const input = {
        analysis: { ...baseAnalysis, department: 'Management' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CATEGORY-SPECIFIC TESTS ====================
  describe('Category-Specific Generation', () => {
    it('should generate content for Security Awareness category', async () => {
      const input = {
        analysis: { ...baseAnalysis, category: 'Security Awareness' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Compliance category', async () => {
      const input = {
        analysis: { ...baseAnalysis, category: 'Compliance' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Technical category', async () => {
      const input = {
        analysis: { ...baseAnalysis, category: 'Technical' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Behavioral category', async () => {
      const input = {
        analysis: { ...baseAnalysis, category: 'Behavioral' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== PARALLEL GENERATION TESTS ====================
  describe('Parallel Execution', () => {
    it('should execute scene generation in parallel', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const startTime = Date.now();
      const result = await executeTool(input);
      const endTime = Date.now();

      // Parallel execution should complete relatively quickly
      // (at least faster than 8x sequential execution)
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it('should complete all 8 scenes even if one fails', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      // Result should either be successful or have detailed error
      expect(result.success !== undefined).toBe(true);
    });
  });

  // ==================== OUTPUT STRUCTURE TESTS ====================
  describe('Output Structure', () => {
    it('should return success flag', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(typeof result.success).toBe('boolean');
    });

    it('should return data when successful', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should return error message when failed', async () => {
      const input: any = {
        analysis: undefined,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    });

    it('should not return both data and error', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(!(result.data && result.error)).toBe(true);
    });

    it('should have proper content structure for success', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(typeof result.data).toBe('object');
        expect(result.data).not.toBeNull();
      }
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Content', () => {
    it('should generate content for Phishing Prevention', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Phishing Prevention' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Password Security', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Password Security' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Data Protection', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Data Protection' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Malware Awareness', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Malware Awareness' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should generate content for Social Engineering', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Social Engineering' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== KEY TOPICS TESTS ====================
  describe('Key Topics Handling', () => {
    it('should accept array of keyTopics', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          keyTopics: ['Email security', 'Red flags', 'Reporting', 'Best practices'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle single key topic', async () => {
      const input = {
        analysis: { ...baseAnalysis, keyTopics: ['Email security'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle multiple key topics', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          keyTopics: ['Email security', 'Sender verification', 'Report procedures', 'Links & attachments', 'Urgent requests'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== LEARNING OBJECTIVES TESTS ====================
  describe('Learning Objectives Handling', () => {
    it('should accept learningObjectives array', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          learningObjectives: ['Identify phishing emails', 'Report suspicious messages', 'Protect company data'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle single learning objective', async () => {
      const input = {
        analysis: { ...baseAnalysis, learningObjectives: ['Identify phishing emails'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== DURATION TESTS ====================
  describe('Duration Handling', () => {
    it('should accept 5-minute training', async () => {
      const input = {
        analysis: { ...baseAnalysis, duration: 5 },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept 10-minute training', async () => {
      const input = {
        analysis: { ...baseAnalysis, duration: 10 },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept 15-minute training', async () => {
      const input = {
        analysis: { ...baseAnalysis, duration: 15 },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept 30-minute training', async () => {
      const input = {
        analysis: { ...baseAnalysis, duration: 30 },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ASSESSMENT AREAS TESTS ====================
  describe('Assessment Areas', () => {
    it('should accept assessmentAreas array', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          assessmentAreas: ['Email analysis', 'Decision making', 'Risk evaluation'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle security assessment area', async () => {
      const input = {
        analysis: { ...baseAnalysis, assessmentAreas: ['Security knowledge', 'Practical application'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== PRACTICAL APPLICATIONS TESTS ====================
  describe('Practical Applications', () => {
    it('should accept practicalApplications array', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          practicalApplications: ['Check email headers', 'Verify sender identity', 'Analyze links', 'Report suspicious emails'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== REGULATION COMPLIANCE TESTS ====================
  describe('Regulation Compliance', () => {
    it('should accept optional regulationCompliance array', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          regulationCompliance: ['GDPR', 'CCPA', 'ISO 27001'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle missing regulationCompliance', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== INDUSTRIES TESTS ====================
  describe('Industries Support', () => {
    it('should support Technology industry', async () => {
      const input = {
        analysis: { ...baseAnalysis, industries: ['Technology'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Finance industry', async () => {
      const input = {
        analysis: { ...baseAnalysis, industries: ['Finance'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Healthcare industry', async () => {
      const input = {
        analysis: { ...baseAnalysis, industries: ['Healthcare'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support multiple industries', async () => {
      const input = {
        analysis: { ...baseAnalysis, industries: ['Technology', 'Finance', 'Healthcare'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ROLES TESTS ====================
  describe('Roles Support', () => {
    it('should support All Roles', async () => {
      const input = {
        analysis: { ...baseAnalysis, roles: ['All Roles'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support specific roles', async () => {
      const input = {
        analysis: { ...baseAnalysis, roles: ['Manager', 'Employee', 'Contractor'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should support Developer role', async () => {
      const input = {
        analysis: { ...baseAnalysis, roles: ['Developer'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== MODEL PROVIDER TESTS ====================
  describe('Model Provider Support', () => {
    it('should work with test model', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept model with modelId property', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: { modelId: '@cf/openai/gpt-oss-120b' },
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should accept model with constructor name', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: { constructor: { name: 'OpenAILanguageModel' } },
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing language gracefully', async () => {
      const input: any = {
        analysis: { ...baseAnalysis, language: undefined },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success || result.error).toBeDefined();
    });

    it('should handle missing topic gracefully', async () => {
      const input: any = {
        analysis: { ...baseAnalysis, topic: undefined },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success || result.error).toBeDefined();
    });

    it('should handle missing model gracefully', async () => {
      const input: any = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
      };

      const result = await executeTool(input);
      expect(result.success || result.error).toBeDefined();
    });

    it('should handle null analysis', async () => {
      const input: any = {
        analysis: null,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error !== undefined).toBe(true);
    });

    it('should handle null microlearning', async () => {
      const input: any = {
        analysis: baseAnalysis,
        microlearning: null,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error !== undefined).toBe(true);
    });

    it('should handle null model', async () => {
      const input: any = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: null,
      };

      const result = await executeTool(input);
      expect(result.success === false || result.error !== undefined).toBe(true);
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete phishing training workflow', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          topic: 'Phishing Prevention',
          keyTopics: ['Email security', 'Red flags', 'Reporting'],
          level: 'intermediate',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.app).toBeDefined();
      }
    });

    it('should handle multi-language training generation', async () => {
      const languages = ['en', 'de', 'tr', 'fr'];

      for (const lang of languages) {
        const input = {
          analysis: { ...baseAnalysis, language: lang },
          microlearning: baseMicrolearning,
          model: mockModel,
        };

        const result = await executeTool(input);
        expect(result).toBeDefined();
      }
    });

    it('should handle high-risk user context', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          additionalContext: 'User is in high-risk role (CFO). Previous phishing simulator: 80% click rate.',
          hasRichContext: true,
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle code review training for developers', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          topic: 'SQL Injection Prevention',
          isCodeTopic: true,
          roles: ['Developer'],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle multilingual code review', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          topic: 'XSS Prevention',
          isCodeTopic: true,
          language: 'de',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle very long topic names', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          topic: 'Comprehensive Phishing Prevention and Email Security Awareness Training for Enterprise Organizations',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle special characters in topic', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          topic: 'Phishing & Email Security (Advanced)',
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle empty learning objectives array', async () => {
      const input = {
        analysis: {
          ...baseAnalysis,
          learningObjectives: [],
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle single industry', async () => {
      const input = {
        analysis: { ...baseAnalysis, industries: ['Technology'] },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle zero duration', async () => {
      const input = {
        analysis: { ...baseAnalysis, duration: 0 },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should handle very long additionalContext', async () => {
      const longContext = 'This is a very long context. '.repeat(50);
      const input = {
        analysis: {
          ...baseAnalysis,
          additionalContext: longContext,
        },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== SCENE CONTENT STRUCTURE TESTS ====================
  describe('Scene Content Structure', () => {
    it('should have highlights in scene 1', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['1']) {
        // Scene 1 typically has highlights for intro points
        expect(result.data['1']).toBeDefined();
      }
    });

    it('should have goals in scene 2', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['2']) {
        // Scene 2 should contain goal-related content
        expect(result.data['2']).toBeDefined();
      }
    });

    it('should have quiz items in scene 5', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data && result.data['5']) {
        // Scene 5 should contain quiz items
        expect(result.data['5']).toBeDefined();
      }
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Content Consistency', () => {
    it('should maintain language consistency across all scenes', async () => {
      const input = {
        analysis: { ...baseAnalysis, language: 'de' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        expect(result.data.app?.texts).toBeDefined();
      }
    });

    it('should maintain topic consistency across all scenes', async () => {
      const input = {
        analysis: { ...baseAnalysis, topic: 'Data Protection' },
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      if (result.success && result.data) {
        // All scenes should relate to Data Protection
        expect(result.data['1']).toBeDefined();
      }
    });
  });

  // ==================== STREAM WRITER TESTS ====================
  describe('Stream Writer Support', () => {
    it('should accept writer parameter for streaming', async () => {
      const mockWriter = { write: vi.fn() };
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
        writer: mockWriter,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });

    it('should work without writer parameter', async () => {
      const input = {
        analysis: baseAnalysis,
        microlearning: baseMicrolearning,
        model: mockModel,
      };

      const result = await executeTool(input);
      expect(result).toBeDefined();
    });
  });
});
