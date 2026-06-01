# Agent Change Log

## 2026-06-01 Europe/London

### codex

- Completed a follow-up repository-wide filename/path hygiene pass after restructure.
- Replaced the remaining old root-plan filename wording in `AI_CONTEXT/DECISIONS.md` with the new canonical `plan/...` paths.
- Re-ran repo-wide searches to confirm no stale old plan filenames or old `playground/*.py` top-level paths remain.

### codex

- Completed repository structure normalization (task T-020) with option 1 naming rules.
- Moved and renamed all plan documents into `plan/`:
  - `plan/architecture/rag-system-design.md`
  - `plan/phase/phase1-mvp-plan.md`
  - `plan/implementation/supabase-pgvector-playground-plan.md`
  - `plan/implementation/playground-llm-rag-plan.md`
- Reorganized playground into professional subdirectories:
  - runtime code under `playground/app/`
  - smoke tests under `playground/tests/`
  - local artifacts under `playground/data/`
- Updated imports and environment-loading paths after moves (`playground/app/api.py`, `playground/app/ask.py`, `playground/app/openrouter_client.py`, `playground/app/index_docs.py`, `playground/tests/*`).
- Added index docs: `plan/README.md` and `playground/README.md`.
- Updated `.gitignore` to ignore `playground/data/input/*.pdf` and `playground/data/embeddings/`.
- Updated references across root docs and AI context files to new plan/playground paths.
- Verification: ran stale-reference grep checks and Python compile checks for moved playground modules.

## 2026-06-01 Europe/London

### codex

- Redacted the concrete Supabase project ID string from tracked documentation.
- Updated `AI_CONTEXT/PROJECT_STATE.md` to remove the explicit project ID from the Supabase project reference.
- Ran a repo-wide search for the same string and confirmed remaining occurrence is only in `.env`, which was intentionally excluded.
- Added completed task entry T-019 in `AI_CONTEXT/TASK_BOARD.md` for this redaction work.

## 2026-05-31 Europe/London

### codex

- Reconciled AI context files to match the current implemented system state (playground CLI + Supabase indexing + OpenRouter answering + playground FastAPI API).
- Updated `AI_CONTEXT/PROJECT_STATE.md`:
  - moved status from planning/infra-ready framing to working vertical-slice framing
  - documented `playground/app/openrouter_client.py`, `playground/tests/test_openrouter.py`, and `playground/app/api.py`
  - refreshed immediate priorities and constraints
  - corrected architecture deviation table to remove stale "answer generation not implemented" statement
- Updated `AI_CONTEXT/DECISIONS.md`:
  - advanced last-updated timestamp
  - changed D-010 to superseded status
  - added D-013 (LLM-backed playground answering) and D-014 (playground FastAPI vertical slice)
  - added O-004 to track retrieval-backend parity gap between CLI and API
- Rewrote `AI_CONTEXT/DOC_ANALYSIS.md` to reflect current reality (implemented vertical slice, remaining modularization and hardening gaps).
- Updated `AI_CONTEXT/TASK_BOARD.md` with T-018 claim for this context reconciliation task.

### codex

- Added `playground/tests/test_openrouter.py` to validate OpenRouter connectivity against a free chat model.
- Script behavior: loads `.env`, accepts both `OPENROUTER_API_KEY` and `OPEN_ROUTER_API_KEY`, fetches model catalog, auto-picks an available `:free` model, sends a test prompt, and prints PASS/FAIL.
- Validation run: `python3 playground/tests/test_openrouter.py` succeeded with a free model and returned a response.
- Updated `AI_CONTEXT/TASK_BOARD.md` T-015 status.
- Added `playground/app/openrouter_client.py` as a shared OpenRouter integration module (`load_env`, key lookup, free-model picker, chat completion call).
- Integrated `playground/app/ask.py` with `--llm` mode using the shared helper. New flow: retrieve top-K chunks -> build grounded prompt with source + chunk_id -> call OpenRouter -> print answer + source list.
- Preserved existing non-LLM behavior; when LLM call fails or key is missing, `ask.py` falls back to raw chunk output.
- Validation runs:
  - `python3 playground/app/ask.py --help` (new flags visible)
  - `python3 playground/tests/test_openrouter.py` (PASS)
  - `python3 playground/app/ask.py "test question" --org example_org --llm` (expected early exit because no local embeddings present)
