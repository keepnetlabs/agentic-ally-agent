import { describe, it, expect, vi } from 'vitest';
import {
  logDataAccess,
  getAuditLogs,
  createDeletionRequest,
  completeDeletionRequest,
  getDeletionRequests,
  buildResourceKeyPrefixes,
  isExpired,
  computeHash,
  buildHashPayload,
  verifyAuditChain,
} from './gdpr-service';

// ─── Mock D1 ───

/**
 * Creates a mock D1 database.
 * Supports multiple prepare() calls — each returns its own bind/run/all chain.
 * Use _calls to inspect specific invocations.
 */
function createMockDb() {
  const calls: Array<{
    query: string;
    bind: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
    all: ReturnType<typeof vi.fn>;
  }> = [];

  const mockPrepare = vi.fn().mockImplementation((query: string) => {
    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockAll = vi.fn().mockResolvedValue({ success: true, results: [] });
    const mockBind = vi.fn().mockReturnValue({ run: mockRun, all: mockAll });
    const call = { query, bind: mockBind, run: mockRun, all: mockAll };
    calls.push(call);
    return { bind: mockBind };
  });

  return {
    prepare: mockPrepare,
    _calls: calls,
    /** Get the Nth prepare call (0-based) */
    call(n: number) {
      return calls[n];
    },
  };
}

function createEnv(db: ReturnType<typeof createMockDb>) {
  return { agentic_ally_memory: db } as unknown as Record<string, unknown>;
}

// ─── Pure Function Tests ───

describe('buildResourceKeyPrefixes', () => {
  it('returns correct KV key prefixes for a resource ID', () => {
    const prefixes = buildResourceKeyPrefixes('abc-123');
    expect(prefixes).toEqual([
      'ml:abc-123:',
      'phishing:abc-123:',
      'smishing:abc-123:',
    ]);
  });

  it('handles empty string', () => {
    const prefixes = buildResourceKeyPrefixes('');
    expect(prefixes).toHaveLength(3);
    expect(prefixes[0]).toBe('ml::');
  });
});

describe('isExpired', () => {
  it('returns false for recent data', () => {
    const now = new Date().toISOString();
    expect(isExpired(now, 'CAMPAIGN_DATA')).toBe(false);
  });

  it('returns true for old data beyond retention period', () => {
    const twoYearsAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(isExpired(twoYearsAgo, 'CAMPAIGN_DATA')).toBe(true);
  });

  it('returns false for data within retention period', () => {
    const sixMonthsAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(isExpired(sixMonthsAgo, 'CAMPAIGN_DATA')).toBe(false);
  });

  it('returns true for unparseable date (NaN guard)', () => {
    expect(isExpired('not-a-date', 'CAMPAIGN_DATA')).toBe(true);
  });

  it('returns true for empty string date', () => {
    expect(isExpired('', 'CAMPAIGN_DATA')).toBe(true);
  });

  it('respects different retention periods', () => {
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(isExpired(hundredDaysAgo, 'SESSION_DATA')).toBe(true);
    expect(isExpired(hundredDaysAgo, 'AUDIT_LOGS')).toBe(false);
  });
});

// ─── Hash-Chain Pure Function Tests ───

