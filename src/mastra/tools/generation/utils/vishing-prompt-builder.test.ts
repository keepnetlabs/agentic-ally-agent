import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildVishingAgentPrompt } from './vishing-prompt-builder';

const generateTextMock = vi.fn();
const withRetryMock = vi.fn();

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock('../../../utils/core/resilience-utils', () => ({
  withRetry: (...args: unknown[]) => withRetryMock(...args),
}));

describe('buildVishingAgentPrompt', () => {
  const scenarioPrompt = 'Simulate a voice call pretext about IT support verification.';
  const model = { id: 'test-model' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns base system prompt directly for English language', async () => {
    const result = await buildVishingAgentPrompt(scenarioPrompt, { language: 'en-US' } as any, model);

    expect(withRetryMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(result).toContain('You are the voice-call simulation agent');
    expect(result).toContain(`Scenario:\n${scenarioPrompt}`);
  });

  it('localizes system prompt for non-English language and trims localized text', async () => {
    withRetryMock.mockImplementation(async (operation: () => Promise<{ text: string }>) => operation());
    generateTextMock.mockResolvedValue({ text: '  Yerellestirilmis sistem promptu  ' });

    const result = await buildVishingAgentPrompt(scenarioPrompt, { language: 'tr' } as any, model);

    expect(withRetryMock).toHaveBeenCalledTimes(1);
    expect(withRetryMock).toHaveBeenCalledWith(expect.any(Function), 'Scene 4 vishing prompt localization');
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).toHaveBeenCalledWith({
      model,
      messages: [
        {
          role: 'system',
          content: expect.stringContaining('Localize the following system prompt into tr.'),
        },
        {
          role: 'user',
          content: expect.stringContaining('You are the voice-call simulation agent'),
        },
      ],
    });
    expect(result).toBe(`Yerellestirilmis sistem promptu\n\nScenario:\n${scenarioPrompt}`);
  });
});
