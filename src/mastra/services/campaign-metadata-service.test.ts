/**
 * Unit tests for campaign-metadata-service
 *
 * Covers: saveCampaignMetadata, getCampaignMetadata,
 *         trySaveCampaignMetadataAfterUpload, trySaveCampaignMetadataFromInput
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveCampaignMetadata,
  getCampaignMetadata,
  trySaveCampaignMetadataAfterUpload,
  trySaveCampaignMetadataFromInput,
  type CampaignMetadataInput,
} from './campaign-metadata-service';

/* ------------------------------------------------------------------ */
/* Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock('../utils/core/logger', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }),
}));

const buildMetadataFromPhishingBaseMock = vi.fn();
vi.mock('../utils/campaign-metadata-helpers', () => ({
  buildMetadataFromPhishingBase: (...args: unknown[]) => buildMetadataFromPhishingBaseMock(...args),
}));

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Creates a mock D1 database that resolves successfully on run/all. */
function createMockDb(overrides?: {
  runResult?: unknown;
  allResult?: unknown;
  runError?: Error | string;
  allError?: Error | string;
}) {
  const runMock = overrides?.runError
    ? vi.fn().mockRejectedValue(overrides.runError)
    : vi.fn().mockResolvedValue(overrides?.runResult ?? { success: true });
  const allMock = overrides?.allError
    ? vi.fn().mockRejectedValue(overrides.allError)
    : vi.fn().mockResolvedValue(overrides?.allResult ?? { success: true, results: [] });
  const bindMock = vi.fn().mockReturnValue({ run: runMock, all: allMock });
  const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });

  return { prepareMock, bindMock, runMock, allMock, db: { prepare: prepareMock } };
}

function envWith(db: unknown) {
  return { agentic_ally_memory: db };
}

/* ================================================================== */
/* Tests                                                              */
/* ================================================================== */

