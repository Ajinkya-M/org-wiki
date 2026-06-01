# Project State

Last updated: 2026-06-01 Europe/London

## Repository Status

- Git repository initialized on 2026-05-28.
- Existing hidden local config directory `.claude/` is workstation-specific and ignored via `.gitignore`.
- **Working playground implementation in `playground/` with Supabase + OpenRouter integration.** Phase 1 infra scaffolded: Supabase schema applied, migration file created, connection verified.
- **Repository structure standardized on 2026-06-01**: all planning docs now live under `plan/`, and playground code/tests/data are split under `playground/app/`, `playground/tests/`, and `playground/data/`.

## Project Goal

Build an organisational knowledge-base RAG system with:

- PDF ingestion and embedding
- retrieval (semantic search)
- LLM-backed answer generation with source citations

Two implementation tracks exist:

| Track | Description | Status |
|---|---|---|
| **Local (prototype)** | JSON-based vector store, org-scoped directories, standalone Python scripts | 🟢 Working |
| **Phase 1 (target)** | FastAPI + Supabase pgvector + OpenRouter (per `plan/phase/phase1-mvp-plan.md`) | 🟡 Partially prototyped in playground; modular backend structure still pending |

## Current Phase

The system has a **working local + Supabase-backed playground prototype**. Core RAG flow is now demonstrated end-to-end (ingest, retrieve, answer with citations) through CLI and a playground FastAPI service. The formal Phase 1 module layout (`config.py`, `db/`, `ingestion/`, `retrieval/`, `routers/`) remains unimplemented as a separate codebase.

### Directory Layout (Current Standard)

- Planning docs: `plan/architecture/`, `plan/phase/`, `plan/implementation/`
- Agent coordination: `AI_CONTEXT/`
- Playground runtime code: `playground/app/`
- Playground smoke tests: `playground/tests/`
- Playground local artifacts: `playground/data/input/`, `playground/data/embeddings/` (ignored)
- Database migrations: `migrations/`

### What Exists

- `playground/app/index_docs.py` — scans PDFs, extracts text with PyMuPDF, chunks (~992 chars), embeds with `all-MiniLM-L6-v2`. Now supports three storage modes via `--store`:
  - `local` (default): saves `.json` per PDF to `playground/data/embeddings/<org>/`
  - `supabase`: inserts into `knowledge_chunks` + upserts `doc_registry`
  - `both`: writes to both simultaneously
  - Stable identity: `doc_id = {org}/{pdf_stem}`, `chunk_id = {doc_id}:c{chunk_order:04d}`
  - Idempotent: SHA-256 hash + `doc_registry` check skips unchanged files; changed files replace old chunks
- `playground/app/ask.py` — loads `.json` embeddings for a given `--org` (default `default_org`), encodes the user's question, returns top-K chunks ranked by cosine similarity. Also supports `--llm` to generate grounded answers via OpenRouter with stable chunk citations.
- **Org-scoped storage:** embeddings sit under `playground/data/embeddings/<org>/` — each org directory is isolated.
- Playground verification was previously done with a local sample PDF, but sample source documents and generated embeddings should not be committed to the repository.
- `migrations/001_initial_schema.sql` — Supabase schema: `knowledge_chunks` table (pgvector), `doc_registry` table, `match_knowledge_chunks()` RPC function.
- `playground/tests/test_supabase.py` — connection, schema, and data verification. Supports `--doc-id` and `--query` flags for targeted checks.
- `playground/app/openrouter_client.py` — shared OpenRouter helper (env loading, API key lookup, free model selection, chat completion call, optional raw payload path).
- `playground/tests/test_openrouter.py` — checks OpenRouter connectivity and runs a simple free-model completion smoke test.
- `playground/app/api.py` — FastAPI playground service with `GET /health`, `POST /ingest` (PDF upload -> Supabase indexing), and `POST /query` (pgvector retrieval -> OpenRouter answer + cited sources).
- Supabase project `org-wiki` provisioned, schema applied, connection confirmed via both Python client and Supabase MCP.

### What's Next

- Add Supabase retrieval mode to `playground/app/ask.py` so query path can run from DB as well as local JSON.
- Harden playground API for operational behavior (retry/backoff, richer error envelopes, request validation, and configurable retrieval filters).
- Implement Phase 1 modular backend structure: `db/client.py`, `config.py`, ingestion pipeline, retrieval + prompt, API routers.

## Scope Boundaries

