import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getModelWithOverride: vi.fn(),
  loggerDebug: vi.fn(),
  aiModel: vi.fn(),
  normalizeError: vi.fn(),
  logErrorInfo: vi.fn(),
  analyzeUserPromptWithAI: vi.fn(),
  getFallbackAnalysis: vi.fn(),
}));

vi.mock('@mastra/core/tools', () => ({
  Tool: class Tool {
    id: string;
    description: string;
    inputSchema: unknown;
    outputSchema: unknown;
    execute: (context: unknown) => Promise<unknown>;
    constructor(config: any) {
      this.id = config.id;
      this.description = config.description;
      this.inputSchema = config.inputSchema;
      this.outputSchema = config.outputSchema;
      this.execute = config.execute;
    }
  },
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: mocks.getModelWithOverride,
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    debug: mocks.loggerDebug,
  }),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    aiModel: mocks.aiModel,
  },
}));

vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
  logErrorInfo: mocks.logErrorInfo,
}));

vi.mock('./utils/prompt-analyzer', () => ({
  analyzeUserPromptWithAI: mocks.analyzeUserPromptWithAI,
  getFallbackAnalysis: mocks.getFallbackAnalysis,
}));

import { analyzeUserPromptTool } from './analyze-user-prompt-tool';

describe('analyzeUserPromptTool.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModelWithOverride.mockReturnValue('mock-model');
    mocks.aiModel.mockReturnValue({ code: 'AI_MODEL_ERROR', message: 'failed' });
    mocks.normalizeError.mockImplementation((e: Error) => e);
  });

  it('uses context.inputData and returns AI analysis on success', async () => {
    mocks.analyzeUserPromptWithAI.mockResolvedValueOnce({
      success: true,
      data: { topic: 'Phishing', language: 'en' },
    });

    const writer = { write: vi.fn() };
    const result = await (analyzeUserPromptTool as any).execute({
      inputData: {
        userPrompt: 'Create phishing awareness training',
        additionalContext: 'Focus on finance users',
        suggestedDepartment: 'Finance',
        suggestedLevel: 'Intermediate',
        customRequirements: 'Include practical examples',
        suggestedLanguage: 'en-gb',
        policyContext: 'Follow internal policy',
        modelProvider: 'OPENAI',
        model: 'OPENAI_GPT_4O',
        writer,
      },
    });

    expect(mocks.getModelWithOverride).toHaveBeenCalledWith('OPENAI', 'OPENAI_GPT_4O');
    expect(mocks.analyzeUserPromptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: 'Create phishing awareness training',
        suggestedDepartment: 'Finance',
        suggestedLanguage: 'en-gb',
        policyContext: 'Follow internal policy',
        writer,
        model: 'mock-model',
      })
    );
    expect(result).toEqual({
      success: true,
      data: { topic: 'Phishing', language: 'en' },
    });
  });

  it('uses context.input when inputData is missing', async () => {
    mocks.analyzeUserPromptWithAI.mockResolvedValueOnce({ success: true, data: { topic: 'x' } });

    await (analyzeUserPromptTool as any).execute({
      input: {
        userPrompt: 'Create training content',
      },
    });

    expect(mocks.analyzeUserPromptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: 'Create training content',
      })
    );
  });

  it('falls back when AI analysis throws and preserves policyContext', async () => {
    const err = new Error('LLM unavailable');
    mocks.analyzeUserPromptWithAI.mockRejectedValueOnce(err);
    mocks.getFallbackAnalysis.mockResolvedValueOnce({
      topic: 'Fallback Topic',
      language: 'en',
      department: 'All',
    });

    const result = await (analyzeUserPromptTool as any).execute({
      userPrompt: 'Create anti-phishing training',
      suggestedDepartment: 'IT',
      additionalContext: 'For onboarding',
      customRequirements: 'Use plain language',
      policyContext: 'Policy V1',
    });

    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.aiModel).toHaveBeenCalledWith('LLM unavailable', expect.objectContaining({ step: 'prompt-analysis' }));
    expect(mocks.logErrorInfo).toHaveBeenCalled();
    expect(mocks.getFallbackAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: 'Create anti-phishing training',
        suggestedDepartment: 'IT',
        additionalContext: 'For onboarding',
        customRequirements: 'Use plain language',
        model: 'mock-model',
      })
    );
    expect(result).toEqual({
      success: true,
      data: {
        topic: 'Fallback Topic',
        language: 'en',
        department: 'All',
      },
      policyContext: 'Policy V1',
      error: JSON.stringify({ code: 'AI_MODEL_ERROR', message: 'failed' }),
    });
  });
});

describe('analyzeUserPromptTool.inputSchema', () => {
  it('applies default suggestedLevel when omitted', () => {
    const parsed = (analyzeUserPromptTool as any).inputSchema.parse({
      userPrompt: 'Create phishing awareness content',
    });

    expect(parsed.suggestedLevel).toBe('Intermediate');
  });

  it('rejects empty prompt (min-length validation)', () => {
    expect(() =>
      (analyzeUserPromptTool as any).inputSchema.parse({
        userPrompt: '',
      })
    ).toThrow();
  });
});
