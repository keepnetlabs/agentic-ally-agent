import { describe, it, expect } from 'vitest';
import {
  buildMetadataFromPhishingBase,
  buildMetadataFromMicrolearningBase,
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
      expect(result?.resourceId).toBe('res-123');
      expect(result?.tactic).toBe('Authority, Fear');
      expect(result?.contentType).toBe('phishing');
    });

    it('falls back to topic when psychologicalTriggers empty', () => {
      const result = buildMetadataFromPhishingBase({ topic: 'CEO Fraud', difficulty: 'Hard' }, 'res-456');
      expect(result?.resourceId).toBe('res-456');
      expect(result?.tactic).toBe('CEO Fraud');
      expect(result?.scenario).toBe('CEO Fraud');
      expect(result?.difficulty).toBe('Hard');
    });

    it('extracts reasoning from explainability', () => {
      const result = buildMetadataFromPhishingBase(
        { topic: 'IT Reset', explainability: { reasoning: 'User clicked authority emails before', keyFactors: [], generatedAt: '2026-01-01T00:00:00.000Z', version: '1.0' } },
        'res-789'
      );
      expect(result?.reasoning).toBe('User clicked authority emails before');
    });

    it('sets contentType to quishing when isQuishing is true', () => {
      const result = buildMetadataFromPhishingBase({ isQuishing: true }, 'res-q1');
      expect(result?.contentType).toBe('quishing');
    });

    it('sets contentType to smishing when passed explicitly', () => {
      const result = buildMetadataFromPhishingBase({ topic: 'SMS Fraud' }, 'res-s1', 'smishing');
      expect(result?.contentType).toBe('smishing');
    });

    it('handles undefined phishingData', () => {
      const result = buildMetadataFromPhishingBase(undefined, 'res-789');
      expect(result?.resourceId).toBe('res-789');
      expect(result?.tactic).toBeUndefined();
    });
  });

  describe('buildMetadataFromMicrolearningBase', () => {
    it('returns null for empty resourceId', () => {
      expect(buildMetadataFromMicrolearningBase({}, '')).toBeNull();
      expect(buildMetadataFromMicrolearningBase({}, '   ')).toBeNull();
    });

    it('returns null for invalid resourceId', () => {
      expect(buildMetadataFromMicrolearningBase({}, undefined as any)).toBeNull();
    });

    it('maps title to scenario and level to difficulty', () => {
      const result = buildMetadataFromMicrolearningBase(
        { microlearning_metadata: { title: 'Phishing Awareness', level: 'Intermediate' } },
        'ml-123'
      );
      expect(result?.resourceId).toBe('ml-123');
      expect(result?.scenario).toBe('Phishing Awareness');
      expect(result?.difficulty).toBe('Intermediate');
      expect(result?.contentType).toBe('training');
    });

    it('uses risk_area as tactic, falling back to category', () => {
      const withRiskArea = buildMetadataFromMicrolearningBase(
        { microlearning_metadata: { risk_area: 'Social Engineering', category: 'Phishing' } },
        'ml-1'
      );
      expect(withRiskArea?.tactic).toBe('Social Engineering');

      const withCategoryOnly = buildMetadataFromMicrolearningBase(
        { microlearning_metadata: { category: 'Phishing' } },
        'ml-2'
      );
      expect(withCategoryOnly?.tactic).toBe('Phishing');
    });

    it('extracts reasoning from explainability', () => {
      const result = buildMetadataFromMicrolearningBase(
        {
          microlearning_metadata: { title: 'Training' },
          explainability: { reasoning: 'User lacks phishing awareness', keyFactors: [], generatedAt: '2026-01-01T00:00:00.000Z', version: '1.0' },
        },
        'ml-456'
      );
      expect(result?.reasoning).toBe('User lacks phishing awareness');
    });

    it('handles undefined microlearning_metadata gracefully', () => {
      const result = buildMetadataFromMicrolearningBase(undefined, 'ml-789');
      expect(result?.resourceId).toBe('ml-789');
      expect(result?.tactic).toBeUndefined();
      expect(result?.scenario).toBeUndefined();
      expect(result?.reasoning).toBeUndefined();
      expect(result?.contentType).toBe('training');
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
      const activities: any[] = [{ actionCategory: 'CLICK', context: 'x' }];
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
            reasoning: null,
            content_type: null,
          },
        ],
      ]);
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBe('Authority');
    });

    it('returns unchanged when no metadata', () => {
      const activities: any[] = [{ actionCategory: 'CLICK', context: 'x' }];
      const metadataMap = new Map();
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBeUndefined();
    });

    it('uses persuasion_tactic when tactic null', () => {
      const activities: any[] = [{ actionCategory: 'CLICK' }];
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
            reasoning: null,
            content_type: null,
          },
        ],
      ]);
      const result = enrichActivitiesWithMetadata(activities, ['id1'], metadataMap);
      expect(result[0].tactic).toBe('Fear');
    });
  });
});