### In scope (playground)

- local CPU-only operation
- PyMuPDF for text extraction (no `poppler` / `unstructured` needed)
- character-budget chunking (no tokenizer dependency)
- cosine similarity on in-memory numpy arrays
- `--org` scoping for multi-org support
- OpenRouter-backed answer generation with grounded prompt + citations
- FastAPI playground API for upload/query testing

### In scope (Phase 1 — planned)

- local runtime only
- backend-only implementation
- ingestion, retrieval, answer generation
- Supabase schema and retrieval function ✅ (schema applied, verified)

### Excluded (both tracks)

- frontend
- auth and RLS enforcement
- production deployment
- re-ranking
- hybrid search

## Immediate Priorities

1. Keep AI context docs synchronized with active implementation changes.
2. Add DB-backed retrieval path to `playground/app/ask.py` (currently local JSON retrieval only).
3. Extract or migrate playground logic into Phase 1 modular backend structure.

## Development Environment

- **Host OS:** Windows with WSL2
- **WSL distro:** Ubuntu
- **Shell:** bash
- **Project root (Windows):** `D:\Ajinkya\workspace\AI\org-wiki`
- **Project root (WSL2):** `/mnt/d/Ajinkya/workspace/AI/org-wiki`
- All commands and scripts must target the WSL2/Ubuntu environment. Linux paths only. No PowerShell or CMD.
- All new directories and files are created relative to the project root. Agents must never use `~/` or absolute paths outside the project root unless explicitly instructed.
- Native dependency for `unstructured[pdf]` (only needed for Phase 1): `sudo apt-get install -y poppler-utils`
- Python toolchain: `python3`, `pip3`. No virtualenv — install directly into system Python with `pip install --break-system-packages <package>`.

## Dependencies (installed)

| Package | Used by | Notes |
|---|---|---|
| `PyMuPDF` (fitz) | `index_docs.py` | Text extraction — no native deps needed |
| `sentence-transformers` | Both scripts | Embedding model `all-MiniLM-L6-v2` (384-dim) |
| `numpy` | `ask.py` | Cosine similarity computation |
| `scikit-learn` | (imported but unused) | Pre-installed, not called |
| `supabase` | `test_supabase.py` | Supabase Python client |
| `python-dotenv` | `test_supabase.py` | Load `.env` from project root |
| `httpx` | (Phase 1) | Installed, used by OpenRouter calls |

No `poppler-utils`, `unstructured`, or `langchain` needed for the local prototype.

## Constraints

- The local prototype loads all embeddings into RAM. 104 chunks × 384 floats × 4 bytes ≈ 160 KB per doc — negligible for now, but watch for large-scale usage.
- `sentence-transformers` downloads model weights (~80MB) on first run; cached at `~/.cache/huggingface/` afterwards.
- The prototype uses character-budget chunking (~992 chars ≈ 256 tokens) to avoid tokenizer dependency. This is sufficient for `all-MiniLM-L6-v2` (max 256 tokens).
- OpenRouter free-tier rate limits can constrain concurrent usage; free model availability can vary.
- `playground/app/api.py` currently depends on environment variables in project `.env` and uses free-model auto-picking at request time.

## Key Deviations from plan/architecture/rag-system-design.md

| Aspect | Design doc says | What we built | Reason |
|---|---|---|---|
| Vector store | Supabase pgvector | Hybrid in playground: local JSON plus optional Supabase storage | Preserve zero-infra path while validating DB path incrementally |
| PDF parser | `unstructured[pdf]` | `PyMuPDF` | No native deps needed (`poppler`) |
| Chunking | `RecursiveCharacterTextSplitter` with tokenizer | Character-budget (~992 chars) | Avoids tokenizer import overhead |
| Answer gen | OpenRouter LLM in `retrieval/prompt.py` | Implemented in playground (`ask.py --llm`, `api.py /query`) | Validate RAG loop early before formal Phase 1 module split |
| API layer | FastAPI + `uvicorn` | Playground FastAPI (`playground/app/api.py`) + CLI scripts | Early vertical slice exists; structured Phase 1 module layout still pending |

## Coordination Notes

- `AI_CONTEXT/` is the current source of truth for agent coordination.
- Agents should claim work before editing and log results afterward.
- Any deviation from the documented architecture must be recorded in `DECISIONS.md`.
- The playground prototype is a **parallel track** — it does not replace Phase 1, but it validates the core RAG concept locally.
