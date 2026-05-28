# Project State

Last updated: 2026-05-28 Europe/London

## Repository Status

- Git repository initialized on 2026-05-28.
- Existing hidden local config directory `.claude/` is workstation-specific and ignored via `.gitignore`.
- **Planning documents + working prototype in `playground/`.** No Phase 1 backend scaffolded yet.

## Project Goal

Build an organisational knowledge-base RAG system with:

- PDF ingestion and embedding
- retrieval (semantic search)
- LLM-backed answer generation with source citations

Two implementation tracks exist:

| Track | Description | Status |
|---|---|---|
| **Local (prototype)** | JSON-based vector store, org-scoped directories, standalone Python scripts | 🟢 Working |
| **Phase 1 (target)** | FastAPI + Supabase pgvector + OpenRouter (per `PHASE1_MVP_PLAN.md`) | 🔴 Not started |

## Current Phase

The system has a **working local prototype** (session 3 codex). Phase 1 (Supabase-backed) remains planned but unimplemented.

### What Exists

- `playground/index_docs.py` — scans PDFs, extracts text with PyMuPDF, chunks (~992 chars), embeds with `all-MiniLM-L6-v2`, saves one `.json` per PDF to `playground/embeddings/<org>/`.
- `playground/ask.py` — loads all `.json` embedding files for a given `--org`, encodes the user's question, returns top-K chunks ranked by cosine similarity.
- **Org-scoped storage:** embeddings sit under `playground/embeddings/<org>/` — each org directory is isolated.
- Playground verification was previously done with a local sample PDF, but sample source documents and generated embeddings should not be committed to the repository.

### What's Next

- Glue the retrieval output (`ask.py` top-K chunks) to a local or free LLM to generate natural-language answers (classic RAG).
- Then decide whether to proceed to Phase 1 (Supabase pgvector + FastAPI).

## Scope Boundaries

### In scope (playground)

- local CPU-only operation
- PyMuPDF for text extraction (no `poppler` / `unstructured` needed)
- character-budget chunking (no tokenizer dependency)
- cosine similarity on in-memory numpy arrays
- `--org` scoping for multi-org support

### In scope (Phase 1 — planned)

- local runtime only
- backend-only implementation
- ingestion, retrieval, answer generation
- Supabase schema and retrieval function

### Excluded (both tracks)

- frontend
- auth and RLS enforcement
- production deployment
- re-ranking
- hybrid search

## Immediate Priorities

1. *(optional)* Build LLM glue script to complete the RAG loop in playground.
2. Proceed to Phase 1 (FastAPI + Supabase) if infra requirements are needed.

## Development Environment

- **Host OS:** Windows with WSL2
- **WSL distro:** Ubuntu
- **Shell:** bash
- **Project root (Windows):** `D:\Ajinkya\workspace\AI\org-wiki`
- **Project root (WSL2):** `/mnt/d/Ajinkya/workspace/AI/org-wiki`
- All commands and scripts must target the WSL2/Ubuntu environment. Linux paths only. No PowerShell or CMD.
- All new directories and files are created relative to the project root. Agents must never use `~/` or absolute paths outside the project root unless explicitly instructed.
- Native dependency for `unstructured[pdf]` (only needed for Phase 1): `sudo apt-get install -y poppler-utils`
- Python toolchain: `python3`, `pip3`. No virtualenv — install directly into system Python with `pip install --break-system-packages <package>`.

## Dependencies (installed)

| Package | Used by | Notes |
|---|---|---|
| `PyMuPDF` (fitz) | `index_docs.py` | Text extraction — no native deps needed |
| `sentence-transformers` | Both scripts | Embedding model `all-MiniLM-L6-v2` (384-dim) |
| `numpy` | `ask.py` | Cosine similarity computation |
| `scikit-learn` | (imported but unused) | Pre-installed, not called |

No `poppler-utils`, `unstructured`, `langchain`, `supabase`, or `httpx` needed for the local prototype.

## Constraints

- The local prototype loads all embeddings into RAM. 104 chunks × 384 floats × 4 bytes ≈ 160 KB per doc — negligible for now, but watch for large-scale usage.
- `sentence-transformers` downloads model weights (~80MB) on first run; cached at `~/.cache/huggingface/` afterwards.
- The prototype uses character-budget chunking (~992 chars ≈ 256 tokens) to avoid tokenizer dependency. This is sufficient for `all-MiniLM-L6-v2` (max 256 tokens).
- No LLM is called during retrieval — the user/developer reads the returned chunks. An LLM glue step needs to be built to get natural-language answers.

## Key Deviations from RAG_SYSTEM_DESIGN.md

| Aspect | Design doc says | What we built | Reason |
|---|---|---|---|
| Vector store | Supabase pgvector | JSON files in `playground/embeddings/<org>/` | Zero infra, instant setup |
| PDF parser | `unstructured[pdf]` | `PyMuPDF` | No native deps needed (`poppler`) |
| Chunking | `RecursiveCharacterTextSplitter` with tokenizer | Character-budget (~992 chars) | Avoids tokenizer import overhead |
| Answer gen | OpenRouter LLM in `retrieval/prompt.py` | Not yet implemented | Pending user direction |
| API layer | FastAPI + `uvicorn` | CLI scripts (`index_docs.py`, `ask.py`) | Faster iteration, no server |

## Coordination Notes

- `AI_CONTEXT/` is the current source of truth for agent coordination.
- Agents should claim work before editing and log results afterward.
- Any deviation from the documented architecture must be recorded in `DECISIONS.md`.
- The playground prototype is a **parallel track** — it does not replace Phase 1, but it validates the core RAG concept locally.
