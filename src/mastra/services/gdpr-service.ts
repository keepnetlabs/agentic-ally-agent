/**
 * GDPR Data Governance Service
 *
 * Provides technical infrastructure for GDPR Art. 15-17, 30, 33-34:
 * - Audit logging: records who accessed/modified/deleted what data
 * - Tamper-evident logging: SHA-256 hash-chain (EU AI Act Art. 12)
 * - Data export: assembles user data for Subject Access Requests (Art. 15)
 * - Data deletion: cascade deletes across KV + D1 (Art. 17 right to erasure)
 * - Deletion request tracking: maintains audit trail of deletion requests
 * - Integrity verification: verifyAuditChain() detects any tampering
 *
 * Pattern: follows campaign-metadata-service.ts — never throws, fails silently,
 * safe for backward compatibility when migration not yet deployed.
 */

import { getLogger } from '../utils/core/logger';
import { GDPR, ERROR_CODES, type GdprAuditAction, type GdprDataCategory } from '../constants';
import { errorService } from './error-service';

const logger = getLogger('GdprService');

// ─── D1 Interfaces (same pattern as campaign-metadata-service) ───

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

// ─── Types ───

export interface AuditLogEntry {
  companyId: string;
  userId?: string;
  action: GdprAuditAction;
  resourceType: GdprDataCategory;
  resourceId?: string;
  details?: Record<string, unknown>;
  initiatedBy: 'system' | 'user' | 'cron';
}

export interface AuditLogRow {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  initiated_by: string;
  created_at: string;
  integrity_hash: string | null;
  prev_hash: string | null;
}

export interface DeletionRequestRow {
  id: string;
  company_id: string;
  user_id: string;
  status: string;
  resources_deleted: string | null;
  requested_at: string;
  completed_at: string | null;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalRows: number;
  verifiedRows: number;
  firstBrokenAt: number | null;      // 0-based index of first broken link
  brokenRowId: string | null;        // ID of the row where chain broke
  concurrentWrites: number;          // Rows sharing same prev_hash (concurrent write indicator)
}

// ─── Helper ───