describe('computeHash', () => {
  it('produces a 64-char hex string (SHA-256)', async () => {
    const hash = await computeHash('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input yields same hash', async () => {
    const a = await computeHash('test-data-123');
    const b = await computeHash('test-data-123');
    expect(a).toBe(b);
  });

  it('different inputs yield different hashes', async () => {
    const a = await computeHash('input-a');
    const b = await computeHash('input-b');
    expect(a).not.toBe(b);
  });
});

describe('buildHashPayload', () => {
  it('returns a JSON array string with all fields', () => {
    const payload = buildHashPayload(
      'id-1', 'company-1', 'user-1', 'READ', 'USER_PII', 'res-1', '{"a":1}', 'user', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    expect(payload).toBe(JSON.stringify([
      'id-1', 'company-1', 'user-1', 'READ', 'USER_PII', 'res-1', '{"a":1}', 'user', '2026-01-01T00:00:00Z', 'GENESIS',
    ]));
  });

  it('preserves null values (no empty string substitution)', () => {
    const payload = buildHashPayload(
      'id-1', 'company-1', null, 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    const parsed = JSON.parse(payload);
    expect(parsed[2]).toBeNull();  // userId
    expect(parsed[5]).toBeNull();  // resourceId
    expect(parsed[6]).toBeNull();  // details
  });

  it('is collision-safe — pipe in details does not affect other fields', () => {
    const withPipe = buildHashPayload(
      'id-1', 'company-1', 'a|b', 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    const withoutPipe = buildHashPayload(
      'id-1', 'company-1', 'a', 'b|READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    // These MUST be different — JSON serialization guarantees it
    expect(withPipe).not.toBe(withoutPipe);
  });
});

// ─── D1 Service Tests ───

describe('logDataAccess', () => {
  it('returns false when env is undefined', async () => {
    const result = await logDataAccess(undefined, {
      companyId: 'c1',
      action: 'READ',
      resourceType: 'USER_PII',
      initiatedBy: 'user',
    });
    expect(result).toBe(false);
  });

  it('returns false when D1 is not available', async () => {
    const result = await logDataAccess({}, {
      companyId: 'c1',
      action: 'READ',
      resourceType: 'USER_PII',
      initiatedBy: 'user',
    });
    expect(result).toBe(false);
  });

  it('writes audit log with hash-chain to D1', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    const result = await logDataAccess(env, {
      companyId: 'company-1',
      userId: 'user-42',
      action: 'DELETE',
      resourceType: 'USER_PII',
      resourceId: 'res-123',
      details: { path: '/api/user' },
      initiatedBy: 'user',
    });

    expect(result).toBe(true);

    // Call 0: getLastHash SELECT
    expect(db.call(0).query).toContain('SELECT integrity_hash');
    expect(db.call(0).bind).toHaveBeenCalledWith('company-1');

    // Call 1: INSERT with hash columns (11 params)
    expect(db.call(1).query).toContain('INSERT INTO data_access_audit');
    expect(db.call(1).query).toContain('integrity_hash');
    expect(db.call(1).bind).toHaveBeenCalledWith(
      expect.any(String),  // UUID
      'company-1',
      'user-42',
      'DELETE',
      'USER_PII',
      'res-123',
      JSON.stringify({ path: '/api/user' }),
      'user',
      expect.any(String),  // createdAt ISO
      expect.any(String),  // integrity_hash (64-char hex)
      'GENESIS'            // prev_hash (first row in chain)
    );
  });

  it('falls back to INSERT without hash columns if migration not applied', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    // getLastHash fails (column doesn't exist) — that's fine, returns GENESIS
    // INSERT with hash columns fails — triggers fallback
    // We need the second prepare call's run to reject
    // Override: make the first INSERT (call index 1) fail
    const originalPrepare = db.prepare.getMockImplementation()!;
    let callCount = 0;
    db.prepare.mockImplementation((query: string) => {
      callCount++;
      const result = originalPrepare(query);
      // The 2nd prepare call is the INSERT with hash — make its run fail
      if (callCount === 2) {
        const call = db._calls[db._calls.length - 1];
        call.run.mockRejectedValueOnce(new Error('table has no column named integrity_hash'));
      }
      return result;
    });

    const result = await logDataAccess(env, {
      companyId: 'c1',
      action: 'READ',
      resourceType: 'USER_PII',
      initiatedBy: 'system',
    });

    expect(result).toBe(true);
    // Should have 3 prepare calls: getLastHash, failed INSERT, fallback INSERT
    expect(db._calls).toHaveLength(3);
    // Fallback INSERT should NOT contain integrity_hash
    expect(db.call(2).query).toContain('INSERT INTO data_access_audit');
    expect(db.call(2).query).not.toContain('integrity_hash');
  });

  it('returns false and does not throw on total D1 failure', async () => {
    const db = createMockDb();
    // Make getLastHash fail with a thrown error from prepare
    db.prepare.mockImplementation(() => {
      throw new Error('D1 completely unavailable');
    });
    const env = createEnv(db);

    const result = await logDataAccess(env, {
      companyId: 'c1',
      action: 'READ',
      resourceType: 'USER_PII',
      initiatedBy: 'system',
    });

    expect(result).toBe(false);
  });

  it('handles null userId and details gracefully', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    const result = await logDataAccess(env, {
      companyId: 'c1',
      action: 'CREATE',
      resourceType: 'CAMPAIGN_DATA',
      initiatedBy: 'cron',
    });

    expect(result).toBe(true);
    // INSERT call (call index 1) should have nulls
    expect(db.call(1).bind).toHaveBeenCalledWith(
      expect.any(String),  // UUID
      'c1',
      null,                // userId
      'CREATE',
      'CAMPAIGN_DATA',
      null,                // resourceId
      null,                // details
      'cron',
      expect.any(String),  // createdAt
      expect.any(String),  // integrity_hash
      'GENESIS'            // prev_hash
    );
  });

  it('chains to previous hash when rows exist', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    // getLastHash returns a previous hash
    const originalPrepare = db.prepare.getMockImplementation()!;
    let callCount = 0;
    db.prepare.mockImplementation((query: string) => {
      callCount++;
      const result = originalPrepare(query);
      // First call is getLastHash — return a previous hash
      if (callCount === 1) {
        const call = db._calls[db._calls.length - 1];
        call.all.mockResolvedValueOnce({
          success: true,
          results: [{ integrity_hash: 'abc123def456' }],
        });
      }
      return result;
    });

    await logDataAccess(env, {
      companyId: 'c1',
      action: 'READ',
      resourceType: 'USER_PII',
      initiatedBy: 'user',
    });

    // INSERT should use 'abc123def456' as prev_hash, not 'GENESIS'
    const insertCall = db.call(1);
    const bindArgs = insertCall.bind.mock.calls[0];
    expect(bindArgs[10]).toBe('abc123def456'); // prev_hash = last arg
  });
});

describe('getAuditLogs', () => {
  it('returns empty array when env is undefined', async () => {
    expect(await getAuditLogs(undefined, 'c1')).toEqual([]);
  });

  it('returns empty array when companyId is empty', async () => {
    const db = createMockDb();
    expect(await getAuditLogs(createEnv(db), '')).toEqual([]);
  });

  it('queries D1 with correct filters', async () => {
    const db = createMockDb();
    // Override the all() mock for the first call
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [{ id: '1', company_id: 'c1', action: 'READ', created_at: '2026-01-01' }],
      });
      return result;
    });

    const result = await getAuditLogs(createEnv(db), 'c1', { userId: 'u1', action: 'READ', limit: 50 });

    expect(result).toHaveLength(1);
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('AND user_id = ?')
    );
    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('AND action = ?')
    );
  });

  it('caps limit at 500', async () => {
    const db = createMockDb();

    await getAuditLogs(createEnv(db), 'c1', { limit: 9999 });

    expect(db.call(0).bind).toHaveBeenCalledWith('c1', 500);
  });
});

