-- Migration: 0002_campaign_metadata
-- Purpose: Active Learning - store simulation metadata for UserInfoAgent correlation
-- Database: agentic_ally_memory (database_id: 5a66922d-fbff-419c-9e5a-24f23334e5b9)
-- Run: npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0002_campaign_metadata.sql
-- Safe: CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS campaign_metadata (
  resource_id TEXT PRIMARY KEY,
  tactic TEXT,
  persuasion_tactic TEXT,
  scenario TEXT,
  difficulty TEXT,
  scenario_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_metadata_tactic ON campaign_metadata(tactic);
CREATE INDEX IF NOT EXISTS idx_campaign_metadata_created_at ON campaign_metadata(created_at);