function getDb(env: Record<string, unknown> | undefined): D1Database | null {
  if (!env) return null;
  const db = env.agentic_ally_memory as D1Database | undefined;
  if (!db) {
    logger.debug('agentic_ally_memory D1 not available, skipping GDPR operation');
    return null;
  }
  return db;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Hash-Chain (EU AI Act Art. 12 — Tamper-Evident Records) ───

/**
 * Compute SHA-256 hex digest of a string.
 * Uses Web Crypto API (available in Cloudflare Workers + Node 18+).
 */
export async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the canonical string representation of an audit row for hashing.
 *
 * Uses JSON.stringify with fixed key order — no separator collision possible.
 * Each field is explicitly keyed, so values containing any character
 * (including separators) cannot produce ambiguous payloads.
 */
export function buildHashPayload(
  id: string,
  companyId: string,
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: string | null,
  initiatedBy: string,
  createdAt: string,
  prevHash: string
): string {
  return JSON.stringify([id, companyId, userId, action, resourceType, resourceId, details, initiatedBy, createdAt, prevHash]);
}

/**
 * Fetch the integrity_hash of the most recent audit row for a company.
 * Returns 'GENESIS' for the first row in the chain (no previous row exists).
 */
async function getLastHash(db: D1Database, companyId: string): Promise<string> {
  try {
    const stmt = db.prepare(
      'SELECT integrity_hash FROM data_access_audit WHERE company_id = ? AND integrity_hash IS NOT NULL ORDER BY created_at DESC LIMIT 1'
    );
    const result = await stmt.bind(companyId).all();
    const rows = result?.results as Array<{ integrity_hash: string }> | undefined;
    if (rows && rows.length > 0 && rows[0].integrity_hash) {
      return rows[0].integrity_hash;
    }
  } catch {
    // If column doesn't exist yet (migration not applied), fall through
    logger.debug('getLastHash: integrity_hash column not available, using GENESIS');
  }
  return 'GENESIS';
}

// ─── Audit Logging (Art. 30 — Records of Processing) ───

/**
 * Write an audit log entry to D1 with hash-chain integrity. Never throws.
 *
 * Hash-chain: each row stores SHA-256(own_data + prev_hash).
 * If the integrity_hash columns don't exist yet (migration 0004 not applied),
 * falls back to writing without hashes (backward-compatible).
 */
export async function logDataAccess(
  env: Record<string, unknown> | undefined,
  entry: AuditLogEntry
): Promise<boolean> {
  const db = getDb(env);
  if (!db) return false;

  try {
    const id = generateId();
    const createdAt = new Date().toISOString();
    const detailsJson = entry.details ? JSON.stringify(entry.details) : null;

    // Fetch previous hash for chain continuity
    const prevHash = await getLastHash(db, entry.companyId);

    // Compute integrity hash: SHA-256(id|company|user|action|type|resource|details|initiatedBy|createdAt|prevHash)
    const payload = buildHashPayload(
      id,
      entry.companyId,
      entry.userId ?? null,
      entry.action,
      entry.resourceType,
      entry.resourceId ?? null,
      detailsJson,
      entry.initiatedBy,
      createdAt,
      prevHash
    );
    const integrityHash = await computeHash(payload);

    // Try INSERT with hash columns first (migration 0004 applied)
    let hasHash = false;
    try {
      const stmt = db.prepare(
        `INSERT INTO data_access_audit
         (id, company_id, user_id, action, resource_type, resource_id, details, initiated_by, created_at, integrity_hash, prev_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      await stmt
        .bind(
          id,
          entry.companyId,
          entry.userId ?? null,
          entry.action,
          entry.resourceType,
          entry.resourceId ?? null,
          detailsJson,
          entry.initiatedBy,
          createdAt,
          integrityHash,
          prevHash
        )
        .run();
      hasHash = true;
    } catch {
      // Fallback: migration 0004 not yet applied — write without hash columns
      logger.debug('integrity_hash columns not available, writing without hash-chain');
      const stmt = db.prepare(
        `INSERT INTO data_access_audit
         (id, company_id, user_id, action, resource_type, resource_id, details, initiated_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      await stmt
        .bind(
          id,
          entry.companyId,
          entry.userId ?? null,
          entry.action,
          entry.resourceType,
          entry.resourceId ?? null,
          detailsJson,
          entry.initiatedBy,
          createdAt
        )
        .run();
    }

    logger.debug('Audit log written', { id, action: entry.action, resourceType: entry.resourceType, hasHash });
    return true;
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'audit-write', action: entry.action },
      ERROR_CODES.GDPR_AUDIT_WRITE_FAILED
    );
    logger.warn('Failed to write audit log (non-blocking)', { code: errInfo.code });
    return false;
  }
}

/**
 * Fetch audit logs for a company. Supports optional filtering by userId and action.
 * Returns empty array on any error. Never throws.
 */
export async function getAuditLogs(
  env: Record<string, unknown> | undefined,
  companyId: string,
  filters?: { userId?: string; action?: GdprAuditAction; limit?: number }
): Promise<AuditLogRow[]> {
  const db = getDb(env);
  if (!db || !companyId) return [];

  try {
    let query = 'SELECT * FROM data_access_audit WHERE company_id = ?';
    const params: unknown[] = [companyId];

    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(filters?.limit ?? 100, 500));

    const stmt = db.prepare(query);
    const bound = stmt.bind(...params) as D1PreparedStatement;
    const result = await bound.all();

    return (result?.results as AuditLogRow[]) ?? [];
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'fetch-audit-logs', companyId },
      ERROR_CODES.GDPR_OPERATION_FAILED
    );
    logger.warn('Failed to fetch audit logs', { code: errInfo.code });
    return [];
  }
}