describe('createDeletionRequest', () => {
  it('returns null when env is undefined', async () => {
    expect(await createDeletionRequest(undefined, 'c1', 'u1')).toBeNull();
  });

  it('returns null when companyId or userId is empty', async () => {
    const db = createMockDb();
    const env = createEnv(db);
    expect(await createDeletionRequest(env, '', 'u1')).toBeNull();
    expect(await createDeletionRequest(env, 'c1', '')).toBeNull();
  });

  it('creates deletion request and returns ID', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    const id = await createDeletionRequest(env, 'company-1', 'user-42');

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    // Should have prepare calls: INSERT deletion + getLastHash + INSERT audit (+ possible getLastHash for audit)
    expect(db._calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('completeDeletionRequest', () => {
  it('returns false when env is undefined', async () => {
    expect(await completeDeletionRequest(undefined, 'req-1', ['key1'])).toBe(false);
  });

  it('marks request as completed with resource list', async () => {
    const db = createMockDb();
    const env = createEnv(db);

    const result = await completeDeletionRequest(env, 'req-1', ['ml:abc:base', 'phishing:abc:base']);

    expect(result).toBe(true);
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE data_deletion_requests'));
    expect(db.call(0).bind).toHaveBeenCalledWith(
      JSON.stringify(['ml:abc:base', 'phishing:abc:base']),
      'req-1'
    );
  });
});

describe('getDeletionRequests', () => {
  it('returns empty array when env is undefined', async () => {
    expect(await getDeletionRequests(undefined, 'c1')).toEqual([]);
  });

  it('returns deletion requests from D1', async () => {
    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [{ id: 'req-1', company_id: 'c1', status: 'completed' }],
      });
      return result;
    });

    const result = await getDeletionRequests(createEnv(db), 'c1');
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });
});

// ─── Chain Verification Tests ───

