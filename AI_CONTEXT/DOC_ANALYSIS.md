# Design And Plan Analysis

Last updated: 2026-06-01 Europe/London

## Executive Read

The repository has moved from planning-only to a working playground vertical slice. The architecture docs remain directionally correct, and the MVP plan still defines the intended module layout, but implementation currently lives in `playground/app/` rather than in the planned package structure.

## What Is Now True

### 1. End-to-end RAG behavior exists in playground

- ingestion supports local JSON, Supabase, or both (`playground/app/index_docs.py`)
- retrieval is available from local embeddings in CLI (`playground/app/ask.py`)
- answer generation via OpenRouter is integrated (`playground/app/openrouter_client.py`, `playground/app/ask.py --llm`)
- API endpoints exist for ingest and query (`playground/app/api.py`)

### 2. Supabase schema and idempotency path are validated

- migration file exists (`migrations/001_initial_schema.sql`)
- `knowledge_chunks`, `doc_registry`, and `match_knowledge_chunks()` are in use
- doc hashing + upsert logic prevents unnecessary reindexing

### 3. Citation stability concerns were addressed in implementation

- chunk citations use stored `chunk_id` / `chunk_order` metadata rather than retrieval rank
- org scoping is implemented in both storage and query workflows

## Remaining Gaps Against Phase 1 Plan

### 1. Planned module structure is not yet materialized

`plan/phase/phase1-mvp-plan.md` still expects implementation under `config.py`, `db/`, `ingestion/`, `retrieval/`, and `routers/`. Equivalent behavior exists, but inside playground scripts.

### 2. Retrieval backend parity is incomplete across interfaces

- `playground/app/ask.py` retrieves from local JSON only
- `playground/app/api.py` query path retrieves from Supabase RPC
- this split is useful for iteration, but should be explicit in docs and UX

### 3. Operational hardening remains light

- limited retry/backoff behavior around model selection and completion calls
- no structured telemetry conventions yet
- free-tier model/rate-limit variability can cause inconsistent query experience

## Working Interpretation Of The Docs

- `plan/architecture/rag-system-design.md`: north-star architecture and production concerns
- `plan/phase/phase1-mvp-plan.md`: target backend package design and implementation baseline
- `playground/*`: validated integration slice proving the main RAG loop and schema assumptions

## Recommended Next Documentation Discipline

1. whenever playground capabilities change, update `PROJECT_STATE.md` and `DECISIONS.md` in the same session
2. if behavior differs by interface (CLI vs API), capture it explicitly in context docs
3. treat migration from playground scripts to Phase 1 modules as a tracked task with parity criteria