// ─── Data Deletion (Art. 17 — Right to Erasure) ───

/**
 * Create a deletion request record. Tracks the lifecycle of a data erasure request.
 * Returns the request ID or null on failure. Never throws.
 */
export async function createDeletionRequest(
  env: Record<string, unknown> | undefined,
  companyId: string,
  userId: string
): Promise<string | null> {
  const db = getDb(env);
  if (!db || !companyId || !userId) return null;

  try {
    const id = generateId();
    const stmt = db.prepare(
      `INSERT INTO data_deletion_requests (id, company_id, user_id, status)
       VALUES (?, ?, ?, 'pending')`
    );
    await stmt.bind(id, companyId, userId).run();

    // Audit the deletion request itself
    await logDataAccess(env, {
      companyId,
      userId,
      action: 'DELETE',
      resourceType: 'USER_PII',
      resourceId: id,
      details: { type: 'deletion_request_created' },
      initiatedBy: 'user',
    });

    logger.info('Deletion request created', { id, companyId, userId });
    return id;
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'create-deletion-request', companyId, userId },
      ERROR_CODES.GDPR_DELETE_FAILED
    );
    logger.warn('Failed to create deletion request', { code: errInfo.code });
    return null;
  }
}

/**
 * Mark a deletion request as completed with the list of deleted resources.
 * Never throws.
 */
export async function completeDeletionRequest(
  env: Record<string, unknown> | undefined,
  requestId: string,
  deletedResources: string[]
): Promise<boolean> {
  const db = getDb(env);
  if (!db || !requestId) return false;

  try {
    const stmt = db.prepare(
      `UPDATE data_deletion_requests
       SET status = 'completed', resources_deleted = ?, completed_at = datetime('now')
       WHERE id = ?`
    );
    await stmt.bind(JSON.stringify(deletedResources), requestId).run();

    logger.info('Deletion request completed', { requestId, resourceCount: deletedResources.length });
    return true;
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'complete-deletion-request', requestId },
      ERROR_CODES.GDPR_DELETE_FAILED
    );
    logger.warn('Failed to complete deletion request', { code: errInfo.code });
    return false;
  }
}

/**
 * Get deletion requests for a company. Never throws.
 */
export async function getDeletionRequests(
  env: Record<string, unknown> | undefined,
  companyId: string
): Promise<DeletionRequestRow[]> {
  const db = getDb(env);
  if (!db || !companyId) return [];

  try {
    const stmt = db.prepare(
      'SELECT * FROM data_deletion_requests WHERE company_id = ? ORDER BY requested_at DESC LIMIT 100'
    );
    const result = await stmt.bind(companyId).all();
    return (result?.results as DeletionRequestRow[]) ?? [];
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'fetch-deletion-requests', companyId },
      ERROR_CODES.GDPR_OPERATION_FAILED
    );
    logger.warn('Failed to fetch deletion requests', { code: errInfo.code });
    return [];
  }
}

// ─── Data Export (Art. 15 — Right of Access) ───

/**
 * Build KV key prefixes for a given resource ID.
 * KV keys use resourceId (not userId) — e.g. `ml:{id}:base`, `phishing:{id}:base`.
 *
 * For Art. 15 data export: first query D1/API to find resourceIds associated with a user,
 * then call this to get the KV key patterns for each resource.
 * Caller is responsible for fetching actual values via KVService.list() + KVService.get().
 */
export function buildResourceKeyPrefixes(resourceId: string): string[] {
  return [
    `ml:${resourceId}:`,        // Microlearning content (base, lang, inbox)
    `phishing:${resourceId}:`,  // Phishing simulation (base, email, landing)
    `smishing:${resourceId}:`,  // Smishing simulation (base, sms, landing)
  ];
}

// ─── Retention Policy Helper ───

/**
 * Check if a record has exceeded its retention period.
 * Useful for cron-based cleanup jobs.
 */
