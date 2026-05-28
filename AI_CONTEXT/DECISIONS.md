# Decisions

Last updated: 2026-05-28 Europe/London

## Active Decisions

### D-001: Phase 1 plan is the execution baseline

- Status: accepted
- Reason: `PHASE1_MVP_PLAN.md` is the most concrete implementation guide and intentionally narrows the broader system design into an MVP slice.
- Consequence: agents should not add auth, deployment splitting, hybrid search, or re-ranking unless the scope is explicitly changed.

### D-002: `RAG_SYSTEM_DESIGN.md` is the north-star architecture

- Status: accepted
- Reason: it captures future-state concerns that should influence extensibility, even if they are out of scope for the first implementation.
- Consequence: module boundaries should leave room for later auth, deployment changes, and richer retrieval features.

### D-003: `AI_CONTEXT/` is the coordination source of truth

- Status: accepted
- Reason: multiple agents need a shared, low-friction memory layer inside the repo.
- Consequence: agents must read and update this directory as part of their normal workflow.

### D-004: Local machine agent config should stay out of version control

- Status: accepted
- Reason: `.claude/` appears to contain local settings rather than portable project state.
- Consequence: `.claude/` is ignored in `.gitignore`.

### D-005: Citation identity uses stored chunk_id, not retrieval rank

- Status: accepted
- Reason: retrieval rank changes query to query and is therefore not a durable citation handle. `chunk_id` (format: `{doc_id}:p{page}:c{chunk_order}`) is assigned at ingest time and is stable.
- Consequence: `Source` response model and prompt builder must reference `chunk_id` and `chunk_order` from stored metadata. Retrieval rank (`i+1`) must not appear in any user-facing citation.

## Open Decisions

### O-001: Stable document identity strategy

- Status: partially resolved for MVP
- Decision: MVP falls back to `file_path.stem` when no explicit `doc_id` is provided, but the ingest endpoint accepts an optional `doc_id` form field so callers can supply a stable namespaced ID (e.g. `hr/handbook-2024`).
- Remaining risk: bare filename stem will collide if files from different folders share a name. Acceptable for local MVP; must be resolved before multi-folder or multi-source ingestion.
- Long-term preference: source-system ID or namespaced slug `{department}/{folder}/{filename-stem}`.

### O-002: PDF parsing backend for MVP

- Status: resolved for MVP
- Decision: use `unstructured[pdf]` behind a narrow `load_pdf()` interface in `ingestion/loader.py`. The interface is a single function returning a plain string, so the backend can be swapped to `pymupdf` or `pypdf` without changing callers.
- Trigger to revisit: if `unstructured` parsing quality is poor on real documents, or if native dependency (`poppler`) is a friction point.

### O-003: Migration layout

- Status: resolved for MVP
- Decision: inline SQL blocks in `PHASE1_MVP_PLAN.md` run manually via the Supabase SQL Editor. No `migrations/` directory for Phase 1.
- Trigger to revisit: when a second environment (staging, CI, another developer's machine) needs reproducible schema setup. At that point, extract SQL into numbered files under `migrations/` and optionally wire up the Supabase CLI.

