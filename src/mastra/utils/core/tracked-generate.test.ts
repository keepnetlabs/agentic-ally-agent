import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateText = vi.hoisted(() => vi.fn());
const mockTrackCost = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock('./cost-tracker', () => ({
  trackCost: (...args: unknown[]) => mockTrackCost(...args),
}));

import { trackedGenerateText, trackAgentCost } from './tracked-generate';
import { requestStorage } from './request-storage';

/** Build a minimal JWT with given payload (no signature verification needed) */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fake-sig`;
}

describe('tracked-generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to generateText and records cost when usage is present', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 10, completionTokens: 5 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];

    const result = await trackedGenerateText('test-op', {
      model,
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(result.text).toBe('ok');
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockTrackCost).toHaveBeenCalledWith(
      'test-op',
      'gpt-4o-mini',
      expect.objectContaining({ promptTokens: 10, completionTokens: 5 })
    );
  });

  it('injects JWT sub as end-user ID when token is in request context', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];
    const token = fakeJwt({ sub: 'ptaCdRKjZE2a', user_id: '32' });

    await requestStorage.run({ token }, async () => {
      await trackedGenerateText('user-id-op', {
        model,
        messages: [{ role: 'user', content: 'test' }],
      });
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions?.openai?.user).toBe('op-ptaCdRKjZE2a');
  });

  it('falls back to companyId for autonomous jobs without token', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];

    await requestStorage.run({ companyId: '42' }, async () => {
      await trackedGenerateText('auto-op', {
        model,
        messages: [{ role: 'user', content: 'test' }],
      });
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions?.openai?.user).toBe('auto-42');
  });

  it('prefers JWT sub over companyId when both exist', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];
    const token = fakeJwt({ sub: 'abc123' });

    await requestStorage.run({ token, companyId: '42' }, async () => {
      await trackedGenerateText('both-op', {
        model,
        messages: [{ role: 'user', content: 'test' }],
      });
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions?.openai?.user).toBe('op-abc123');
  });

  it('falls back to companyId when token is not a valid JWT', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];

    await requestStorage.run({ token: 'not-a-jwt', companyId: '7' }, async () => {
      await trackedGenerateText('bad-jwt-op', {
        model,
        messages: [{ role: 'user', content: 'test' }],
      });
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions?.openai?.user).toBe('auto-7');
  });

  it('does not inject end-user ID when context is empty', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];

    await trackedGenerateText('no-ctx-op', {
      model,
      messages: [{ role: 'user', content: 'test' }],
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions).toBeUndefined();
  });

  it('preserves existing providerOptions when injecting end-user ID', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'ok',
      usage: { promptTokens: 1, completionTokens: 1 },
    });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];
    const token = fakeJwt({ sub: 'mergeUser' });

    await requestStorage.run({ token }, async () => {
      await trackedGenerateText('merge-op', {
        model,
        messages: [{ role: 'user', content: 'test' }],
        providerOptions: { openai: { reasoningEffort: 'medium' } },
      });
    });

    const passedParams = mockGenerateText.mock.calls[0][0];
    expect(passedParams.providerOptions.openai.user).toBe('op-mergeUser');
    expect(passedParams.providerOptions.openai.reasoningEffort).toBe('medium');
  });

  it('does not call trackCost when usage is missing', async () => {
    mockGenerateText.mockResolvedValue({ text: 'no-usage' });
    const model = { modelId: 'gpt-4o-mini' } as Parameters<typeof trackedGenerateText>[1]['model'];

    await trackedGenerateText('no-usage-op', {
      model,
      messages: [{ role: 'user', content: 'x' }],
    });

    expect(mockTrackCost).not.toHaveBeenCalled();
  });

  it('trackAgentCost forwards usage to trackCost', () => {
    const model = { modelId: 'claude-sonnet-4-6' };
    trackAgentCost('agent-op', { usage: { promptTokens: 3, completionTokens: 2 } }, model);

    expect(mockTrackCost).toHaveBeenCalledWith(
      'agent-op',
      'claude-sonnet-4-6',
      expect.objectContaining({ promptTokens: 3 })
    );
  });

  it('trackAgentCost skips when no usage', () => {
    trackAgentCost('noop', {}, { modelId: 'm' });
    expect(mockTrackCost).not.toHaveBeenCalled();
  });
});
