-- Migration: Add requestContext column to dev_mastra_scorers table
-- Required by @mastra/evals@1.1.2 (scorer results storage)
-- Safe: ALTER TABLE ADD COLUMN is non-destructive, no data loss

ALTER TABLE dev_mastra_scorers ADD COLUMN requestContext TEXT;
