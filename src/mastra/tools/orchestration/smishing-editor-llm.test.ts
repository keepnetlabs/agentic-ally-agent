import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  withRetry: vi.fn(),
  withTimeout: vi.fn(),
  getSmsSystemPrompt: vi.fn(),
  getSmsUserPrompt: vi.fn(),
  getLandingSystemPrompt: vi.fn(),
  getLandingUserPrompt: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withRetry: mocks.withRetry,
  withTimeout: mocks.withTimeout,
}));

vi.mock('./smishing-editor-prompts', () => ({
  getSmishingSmsSystemPrompt: mocks.getSmsSystemPrompt,
  getSmishingSmsUserPrompt: mocks.getSmsUserPrompt,
  getSmishingLandingPageSystemPrompt: mocks.getLandingSystemPrompt,
  getSmishingLandingPageUserPrompt: mocks.getLandingUserPrompt,
}));

import { createSmsEditPromise, createLandingEditPromises } from './smishing-editor-llm';

describe('smishing-editor-llm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateText.mockResolvedValue({ text: '{"ok":true}' });
    mocks.withTimeout.mockImplementation((p: Promise<unknown>) => p);
    mocks.withRetry.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mocks.getSmsSystemPrompt.mockReturnValue('sms-system');
    mocks.getSmsUserPrompt.mockReturnValue('sms-user');
    mocks.getLandingSystemPrompt.mockReturnValue('landing-system');
    mocks.getLandingUserPrompt.mockReturnValue('landing-user');
  });

  it('creates sms edit promise with retry and timeout wrappers', async () => {
    const logger = { info: vi.fn() };
    const result = await createSmsEditPromise({
      aiModel: 'model-x' as any,
      sms: { messages: ['a'] },
      escapedInstruction: 'edit',
      mode: 'edit',
      logger,
    });

    expect(logger.info).toHaveBeenCalledWith('Calling LLM for SMS editing');
    expect(mocks.getSmsSystemPrompt).toHaveBeenCalledWith('edit');
    expect(mocks.getSmsUserPrompt).toHaveBeenCalledWith({ messages: ['a'] }, 'edit');
    expect(mocks.withRetry).toHaveBeenCalledWith(expect.any(Function), 'Smishing SMS editing');
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'model-x',
        temperature: 0.3,
      })
    );
    expect(result).toEqual({ text: '{"ok":true}' });
  });

  it('returns empty array when landing pages are empty', () => {
    const logger = { info: vi.fn() };
    const result = createLandingEditPromises({
      aiModel: 'model-x' as any,
      pages: [],
      mode: 'edit',
      escapedInstruction: 'update',
      brandContext: '',
      logger,
    });

    expect(result).toEqual([]);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('creates one landing promise per page and uses indexed retry labels', async () => {
    const logger = { info: vi.fn() };
    const promises = createLandingEditPromises({
      aiModel: 'model-x' as any,
      pages: [
        { type: 'login', template: '<html>1</html>' },
        { type: 'success', template: '<html>2</html>' },
      ],
      mode: 'translate',
      escapedInstruction: 'tr',
      brandContext: 'brand',
      logger,
    });

    expect(promises).toHaveLength(2);
    await Promise.all(promises);

    expect(mocks.getLandingSystemPrompt).toHaveBeenCalledWith('translate');
    expect(mocks.getLandingUserPrompt).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('Calling LLM for landing page 1 editing');
    expect(logger.info).toHaveBeenCalledWith('Calling LLM for landing page 2 editing');
    expect(mocks.withRetry).toHaveBeenCalledWith(expect.any(Function), 'Smishing landing page 1 editing');
    expect(mocks.withRetry).toHaveBeenCalledWith(expect.any(Function), 'Smishing landing page 2 editing');
  });
});