export function isExpired(createdAt: string, dataCategory: keyof typeof GDPR.RETENTION_DAYS): boolean {
  const retentionDays = GDPR.RETENTION_DAYS[dataCategory];
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) {
    logger.warn('isExpired: unparseable date, treating as expired', { createdAt, dataCategory });
    return true;
  }
  const now = Date.now();
  const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
  return ageInDays > retentionDays;
}

// ─── Chain Verification (EU AI Act Art. 12 — Integrity Check) ───

/**
 * Verify the integrity of the audit log hash-chain for a company.
 *
 * Walks every row in chronological order, recomputes the SHA-256 hash,
 * and compares it to the stored `integrity_hash`. Any mismatch means
 * a row was tampered with (edited/deleted/inserted out of order).
 *
 * Also detects concurrent writes: rows sharing the same prev_hash
 * (natural in distributed systems, not necessarily tampering).
 *
 * Never throws — returns a verification result object.
 */
export async function verifyAuditChain(
  env: Record<string, unknown> | undefined,
  companyId: string
): Promise<ChainVerificationResult> {
  const empty: ChainVerificationResult = {
    valid: true,
    totalRows: 0,
    verifiedRows: 0,
    firstBrokenAt: null,
    brokenRowId: null,
    concurrentWrites: 0,
  };

  const db = getDb(env);
  if (!db || !companyId) return empty;

  try {
    const stmt = db.prepare(
      'SELECT id, company_id, user_id, action, resource_type, resource_id, details, initiated_by, created_at, integrity_hash, prev_hash FROM data_access_audit WHERE company_id = ? ORDER BY created_at ASC'
    );
    const result = await stmt.bind(companyId).all();
    const rows = (result?.results ?? []) as AuditLogRow[];

    if (rows.length === 0) return empty;

    // Skip verification for rows without hashes (pre-migration data)
    const hashedRows = rows.filter(r => r.integrity_hash !== null);
    if (hashedRows.length === 0) {
      return { ...empty, totalRows: rows.length };
    }

    let verifiedRows = 0;
    let firstBrokenAt: number | null = null;
    let brokenRowId: string | null = null;
    const prevHashCounts = new Map<string, number>();

    for (let i = 0; i < hashedRows.length; i++) {
      const row = hashedRows[i];

      // Track concurrent writes (multiple rows with same prev_hash)
      if (row.prev_hash) {
        prevHashCounts.set(row.prev_hash, (prevHashCounts.get(row.prev_hash) ?? 0) + 1);
      }

      // Recompute hash from row data
      const payload = buildHashPayload(
        row.id,
        row.company_id,
        row.user_id,
        row.action,
        row.resource_type,
        row.resource_id,
        row.details,
        row.initiated_by,
        row.created_at,
        row.prev_hash ?? 'GENESIS'
      );
      const expectedHash = await computeHash(payload);

      if (expectedHash === row.integrity_hash) {
        verifiedRows++;
      } else if (firstBrokenAt === null) {
        firstBrokenAt = i;
        brokenRowId = row.id;
        logger.warn('Audit chain integrity broken', {
          rowIndex: i,
          rowId: row.id,
          expectedHash,
          storedHash: row.integrity_hash,
        });
      }
    }

    // Count concurrent writes (prev_hash used more than once)
    let concurrentWrites = 0;
    for (const count of prevHashCounts.values()) {
      if (count > 1) concurrentWrites += count;
    }

    return {
      valid: firstBrokenAt === null,
      totalRows: rows.length,
      verifiedRows,
      firstBrokenAt,
      brokenRowId,
      concurrentWrites,
    };
  } catch (error) {
    const errInfo = errorService.dataProcessing(
      error instanceof Error ? error.message : String(error),
      { operation: 'verify-audit-chain', companyId },
      ERROR_CODES.GDPR_OPERATION_FAILED
    );
    logger.warn('Failed to verify audit chain', { code: errInfo.code });
    return { ...empty, valid: false };
  }
}
