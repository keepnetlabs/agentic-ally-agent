import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLanguageJsonTool } from './generate-language-json-tool';
import { generateText } from 'ai';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';

// Mock AI module
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock Content Processors
vi.mock('../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: vi.fn((text, _type) => text),
}));

vi.mock('../../utils/content-processors/transcript-translator', () => ({
  translateTranscript: vi.fn().mockResolvedValue('Translated transcript'),
}));

// Mock Scene Generators
vi.mock('../scenes/generators/scene1-intro-generator', () => ({
  generateScene1Prompt: vi.fn().mockReturnValue('Scene 1 Prompt'),
}));
vi.mock('../scenes/generators/scene2-goal-generator', () => ({
  generateScene2Prompt: vi.fn().mockReturnValue('Scene 2 Prompt'),
}));
vi.mock('../scenes/generators/scene3-video-generator', () => ({
  generateVideoPrompt: vi.fn().mockResolvedValue({
    prompt: 'Video Prompt',
    videoUrl: 'https://video.url',
    transcript: 'Original Transcript',
  }),
}));
vi.mock('../scenes/generators/scene4-actionable-generator', () => ({
  generateScene4Prompt: vi.fn().mockReturnValue('Scene 4 Prompt'),
}));
vi.mock('../scenes/generators/scene4-code-review-generator', () => ({
  generateScene4CodeReviewPrompt: vi.fn().mockReturnValue('Scene 4 Code Prompt'),
}));
vi.mock('../scenes/generators/scene4-vishing-generator', () => ({
  generateScene4VishingPrompt: vi.fn().mockReturnValue('Scene 4 Vishing Prompt'),
}));
vi.mock('../scenes/generators/scene5-quiz-generator', () => ({
  generateScene5Prompt: vi.fn().mockReturnValue('Scene 5 Prompt'),
}));
vi.mock('../scenes/generators/scene6-survey-generator', () => ({
  generateScene6Prompt: vi.fn().mockReturnValue('Scene 6 Prompt'),
}));
vi.mock('../scenes/generators/scene7-nudge-generator', () => ({
  generateScene7Prompt: vi.fn().mockReturnValue('Scene 7 Prompt'),
}));
vi.mock('../scenes/generators/scene8-summary-generator', () => ({
  generateScene8Prompt: vi.fn().mockReturnValue('Scene 8 Prompt'),
}));

// Mock Utils
vi.mock('../../utils/prompt-builders/base-context-builder', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('System Prompt'),
}));
vi.mock('../../utils/prompt-builders/policy-context-builder', () => ({
  buildPolicyScenePrompt: vi.fn().mockReturnValue(''),
}));
vi.mock('../../utils/core/cost-tracker', () => ({ trackCost: vi.fn() }));
vi.mock('../../utils/config/llm-generation-params', () => ({
  SCENE_GENERATION_PARAMS: {
    1: { temperature: 0.7 },
    2: { temperature: 0.7 },
    3: { temperature: 0.7 },
    4: { temperature: 0.7 },
    5: { temperature: 0.7 },
    6: { temperature: 0.7 },
    7: { temperature: 0.7 },
    8: { temperature: 0.7 },
  },
}));
vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));
vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(fn => fn()),
}));
vi.mock('../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn(msg => ({ message: msg, code: 'AI_ERROR' })),
  },
}));
vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: (e: any) => (e instanceof Error ? e : new Error(String(e))),
  createToolErrorResponse: (info: any) => ({ success: false, error: info.message }),
  logErrorInfo: vi.fn(),
}));
vi.mock('../../utils/language/app-texts', () => ({
  getAppTexts: vi.fn().mockReturnValue({ start: 'Start' }),
  getAppAriaTexts: vi.fn().mockReturnValue({ main: 'Main Area' }),
}));

