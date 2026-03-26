/**
 * Campaign Metadata Helpers — Active Learning integration
 *
 * Extracted logic for building metadata from phishing data and enriching
 * timeline activities. Keeps tools clean and logic testable.
 */

import type { CampaignMetadataInput, CampaignMetadataRow } from '../services/campaign-metadata-service';
import type { Explainability } from '../types/explainability';

/** Phishing/smishing base from KV (partial shape) */
export interface PhishingBaseData {
  psychologicalTriggers?: unknown;
  topic?: unknown;
  difficulty?: unknown;
  explainability?: Explainability;
  isQuishing?: boolean;
}

/** Timeline activity from Product API (partial shape) */
export interface TimelineActivity {
  scenarioResourceId?: string;
  resourceId?: string;
}

/**
 * Builds CampaignMetadataInput from phishing/smishing KV base. Returns null if invalid.
 */
export function buildMetadataFromPhishingBase(
  phishingData: PhishingBaseData | undefined,
  resourceId: string,
  contentType: 'phishing' | 'smishing' = 'phishing'
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

  // Quishing is a phishing subtype — reflect in content_type
  const resolvedContentType =
    contentType === 'phishing' && phishingData?.isQuishing ? 'quishing' as const : contentType;

  return {
    resourceId: rid,
    tactic: tactic || undefined,
    scenario: typeof phishingData?.topic === 'string' ? phishingData.topic : undefined,
    difficulty: typeof phishingData?.difficulty === 'string' ? phishingData.difficulty : undefined,
    reasoning: phishingData?.explainability?.reasoning || undefined,
    contentType: resolvedContentType,
  };
}

/** Microlearning base from KV (partial shape) */
export interface MicrolearningBaseData {
  microlearning_metadata?: {
    title?: string;
    description?: string;
    category?: string;
    level?: string;
    risk_area?: string;
  };
  explainability?: Explainability;
}

/**
 * Builds CampaignMetadataInput from microlearning KV base. Returns null if invalid.
 * Maps: title→scenario, level→difficulty, category→tactic (closest available field).
 */
export function buildMetadataFromMicrolearningBase(
  microlearningData: MicrolearningBaseData | undefined,
  resourceId: string
): CampaignMetadataInput | null {
  if (!resourceId || typeof resourceId !== 'string') return null;
  const rid = resourceId.trim();
  if (!rid) return null;

  const meta = microlearningData?.microlearning_metadata;

  return {
    resourceId: rid,
    tactic: meta?.risk_area || meta?.category || undefined,
    scenario: meta?.title || undefined,
    difficulty: meta?.level || undefined,
    reasoning: microlearningData?.explainability?.reasoning || undefined,
    contentType: 'training',
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
export function enrichActivitiesWithMetadata<T extends { tactic?: string; scenarioType?: string; metadataDifficulty?: string; contentType?: string }>(
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
    const scenarioType = typeof meta.scenario_type === 'string' && meta.scenario_type.trim() ? meta.scenario_type.trim() : undefined;
    const metadataDifficulty = typeof meta.difficulty === 'string' && meta.difficulty.trim() ? meta.difficulty.trim() : undefined;
    const contentType = typeof meta.content_type === 'string' && meta.content_type.trim() ? meta.content_type.trim() : undefined;
    return {
      ...a,
      ...(tacticStr && { tactic: tacticStr }),
      ...(scenarioType && { scenarioType }),
      ...(metadataDifficulty && { metadataDifficulty }),
      ...(contentType && { contentType }),
    };
  });
}
