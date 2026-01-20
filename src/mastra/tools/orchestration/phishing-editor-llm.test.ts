import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmailEditPromise, createLandingEditPromises } from './phishing-editor-llm';
import { generateText } from 'ai';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: vi.fn(async (fn: any) => await fn()),
  withTimeout: vi.fn(async (p: any) => await p),
}));

vi.mock('./phishing-editor-prompts', () => ({
  getPhishingEditorSystemPrompt: vi.fn(() => 'SYSTEM_EMAIL'),
  getPhishingEmailUserPrompt: vi.fn(() => 'USER_EMAIL'),
  getLandingPageSystemPrompt: vi.fn(() => 'SYSTEM_LANDING'),
  getLandingPageUserPrompt: vi.fn(() => 'USER_LANDING'),
}));

describe('phishing-editor-llm', () => {
  const logger = { info: vi.fn() };
  const model = { modelId: 'test-model' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockResolvedValue({ text: '{"ok":true}' });
  });

  it('createEmailEditPromise should call generateText with system+user messages', async () => {
    await createEmailEditPromise({
      aiModel: model,
      email: { subject: 'Sub', template: '<html></html>' },
      escapedInstruction: 'Make it English',
      brandContext: '',
      logger,
    });

    expect(withRetry).toHaveBeenCalledWith(expect.any(Function), 'Phishing email editing');
    expect(withTimeout).toHaveBeenCalled();
    expect(generateText).toHaveBeenCalledTimes(1);

    const callArg = (generateText as any).mock.calls[0][0];
    expect(callArg.model).toBe(model);
    expect(callArg.messages).toEqual([
      { role: 'system', content: 'SYSTEM_EMAIL' },
      { role: 'user', content: 'USER_EMAIL' },
    ]);
    expect(logger.info).toHaveBeenCalledWith('Calling LLM for email editing');
  });

  it('createLandingEditPromises should create one promise per page and call generateText', async () => {
    const promises = createLandingEditPromises({
      aiModel: model,
      pages: [
        { type: 'login', template: '<html>1</html>' },
        { type: 'login', template: '<html>2</html>' },
      ],
      mode: 'edit',
      escapedInstruction: 'Make it English',
      brandContext: '',
      logger,
    });

    expect(promises).toHaveLength(2);

    await Promise.all(promises);

    expect(generateText).toHaveBeenCalledTimes(2);
    const firstCall = (generateText as any).mock.calls[0][0];
    expect(firstCall.messages[0]).toEqual({ role: 'system', content: 'SYSTEM_LANDING' });
    expect(firstCall.messages[1]).toEqual({ role: 'user', content: 'USER_LANDING' });
  });
});
