# Design And Plan Analysis

Last updated: 2026-05-28 Europe/London

## Executive Read

The repository currently contains a strong architectural direction and a practical MVP implementation plan. The documents align on the core stack and the overall data flow, but they also reveal a few important scope seams that should be made explicit before several agents begin coding in parallel.

## What Is Strong

### 1. The architecture is coherent end to end

The design document covers the full lifecycle well:

- ingest raw organisational documents
- chunk them with overlap
- embed them into a shared vector space
- retrieve via pgvector
- generate grounded answers with citations

That makes it easy for multiple agents to reason about where their component fits.

### 2. The plan is implementation-oriented

The Phase 1 plan is not just conceptual. It already defines:

- folder structure
- key modules
- endpoint list
- schema
- environment variables
- acceptance criteria

This is enough to begin scaffolding without inventing the architecture from scratch.

### 3. The documents already anticipate non-trivial production issues

The design goes beyond a toy RAG example by covering:

- chunking pitfalls
- access control
- stale-document replacement
- context-window budgeting
- rate-limit bottlenecks
- deployment tradeoffs

That reduces the risk of agents building something naive that later has to be reworked.

## Gaps And Tensions

### 1. There is a deliberate but important scope split between design and Phase 1

The design document describes a broader target system, including:

- auth and RLS
- a dedicated embedding service
- deployment split across Vercel and separate hosting

The Phase 1 plan intentionally excludes those. That is reasonable, but it creates a coordination risk: one agent may start implementing production concerns while another stays inside the MVP scope.

Recommendation:

- treat `PHASE1_MVP_PLAN.md` as the execution authority for the next coding phase
- treat `RAG_SYSTEM_DESIGN.md` as the longer-term north star

### 2. The repository has no code yet, so the plan is unvalidated

The proposed structure is sensible, but several assumptions remain theoretical:

- library interoperability
- PDF parsing quality across varied files
- Supabase RPC payload format for vectors
- OpenRouter response stability

Recommendation:

- scaffold thin vertical slices early
- prove ingestion and retrieval with one real document before optimizing structure

### 3. Citation fidelity needs a more explicit rule

The plan returns citations based on retrieval rank (`chunk_index = i + 1`) rather than a persistent chunk identifier or page reference. That is acceptable for debugging but weak for real source traceability.

Risk:

- the same chunk can appear with a different index on a different query
- citations may be hard for users or later agents to reconcile

Recommendation:

- add stable chunk metadata such as `chunk_id`, `chunk_order`, and `page`
- keep response citations tied to stored metadata, not retrieval position alone

### 4. `doc_id = file_path.stem` is simple but collision-prone

This will break if:

- two files in different folders share a name
- a file is renamed but should still map to the same logical document

Recommendation:

- define a stable document identity rule early
- at minimum, record both a logical `doc_id` and the uploaded filename

### 5. The ingestion toolchain may be heavier than the MVP needs

`unstructured[pdf]` is flexible but can be operationally awkward because of extra native dependencies and parsing variability.

Recommendation:

- keep the loader behind a narrow interface
- be prepared to swap in `pymupdf` or `pypdf` if the first implementation is too brittle

### 6. Operational safety is under-specified

The documents do not yet define:

- structured logging
- retry/backoff policy around OpenRouter
- failure behavior for partial ingestion
- migration/versioning layout inside the repo

Recommendation:

- add lightweight conventions as code scaffolding begins
- do not wait until after implementation to define these

## Suggested Parallel Work Breakdown

To reduce agent collisions, the repository can be split into these workstreams:

1. Project scaffolding and dependency setup
2. Supabase schema and migration assets
3. Ingestion pipeline
4. Retrieval and prompt generation
5. API router wiring
6. Tests, fixtures, and developer workflow
7. Documentation and coordination maintenance

Each stream should be claimed in `TASK_BOARD.md` before edits begin.

## Recommended Immediate Decisions

These decisions should stay stable unless intentionally changed:

1. Phase 1 is the authoritative implementation scope.
2. FastAPI is the initial runtime boundary for local development.
3. Embedding dimension remains `384` unless schema and docs are revised together.
4. Agents must update shared context docs as part of normal work, not as an afterthought.

## Bottom Line

The repository is ready for implementation work, but not yet ready for uncoordinated parallel agent execution. The new `AI_CONTEXT/` layer and root collaboration contract close that gap by turning the planning docs into an operational workflow.

