-- Migration 001: Initial Schema
-- Phase 1 — Org Wiki RAG System
-- Run this in the Supabase SQL Editor.

-- Block 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Block 2: Main chunks table
CREATE TABLE knowledge_chunks (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    embedding       VECTOR(384),
    doc_id          TEXT GENERATED ALWAYS AS (metadata->>'doc_id') STORED,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast ANN search
CREATE INDEX idx_knowledge_chunks_embedding
    ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 128);

-- Index on doc_id for fast delete-by-doc
CREATE INDEX idx_knowledge_chunks_doc_id ON knowledge_chunks (doc_id);

-- GIN index on metadata for fast filtering
CREATE INDEX idx_knowledge_chunks_metadata ON knowledge_chunks USING gin (metadata);

-- Block 3: Document registry (dedup / staleness)
CREATE TABLE doc_registry (
    doc_id      TEXT PRIMARY KEY,
    source_hash TEXT NOT NULL,
    file_name   TEXT,
    chunk_count INT DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Block 4: Similarity search function
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding VECTOR(384),
    match_threshold FLOAT DEFAULT 0.4,
    match_count     INT   DEFAULT 10,
    filter_doc_id   TEXT  DEFAULT NULL
)
RETURNS TABLE (
    id         BIGINT,
    content    TEXT,
    metadata   JSONB,
    doc_id     TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        id,
        content,
        metadata,
        doc_id,
        1 - (embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks
    WHERE
        1 - (embedding <=> query_embedding) > match_threshold
        AND (filter_doc_id IS NULL OR doc_id = filter_doc_id)
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
