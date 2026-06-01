# Org Wiki RAG Playground

This repository contains an organisational knowledge-base RAG system in active development.

Current implementation focus is a **playground vertical slice**:

- PDF ingestion and chunking
- embeddings with `sentence-transformers` (`all-MiniLM-L6-v2`)
- local JSON vector storage and optional Supabase pgvector storage
- retrieval from local vectors (CLI) and Supabase RPC (API)
- grounded answer generation via OpenRouter free chat models

The planned production-oriented structure is documented in `plan/phase/phase1-mvp-plan.md` and `plan/architecture/rag-system-design.md`.

## Repository Structure

- `playground/app/index_docs.py` - ingest PDFs, create chunks, embed, store to `local|supabase|both`
- `playground/app/ask.py` - local retrieval query CLI with optional `--llm` answer generation
- `playground/app/api.py` - FastAPI playground service (`/health`, `/ingest`, `/query`)
- `playground/app/openrouter_client.py` - shared OpenRouter client utilities
- `playground/tests/test_supabase.py` - Supabase connectivity/schema/RPC checks
- `playground/tests/test_openrouter.py` - OpenRouter connectivity smoke test
- `migrations/001_initial_schema.sql` - Supabase schema and retrieval RPC function
- `AI_CONTEXT/` - shared project state, decisions, task board, and changelog for agent coordination

## Prerequisites (WSL2 Ubuntu)

- Python 3.10+
- `pip3`
- Access to a Supabase project (for DB-backed flows)
- Access to OpenRouter API key (for LLM answer flows)

Install dependencies in system Python (no virtualenv in this repo workflow):

```bash
pip3 install --break-system-packages \
  pymupdf \
  sentence-transformers \
  numpy \
  supabase \
  python-dotenv \
  fastapi \
  "uvicorn[standard]" \
  httpx \
  python-multipart
```

## Quick Start

### 1) Index documents

```bash
python3 playground/app/index_docs.py \
  playground/data/input \
  --org default_org \
  --store local
```

To index into Supabase as well:

```bash
python3 playground/app/index_docs.py \
  playground/data/input \
  --org default_org \
  --store both
```

### 2) Ask questions from local embeddings

```bash
python3 playground/app/ask.py "What is the roadside assistance policy?" --org default_org -n 3
```

With LLM synthesis (falls back to raw chunks if model call fails):

```bash
python3 playground/app/ask.py "What is the roadside assistance policy?" --org default_org --llm
```

### 3) Run the playground API

```bash
uvicorn playground.app.api:app --reload
```

- `GET /health`
- `POST /ingest` (multipart PDF upload)
- `POST /query` (question + org + retrieval options)

## Database Notes

Apply `migrations/001_initial_schema.sql` to your Supabase project before DB-backed indexing/query flows.

The schema includes:

- `knowledge_chunks` table with `vector(384)` embeddings
- `doc_registry` table for source-hash idempotency
- `match_knowledge_chunks()` RPC for similarity search

## Project Status

- Playground track: implemented and usable for local experimentation
- Phase 1 modular backend (`config.py`, `db/`, `ingestion/`, `retrieval/`, `routers/`): planned, not fully materialized yet

For latest coordination and progress, see:

- `AI_CONTEXT/PROJECT_STATE.md`
- `AI_CONTEXT/TASK_BOARD.md`
- `AI_CONTEXT/DECISIONS.md`
- `AI_CONTEXT/CHANGELOG.md`
