# Agent Change Log

## 2026-05-28 Europe/London

### me (session 2 — playground Supabase integration)

- Refactored `playground/index_docs.py` into cleaner helper functions (extract_text, chunk_text, get_source_hash, make_doc_id, make_chunk_id, collect_pdfs).
- Added `--store local|supabase|both` CLI flag (default: local). Preserves existing JSON behavior.
- Added `.env` loading and Supabase client init using same pattern as `test_supabase.py`.
- Added SHA-256 file hashing idempotency: `doc_registry` check skips unchanged files, replaces old chunks for changed files.
- Stable identity: `doc_id = {org}/{pdf_stem}`, `chunk_id = {doc_id}:c{chunk_order:04d}`.
- Insert into `knowledge_chunks` with `content`, `embedding`, `metadata` (doc_id, source, organisation, chunk_id, chunk_order, source_hash).
- Upsert `doc_registry` with doc_id, source_hash, file_name, chunk_count.
- Improved CLI output per document (file name, doc_id, chunk count, embedding dim, store mode, status).
- Fixed `maybe_single()` guard — returns `None` directly when no match (not a chainable query builder).
- Extended `playground/test_supabase.py` with `--doc-id` and `--query` flags for targeted data verification.
- Validation: local ✅, supabase ✅, both ✅, re-run skip ✅, Supabase MCP table verification ✅.

## 2026-05-28 Europe/London

### me

- Created `migrations/001_initial_schema.sql` with all 4 SQL blocks from `PHASE1_MVP_PLAN.md` Step 2c (pgvector, knowledge_chunks, doc_registry, match_knowledge_chunks function).
- Applied schema to Supabase project via SQL Editor — success.
- Created `playground/test_supabase.py` — validates Supabase connection, table existence, and `match_knowledge_chunks()` RPC function. All 4 checks pass.
- Installed `python-dotenv` and `supabase` Python packages.
- Updated T-003 to done in task board.

## 2026-05-28 Europe/London

### codex (session 4 — docs sync)

- Updated `PROJECT_STATE.md` to reflect the working local prototype (JSON vector store, org-scoped dirs, PyMuPDF, character-budget chunking).
- Added decisions D-006 through D-010 to `DECISIONS.md` covering: JSON vector store, PyMuPDF, character-budget chunking, org scoping, and no-LLM retrieval.
- Updated `RAG_SYSTEM_DESIGN.md` overview to mention the parallel local prototype track and link to playground scripts.
- Updated `PHASE1_MVP_PLAN.md` status banner noting that the plan is unimplemented; the local prototype is the current state.
- No code changes.

### codex (session 3)

- Created `playground/index_docs.py` — scans PDFs, extracts text via PyMuPDF, chunks (~992 chars), embeds with `all-MiniLM-L6-v2`, saves one `.json` per PDF to `playground/embeddings/`.
- Created `playground/ask.py` — loads all `.json` embedding files, encodes the user's question, returns top-K chunks ranked by cosine similarity (no LLM, no DB).
- Tested the playground flow against a local sample PDF to verify indexing and retrieval behavior.
- Recorded as T-012 in task board.
- Refactored both scripts to be org-scoped: `--org <name>` isolates embeddings under `playground/embeddings/<org>/`. Querying only searches that org's directory.

### codex

- Initialized the repository as a Git repository.
- Reviewed `RAG_SYSTEM_DESIGN.md` and `PHASE1_MVP_PLAN.md`.
- Added `.gitignore` to keep local agent config, environments, and secrets out of version control.
- Added `AGENTS.md` to define the shared multi-agent workflow.
- Created `AI_CONTEXT/` with project state, document analysis, decisions, task board, and handoff template.
- Recorded the current project as planning-only, with Phase 1 as the implementation baseline.
- Updated `RAG_SYSTEM_DESIGN.md` with explicit guidance for stable `chunk_id` / `chunk_order` metadata and safer `doc_id` strategy to avoid filename-stem collisions.
- Expanded `.gitignore` to exclude Python virtual environments, installed-package directories, wheel/build artifacts, and common Python tool caches.
- Renamed playground example organisation references to `example_org` and stopped tracking local sample PDFs and generated embedding artifacts.
- Added `SUPABASE_PGVECTOR_PLAYGROUND_PLAN.md` with a step-by-step plan to evolve the playground indexer from local JSON output to optional Supabase pgvector storage.

### cowork (session 2)

- Added WSL2/Ubuntu environment constraints to `CLAUDE.md`, `AGENTS.md`, `AI_CONTEXT/PROJECT_STATE.md`, and `PHASE1_MVP_PLAN.md`.
- All shell commands now target bash/Ubuntu: Linux paths only, `apt-get` for system packages, `python3`/`pip3`, no PowerShell or Windows paths.
- Step 1 of `PHASE1_MVP_PLAN.md` now opens with `sudo apt-get install -y poppler-utils` before the Python env setup.

### cowork (session 1)

- Reviewed `RAG_SYSTEM_DESIGN.md` and produced full architecture review (6 critical/significant findings).
- Updated `RAG_SYSTEM_DESIGN.md`: fixed `chunk_size` characters-vs-tokens bug; added dedicated embedding service section (sentence-transformers cannot run on Vercel Serverless); added auth/RLS section (§5); added document update/delete strategy (§6) with `doc_registry` table and SHA-256 staleness check; added OpenRouter rate limit constraints and context window budget; expanded Potential Improvements with query rewriting/HyDE, semantic caching, and HNSW parameter tuning.
- Created `PHASE1_MVP_PLAN.md`: full Phase 1 MVP implementation plan — Python env, Supabase fresh setup (4 SQL blocks), complete module code for `config.py`, `db/client.py`, `ingestion/` (loader, chunker, embedder, pipeline), `retrieval/` (search, prompt), `routers/` (ingest, query, documents), `main.py`, local dev workflow, and 9-step end-to-end test script with acceptance criteria.
- Reconciled `PHASE1_MVP_PLAN.md` with codex's additions: updated `ingest_pdf()` to accept optional explicit `doc_id` param and populate `chunk_id`/`chunk_order` in metadata; updated `Source` response model to use stable `chunk_id`/`chunk_order`/`doc_id` fields instead of retrieval rank; updated prompt builder to cite `chunk_id` not `i+1`; updated ingest router to expose `doc_id` as an optional form field.
- Updated `AI_CONTEXT/TASK_BOARD.md`: recorded T-008, T-009, T-010 as done; added resolution notes to T-003, T-004, T-005.
- Updated `AI_CONTEXT/DECISIONS.md`: added D-005 (citation identity); partially resolved O-001 (doc_id strategy for MVP); resolved O-002 (unstructured[pdf] behind narrow interface); resolved O-003 (inline SQL for MVP, migrate to files when a second environment is needed).
