# Supabase pgvector Playground Integration Plan

## Goal

Upgrade the existing playground indexing flow so it can store document chunks and embeddings in Supabase pgvector instead of only writing local JSON files.

This plan is intentionally scoped to the current playground workflow:

- keep `playground/app/index_docs.py` as the main entry point
- reuse the current PDF extraction, chunking, and embedding logic
- add a Supabase-backed storage mode
- avoid jumping straight to the full FastAPI Phase 1 backend

## Current Baseline

The repository already has:

- `playground/app/index_docs.py`
  - extracts PDF text with `PyMuPDF`
  - chunks text with a character budget
  - generates embeddings with `all-MiniLM-L6-v2`
  - writes `.json` files under `playground/data/embeddings/<org>/`
- `migrations/001_initial_schema.sql`
  - `knowledge_chunks` table with `VECTOR(384)`
  - `doc_registry` table
  - `match_knowledge_chunks()` RPC
- `playground/tests/test_supabase.py`
  - verifies Supabase connectivity and schema availability

## Feature Target

Add a new indexing path that:

1. reads one or more PDFs
2. extracts and chunks text
3. generates embeddings
4. writes rows into `knowledge_chunks`
5. updates `doc_registry`
6. supports idempotent re-indexing by replacing prior chunks for the same document

## Non-Goals

This change should not:

- implement the FastAPI backend yet
- add LLM answer generation
- add auth or RLS
- add deployment automation
- replace the existing JSON mode unless explicitly requested

## Recommended Implementation Shape

### Option A: Dual-mode playground script

Recommended first step.

Enhance `playground/app/index_docs.py` to support:

- `--store local`
- `--store supabase`
- `--store both`

Why this is the best next step:

- preserves the current working local prototype
- allows side-by-side validation between JSON and Supabase outputs
- reduces risk while the database path is still being proven

### Option B: Separate Supabase script

Alternative if code clarity is preferred over one-script convenience.

Example:

- `playground/app/index_docs.py` stays local-only
- `playground/index_docs_supabase.py` handles DB insertion

This is acceptable, but Option A is better if the goal is gradual evolution from the current prototype.

## Data Model Mapping

Each chunk inserted into `knowledge_chunks` should include:

- `content`
  - the chunk text
- `embedding`
  - 384-dim embedding vector
- `metadata`
  - JSON object with at least:
    - `doc_id`
    - `source`
    - `organisation`
    - `chunk_id`
    - `chunk_order`
    - `source_hash`

Each indexed document should upsert one row in `doc_registry` with:

- `doc_id`
- `source_hash`
- `file_name`
- `chunk_count`

## Stable Identity Rules

### Document ID

Do not rely only on filename stem as the long-term document identity, but for this playground phase it is acceptable as a fallback if it is namespaced.

Recommended playground rule:

```text
doc_id = "{org_name}/{pdf_stem_slug}"
```

Example:

```text
example_org/employee_handbook
```

This avoids collisions across organisations while staying simple.

### Chunk ID

Generate a stable chunk ID per chunk:

```text
{doc_id}:c{chunk_order:04d}
```

Example:

```text
example_org/employee_handbook:c0007
```

## Idempotency Strategy

Before inserting new rows for a document:

1. compute `source_hash` from file bytes
2. check `doc_registry` for the same `doc_id`
3. if `source_hash` is unchanged, skip indexing
4. if changed, delete old `knowledge_chunks` rows for `doc_id`
5. insert new chunks
6. upsert the `doc_registry` row

This keeps re-indexing safe and avoids duplicate chunks.

## Step-by-Step Implementation Plan

### Step 1: Refactor `index_docs.py` into clearer units

Create or extract helper functions for:

- collecting PDFs
- generating `doc_id`
- hashing file contents
- processing one PDF into `{text, chunks, embeddings, metadata}`
- saving local JSON
- inserting chunks into Supabase
- upserting the registry row

Expected outcome:

- easier testing
- easier dual local/Supabase support

### Step 2: Add Supabase config loading

Use `.env` at the project root and read:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Reuse the pattern already proven in `playground/tests/test_supabase.py`.

