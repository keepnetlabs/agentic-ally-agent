-- Migration: 0003_gdpr_audit
-- Purpose: GDPR compliance — audit trail for data access, deletion, and export (Art. 15-17, 30, 33)
-- Database: agentic_ally_memory (database_id: 5a66922d-fbff-419c-9e5a-24f23334e5b9)
-- Run: npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0003_gdpr_audit.sql
-- Safe: CREATE TABLE IF NOT EXISTS

-- Audit log: tracks every data access, deletion, and export event
CREATE TABLE IF NOT EXISTS data_access_audit (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,          -- READ, CREATE, UPDATE, DELETE, EXPORT
  resource_type TEXT NOT NULL,   -- USER_PII, CAMPAIGN_DATA, TRAINING_DATA, ANALYTICS, AI_GENERATED
  resource_id TEXT,
  details TEXT,                  -- JSON: additional context (endpoint, key pattern, etc.)
  initiated_by TEXT,             -- system | user | cron
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON data_access_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON data_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON data_access_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON data_access_audit(created_at);

-- Data deletion requests: tracks Art. 17 "right to erasure" requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, failed
  resources_deleted TEXT,                   -- JSON: list of deleted resource keys
  requested_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_deletion_company ON data_deletion_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_deletion_status ON data_deletion_requests(status);
