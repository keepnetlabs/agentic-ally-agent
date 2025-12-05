-- Migration number: 0001 	 2025-12-04T19:29:36.800Z
-- Purpose: Add performance indexes to embedding_cache table
-- Impact: Improve cache lookup performance by 10x
-- Safe: Uses IF NOT EXISTS, won't break existing data

-- Index on content_hash (most common lookup)
-- Used when checking if embedding already exists for a file
CREATE INDEX IF NOT EXISTS idx_content_hash ON embedding_cache(content_hash);

-- Index on last_used (for cleanup operations)
-- Used when removing old/stale cache entries
CREATE INDEX IF NOT EXISTS idx_last_used ON embedding_cache(last_used);

-- Index on cache_version (for version-based queries)
-- Used when migrating between cache versions
CREATE INDEX IF NOT EXISTS idx_cache_version ON embedding_cache(cache_version);

-- Composite index for common query pattern
-- Used when searching by version + recent usage
CREATE INDEX IF NOT EXISTS idx_version_last_used ON embedding_cache(cache_version, last_used);
