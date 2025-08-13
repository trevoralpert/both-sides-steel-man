-- Database Setup: Required Extensions
-- Run this file when setting up a new database instance

-- Enable pgvector extension for AI embeddings (required for semantic search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension was installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