describe('generateLanguageJsonTool', () => {
  const executeTool = (generateLanguageJsonTool as any).execute;

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

  // Mock a proper LanguageModel instance
  const mockModel: any = {
    provider: 'openai',
    modelId: 'gpt-4',
    // Add additional properties to pass LanguageModelSchema validation
    specificationVersion: 'v1',
    defaultObjectGenerationMode: 'json',
  };

  const baseInput = {
    analysis: baseAnalysis,
    microlearning: baseMicrolearning,
    model: mockModel,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Provide default success mocks for all 8 scene generation calls
    (generateText as any).mockResolvedValue({
      text: JSON.stringify({}),
      usage: { promptTokens: 0, completionTokens: 0 },
    });
  });

  it('should generate all scenes successfully', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': { type: 'intro' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': { type: 'goals' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': { type: 'video' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': { type: 'action' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': { type: 'quiz' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': { type: 'survey' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': { type: 'nudge' } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': { type: 'summary' } }), usage: {} });

    const result = await executeTool(baseInput);

    expect(result.success).toBe(true);
    expect(result.data['1']).toBeDefined();
    expect(result.data['8']).toBeDefined();
    expect(result.data.app).toBeDefined();
    expect(generateText).toHaveBeenCalledTimes(8);
  });

  it('should handle JSON parse errors gracefully', async () => {
    // Mock all 8 calls, with the FIRST one failing parsing
    (generateText as any).mockResolvedValueOnce({
      text: 'INVALID JSON',
      usage: { promptTokens: 0, completionTokens: 0 },
    });

    // The other 7 will still use the default mock from beforeEach

    (cleanResponse as any).mockReturnValueOnce('INVALID JSON');

    const result = await executeTool(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Scene 1 JSON parsing failed');
  });

  it('should retry video generation on parse error', async () => {
    // The parallel calls: 1, 2, 3(video), 4, 5, 6, 7, 8
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} }) // 1
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} }) // 2
      .mockResolvedValueOnce({ text: 'INVALID VIDEO', usage: { promptTokens: 0, completionTokens: 0 } }) // 3 (video fail)
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} }) // 4
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} }) // 5
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} }) // 6
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} }) // 7
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} }) // 8
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': { video: {} } }), usage: {} }); // 3 (video retry)

    (cleanResponse as any).mockImplementation((text: string, _type: string) => {
      if (text === 'INVALID VIDEO') return 'INVALID VIDEO';
      return text;
    });

    const result = await executeTool(baseInput);

    expect(generateText).toHaveBeenCalledTimes(9);
    expect(result.success).toBe(true);
  });

  it('should use code review prompt for code topics', async () => {
    const { generateScene4CodeReviewPrompt } = await import('../scenes/generators/scene4-code-review-generator');

    await executeTool({
      ...baseInput,
      analysis: { ...baseInput.analysis, isCodeTopic: true },
    });

    expect(generateScene4CodeReviewPrompt).toHaveBeenCalled();
  });

  it('should use vishing prompt for vishing topics', async () => {
    const { generateScene4VishingPrompt } = await import('../scenes/generators/scene4-vishing-generator');

    await executeTool({
      ...baseInput,
      analysis: { ...baseInput.analysis, isVishing: true },
    });

    expect(generateScene4VishingPrompt).toHaveBeenCalled();
  });

  it('should include policy context when provided', async () => {
    const { buildPolicyScenePrompt } = await import('../../utils/prompt-builders/policy-context-builder');

    const inputWithPolicy = {
      ...baseInput,
      policyContext: 'Company security policy: Always verify sender before clicking links',
    };

    await executeTool(inputWithPolicy);

    expect(buildPolicyScenePrompt).toHaveBeenCalledWith(
      'Company security policy: Always verify sender before clicking links'
    );
  });

  it('should handle additionalContext in analysis', async () => {
    const inputWithContext = {
      ...baseInput,
      analysis: {
        ...baseInput.analysis,
        hasRichContext: true,
        additionalContext: 'User has failed 3 previous phishing tests',
      },
    };

    const result = await executeTool(inputWithContext);

    expect(result.success).toBe(true);
    // Additional context should be included in the generation
    expect(generateText).toHaveBeenCalled();
  });

  it('should support different languages', async () => {
    const turkishInput = {
      ...baseInput,
      analysis: { ...baseInput.analysis, language: 'tr' },
    };

    const result = await executeTool(turkishInput);

    expect(result.success).toBe(true);
    expect(generateText).toHaveBeenCalled();
  });

  it('should generate app texts along with scenes', async () => {
    const { getAppTexts, getAppAriaTexts } = await import('../../utils/language/app-texts');

    const result = await executeTool(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.app).toBeDefined();
    expect(getAppTexts).toHaveBeenCalledWith('en');
    // getAppAriaTexts is called with language and topic
    expect(getAppAriaTexts).toHaveBeenCalled();
  });

  it('should track cost for all scene generations', async () => {
    const { trackCost } = await import('../../utils/core/cost-tracker');

    (generateText as any).mockResolvedValue({
      text: JSON.stringify({ '1': {} }),
      usage: { promptTokens: 100, completionTokens: 200 },
    });

    await executeTool(baseInput);

    // Should track cost for each of the 8 scenes
    expect(trackCost).toHaveBeenCalled();
  });

  it('should handle writer/streaming for progress updates', async () => {
    const mockWriter = {
      write: vi.fn(),
    };

    const inputWithWriter = {
      ...baseInput,
      writer: mockWriter,
    };

    const result = await executeTool(inputWithWriter);

    expect(result.success).toBe(true);
    // Writer is optional, tool should still succeed even if writer is provided
    expect(result.data).toBeDefined();
  });

  it('should handle all scenes failing gracefully', async () => {
    (generateText as any).mockRejectedValue(new Error('AI Service Down'));

    const result = await executeTool(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle mixed success and failure in parallel generation', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockRejectedValueOnce(new Error('Scene 3 failed'))
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} });

    const result = await executeTool(baseInput);

    // Should fail if any critical scene fails
    expect(result.success).toBe(false);
  });

  it('should handle empty scenes array', async () => {
    const inputWithNoScenes = {
      ...baseInput,
      microlearning: {
        ...baseMicrolearning,
        scenes: [],
      },
    };

    const result = await executeTool(inputWithNoScenes);

    // Should still generate app texts
    expect(result.data.app).toBeDefined();
  });

  it('should handle customRequirements in analysis', async () => {
    const inputWithCustomRequirements = {
      ...baseInput,
      analysis: {
        ...baseInput.analysis,
        customRequirements: 'Focus on mobile security scenarios',
      },
    };

    const result = await executeTool(inputWithCustomRequirements);

    expect(result.success).toBe(true);
    expect(generateText).toHaveBeenCalled();
  });

  it('should handle regulation compliance requirements', async () => {
    const inputWithCompliance = {
      ...baseInput,
      analysis: {
        ...baseInput.analysis,
        regulationCompliance: ['GDPR', 'HIPAA'],
      },
    };

    const result = await executeTool(inputWithCompliance);

    expect(result.success).toBe(true);
  });
  it('should correctly override video URL and transcript details in the final output', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': { video: { src: 'old', transcript: 'old' } } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} });

    const result = await executeTool(baseInput);

    expect(result.success).toBe(true);
    expect(result.data['3'].video.src).toBe('https://video.url'); // From mocked generateVideoPrompt
    expect(result.data['3'].video.transcript).toBe('Translated transcript'); // From mocked translateTranscript
  });

  it('should set transcript language to "English" when language is "en"', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': { video: { src: 'old' } } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} });

    const result = await executeTool({ ...baseInput, analysis: { ...baseAnalysis, language: 'en' } });
    expect(result.data['3'].video.transcriptLanguage).toBe('English');
  });

  it('should use raw language code for transcript language when not "en"', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': { video: { src: 'old' } } }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} });

    const result = await executeTool({ ...baseInput, analysis: { ...baseAnalysis, language: 'tr' } });
    expect(result.data['3'].video.transcriptLanguage).toBe('tr');
  });

  it('should fail if video generation fails even after retry', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockResolvedValueOnce({ text: 'INVALID VIDEO', usage: {} }) // 3 Fail
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '5': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} })
      .mockResolvedValueOnce({ text: 'INVALID VIDEO RETRY', usage: {} }); // 3 Retry Fail

    const result = await executeTool(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Video content generation failed after retry');
  });

  it('should handle parsing errors in other scenes (e.g. Scene 5)', async () => {
    (generateText as any)
      .mockResolvedValueOnce({ text: JSON.stringify({ '1': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '2': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '3': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '4': {} }), usage: {} })
      .mockResolvedValueOnce({ text: 'INVALID JSON', usage: {} }) // 5 Fail
      .mockResolvedValueOnce({ text: JSON.stringify({ '6': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '7': {} }), usage: {} })
      .mockResolvedValueOnce({ text: JSON.stringify({ '8': {} }), usage: {} });

    const result = await executeTool(baseInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Scene 5 JSON parsing failed');
  });

  it('should include additional context as a separate user message with CRITICAL label', async () => {
    const inputWithContext = {
      ...baseInput,
      analysis: {
        ...baseInput.analysis,
        additionalContext: 'User has failed 3 previous phishing tests',
      },
    };

    await executeTool(inputWithContext);

    // Check arguments of the first call (Scene 1)
    const callArgs = (generateText as any).mock.calls[0][0];
    const messages = callArgs.messages;

    // Should have: System, User (Critical Context), User (Prompt)
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('CRITICAL USER CONTEXT');
    expect(messages[1].content).toContain('User has failed 3 previous phishing tests');
  });
});
