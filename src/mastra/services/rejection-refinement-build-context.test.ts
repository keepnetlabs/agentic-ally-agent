/**
 * buildRefinementContext — D1 + LLM mocked; exercises full control flow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CampaignMetadataRow } from './campaign-metadata-service';

const mockGetCampaignMetadata = vi.hoisted(() => vi.fn());
const mockTrackedGenerateText = vi.hoisted(() => vi.fn());

vi.mock('./campaign-metadata-service', () => ({
  getCampaignMetadata: (...args: unknown[]) => mockGetCampaignMetadata(...args),
}));

vi.mock('../utils/core/tracked-generate', () => ({
  trackedGenerateText: (...args: unknown[]) => mockTrackedGenerateText(...args),
}));

vi.mock('../model-providers', () => ({
  getRefinementModel: () => ({ modelId: 'gpt-4o-mini' }),
}));

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
}));

import { buildRefinementContext } from './rejection-refinement-service';

function sampleRow(id: string): CampaignMetadataRow {
  return {
    resource_id: id,
    tactic: 'Authority',
    persuasion_tactic: null,
    scenario: 'CEO fraud',
    difficulty: 'Hard',
    scenario_type: null,
    created_at: '2026-01-01T00:00:00Z',
    reasoning: null,
    content_type: 'phishing',
  };
}

describe('buildRefinementContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when rejectedScenarioResourceId is empty', async () => {
    expect(
      await buildRefinementContext({
        rejectedScenarioResourceId: '',
        rejectingReason: 'x',
        actions: ['phishing'],
        env: {},
      })
    ).toBeNull();
    expect(mockGetCampaignMetadata).not.toHaveBeenCalled();
  });

  it('returns null when rejectingReason is blank', async () => {
    expect(
      await buildRefinementContext({
        rejectedScenarioResourceId: 'res-1',
        rejectingReason: '   ',
        actions: ['phishing'],
        env: {},
      })
    ).toBeNull();
    expect(mockGetCampaignMetadata).not.toHaveBeenCalled();
  });

  it('returns null when D1 has no metadata — does not call LLM', async () => {
    mockGetCampaignMetadata.mockResolvedValue(new Map());
    const result = await buildRefinementContext({
      rejectedScenarioResourceId: 'res-1',
      rejectingReason: 'Too dark',
      actions: ['phishing'],
      env: { agentic_ally_memory: {} },
    });
    expect(result).toBeNull();
    expect(mockTrackedGenerateText).not.toHaveBeenCalled();
  });

  it('returns refinement context when metadata and LLM succeed', async () => {
    const map = new Map<string, CampaignMetadataRow>();
    map.set('res-1', sampleRow('res-1'));
    mockGetCampaignMetadata.mockResolvedValue(map);
    mockTrackedGenerateText.mockResolvedValue({
      text: JSON.stringify({ phishingInstruction: 'Use a softer tone.' }),
    });

    const result = await buildRefinementContext({
      rejectedScenarioResourceId: 'res-1',
      rejectingReason: 'Too aggressive',
      actions: ['phishing'],
      env: {},
    });

    expect(result).toEqual({ phishingInstruction: 'Use a softer tone.' });
    expect(mockGetCampaignMetadata).toHaveBeenCalled();
    expect(mockTrackedGenerateText).toHaveBeenCalledTimes(1);
  });

  it('returns null when LLM output is not valid JSON', async () => {
    const map = new Map<string, CampaignMetadataRow>([['res-1', sampleRow('res-1')]]);
    mockGetCampaignMetadata.mockResolvedValue(map);
    mockTrackedGenerateText.mockResolvedValue({ text: 'not json at all' });

    expect(
      await buildRefinementContext({
        rejectedScenarioResourceId: 'res-1',
        rejectingReason: 'x',
        actions: ['phishing'],
        env: {},
      })
    ).toBeNull();
  });

  it('returns null and swallows errors from getCampaignMetadata', async () => {
    mockGetCampaignMetadata.mockRejectedValue(new Error('D1 down'));
    const result = await buildRefinementContext({
      rejectedScenarioResourceId: 'res-1',
      rejectingReason: 'x',
      actions: ['phishing'],
      env: {},
    });
    expect(result).toBeNull();
  });
});
