# Task Board

Last updated: 2026-05-31 Europe/London

## Status Legend

- `planned`
- `in_progress`
- `blocked`
- `done`

## Current Tasks

| Task ID | Status | Owner | Scope | Files / Area | Notes |
|---|---|---|---|---|---|
| T-001 | done | codex | Initialize repo and create collaboration context layer | `.gitignore`, `AGENTS.md`, `AI_CONTEXT/*` | Completed on 2026-05-28 Europe/London |
| T-002 | planned | unassigned | Scaffold backend project structure from Phase 1 plan | root app files, `db/`, `ingestion/`, `retrieval/`, `routers/` | Start here for implementation |
| T-003 | done | me | Create reproducible Supabase schema and migration assets | `migrations/001_initial_schema.sql`, `playground/test_supabase.py` | Schema applied to Supabase project, connection verified |
| T-004 | done | me | Implement Supabase ingestion in playground | `playground/index_docs.py`, `playground/test_supabase.py` | --store local|supabase|both, SHA-256 hashing, doc_registry idempotency, stable doc_id/chunk_id |
| T-005 | planned | unassigned | Implement retrieval, prompt, and query endpoint | `retrieval/`, `routers/query.py` | Citations must use stored `chunk_id`, not retrieval rank |
| T-006 | planned | unassigned | Add tests and local developer workflow docs | tests, fixtures, setup docs | Prefer at least one vertical-slice smoke test |
| T-007 | done | codex | Add chunk ID and document ID collision guidance to architecture docs | `RAG_SYSTEM_DESIGN.md` | Completed on 2026-05-28 Europe/London |
| T-008 | done | cowork | Architecture review and RAG_SYSTEM_DESIGN.md updates | `RAG_SYSTEM_DESIGN.md` | Fixed chunk_size bug, added embedding service section, auth/RLS, update/delete strategy, rate limit docs, improvements. Completed 2026-05-28 Europe/London |
| T-009 | done | cowork | Write Phase 1 MVP plan | `PHASE1_MVP_PLAN.md` | Full implementation plan with modules, SQL schema, API routers, and end-to-end test steps. Completed 2026-05-28 Europe/London |
| T-010 | done | cowork | Reconcile PHASE1_MVP_PLAN.md with codex's chunk_id / doc_id additions | `PHASE1_MVP_PLAN.md` | Updated pipeline.py (chunk_id, chunk_order), Source model (stable fields), prompt builder, ingest router (optional doc_id param), test examples. Completed 2026-05-28 Europe/London |
| T-011 | done | codex | Expand `.gitignore` for Python packages, environments, and build artifacts | `.gitignore` | Completed on 2026-05-28 Europe/London |
| T-012 | done | codex | Remove company-specific playground sample artifacts from version control | `.gitignore`, `playground/*`, `AI_CONTEXT/*` | Completed on 2026-05-28 Europe/London |
| T-012 | done | codex | Build local-only indexing & query scripts in playground/ | `playground/index_docs.py`, `playground/ask.py`, `playground/embeddings/` | Embeddings JSON as local vector store — no DB needed |
| T-013 | done | codex | Sync docs to reflect working prototype | `PROJECT_STATE.md`, `DECISIONS.md`, `RAG_SYSTEM_DESIGN.md`, `PHASE1_MVP_PLAN.md` | All context files updated to show current state |
| T-014 | done | codex | Add implementation plan for Supabase pgvector-backed playground storage | `SUPABASE_PGVECTOR_PLAYGROUND_PLAN.md`, `AI_CONTEXT/*` | Completed on 2026-05-28 Europe/London |

| T-015 | done | codex | Add LLM answer generation to playground query flow | `playground/ask.py`, `playground/openrouter_client.py`, `playground/test_openrouter.py`, `PALYGROUND_LLM_RAG_PLAN.md` | Added shared OpenRouter helper module and integrated `ask.py --llm` with free-model selection, grounded prompting, answer output, and fallback to raw chunks |
| T-016 | done | codex | Add prompt/response debug output for LLM query runs | `playground/ask.py`, `playground/openrouter_client.py` | Added `--print-prompt` and `--print-raw-response` flags; verified with `ask.py --llm` run printing both prompt and provider payload |
| T-017 | done | codex | Build REST API for ingest + question answering | `playground/api.py`, `playground/openrouter_client.py` | Added FastAPI service with `/ingest` (PDF upload, default org fallback, Supabase pgvector indexing) and `/query` (pgvector retrieval + OpenRouter answer + citations) |
| T-018 | done | codex | Reconcile and refresh AI context files with current implemented system state | `AI_CONTEXT/*` | Completed on 2026-05-31 Europe/London: synced project state, decisions, doc analysis, task board, and changelog with current playground + API + LLM capabilities |
| T-019 | done | codex | Redact concrete Supabase project ID from tracked repo docs | `AI_CONTEXT/PROJECT_STATE.md`, repo-wide text search (excluding `.env*`, `playground/embeddings/`) | Completed on 2026-06-01 Europe/London: replaced explicit project ID strings with generic wording in tracked docs |

## Claim Protocol

Before editing, add or update a row with:

- task ID
- status
- owner or agent name
- files or directories you expect to touch
- a short note on what you are changing

When done, update the row and add a corresponding entry to `CHANGELOG.md`.
