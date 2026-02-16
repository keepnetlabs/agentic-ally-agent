import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPolicySummary: vi.fn(),
  generateText: vi.fn(),
  getModelWithOverride: vi.fn(),
  cleanResponse: vi.fn(),
  validateToolResult: vi.fn(),
  withRetry: vi.fn(),
  validation: vi.fn(),
  external: vi.fn(),
  createToolErrorResponse: vi.fn(),
  normalizeError: vi.fn(),
  logErrorInfo: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@mastra/core/tools', () => ({
  createTool: (config: any) => config,
}));

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: mocks.getPolicySummary,
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

vi.mock('../../utils/tool-result-validation', () => ({
  validateToolResult: mocks.validateToolResult,
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    validation: mocks.validation,
    external: mocks.external,
  },
}));

vi.mock('../../utils/core/error-utils', () => ({
  normalizeError: mocks.normalizeError,
  createToolErrorResponse: mocks.createToolErrorResponse,
  logErrorInfo: mocks.logErrorInfo,
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: mocks.loggerInfo,
    debug: mocks.loggerDebug,
    error: mocks.loggerError,
  }),
}));

import { summarizePolicyTool } from './summarize-policy-tool';

describe('summarizePolicyTool.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getModelWithOverride.mockReturnValue('mock-model');
    mocks.getPolicySummary.mockResolvedValue('Policy content');
    mocks.withRetry.mockImplementation(async (fn: any) => fn());
    mocks.generateText.mockResolvedValue({
      text: '{"summary":"S","key_points":["K1"],"recommendations":["R1"],"relevant_sections":["Sec1"]}',
    });
    mocks.cleanResponse.mockImplementation((t: string) => t);
    mocks.validateToolResult.mockImplementation((result: any) => ({
      success: true,
      data: result,
    }));
    mocks.validation.mockReturnValue({ code: 'VALIDATION', message: 'validation failed' });
    mocks.external.mockReturnValue({ code: 'EXTERNAL', message: 'external failed' });
    mocks.createToolErrorResponse.mockImplementation((errorInfo: any) => ({
      success: false,
      error: JSON.stringify(errorInfo),
    }));
    mocks.normalizeError.mockImplementation((e: Error) => e);
  });

  it('returns tool error when policy summary is empty', async () => {
    mocks.getPolicySummary.mockResolvedValueOnce('');

    const result = await summarizePolicyTool.execute({
      context: { question: 'What is policy?' },
    } as any);

    expect(mocks.createToolErrorResponse).toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('returns validated success payload on happy path', async () => {
    const result = await summarizePolicyTool.execute({
      context: { question: 'What is phishing policy?', focusArea: 'phishing', language: 'en' },
    } as any);

    expect(mocks.getModelWithOverride).toHaveBeenCalled();
    expect(mocks.withRetry).toHaveBeenCalled();
    expect(mocks.generateText).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: {
        question: 'What is phishing policy?',
        summary: 'S',
        key_points: ['K1'],
        recommendations: ['R1'],
        relevant_sections: ['Sec1'],
      },
    });
  });

  it('returns validation error when tool-result validation fails', async () => {
    mocks.validateToolResult.mockReturnValueOnce({
      success: false,
      error: { code: 'SCHEMA_INVALID', message: 'invalid output shape' },
    });

    const result = await summarizePolicyTool.execute({
      context: { question: 'What is policy?' },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('SCHEMA_INVALID');
  });

  it('returns external error payload when execute throws', async () => {
    mocks.generateText.mockRejectedValueOnce(new Error('LLM down'));

    const result = await summarizePolicyTool.execute({
      context: { question: 'What is policy?', focusArea: 'security' },
    } as any);

    expect(mocks.normalizeError).toHaveBeenCalled();
    expect(mocks.external).toHaveBeenCalledWith('LLM down', expect.objectContaining({ step: 'policy-summarization' }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('EXTERNAL');
  });

  it('uses English in system prompt when language is not provided', async () => {
    await summarizePolicyTool.execute({
      context: { question: 'What is our policy?' },
    } as any);

    const generateArg = mocks.generateText.mock.calls[0][0];
    expect(generateArg.system).toContain('Respond in English');
  });

  it('returns external error when cleaned response is not valid JSON', async () => {
    mocks.cleanResponse.mockReturnValueOnce('not-json');

    const result = await summarizePolicyTool.execute({
      context: { question: 'What is our policy?' },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('EXTERNAL');
  });

  it('fills missing parsed fields with defaults before validation', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{"summary":"Only summary"}',
    });

    const result = await summarizePolicyTool.execute({
      context: { question: 'Policy question?' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data.summary).toBe('Only summary');
    expect(result.data.key_points).toEqual([]);
    expect(result.data.recommendations).toEqual([]);
  });

  it('defaults summary to empty string when parsed summary is missing', async () => {
    mocks.generateText.mockResolvedValueOnce({
      text: '{}',
    });

    const result = await summarizePolicyTool.execute({
      context: { question: 'Policy question?' },
    } as any);

    expect(result.success).toBe(true);
    expect(result.data.summary).toBe('');
    expect(result.data.key_points).toEqual([]);
    expect(result.data.recommendations).toEqual([]);
  });
});
