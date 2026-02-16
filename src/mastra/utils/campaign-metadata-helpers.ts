/**
 * Campaign Metadata Helpers — Active Learning integration
 *
 * Extracted logic for building metadata from phishing data and enriching
 * timeline activities. Keeps tools clean and logic testable.
 */

import type { CampaignMetadataInput, CampaignMetadataRow } from '../services/campaign-metadata-service';

/** Phishing base from KV (partial shape) */
export interface PhishingBaseData {
  psychologicalTriggers?: unknown;
  topic?: unknown;
  difficulty?: unknown;
}

/** Timeline activity from Product API (partial shape) */
export interface TimelineActivity {
  scenarioResourceId?: string;
  resourceId?: string;
}

/**
 * Builds CampaignMetadataInput from phishing KV base. Returns null if invalid.
 */
export function buildMetadataFromPhishingBase(
  phishingData: PhishingBaseData | undefined,
  resourceId: string
): CampaignMetadataInput | null {
  if (!resourceId || typeof resourceId !== 'string') return null;
  const rid = resourceId.trim();
  if (!rid) return null;

  const triggers = phishingData?.psychologicalTriggers;
  const tactic =
    Array.isArray(triggers) && triggers.length > 0
      ? triggers.map(t => (typeof t === 'string' ? t : String(t))).join(', ')
      : typeof phishingData?.topic === 'string'
        ? phishingData.topic
        : undefined;

  return {
    resourceId: rid,
    tactic: tactic || undefined,
    scenario: typeof phishingData?.topic === 'string' ? phishingData.topic : undefined,
    difficulty: typeof phishingData?.difficulty === 'string' ? phishingData.difficulty : undefined,
  };
}

/**
 * Extracts resource IDs from timeline results. Product API may use scenarioResourceId or resourceId.
 */
export function extractResourceIdsFromTimeline(results: TimelineActivity[]): {
  byIndex: (string | undefined)[];
  unique: string[];
} {
  const byIndex = results.map(r => {
    const id = r.scenarioResourceId || r.resourceId;
    return typeof id === 'string' ? id.trim() || undefined : undefined;
  });
  const unique = [...new Set(byIndex.filter((id): id is string => !!id))];
  return { byIndex, unique };
}

/**
 * Enriches activities with tactic from campaign metadata map.
 * T must have optional tactic (e.g. EnrichedActivity).
 */
export function enrichActivitiesWithMetadata<T extends { tactic?: string }>(
  activities: T[],
  resourceIdsByIndex: (string | undefined)[],
  metadataMap: Map<string, CampaignMetadataRow>
): T[] {
  return activities.map((a, i) => {
    const rid = resourceIdsByIndex[i];
    const meta = rid ? metadataMap.get(rid) : undefined;
    if (!meta) return a;
    const tactic = meta.tactic || meta.persuasion_tactic;
    const tacticStr = typeof tactic === 'string' && tactic.trim() ? tactic.trim() : undefined;
    return tacticStr ? { ...a, tactic: tacticStr } : a;
  });
}
