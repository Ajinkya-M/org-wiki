# Task Board

Last updated: 2026-05-28 Europe/London

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
| T-004 | planned | unassigned | Implement ingestion pipeline | `ingestion/`, upload flow | O-002 resolved: start with `unstructured[pdf]`, interface is narrow enough to swap |
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

## Claim Protocol

Before editing, add or update a row with:

- task ID
- status
- owner or agent name
- files or directories you expect to touch
- a short note on what you are changing

When done, update the row and add a corresponding entry to `CHANGELOG.md`.