Expected outcome:

- the playground script can initialize a Supabase client when DB-backed storage is requested

### Step 3: Add storage mode CLI

Add CLI flags such as:

- `--store local`
- `--store supabase`
- `--store both`

Default recommendation:

- keep `local` as default at first to preserve current behavior

Expected outcome:

- current users are not broken
- Supabase mode is opt-in until validated

### Step 4: Implement document hashing and registry checks

Add:

- `get_source_hash(pdf_path) -> str`
- `get_existing_registry_row(doc_id)`
- skip logic for unchanged docs

Expected outcome:

- reruns do not create duplicate rows

### Step 5: Implement chunk insertion into `knowledge_chunks`

Insert one row per chunk with:

- `content`
- `embedding`
- `metadata`

Metadata should include:

- `doc_id`
- `source`
- `organisation`
- `chunk_id`
- `chunk_order`
- `source_hash`

Expected outcome:

- the same semantic data currently written to JSON is now queryable via pgvector

### Step 6: Implement stale-row deletion for changed documents

Before inserting a changed document:

- delete all `knowledge_chunks` rows where `doc_id = <current doc_id>`

Expected outcome:

- Supabase stays consistent after document updates

### Step 7: Upsert `doc_registry`

After successful insertion:

- upsert `doc_id`
- `source_hash`
- `file_name`
- `chunk_count`

Expected outcome:

- registry becomes the authoritative index state for each document

### Step 8: Improve console output

For each processed document, print:

- source filename
- `doc_id`
- chunk count
- embedding dimension
- storage target used
- inserted vs skipped status

Expected outcome:

- easier operator confidence during local runs

### Step 9: Add a verification script or verification mode

Either:

- extend `playground/tests/test_supabase.py`

or:

- add a lightweight query check after insert

Suggested checks:

- count inserted `knowledge_chunks` rows for a `doc_id`
- confirm `doc_registry` row exists
- optionally call `match_knowledge_chunks()` with one inserted vector

Expected outcome:

- faster confidence that write path is working end to end

## Suggested CLI Shape

Example commands:

```bash
python3 playground/app/index_docs.py docs/handbook.pdf --org example_org --store local
python3 playground/app/index_docs.py docs/handbook.pdf --org example_org --store supabase
python3 playground/app/index_docs.py docs/ --org example_org --store both
```

Optional future flags:

- `--doc-id <value>`
- `--skip-unchanged`
- `--replace-existing`
- `--dry-run`

## Validation Checklist

The feature is complete when all of these are true:

- `--store local` still works exactly as before
- `--store supabase` initializes the client using `.env`
- unchanged documents are skipped cleanly
- changed documents replace prior chunks for the same `doc_id`
- `doc_registry` reflects the latest `source_hash` and `chunk_count`
- inserted rows are retrievable through Supabase
- no secrets are hard-coded

## Risks

### 1. Vector payload formatting

The Supabase Python client must send embeddings in a format accepted by the `VECTOR(384)` column. This should be validated early with a single-document insert.

### 2. Large insert payloads

Very large PDFs may produce many chunks, which can make one giant insert inefficient.

Mitigation:

- start with one-document validation
- batch inserts later if needed

### 3. Divergence between local and DB paths

If the script supports multiple storage modes, shared preprocessing must stay centralized.

Mitigation:

- keep extraction, chunking, embedding, and metadata generation in shared helpers

## Recommended Order For Claude Code

1. Refactor `playground/app/index_docs.py` into reusable helpers without changing behavior.
2. Add `.env` loading and Supabase client initialization.
3. Add `--store` CLI with `local` as default.
4. Implement `doc_id`, `chunk_id`, and `source_hash`.
5. Add Supabase insert + registry upsert for one document.
6. Add skip/replacement logic.
7. Verify with `playground/tests/test_supabase.py` and one real PDF.
8. Only after that, consider adding DB-backed retrieval.

## Handoff Note

Once this feature works, the natural next step is:

- either teach `playground/app/ask.py` to query Supabase via `match_knowledge_chunks()`
- or begin the proper Phase 1 FastAPI ingestion/retrieval modules

