# Decisions

Last updated: 2026-05-28 Europe/London

## Implementation Paths

The project now has two parallel tracks. This section records the decisions taken for each.

### D-006: JSON-based vector store for local prototype

- Status: accepted (prototype only)
- Rationale: zero infrastructure, instant setup, portable. Embeddings JSON files are loaded into memory and searched via numpy cosine similarity.
- Limitation: does not scale beyond what fits in RAM. For hundreds of documents with thousands of chunks, this will become slow. The Supabase pgvector path (Phase 1) is still the target for production.
- Consequence: the prototype is purely local. No Supabase, no API server, no network calls.

### D-007: PyMuPDF instead of unstructured[pdf] for prototype

- Status: accepted
- Rationale: PyMuPDF has zero native dependencies — no `poppler-utils`, no `libreoffice`, no Java. Works instantly after `pip install`. Text extraction quality is sufficient for the handbook PDF tested.
- Trigger to revisit: if scanned PDFs (image-only) need to be processed, `unstructured[pdf]` or OCR would be required.

### D-008: Character-budget chunking instead of tokenizer-based

- Status: accepted
- Rationale: calling `AutoTokenizer.encode()` on every paragraph adds meaningful overhead. Character-budget (~992 chars ≈ 256 tokens for English) is a simple approximation that stays safely within the model's 256-token max sequence length without any tokenizer calls.
- Risk: short sentences + non-English text may have different chars/token ratios. If retrieval quality degrades, switch to tokenizer-based splitting.
- Consequence: the chunker does not import `transformers` or `langchain` — fewer dependencies, faster startup.

### D-009: Org-scoped subdirectories for embeddings

- Status: accepted
- Rationale: `playground/embeddings/<org>/` keeps each organisation's data fully isolated. The `--org` flag on both `index_docs.py` and `ask.py` enforces this at the CLI level. No cross-contamination between orgs.
- Consequence: queries must specify `--org`; there is no cross-org search. This matches the production requirement (department scoping in RAG_SYSTEM_DESIGN.md §5).

### D-010: No LLM in the prototype retrieval step

- Status: accepted
- Rationale: the prototype returns raw chunks ranked by similarity. The user reads them directly. This is intentional — it validates retrieval quality before adding LLM hallucination risk.
- Next step: an LLM glue script can be added to consume the top-K chunks and produce a natural-language answer.

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

### D-011: Playground Supabase integration via --store flag

- Status: accepted
- Rationale: adding `--store local|supabase|both` to the existing `index_docs.py` preserves the working local prototype while allowing opt-in DB storage. This de-risks the Phase 1 migration path by validating the insert/upsert/idempotency logic in the familiar playground environment first.
- Consequence: the playground script now has two storage paths sharing the same extraction, chunking, and embedding code. Keeping them in one file avoids drift between parallel implementations.
- Tradeoff: the script is now more complex (conditional DB logic), but the CLI flag keeps the default path (`--store local`) identical to the previous behavior.

### D-012: doc_id namespacing format

- Status: accepted
- Rationale: `{org_name}/{pdf_stem_slug}` prevents cross-org collisions while staying simple. This is a playground-level improvement over the bare filename stem that `index_docs.py` previously used for the JSON output filename. The Supabase `doc_id` column is `TEXT` so the format has no DB constraints.
- Consequence: the local JSON file name is still just `{pdf_stem}.json` (unchanged). The namespaced `doc_id` only affects the DB path.

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

- Status: resolved
- Decision: `migrations/001_initial_schema.sql` created with all 4 SQL blocks from `PHASE1_MVP_PLAN.md`. Schema applied to Supabase project `org-wiki` via SQL Editor. Connection verified via both Python client and Supabase MCP.
- The original decision noted `migrations/` as a "trigger to revisit" item for multi-environment setups; the file was created proactively for reproducibility.

