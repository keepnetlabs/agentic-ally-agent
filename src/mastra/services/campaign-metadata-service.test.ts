import { describe, it, expect, vi } from 'vitest';
import {
  saveCampaignMetadata,
  getCampaignMetadata,
  trySaveCampaignMetadataAfterUpload,
  type CampaignMetadataInput,
} from './campaign-metadata-service';

describe('campaign-metadata-service', () => {
  describe('saveCampaignMetadata', () => {
    it('returns false when env is undefined', async () => {
      const result = await saveCampaignMetadata(undefined, {
        resourceId: 'test-123',
        tactic: 'Authority',
      });
      expect(result).toBe(false);
    });

    it('returns false when metadata is missing resourceId', async () => {
      const result = await saveCampaignMetadata({}, {} as CampaignMetadataInput);
      expect(result).toBe(false);
    });

    it('returns false when resourceId is empty string', async () => {
      const result = await saveCampaignMetadata({}, { resourceId: '' });
      expect(result).toBe(false);
    });

    it('returns false when D1 binding is not available', async () => {
      const result = await saveCampaignMetadata({ agentic_ally_memory: undefined }, { resourceId: 'test-123' });
      expect(result).toBe(false);
    });

    it('returns true and persists when D1 is available', async () => {
      const runMock = vi.fn().mockResolvedValue({ success: true });
      const bindMock = vi.fn().mockReturnValue({ run: runMock });
      const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });
      const env = { agentic_ally_memory: { prepare: prepareMock } };

      const result = await saveCampaignMetadata(env as any, {
        resourceId: 'test-123',
        tactic: 'Authority, Fear',
      });

      expect(result).toBe(true);
      expect(prepareMock).toHaveBeenCalled();
      expect(bindMock).toHaveBeenCalledWith('test-123', 'Authority, Fear', null, null, null, null);
    });

    it('binds persuasionTactic, scenario, difficulty when provided', async () => {
      const runMock = vi.fn().mockResolvedValue({ success: true });
      const bindMock = vi.fn().mockReturnValue({ run: runMock });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: bindMock }) } };

      await saveCampaignMetadata(env as any, {
        resourceId: 'r1',
        tactic: 'Urgency',
        persuasionTactic: 'Fear',
        scenario: 'CEO Fraud',
        difficulty: 'Hard',
        scenarioType: 'phishing',
      });

      expect(bindMock).toHaveBeenCalledWith('r1', 'Urgency', 'Fear', 'CEO Fraud', 'Hard', 'phishing');
    });

    it('returns false on D1 error but never throws', async () => {
      const runMock = vi.fn().mockRejectedValue(new Error('D1 table not found'));
      const bindMock = vi.fn().mockReturnValue({ run: runMock });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: bindMock }) } };

      const result = await saveCampaignMetadata(env as any, { resourceId: 'test-123' });

      expect(result).toBe(false);
    });
  });

  describe('getCampaignMetadata', () => {
    it('returns empty Map when env is undefined', async () => {
      const result = await getCampaignMetadata(undefined, ['id1']);
      expect(result).toEqual(new Map());
    });

    it('returns empty Map when D1 binding is not available', async () => {
      const result = await getCampaignMetadata({ agentic_ally_memory: undefined }, ['id1']);
      expect(result).toEqual(new Map());
    });

    it('returns empty Map when resourceIds is empty', async () => {
      const result = await getCampaignMetadata({}, []);
      expect(result).toEqual(new Map());
    });

    it('returns empty Map when resourceIds is not array', async () => {
      const result = await getCampaignMetadata({}, null as any);
      expect(result).toEqual(new Map());
    });

    it('returns empty Map when uniqueIds is empty after filtering', async () => {
      const result = await getCampaignMetadata({ agentic_ally_memory: {} }, ['', '  ', undefined as any]);
      expect(result).toEqual(new Map());
    });

    it('deduplicates and filters invalid resourceIds', async () => {
      const allMock = vi.fn().mockResolvedValue({ success: true, results: [] });
      const bindMock = vi.fn().mockReturnValue({ all: allMock });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: bindMock }) } };

      await getCampaignMetadata(env as any, ['id1', 'id1', '', 'id2', {} as any]);

      expect(bindMock).toHaveBeenCalledWith('id1', 'id2');
    });

    it('returns empty Map on D1 error but never throws', async () => {
      const allMock = vi.fn().mockRejectedValue(new Error('Table not found'));
      const env = { agentic_ally_memory: { prepare: () => ({ bind: () => ({ all: allMock }) }) } };

      const result = await getCampaignMetadata(env as any, ['id1']);

      expect(result).toEqual(new Map());
    });

    it('returns Map with results when D1 succeeds', async () => {
      const allMock = vi.fn().mockResolvedValue({
        success: true,
        results: [{ resource_id: 'id1', tactic: 'Authority', persuasion_tactic: null }],
      });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: () => ({ all: allMock }) }) } };

      const result = await getCampaignMetadata(env as any, ['id1']);

      expect(result.size).toBe(1);
      expect(result.get('id1')?.tactic).toBe('Authority');
    });

    it('returns empty Map when D1 returns empty results', async () => {
      const allMock = vi.fn().mockResolvedValue({ success: true, results: [] });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: () => ({ all: allMock }) }) } };

      const result = await getCampaignMetadata(env as any, ['id1']);

      expect(result.size).toBe(0);
      expect(result).toEqual(new Map());
    });

    it('returns empty Map when D1 returns results: undefined', async () => {
      const allMock = vi.fn().mockResolvedValue({ success: true });
      const env = { agentic_ally_memory: { prepare: () => ({ bind: () => ({ all: allMock }) }) } };

      const result = await getCampaignMetadata(env as any, ['id1']);

      expect(result.size).toBe(0);
    });
  });

  describe('trySaveCampaignMetadataAfterUpload', () => {
    it('never throws when env and resourceId are undefined', async () => {
      await expect(trySaveCampaignMetadataAfterUpload(undefined, {}, undefined)).resolves.toBeUndefined();
    });

    it('never throws when build returns null (empty resourceId)', async () => {
      await expect(trySaveCampaignMetadataAfterUpload({}, { topic: 'X' }, '')).resolves.toBeUndefined();
    });

    it('calls save and persists when build returns metadata', async () => {
      const runMock = vi.fn().mockResolvedValue({ success: true });
      const bindMock = vi.fn().mockReturnValue({ run: runMock });
      const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });
      const env = { agentic_ally_memory: { prepare: prepareMock } };

      await trySaveCampaignMetadataAfterUpload(
        env as any,
        { psychologicalTriggers: ['Authority', 'Fear'], topic: 'CEO Fraud' },
        'res-456'
      );

      expect(prepareMock).toHaveBeenCalled();
      expect(bindMock).toHaveBeenCalledWith('res-456', 'Authority, Fear', null, 'CEO Fraud', null, null);
    });

    it('never throws when save fails (D1 error)', async () => {
      const runMock = vi.fn().mockRejectedValue(new Error('D1 error'));
      const env = { agentic_ally_memory: { prepare: () => ({ bind: () => ({ run: runMock }) }) } };

      await expect(
        trySaveCampaignMetadataAfterUpload(env as any, { psychologicalTriggers: ['Urgency'] }, 'res-789')
      ).resolves.toBeUndefined();
    });
  });
});
