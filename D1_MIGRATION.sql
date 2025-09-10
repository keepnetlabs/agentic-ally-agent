-- D1 Database Migration for Embedding Cache
-- Run this on your D1 database to create the embedding cache table

CREATE TABLE IF NOT EXISTS embedding_cache (
    path TEXT PRIMARY KEY,                -- Example file path (e.g., "examples/phishing.json")
    content_hash TEXT NOT NULL,           -- MD5 hash of file content for staleness detection
    embedding_json TEXT NOT NULL,         -- JSON-encoded embedding vector
    metadata_json TEXT,                   -- JSON-encoded metadata (category, topics, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- When embedding was first created
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,   -- Last time this embedding was used
    usage_count INTEGER DEFAULT 1,        -- How many times this embedding has been used
    cache_version TEXT DEFAULT '1.0.0'    -- Cache schema version for migrations
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_version ON embedding_cache(cache_version);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_usage ON embedding_cache(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_last_used ON embedding_cache(last_used DESC);

-- Example queries you can run to monitor cache performance:

-- Get cache statistics
-- SELECT 
--     COUNT(*) as total_entries,
--     SUM(usage_count) as total_usage,
--     MIN(created_at) as oldest_entry,
--     MAX(created_at) as newest_entry,
--     AVG(usage_count) as avg_usage
-- FROM embedding_cache;

-- Find most popular examples
-- SELECT path, usage_count, last_used 
-- FROM embedding_cache 
-- ORDER BY usage_count DESC 
-- LIMIT 10;

-- Find stale entries (not used in 30 days)
-- SELECT path, usage_count, last_used 
-- FROM embedding_cache 
-- WHERE last_used < datetime('now', '-30 days')
-- ORDER BY last_used ASC;