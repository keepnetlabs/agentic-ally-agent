-- Migration: 0004_audit_integrity_hash
-- Purpose: Tamper-evident audit logs — EU AI Act Art. 12 (integrity of records)
-- Pattern: Hash-chain — each row stores SHA-256(own_data + prev_hash)
-- Verification: Walk chain, recompute hashes, any mismatch = tampering detected
-- Database: agentic_ally_memory
-- Run: npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0004_audit_integrity_hash.sql
-- Safe: ALTER TABLE ... ADD COLUMN (no-op if column exists in future re-runs is NOT supported by SQLite,
--        but D1 will error harmlessly if already applied)

-- Add hash-chain columns to audit table
ALTER TABLE data_access_audit ADD COLUMN integrity_hash TEXT;
ALTER TABLE data_access_audit ADD COLUMN prev_hash TEXT;

-- Index for chain verification (walking the chain by company + time order)
CREATE INDEX IF NOT EXISTS idx_audit_integrity ON data_access_audit(company_id, created_at);
