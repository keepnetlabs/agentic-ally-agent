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
