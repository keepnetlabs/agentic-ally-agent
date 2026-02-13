import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  getModelWithOverride: vi.fn(),
  cleanResponse: vi.fn(),
  withRetry: vi.fn(),
  aiModel: vi.fn(),
  normalizeError: vi.fn(),
  logErrorInfo: vi.fn(),
  loggerInfo: vi.fn(),
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

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: mocks.getModelWithOverride,
}));

vi.mock('../../utils/content-processors/json-cleaner', () => ({
  cleanResponse: mocks.cleanResponse,
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
  }),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    validation: vi.fn((message: string, meta?: any) => ({ code: 'VALIDATION', message, meta })),
    aiModel: mocks.aiModel,
  },
}));

vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
  logErrorInfo: mocks.logErrorInfo,
}));

import { codeReviewCheckTool } from './code-review-check-tool';

describe('codeReviewCheckTool.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModelWithOverride.mockReturnValue('mock-model');
    mocks.withRetry.mockImplementation(async (fn: any) => fn());
    mocks.generateText.mockResolvedValue({
      text: '{"isCorrect":true,"severity":"correct","feedback":"ok","explanation":"ok","hint":"good"}',
    });
    mocks.cleanResponse.mockImplementation((text: string) => text);
    mocks.aiModel.mockReturnValue({ code: 'AI_MODEL_ERROR', message: 'failed' });
    mocks.normalizeError.mockImplementation((e: Error) => e);
  });

  it('returns correct verdict and 25 points on successful validation', async () => {
    const result = await (codeReviewCheckTool as any).execute({
      issueType: 'SQL Injection',
      originalCode: 'SELECT * FROM users WHERE id = ' + 'userId',
      fixedCode: 'SELECT * FROM users WHERE id = ?',
      language: 'javascript',
      outputLanguage: 'en',
    });

    expect(result).toEqual({
      success: true,
      data: {
        isCorrect: true,
        severity: 'correct',
        feedback: 'ok',
        explanation: 'ok',
        points: 25,
        hint: 'good',
      },
    });
    expect(mocks.generateText).toHaveBeenCalled();
  });

  it('maps partial severity to 10 points and uses nextStep as hint fallback', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{"isCorrect":false,"severity":"partial","feedback":"partial","explanation":"needs work","nextStep":"parameterize query"}',
    });

    const result = await (codeReviewCheckTool as any).execute({
      inputData: {
        issueType: 'SQL Injection',
        originalCode: 'unsafe',
        fixedCode: 'still risky',
        language: 'javascript',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.severity).toBe('partial');
    expect(result.data.points).toBe(10);
    expect(result.data.hint).toBe('parameterize query');
  });

  it('uses default outputLanguage=en when not provided', async () => {
    await (codeReviewCheckTool as any).execute({
      issueType: 'Logic Error',
      originalCode: 'if (a || b)',
      fixedCode: 'if (a && b)',
      language: 'javascript',
    });

    const arg = mocks.generateText.mock.calls[0][0];
    expect(arg.messages[0].content).toContain('Respond in en language');
  });

  it('returns failure payload when severity is invalid', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{"isCorrect":false,"severity":"unknown","feedback":"bad","explanation":"bad"}',
    });

    const result = await (codeReviewCheckTool as any).execute({
      issueType: 'XSS',
      originalCode: 'innerHTML',
      fixedCode: 'innerHTML',
      language: 'javascript',
    });

    expect(result.success).toBe(false);
    expect(result.data.severity).toBe('incorrect');
    expect(result.error).toContain('AI_MODEL_ERROR');
  });

  it('defaults severity to incorrect when missing and isCorrect=false', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{"isCorrect":false,"feedback":"nope","explanation":"still vulnerable"}',
    });

    const result = await (codeReviewCheckTool as any).execute({
      input: {
        issueType: 'SQL Injection',
        originalCode: 'unsafe',
        fixedCode: 'unsafe',
        language: 'javascript',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.severity).toBe('incorrect');
    expect(result.data.points).toBe(0);
    expect(result.data.hint).toBe('');
  });

  it('returns failure payload when LLM call fails', async () => {
    mocks.withRetry.mockRejectedValueOnce(new Error('provider timeout'));

    const result = await (codeReviewCheckTool as any).execute({
      issueType: 'Race Condition',
      originalCode: 'unsafe code',
      fixedCode: 'attempted fix',
      language: 'javascript',
    });

    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.aiModel).toHaveBeenCalledWith(
      'provider timeout',
      expect.objectContaining({ issueType: 'Race Condition' })
    );
    expect(result.success).toBe(false);
    expect(result.data.points).toBe(0);
    expect(result.error).toContain('AI_MODEL_ERROR');
  });

  it('defaults severity to correct when isCorrect=true and severity is missing', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{"isCorrect":true,"feedback":"looks good","explanation":"issue resolved"}',
    });

    const result = await (codeReviewCheckTool as any).execute({
      issueType: 'XSS',
      originalCode: 'innerHTML',
      fixedCode: 'textContent',
      language: 'javascript',
    });

    expect(result.success).toBe(true);
    expect(result.data.severity).toBe('correct');
    expect(result.data.points).toBe(25);
  });
});
