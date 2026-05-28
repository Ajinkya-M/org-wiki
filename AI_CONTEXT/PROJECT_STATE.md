# Project State

Last updated: 2026-05-28 Europe/London

## Repository Status

- Git repository initialized on 2026-05-28.
- Current repository contents are planning documents only; no application code has been scaffolded yet.
- Existing hidden local config directory `.claude/` appears to be workstation-specific and is ignored via `.gitignore`.

## Project Goal

Build an organisational knowledge-base RAG system with:

- PDF ingestion
- token-aware chunking
- sentence-transformer embeddings
- Supabase pgvector retrieval
- FastAPI query API
- OpenRouter-backed answer generation with citations

## Current Phase

Phase 1 is still at the planning stage.

Planned Phase 1 outcome:

- a local Python + FastAPI backend
- ingestion endpoints for one or more PDFs
- retrieval and answer generation endpoints
- document registry and delete/list endpoints
- end-to-end validation against a real PDF

## Scope Boundaries

Phase 1 includes:

- local runtime only
- backend-only implementation
- ingestion, retrieval, answer generation
- Supabase schema and retrieval function

Phase 1 excludes:

- frontend
- auth and RLS enforcement
- production deployment
- re-ranking
- hybrid search

## Immediate Priorities

1. Scaffold the backend repository structure described in `PHASE1_MVP_PLAN.md`.
2. Add environment/config management and Supabase connectivity.
3. Implement ingestion pipeline with idempotent document re-ingestion.
4. Implement retrieval flow with source-aware answer generation.
5. Add smoke tests and end-to-end validation.

## Development Environment

- **Host OS:** Windows with WSL2
- **WSL distro:** Ubuntu
- **Shell:** bash
- **Project root (Windows):** `D:\Ajinkya\workspace\AI\org-wiki`
- **Project root (WSL2):** `/mnt/d/Ajinkya/workspace/AI/org-wiki`
- All commands and scripts must target the WSL2/Ubuntu environment. Linux paths only. No PowerShell or CMD.
- All new directories and files are created relative to the project root. Agents must never use `~/` or absolute paths outside the project root unless explicitly instructed.
- Native dependency for PDF parsing: `sudo apt-get install -y poppler-utils`
- Python toolchain: `python3`, `pip3`. No virtualenv — install directly into system Python with `pip install --break-system-packages <package>`.

## Constraints

- OpenRouter free-tier rate limits can affect testing and concurrent usage.
- `sentence-transformers` will download model weights on first run (~80MB for `all-MiniLM-L6-v2`).
- `unstructured[pdf]` requires `poppler-utils` — install via `sudo apt-get install -y poppler-utils` in WSL2.
- The current plan assumes embedding dimension `384`; any model change must be reflected in schema and docs together.

## Coordination Notes

- `AI_CONTEXT/` is the current source of truth for agent coordination.
- Agents should claim work before editing and log results afterward.
- Any deviation from the documented architecture must be recorded in `DECISIONS.md`.

