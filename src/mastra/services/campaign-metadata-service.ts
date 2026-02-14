/**
 * Campaign Metadata Service — Active Learning
 *
 * Stores simulation metadata (tactic, scenario, difficulty) for UserInfoAgent correlation.
 * When a user clicks a phishing sim, we can look up which psychological trigger was used
 * and provide personalized training recommendations.
 *
 * Used by: upload-phishing-tool (after successful upload)
 * Read by: get-user-info-tool (when enriching timeline for analysis)
 */

import { getLogger } from '../utils/core/logger';
import { buildMetadataFromPhishingBase } from '../utils/campaign-metadata-helpers';

const logger = getLogger('CampaignMetadataService');

export interface CampaignMetadataInput {
  resourceId: string;
  tactic?: string;
  persuasionTactic?: string;
  scenario?: string;
  difficulty?: string;
  scenarioType?: string;
}

export interface CampaignMetadataRow {
  resource_id: string;
  tactic: string | null;
  persuasion_tactic: string | null;
  scenario: string | null;
  difficulty: string | null;
  scenario_type: string | null;
  created_at: string | null;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all(): Promise<D1Result>;
}

interface D1Result {
  success: boolean;
  results?: unknown[];
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/**
 * Saves campaign metadata to D1. Fails silently if D1 unavailable — metadata is optional.
 * Never throws — safe for backward compatibility when feature was not deployed before.
 */
export async function saveCampaignMetadata(
  env: Record<string, unknown> | undefined,
  metadata: CampaignMetadataInput
): Promise<boolean> {
  if (!env || !metadata?.resourceId || typeof metadata.resourceId !== 'string') {
    return false;
  }
  const resourceId = String(metadata.resourceId).trim();
  if (!resourceId) return false;

  const db = env.agentic_ally_memory as D1Database | undefined;
  if (!db) {
    logger.debug('agentic_ally_memory D1 not available, skipping campaign metadata save');
    return false;
  }

  try {
    logger.debug('Campaign metadata save attempt', {
      resourceId,
      tactic: metadata.tactic ?? null,
      scenario: metadata.scenario ?? null,
    });
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO campaign_metadata 
       (resource_id, tactic, persuasion_tactic, scenario, difficulty, scenario_type) 
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    await stmt
      .bind(
        resourceId,
        metadata.tactic ?? null,
        metadata.persuasionTactic ?? null,
        metadata.scenario ?? null,
        metadata.difficulty ?? null,
        metadata.scenarioType ?? null
      )
      .run();
    logger.debug('Campaign metadata saved OK', { resourceId, tactic: metadata.tactic });
    return true;
  } catch (error) {
    logger.warn('Failed to save campaign metadata (non-blocking)', {
      resourceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Fetches metadata for given resource IDs. Returns a map resourceId -> metadata.
 * Never throws — returns empty Map on any error. Safe when D1/table not yet deployed.
 */
export async function getCampaignMetadata(
  env: Record<string, unknown> | undefined,
  resourceIds: string[]
): Promise<Map<string, CampaignMetadataRow>> {
  if (!env || !Array.isArray(resourceIds)) {
    return new Map();
  }
  const uniqueIds = [
    ...new Set(resourceIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)),
  ];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const db = env.agentic_ally_memory as D1Database | undefined;
  if (!db) {
    logger.debug('Campaign metadata fetch skipped: D1 not available');
    return new Map();
  }

  logger.debug('Campaign metadata fetch', { resourceIds: uniqueIds, count: uniqueIds.length });
  const result = new Map<string, CampaignMetadataRow>();
  try {
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const stmt = db.prepare(
      `SELECT resource_id, tactic, persuasion_tactic, scenario, difficulty, scenario_type, created_at 
       FROM campaign_metadata WHERE resource_id IN (${placeholders})`
    );
    const bound = stmt.bind(...uniqueIds) as D1PreparedStatement;
    const rows = await bound.all();
    if (rows?.results) {
      for (const row of rows.results as CampaignMetadataRow[]) {
        result.set(row.resource_id, row);
      }
      logger.debug('Campaign metadata fetched', {
        requested: uniqueIds.length,
        found: result.size,
        tactics: [...result.values()].map(r => ({ id: r.resource_id, tactic: r.tactic })),
      });
    } else {
      logger.debug('Campaign metadata fetch: no results', { resourceIds: uniqueIds });
    }
  } catch (error) {
    logger.warn('Failed to fetch campaign metadata', {
      sampleIds: uniqueIds.slice(0, 3),
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return result;
}

/**
 * Attempts to save campaign metadata after successful upload. Never throws.
 * Use from upload-phishing-tool — swallows all errors so upload flow is never broken.
 */
export async function trySaveCampaignMetadataAfterUpload(
  env: Record<string, unknown> | undefined,
  phishingData: { psychologicalTriggers?: unknown; topic?: unknown; difficulty?: unknown } | undefined,
  resourceId: string | undefined
): Promise<void> {
  try {
    const metadata = buildMetadataFromPhishingBase(phishingData, resourceId ?? '');
    if (metadata) {
      logger.debug('Campaign metadata build OK, saving...', {
        resourceId: metadata.resourceId,
        tactic: metadata.tactic,
      });
      await saveCampaignMetadata(env, metadata);
    } else {
      logger.debug('Campaign metadata build returned null', { resourceId, hasPhishingData: !!phishingData });
    }
  } catch {
    // Swallow — upload succeeded, metadata is optional
  }
}
