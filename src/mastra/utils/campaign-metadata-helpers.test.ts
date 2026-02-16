import { describe, it, expect } from 'vitest';
import {
  buildMetadataFromPhishingBase,
  extractResourceIdsFromTimeline,
  enrichActivitiesWithMetadata,
} from './campaign-metadata-helpers';

describe('campaign-metadata-helpers', () => {
  describe('buildMetadataFromPhishingBase', () => {
    it('returns null for empty resourceId', () => {
      expect(buildMetadataFromPhishingBase({}, '')).toBeNull();
      expect(buildMetadataFromPhishingBase({}, '   ')).toBeNull();
    });

    it('returns null for invalid resourceId', () => {
      expect(buildMetadataFromPhishingBase({}, undefined as any)).toBeNull();
    });

    it('builds metadata from psychologicalTriggers array', () => {
      const result = buildMetadataFromPhishingBase({ psychologicalTriggers: ['Authority', 'Fear'] }, 'res-123');
      expect(result).toEqual({
        resourceId: 'res-123',
        tactic: 'Authority, Fear',
        scenario: undefined,
        difficulty: undefined,
      });
    });

    it('falls back to topic when psychologicalTriggers empty', () => {
      const result = buildMetadataFromPhishingBase({ topic: 'CEO Fraud', difficulty: 'Hard' }, 'res-456');
      expect(result).toEqual({
        resourceId: 'res-456',
        tactic: 'CEO Fraud',
        scenario: 'CEO Fraud',
        difficulty: 'Hard',
      });
    });

    it('handles undefined phishingData', () => {
      const result = buildMetadataFromPhishingBase(undefined, 'res-789');
      expect(result?.resourceId).toBe('res-789');
      expect(result?.tactic).toBeUndefined();
    });
  });

  describe('extractResourceIdsFromTimeline', () => {
    it('extracts scenarioResourceId first', () => {
      const { byIndex, unique } = extractResourceIdsFromTimeline([{ scenarioResourceId: 's1', resourceId: 'r1' }]);
      expect(byIndex).toEqual(['s1']);
      expect(unique).toEqual(['s1']);
    });

    it('falls back to resourceId', () => {
      const { byIndex, unique } = extractResourceIdsFromTimeline([{ resourceId: 'r2' }]);
      expect(byIndex).toEqual(['r2']);
      expect(unique).toEqual(['r2']);
    });

    it('deduplicates and filters empty', () => {
      const { byIndex, unique } = extractResourceIdsFromTimeline([
        { resourceId: 'id1' },
        { resourceId: 'id1' },
        { resourceId: '  ' },
        {},
        { resourceId: 'id2' },
      ]);
      expect(byIndex).toEqual(['id1', 'id1', undefined, undefined, 'id2']);
      expect(unique).toEqual(['id1', 'id2']);
    });
  });

  describe('enrichActivitiesWithMetadata', () => {
    it('adds tactic when metadata exists', () => {
      const activities = [{ actionCategory: 'CLICK', context: 'x' }];
      const metadataMap = new Map([
        [
          'id1',
          {
            resource_id: 'id1',
            tactic: 'Authority',
            persuasion_tactic: null,
            scenario: null,
            difficulty: null,
            scenario_type: null,
            created_at: null,
          },
        ],
      ]);
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBe('Authority');
    });

    it('returns unchanged when no metadata', () => {
      const activities = [{ actionCategory: 'CLICK', context: 'x' }];
      const metadataMap = new Map();
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBeUndefined();
    });

    it('uses persuasion_tactic when tactic null', () => {
      const activities = [{ actionCategory: 'CLICK' }];
      const metadataMap = new Map([
        [
          'id1',
          {
            resource_id: 'id1',
            tactic: null,
            persuasion_tactic: 'Fear',
            scenario: null,
            difficulty: null,
            scenario_type: null,
            created_at: null,
          },
        ],
      ]);
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBe('Fear');
    });
  });
});
