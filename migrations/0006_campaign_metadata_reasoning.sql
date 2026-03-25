-- Migration: 0006_campaign_metadata_reasoning
-- Purpose: Add reasoning column for rejection refinement — stores AI explainability.reasoning
--          so rejection-refinement-service can fetch rich context from D1 without KV lookup.
--          Also fixes created_at which was previously always NULL.
-- Database: agentic_ally_memory (database_id: 5a66922d-fbff-419c-9e5a-24f23334e5b9)
-- Run: npx wrangler d1 execute agentic-ally-memory --remote --file=./migrations/0006_campaign_metadata_reasoning.sql
-- Safe: ALTER TABLE ADD COLUMN is additive — no data loss

ALTER TABLE campaign_metadata ADD COLUMN reasoning TEXT;
ALTER TABLE campaign_metadata ADD COLUMN content_type TEXT;
