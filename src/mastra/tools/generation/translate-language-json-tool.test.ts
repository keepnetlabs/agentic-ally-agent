import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock dependency modules
vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn().mockReturnValue({ provider: 'OPENAI', modelId: 'gpt-4' })
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn((fn: any) => fn())
}));

// Mock all rewriters
vi.mock('../scenes/rewriters/scene1-intro-rewriter', () => ({ rewriteScene1Intro: vi.fn().mockResolvedValue({ id: '1', content: 'Intro' }) }));
vi.mock('../scenes/rewriters/scene2-goal-rewriter', () => ({ rewriteScene2Goal: vi.fn().mockResolvedValue({ id: '2', content: 'Goal' }) }));
vi.mock('../scenes/rewriters/scene3-video-rewriter', () => ({ rewriteScene3Video: vi.fn().mockResolvedValue({ id: '3', content: 'Video' }) }));
vi.mock('../scenes/rewriters/scene4-actionable-rewriter', () => ({ rewriteScene4Actionable: vi.fn().mockResolvedValue({ id: '4', content: 'Actions' }) }));
vi.mock('../scenes/rewriters/scene5-quiz-rewriter', () => ({ rewriteScene5Quiz: vi.fn().mockResolvedValue({ id: '5', content: 'Quiz' }) }));
vi.mock('../scenes/rewriters/scene6-survey-rewriter', () => ({ rewriteScene6Survey: vi.fn().mockResolvedValue({ id: '6', content: 'Survey' }) }));
vi.mock('../scenes/rewriters/scene7-nudge-rewriter', () => ({ rewriteScene7Nudge: vi.fn().mockResolvedValue({ id: '7', content: 'Nudge' }) }));
vi.mock('../scenes/rewriters/scene8-summary-rewriter', () => ({ rewriteScene8Summary: vi.fn().mockResolvedValue({ id: '8', content: 'Summary' }) }));
vi.mock('../scenes/rewriters/app-texts-rewriter', () => ({ rewriteAppTexts: vi.fn().mockResolvedValue({ app: 'texts' }) }));

import { translateLanguageJsonTool } from './translate-language-json-tool';
import { rewriteScene1Intro } from '../scenes/rewriters/scene1-intro-rewriter';
import { rewriteAppTexts } from '../scenes/rewriters/app-texts-rewriter';

describe('translateLanguageJsonTool', () => {
  const baseInput = {
    json: {
      '1': { original: 'content' },
      app_texts: { key: 'value' }
    },
    microlearningStructure: {
      scenes: [
        { scene_id: '1', metadata: { scene_type: 'intro' } }
      ]
    },
    sourceLanguage: 'en-gb',
    targetLanguage: 'tr-tr',
    topic: 'Security'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should translate successfully', async () => {
    const result = await (translateLanguageJsonTool as any).execute(baseInput);

    expect(result.success).toBe(true);
    expect(rewriteScene1Intro).toHaveBeenCalled();
    expect(rewriteAppTexts).toHaveBeenCalled();
    expect(result.data['1']).toEqual({ id: '1', content: 'Intro' });
  });

  it('should handle scene failure with fallback', async () => {
    (rewriteScene1Intro as any).mockRejectedValue(new Error('Rewrite failed'));

    const result = await (translateLanguageJsonTool as any).execute(baseInput);

    expect(result.success).toBe(true); // Should succeed with fallback
    expect(result.data['1']).toEqual({ original: 'content' }); // Returns original
  });

  it('should return error on critical failure', async () => {
    // Critical failure like invalid JSON structure that prevents parallel processing
    const result = await (translateLanguageJsonTool as any).execute({ ...baseInput, json: null });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle empty scenes metadata', async () => {
    const result = await (translateLanguageJsonTool as any).execute({
      ...baseInput,
      microlearningStructure: { scenes: [] }
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(baseInput.json);
  });
});