- Updated org handling defaults in playground scripts:
  - `playground/app/index_docs.py`: `--org` is now optional with default `default_org`
  - `playground/app/ask.py`: `--org` is now optional with default `default_org`
  - Queries run without `--org` now target `playground/data/embeddings/default_org/`
- Validation runs:
  - `python3 playground/app/index_docs.py --help`
  - `python3 playground/app/ask.py --help`
- Added LLM debug output support:
  - `playground/app/ask.py` now supports `--print-prompt` and `--print-raw-response`
  - `playground/app/openrouter_client.py` now exposes `chat_completion_with_payload()` for raw response inspection
- Validation run:
  - `python3 playground/app/ask.py "Is road side assistance provided by Ayvens for client?" --llm --print-prompt --print-raw-response -n 3`
- Added `playground/app/api.py` FastAPI service with:
  - `POST /ingest`: accepts PDF upload + optional `org` (defaults to `default_org`), chunks/embeds with `all-MiniLM-L6-v2`, stores vectors in Supabase `knowledge_chunks` + `doc_registry` via existing indexing pipeline.
  - `POST /query`: accepts question + optional `org`, embeds question, retrieves top matches from pgvector RPC, filters by org prefix (`{org}/`), calls OpenRouter free model, returns answer + source citations.
- Reused shared OpenRouter module and existing indexing helpers to avoid code duplication.
- Validation run:
  - `python3 -m py_compile playground/app/api.py playground/app/openrouter_client.py playground/app/ask.py`

## 2026-05-30

### me

- Created `plan/implementation/playground-llm-rag-plan.md` — plan to add OpenRouter LLM inference to `playground/app/ask.py` via `--llm` flag
- Added T-015 to `AI_CONTEXT/TASK_BOARD.md` for the LLM RAG playground task

## 2026-05-28 Europe/London

### me (session 2 — playground Supabase integration)

- Refactored `playground/app/index_docs.py` into cleaner helper functions (extract_text, chunk_text, get_source_hash, make_doc_id, make_chunk_id, collect_pdfs).
- Added `--store local|supabase|both` CLI flag (default: local). Preserves existing JSON behavior.
- Added `.env` loading and Supabase client init using same pattern as `test_supabase.py`.
- Added SHA-256 file hashing idempotency: `doc_registry` check skips unchanged files, replaces old chunks for changed files.
- Stable identity: `doc_id = {org}/{pdf_stem}`, `chunk_id = {doc_id}:c{chunk_order:04d}`.
- Insert into `knowledge_chunks` with `content`, `embedding`, `metadata` (doc_id, source, organisation, chunk_id, chunk_order, source_hash).
- Upsert `doc_registry` with doc_id, source_hash, file_name, chunk_count.
- Improved CLI output per document (file name, doc_id, chunk count, embedding dim, store mode, status).
- Fixed `maybe_single()` guard — returns `None` directly when no match (not a chainable query builder).
- Extended `playground/tests/test_supabase.py` with `--doc-id` and `--query` flags for targeted data verification.
- Validation: local ✅, supabase ✅, both ✅, re-run skip ✅, Supabase MCP table verification ✅.

## 2026-05-28 Europe/London

### me

- Created `migrations/001_initial_schema.sql` with all 4 SQL blocks from `plan/phase/phase1-mvp-plan.md` Step 2c (pgvector, knowledge_chunks, doc_registry, match_knowledge_chunks function).
- Applied schema to Supabase project via SQL Editor — success.
- Created `playground/tests/test_supabase.py` — validates Supabase connection, table existence, and `match_knowledge_chunks()` RPC function. All 4 checks pass.
- Installed `python-dotenv` and `supabase` Python packages.
- Updated T-003 to done in task board.

## 2026-05-28 Europe/London

### codex (session 4 — docs sync)

- Updated `PROJECT_STATE.md` to reflect the working local prototype (JSON vector store, org-scoped dirs, PyMuPDF, character-budget chunking).
- Added decisions D-006 through D-010 to `DECISIONS.md` covering: JSON vector store, PyMuPDF, character-budget chunking, org scoping, and no-LLM retrieval.
- Updated `plan/architecture/rag-system-design.md` overview to mention the parallel local prototype track and link to playground scripts.
- Updated `plan/phase/phase1-mvp-plan.md` status banner noting that the plan is unimplemented; the local prototype is the current state.
- No code changes.