describe('campaign-metadata-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildMetadataFromPhishingBaseMock.mockReset();
  });

  /* ---------------------------------------------------------------- */
  /* saveCampaignMetadata                                             */
  /* ---------------------------------------------------------------- */
  describe('saveCampaignMetadata', () => {
    // --- Guard clauses ---
    it('returns false when env is undefined', async () => {
      expect(await saveCampaignMetadata(undefined, { resourceId: 'test-123', tactic: 'Authority' })).toBe(false);
    });

    it('returns false when env is null (cast)', async () => {
      expect(await saveCampaignMetadata(null as any, { resourceId: 'test-123' })).toBe(false);
    });

    it('returns false when metadata is missing resourceId', async () => {
      expect(await saveCampaignMetadata({}, {} as CampaignMetadataInput)).toBe(false);
    });

    it('returns false when resourceId is empty string', async () => {
      expect(await saveCampaignMetadata({}, { resourceId: '' })).toBe(false);
    });

    it('returns false when resourceId is whitespace only', async () => {
      expect(await saveCampaignMetadata({}, { resourceId: '   ' })).toBe(false);
    });

    it('returns false when resourceId is not a string (number)', async () => {
      expect(await saveCampaignMetadata({}, { resourceId: 123 as any })).toBe(false);
    });

    it('returns false when D1 binding is not available', async () => {
      expect(await saveCampaignMetadata(envWith(undefined), { resourceId: 'test-123' })).toBe(false);
    });

    it('returns false when D1 binding is null', async () => {
      expect(await saveCampaignMetadata(envWith(null), { resourceId: 'test-123' })).toBe(false);
    });

    // --- Success path ---
    it('returns true and persists when D1 is available', async () => {
      const { db, prepareMock, bindMock } = createMockDb();

      const result = await saveCampaignMetadata(envWith(db), {
        resourceId: 'test-123',
        tactic: 'Authority, Fear',
      });

      expect(result).toBe(true);
      expect(prepareMock).toHaveBeenCalledOnce();
      expect(bindMock).toHaveBeenCalledWith('test-123', 'Authority, Fear', null, null, null, null, null, null);
    });

    it('trims whitespace from resourceId before saving', async () => {
      const { db, bindMock } = createMockDb();

      const result = await saveCampaignMetadata(envWith(db), {
        resourceId: '  res-trimmed  ',
        tactic: 'Urgency',
      });

      expect(result).toBe(true);
      expect(bindMock).toHaveBeenCalledWith('res-trimmed', 'Urgency', null, null, null, null, null, null);
    });

    it('binds all fields when every optional field is provided', async () => {
      const { db, bindMock } = createMockDb();

      await saveCampaignMetadata(envWith(db), {
        resourceId: 'r1',
        tactic: 'Urgency',
        persuasionTactic: 'Fear',
        scenario: 'CEO Fraud',
        difficulty: 'Hard',
        scenarioType: 'phishing',
        reasoning: 'Finance users are high value targets',
        contentType: 'phishing',
      });

      expect(bindMock).toHaveBeenCalledWith(
        'r1', 'Urgency', 'Fear', 'CEO Fraud', 'Hard', 'phishing',
        'Finance users are high value targets', 'phishing'
      );
    });

    it('binds null for all optional fields when not provided', async () => {
      const { db, bindMock } = createMockDb();

      await saveCampaignMetadata(envWith(db), { resourceId: 'r1' });

      expect(bindMock).toHaveBeenCalledWith('r1', null, null, null, null, null, null, null);
    });

    it('binds null for reasoning and contentType when not provided', async () => {
      const { db, bindMock } = createMockDb();

      await saveCampaignMetadata(envWith(db), { resourceId: 'r1', tactic: 'Urgency' });

      expect(bindMock).toHaveBeenCalledWith('r1', 'Urgency', null, null, null, null, null, null);
    });

    it('uses INSERT OR REPLACE SQL statement', async () => {
      const { db, prepareMock } = createMockDb();

      await saveCampaignMetadata(envWith(db), { resourceId: 'r1' });

      const sql = prepareMock.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT OR REPLACE');
      expect(sql).toContain('campaign_metadata');
    });

    // --- Error path ---
    it('returns false on D1 error but never throws', async () => {
      const { db } = createMockDb({ runError: new Error('D1 table not found') });

      const result = await saveCampaignMetadata(envWith(db), { resourceId: 'test-123' });

      expect(result).toBe(false);
    });

    it('handles non-Error in catch (String(error) branch)', async () => {
      const { db } = createMockDb({ runError: 'string error' as any });

      const result = await saveCampaignMetadata(envWith(db), { resourceId: 'test-123' });

      expect(result).toBe(false);
    });

    it('returns false when prepare throws', async () => {
      const db = {
        prepare: vi.fn(() => { throw new Error('prepare failed'); }),
      };

      const result = await saveCampaignMetadata(envWith(db), { resourceId: 'test-123' });

      expect(result).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /* getCampaignMetadata                                              */
  /* ---------------------------------------------------------------- */
  describe('getCampaignMetadata', () => {
    // --- Guard clauses ---
    it('returns empty Map when env is undefined', async () => {
      expect(await getCampaignMetadata(undefined, ['id1'])).toEqual(new Map());
    });

    it('returns empty Map when env is null (cast)', async () => {
      expect(await getCampaignMetadata(null as any, ['id1'])).toEqual(new Map());
    });

    it('returns empty Map when D1 binding is not available', async () => {
      expect(await getCampaignMetadata(envWith(undefined), ['id1'])).toEqual(new Map());
    });

    it('returns empty Map when resourceIds is empty', async () => {
      expect(await getCampaignMetadata({}, [])).toEqual(new Map());
    });

    it('returns empty Map when resourceIds is not array', async () => {
      expect(await getCampaignMetadata({}, null as any)).toEqual(new Map());
    });

    it('returns empty Map when resourceIds is a string (not array)', async () => {
      expect(await getCampaignMetadata({}, 'id1' as any)).toEqual(new Map());
    });

    it('returns empty Map when uniqueIds is empty after filtering', async () => {
      expect(await getCampaignMetadata(envWith({}), ['', '  ', undefined as any])).toEqual(new Map());
    });

    it('filters out non-string items from resourceIds', async () => {
      const { db, bindMock } = createMockDb({ allResult: { success: true, results: [] } });

      await getCampaignMetadata(envWith(db), ['id1', 42 as any, {} as any, null as any, 'id2']);

      expect(bindMock).toHaveBeenCalledWith('id1', 'id2');
    });

    // --- Deduplication ---
    it('deduplicates and filters invalid resourceIds', async () => {
      const { db, bindMock } = createMockDb({ allResult: { success: true, results: [] } });

      await getCampaignMetadata(envWith(db), ['id1', 'id1', '', 'id2', {} as any]);

      expect(bindMock).toHaveBeenCalledWith('id1', 'id2');
    });

    // --- SQL construction ---
    it('generates correct number of placeholders for query', async () => {
      const { db, prepareMock } = createMockDb({ allResult: { success: true, results: [] } });

      await getCampaignMetadata(envWith(db), ['a', 'b', 'c']);

      const sql = prepareMock.mock.calls[0][0] as string;
      expect(sql).toContain('?, ?, ?');
      expect(sql).toContain('campaign_metadata');
    });

    // --- Success path ---
    it('returns Map with single result when D1 succeeds', async () => {
      const { db } = createMockDb({
        allResult: {
          success: true,
          results: [{ resource_id: 'id1', tactic: 'Authority', persuasion_tactic: null, scenario: 'CEO Fraud', difficulty: 'Hard', scenario_type: null, created_at: '2026-01-01', reasoning: null, content_type: 'phishing' }],
        },
      });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result.size).toBe(1);
      expect(result.get('id1')?.tactic).toBe('Authority');
      expect(result.get('id1')?.scenario).toBe('CEO Fraud');
      expect(result.get('id1')?.content_type).toBe('phishing');
    });

    it('returns Map with multiple results', async () => {
      const { db } = createMockDb({
        allResult: {
          success: true,
          results: [
            { resource_id: 'id1', tactic: 'Authority', persuasion_tactic: null, scenario: null, difficulty: null, scenario_type: null, created_at: null, reasoning: null, content_type: null },
            { resource_id: 'id2', tactic: 'Urgency', persuasion_tactic: 'Fear', scenario: 'Invoice', difficulty: 'Medium', scenario_type: 'phishing', created_at: '2026-02-01', reasoning: 'Target finance', content_type: 'phishing' },
          ],
        },
      });

      const result = await getCampaignMetadata(envWith(db), ['id1', 'id2']);

      expect(result.size).toBe(2);
      expect(result.get('id1')?.tactic).toBe('Authority');
      expect(result.get('id2')?.tactic).toBe('Urgency');
      expect(result.get('id2')?.persuasion_tactic).toBe('Fear');
    });

    it('returns partial results when some IDs are not found', async () => {
      const { db } = createMockDb({
        allResult: {
          success: true,
          results: [
            { resource_id: 'id1', tactic: 'Authority', persuasion_tactic: null, scenario: null, difficulty: null, scenario_type: null, created_at: null, reasoning: null, content_type: null },
          ],
        },
      });

      const result = await getCampaignMetadata(envWith(db), ['id1', 'id-missing']);

      expect(result.size).toBe(1);
      expect(result.has('id1')).toBe(true);
      expect(result.has('id-missing')).toBe(false);
    });

    it('returns empty Map when D1 returns empty results array', async () => {
      const { db } = createMockDb({ allResult: { success: true, results: [] } });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result.size).toBe(0);
    });

    it('returns empty Map when D1 returns results: undefined', async () => {
      const { db } = createMockDb({ allResult: { success: true } });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result.size).toBe(0);
    });

    it('returns empty Map when D1 returns results: null', async () => {
      const { db } = createMockDb({ allResult: { success: true, results: null } });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result.size).toBe(0);
    });

    // --- Error path ---
    it('returns empty Map on D1 error but never throws', async () => {
      const { db } = createMockDb({ allError: new Error('Table not found') });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result).toEqual(new Map());
    });

    it('handles non-Error in catch (string rejection)', async () => {
      const { db } = createMockDb({ allError: 'network error string' as any });

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result).toEqual(new Map());
    });

    it('returns empty Map when prepare throws', async () => {
      const db = {
        prepare: vi.fn(() => { throw new Error('prepare failed'); }),
      };

      const result = await getCampaignMetadata(envWith(db), ['id1']);

      expect(result).toEqual(new Map());
    });
  });

  /* ---------------------------------------------------------------- */
  /* trySaveCampaignMetadataAfterUpload                               */
  /* ---------------------------------------------------------------- */
  describe('trySaveCampaignMetadataAfterUpload', () => {
    beforeEach(() => {
      buildMetadataFromPhishingBaseMock.mockReset();
    });

    it('never throws when env and resourceId are undefined', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await expect(trySaveCampaignMetadataAfterUpload(undefined, {}, undefined)).resolves.toBeUndefined();
    });

    it('never throws when build returns null (empty resourceId)', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await expect(trySaveCampaignMetadataAfterUpload({}, { topic: 'X' }, '')).resolves.toBeUndefined();
    });

    it('never throws when phishingData is undefined', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await expect(trySaveCampaignMetadataAfterUpload({}, undefined, 'res-1')).resolves.toBeUndefined();
    });

    it('passes contentType defaulting to phishing to buildMetadataFromPhishingBase', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await trySaveCampaignMetadataAfterUpload({}, { topic: 'X' }, 'res-1');

      expect(buildMetadataFromPhishingBaseMock).toHaveBeenCalledWith({ topic: 'X' }, 'res-1', 'phishing');
    });

    it('passes smishing contentType to buildMetadataFromPhishingBase', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await trySaveCampaignMetadataAfterUpload({}, { topic: 'X' }, 'res-1', 'smishing');

      expect(buildMetadataFromPhishingBaseMock).toHaveBeenCalledWith({ topic: 'X' }, 'res-1', 'smishing');
    });

    it('uses empty string for resourceId when it is undefined', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      await trySaveCampaignMetadataAfterUpload({}, {}, undefined);

      expect(buildMetadataFromPhishingBaseMock).toHaveBeenCalledWith({}, '', 'phishing');
    });

    it('never throws when buildMetadataFromPhishingBase throws', async () => {
      buildMetadataFromPhishingBaseMock.mockImplementation(() => {
        throw new Error('build error');
      });
      await expect(
        trySaveCampaignMetadataAfterUpload(envWith({}), { topic: 'X' }, 'res-1')
      ).resolves.toBeUndefined();
    });

    it('calls saveCampaignMetadata and persists when build returns metadata', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue({
        resourceId: 'res-456',
        tactic: 'Authority, Fear',
        scenario: 'CEO Fraud',
      });
      const { db, prepareMock, bindMock } = createMockDb();

      await trySaveCampaignMetadataAfterUpload(
        envWith(db),
        { psychologicalTriggers: ['Authority', 'Fear'], topic: 'CEO Fraud' },
        'res-456'
      );

      expect(prepareMock).toHaveBeenCalled();
      expect(bindMock).toHaveBeenCalledWith('res-456', 'Authority, Fear', null, 'CEO Fraud', null, null, null, null);
    });

    it('never throws when saveCampaignMetadata fails (D1 error)', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue({ resourceId: 'res-789', tactic: 'Urgency' });
      const { db } = createMockDb({ runError: new Error('D1 error') });

      await expect(
        trySaveCampaignMetadataAfterUpload(envWith(db), { psychologicalTriggers: ['Urgency'] }, 'res-789')
      ).resolves.toBeUndefined();
    });

    it('does not call saveCampaignMetadata when build returns null', async () => {
      buildMetadataFromPhishingBaseMock.mockReturnValue(null);
      const { db, prepareMock } = createMockDb();

      await trySaveCampaignMetadataAfterUpload(envWith(db), {}, 'res-1');

      expect(prepareMock).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /* trySaveCampaignMetadataFromInput                                 */
  /* ---------------------------------------------------------------- */
  describe('trySaveCampaignMetadataFromInput', () => {
    it('returns immediately when metadata is null', async () => {
      const { db, prepareMock } = createMockDb();

      await expect(trySaveCampaignMetadataFromInput(envWith(db), null)).resolves.toBeUndefined();
      expect(prepareMock).not.toHaveBeenCalled();
    });

    it('returns immediately when metadata is undefined', async () => {
      const { db, prepareMock } = createMockDb();

      await expect(trySaveCampaignMetadataFromInput(envWith(db), undefined)).resolves.toBeUndefined();
      expect(prepareMock).not.toHaveBeenCalled();
    });

    it('calls saveCampaignMetadata with the provided metadata', async () => {
      const { db, prepareMock, bindMock } = createMockDb();
      const metadata: CampaignMetadataInput = {
        resourceId: 'train-001',
        tactic: 'Social Engineering',
        scenario: 'Password Reset',
        difficulty: 'Easy',
        contentType: 'training',
      };

      await trySaveCampaignMetadataFromInput(envWith(db), metadata);

      expect(prepareMock).toHaveBeenCalledOnce();
      expect(bindMock).toHaveBeenCalledWith(
        'train-001', 'Social Engineering', null, 'Password Reset', 'Easy', null, null, 'training'
      );
    });

    it('saves metadata with all fields populated', async () => {
      const { db, bindMock } = createMockDb();
      const metadata: CampaignMetadataInput = {
        resourceId: 'res-full',
        tactic: 'Authority',
        persuasionTactic: 'Fear',
        scenario: 'Invoice Scam',
        difficulty: 'Hard',
        scenarioType: 'smishing',
        reasoning: 'Targets finance department',
        contentType: 'smishing',
      };

      await trySaveCampaignMetadataFromInput(envWith(db), metadata);

      expect(bindMock).toHaveBeenCalledWith(
        'res-full', 'Authority', 'Fear', 'Invoice Scam', 'Hard', 'smishing',
        'Targets finance department', 'smishing'
      );
    });

    it('never throws when env is undefined', async () => {
      const metadata: CampaignMetadataInput = { resourceId: 'res-1', tactic: 'X' };
      await expect(trySaveCampaignMetadataFromInput(undefined, metadata)).resolves.toBeUndefined();
    });

    it('never throws when D1 binding is missing', async () => {
      const metadata: CampaignMetadataInput = { resourceId: 'res-1', tactic: 'X' };
      await expect(trySaveCampaignMetadataFromInput(envWith(undefined), metadata)).resolves.toBeUndefined();
    });

    it('never throws when saveCampaignMetadata rejects', async () => {
      const { db } = createMockDb({ runError: new Error('D1 write failure') });
      const metadata: CampaignMetadataInput = { resourceId: 'res-1', tactic: 'X' };

      await expect(trySaveCampaignMetadataFromInput(envWith(db), metadata)).resolves.toBeUndefined();
    });

    it('never throws when resourceId in metadata is empty (saveCampaignMetadata returns false)', async () => {
      const { db, prepareMock } = createMockDb();
      const metadata: CampaignMetadataInput = { resourceId: '' };

      await expect(trySaveCampaignMetadataFromInput(envWith(db), metadata)).resolves.toBeUndefined();
      expect(prepareMock).not.toHaveBeenCalled();
    });
  });
});
