# Task Board

Last updated: 2026-06-01 Europe/London

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
| T-003 | done | me | Create reproducible Supabase schema and migration assets | `migrations/001_initial_schema.sql`, `playground/tests/test_supabase.py` | Schema applied to Supabase project, connection verified |
| T-004 | done | me | Implement Supabase ingestion in playground | `playground/app/index_docs.py`, `playground/tests/test_supabase.py` | --store local|supabase|both, SHA-256 hashing, doc_registry idempotency, stable doc_id/chunk_id |
| T-005 | planned | unassigned | Implement retrieval, prompt, and query endpoint | `retrieval/`, `routers/query.py` | Citations must use stored `chunk_id`, not retrieval rank |
| T-006 | planned | unassigned | Add tests and local developer workflow docs | tests, fixtures, setup docs | Prefer at least one vertical-slice smoke test |
| T-007 | done | codex | Add chunk ID and document ID collision guidance to architecture docs | `plan/architecture/rag-system-design.md` | Completed on 2026-05-28 Europe/London |
| T-008 | done | cowork | Architecture review and plan/architecture/rag-system-design.md updates | `plan/architecture/rag-system-design.md` | Fixed chunk_size bug, added embedding service section, auth/RLS, update/delete strategy, rate limit docs, improvements. Completed 2026-05-28 Europe/London |
| T-009 | done | cowork | Write Phase 1 MVP plan | `plan/phase/phase1-mvp-plan.md` | Full implementation plan with modules, SQL schema, API routers, and end-to-end test steps. Completed 2026-05-28 Europe/London |
| T-010 | done | cowork | Reconcile plan/phase/phase1-mvp-plan.md with codex's chunk_id / doc_id additions | `plan/phase/phase1-mvp-plan.md` | Updated pipeline.py (chunk_id, chunk_order), Source model (stable fields), prompt builder, ingest router (optional doc_id param), test examples. Completed 2026-05-28 Europe/London |
| T-011 | done | codex | Expand `.gitignore` for Python packages, environments, and build artifacts | `.gitignore` | Completed on 2026-05-28 Europe/London |
| T-012 | done | codex | Remove company-specific playground sample artifacts from version control | `.gitignore`, `playground/*`, `AI_CONTEXT/*` | Completed on 2026-05-28 Europe/London |
| T-012 | done | codex | Build local-only indexing & query scripts in playground/ | `playground/app/index_docs.py`, `playground/app/ask.py`, `playground/data/embeddings/` | Embeddings JSON as local vector store — no DB needed |
| T-013 | done | codex | Sync docs to reflect working prototype | `PROJECT_STATE.md`, `DECISIONS.md`, `plan/architecture/rag-system-design.md`, `plan/phase/phase1-mvp-plan.md` | All context files updated to show current state |
| T-014 | done | codex | Add implementation plan for Supabase pgvector-backed playground storage | `plan/implementation/supabase-pgvector-playground-plan.md`, `AI_CONTEXT/*` | Completed on 2026-05-28 Europe/London |

| T-015 | done | codex | Add LLM answer generation to playground query flow | `playground/app/ask.py`, `playground/app/openrouter_client.py`, `playground/tests/test_openrouter.py`, `plan/implementation/playground-llm-rag-plan.md` | Added shared OpenRouter helper module and integrated `ask.py --llm` with free-model selection, grounded prompting, answer output, and fallback to raw chunks |
| T-016 | done | codex | Add prompt/response debug output for LLM query runs | `playground/app/ask.py`, `playground/app/openrouter_client.py` | Added `--print-prompt` and `--print-raw-response` flags; verified with `ask.py --llm` run printing both prompt and provider payload |
| T-017 | done | codex | Build REST API for ingest + question answering | `playground/app/api.py`, `playground/app/openrouter_client.py` | Added FastAPI service with `/ingest` (PDF upload, default org fallback, Supabase pgvector indexing) and `/query` (pgvector retrieval + OpenRouter answer + citations) |
| T-018 | done | codex | Reconcile and refresh AI context files with current implemented system state | `AI_CONTEXT/*` | Completed on 2026-05-31 Europe/London: synced project state, decisions, doc analysis, task board, and changelog with current playground + API + LLM capabilities |
| T-019 | done | codex | Redact concrete Supabase project ID from tracked repo docs | `AI_CONTEXT/PROJECT_STATE.md`, repo-wide text search (excluding `.env*`, `playground/data/embeddings/`) | Completed on 2026-06-01 Europe/London: replaced explicit project ID strings with generic wording in tracked docs |
| T-020 | done | codex | Restructure repository into professional layout with centralized plan docs and playground app/test/data split | `plan/`, `playground/`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `AI_CONTEXT/*` | Completed on 2026-06-01 Europe/London: moved/renamed plan docs to kebab-case under `plan/`, split playground into `app/tests/data`, updated imports/paths/references and context docs |
| T-021 | done | codex | Repo-wide path hygiene pass after restructure | `AI_CONTEXT/DECISIONS.md`, `AI_CONTEXT/CHANGELOG.md`, repo-wide grep checks | Completed on 2026-06-01 Europe/London: removed remaining old root-plan filename references and re-verified no stale playground or plan paths |

## Claim Protocol

Before editing, add or update a row with:

- task ID
- status
- owner or agent name
- files or directories you expect to touch
- a short note on what you are changing

When done, update the row and add a corresponding entry to `CHANGELOG.md`.