describe('verifyAuditChain', () => {
  it('returns valid=true for empty chain', async () => {
    const db = createMockDb();
    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(0);
  });

  it('returns valid=true when env is undefined', async () => {
    const result = await verifyAuditChain(undefined, 'c1');
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(0);
  });

  it('skips rows without integrity_hash (pre-migration)', async () => {
    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [
          { id: '1', company_id: 'c1', action: 'READ', resource_type: 'USER_PII', integrity_hash: null, prev_hash: null },
          { id: '2', company_id: 'c1', action: 'READ', resource_type: 'USER_PII', integrity_hash: null, prev_hash: null },
        ],
      });
      return result;
    });

    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(true);
    expect(result.totalRows).toBe(2);
    expect(result.verifiedRows).toBe(0);
  });

  it('verifies a valid single-row chain', async () => {
    // Build a real hash for a single row
    const prevHash = 'GENESIS';
    const payload = buildHashPayload(
      'row-1', 'c1', null, 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', prevHash
    );
    const hash = await computeHash(payload);

    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [{
          id: 'row-1',
          company_id: 'c1',
          user_id: null,
          action: 'READ',
          resource_type: 'USER_PII',
          resource_id: null,
          details: null,
          initiated_by: 'system',
          created_at: '2026-01-01T00:00:00Z',
          integrity_hash: hash,
          prev_hash: 'GENESIS',
        }],
      });
      return result;
    });

    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(true);
    expect(result.verifiedRows).toBe(1);
    expect(result.firstBrokenAt).toBeNull();
  });

  it('verifies a valid multi-row chain', async () => {
    // Row 1 (genesis)
    const payload1 = buildHashPayload(
      'row-1', 'c1', null, 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    const hash1 = await computeHash(payload1);

    // Row 2 (chained to row 1)
    const payload2 = buildHashPayload(
      'row-2', 'c1', 'u1', 'DELETE', 'USER_PII', 'res-1', null, 'user', '2026-01-01T01:00:00Z', hash1
    );
    const hash2 = await computeHash(payload2);

    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [
          {
            id: 'row-1', company_id: 'c1', user_id: null, action: 'READ',
            resource_type: 'USER_PII', resource_id: null, details: null,
            initiated_by: 'system', created_at: '2026-01-01T00:00:00Z',
            integrity_hash: hash1, prev_hash: 'GENESIS',
          },
          {
            id: 'row-2', company_id: 'c1', user_id: 'u1', action: 'DELETE',
            resource_type: 'USER_PII', resource_id: 'res-1', details: null,
            initiated_by: 'user', created_at: '2026-01-01T01:00:00Z',
            integrity_hash: hash2, prev_hash: hash1,
          },
        ],
      });
      return result;
    });

    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(true);
    expect(result.verifiedRows).toBe(2);
    expect(result.concurrentWrites).toBe(0);
  });

  it('detects tampering — modified action field', async () => {
    // Build hash with action='READ'
    const payload = buildHashPayload(
      'row-1', 'c1', null, 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    const hash = await computeHash(payload);

    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [{
          id: 'row-1', company_id: 'c1', user_id: null,
          action: 'DELETE',  // ← TAMPERED! Was 'READ' when hash was computed
          resource_type: 'USER_PII', resource_id: null, details: null,
          initiated_by: 'system', created_at: '2026-01-01T00:00:00Z',
          integrity_hash: hash, prev_hash: 'GENESIS',
        }],
      });
      return result;
    });

    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt).toBe(0);
    expect(result.brokenRowId).toBe('row-1');
  });

  it('detects concurrent writes via prev_hash sharing', async () => {
    // Two rows with the same prev_hash (concurrent writes)
    const payload1 = buildHashPayload(
      'row-1', 'c1', null, 'READ', 'USER_PII', null, null, 'system', '2026-01-01T00:00:00Z', 'GENESIS'
    );
    const hash1 = await computeHash(payload1);

    const payload2 = buildHashPayload(
      'row-2', 'c1', null, 'CREATE', 'CAMPAIGN_DATA', null, null, 'cron', '2026-01-01T00:00:01Z', 'GENESIS'
    );
    const hash2 = await computeHash(payload2);

    const db = createMockDb();
    const originalPrepare = db.prepare.getMockImplementation()!;
    db.prepare.mockImplementation((query: string) => {
      const result = originalPrepare(query);
      const call = db._calls[db._calls.length - 1];
      call.all.mockResolvedValueOnce({
        success: true,
        results: [
          {
            id: 'row-1', company_id: 'c1', user_id: null, action: 'READ',
            resource_type: 'USER_PII', resource_id: null, details: null,
            initiated_by: 'system', created_at: '2026-01-01T00:00:00Z',
            integrity_hash: hash1, prev_hash: 'GENESIS',
          },
          {
            id: 'row-2', company_id: 'c1', user_id: null, action: 'CREATE',
            resource_type: 'CAMPAIGN_DATA', resource_id: null, details: null,
            initiated_by: 'cron', created_at: '2026-01-01T00:00:01Z',
            integrity_hash: hash2, prev_hash: 'GENESIS',
          },
        ],
      });
      return result;
    });

    const result = await verifyAuditChain(createEnv(db), 'c1');
    expect(result.valid).toBe(true); // Both rows valid individually
    expect(result.concurrentWrites).toBe(2); // 2 rows share 'GENESIS' as prev_hash
  });
});