### codex (session 3)

- Created `playground/app/index_docs.py` — scans PDFs, extracts text via PyMuPDF, chunks (~992 chars), embeds with `all-MiniLM-L6-v2`, saves one `.json` per PDF to `playground/data/embeddings/`.
- Created `playground/app/ask.py` — loads all `.json` embedding files, encodes the user's question, returns top-K chunks ranked by cosine similarity (no LLM, no DB).
- Tested the playground flow against a local sample PDF to verify indexing and retrieval behavior.
- Recorded as T-012 in task board.
- Refactored both scripts to be org-scoped: `--org <name>` isolates embeddings under `playground/data/embeddings/<org>/`. Querying only searches that org's directory.

### codex

- Initialized the repository as a Git repository.
- Reviewed `plan/architecture/rag-system-design.md` and `plan/phase/phase1-mvp-plan.md`.
- Added `.gitignore` to keep local agent config, environments, and secrets out of version control.
- Added `AGENTS.md` to define the shared multi-agent workflow.
- Created `AI_CONTEXT/` with project state, document analysis, decisions, task board, and handoff template.
- Recorded the current project as planning-only, with Phase 1 as the implementation baseline.
- Updated `plan/architecture/rag-system-design.md` with explicit guidance for stable `chunk_id` / `chunk_order` metadata and safer `doc_id` strategy to avoid filename-stem collisions.
- Expanded `.gitignore` to exclude Python virtual environments, installed-package directories, wheel/build artifacts, and common Python tool caches.
- Renamed playground example organisation references to `example_org` and stopped tracking local sample PDFs and generated embedding artifacts.
- Added `plan/implementation/supabase-pgvector-playground-plan.md` with a step-by-step plan to evolve the playground indexer from local JSON output to optional Supabase pgvector storage.

### cowork (session 2)

- Added WSL2/Ubuntu environment constraints to `CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/PROJECT_STATE.md`, and `plan/phase/phase1-mvp-plan.md`.
- All shell commands now target bash/Ubuntu: Linux paths only, `apt-get` for system packages, `python3`/`pip3`, no PowerShell or Windows paths.
- Step 1 of `plan/phase/phase1-mvp-plan.md` now opens with `sudo apt-get install -y poppler-utils` before the Python env setup.

### cowork (session 1)

- Reviewed `plan/architecture/rag-system-design.md` and produced full architecture review (6 critical/significant findings).
- Updated `plan/architecture/rag-system-design.md`: fixed `chunk_size` characters-vs-tokens bug; added dedicated embedding service section (sentence-transformers cannot run on Vercel Serverless); added auth/RLS section (§5); added document update/delete strategy (§6) with `doc_registry` table and SHA-256 staleness check; added OpenRouter rate limit constraints and context window budget; expanded Potential Improvements with query rewriting/HyDE, semantic caching, and HNSW parameter tuning.
- Created `plan/phase/phase1-mvp-plan.md`: full Phase 1 MVP implementation plan — Python env, Supabase fresh setup (4 SQL blocks), complete module code for `config.py`, `db/client.py`, `ingestion/` (loader, chunker, embedder, pipeline), `retrieval/` (search, prompt), `routers/` (ingest, query, documents), `main.py`, local dev workflow, and 9-step end-to-end test script with acceptance criteria.
- Reconciled `plan/phase/phase1-mvp-plan.md` with codex's additions: updated `ingest_pdf()` to accept optional explicit `doc_id` param and populate `chunk_id`/`chunk_order` in metadata; updated `Source` response model to use stable `chunk_id`/`chunk_order`/`doc_id` fields instead of retrieval rank; updated prompt builder to cite `chunk_id` not `i+1`; updated ingest router to expose `doc_id` as an optional form field.
- Updated `AI_CONTEXT/TASK_BOARD.md`: recorded T-008, T-009, T-010 as done; added resolution notes to T-003, T-004, T-005.
- Updated `AI_CONTEXT/DECISIONS.md`: added D-005 (citation identity); partially resolved O-001 (doc_id strategy for MVP); resolved O-002 (unstructured[pdf] behind narrow interface); resolved O-003 (inline SQL for MVP, migrate to files when a second environment is needed).
