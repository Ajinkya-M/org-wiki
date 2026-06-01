# Phase 1 MVP — Backend Pipeline Plan
## Org Wiki RAG System

> ⏩ **Status:** This plan has **not been implemented yet**. A local prototype exists at `playground/app/index_docs.py` + `playground/app/ask.py` (JSON-based vector store, no Supabase). See `AI_CONTEXT/PROJECT_STATE.md` and `AI_CONTEXT/DECISIONS.md` for the current state. This document remains the target architecture for Phase 1.

**Goal:** A locally-runnable Python + FastAPI backend that accepts one or more PDF files, chunks and embeds them into Supabase pgvector, and exposes a query endpoint that retrieves relevant information with clearly cited sources.

**Stack:** Python 3.11+, FastAPI, sentence-transformers, Supabase (pgvector), OpenRouter (free LLM)
**Runtime:** Local (`uvicorn --reload`)
**Out of scope for Phase 1:** Auth, deployment, frontend, re-ranking, hybrid search

---

## Deliverables

| # | Deliverable | Done when… |
|---|---|---|
| 1 | Supabase project with pgvector schema | `match_knowledge_chunks()` function callable |
| 2 | `POST /ingest` endpoint | PDFs uploaded → chunks stored in Supabase |
| 3 | `POST /query` endpoint | Question in → answer + cited sources out |
| 4 | Utility endpoints | Health check, list docs, delete doc |
| 5 | End-to-end test | Upload a real PDF, query it, verify citations |

---

## Project Structure

```
org-wiki-backend/
├── .env                      # secrets (never commit)
├── .env.example              # template for .env
├── requirements.txt
├── main.py                   # FastAPI app, route registration
├── config.py                 # pydantic-settings config loader
├── db/
│   └── client.py             # Supabase client singleton
├── ingestion/
│   ├── loader.py             # PDF → raw text
│   ├── chunker.py            # token-aware text splitting
│   ├── embedder.py           # sentence-transformers wrapper
│   └── pipeline.py           # orchestrates: load → chunk → embed → store
├── retrieval/
│   ├── search.py             # pgvector similarity search
│   └── prompt.py             # prompt builder + OpenRouter call
└── routers/
    ├── ingest.py             # POST /ingest
    ├── query.py              # POST /query
    └── documents.py          # GET /documents, DELETE /documents/{doc_id}
```

---

## Step 1 — Python Environment

**Estimated time: 10 minutes**

```bash
# All commands run inside WSL2 (Ubuntu). No virtualenv — system Python only.

# Install native PDF dependency (required by unstructured[pdf])
sudo apt-get update && sudo apt-get install -y poppler-utils

# Install Python dependencies into system Python
pip install --break-system-packages \
  fastapi "uvicorn[standard]" \
  supabase \
  sentence-transformers \
  langchain langchain-community \
  "unstructured[pdf]" pdfminer.six \
  transformers \
  python-multipart \
  pydantic-settings \
  httpx \
  python-dotenv
```

Save to `requirements.txt`:

```bash
pip freeze > requirements.txt
```

---

## Step 2 — Supabase Setup (Fresh Project)

**Estimated time: 20 minutes**

### 2a. Create the project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to you (e.g., `eu-west-2` for London)
3. Save the **database password** — you will not see it again
4. Wait ~2 minutes for provisioning

### 2b. Get your credentials

In the Supabase dashboard → **Settings → API**:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL (e.g., `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | `service_role` key (under "Project API keys") |

> ⚠️ Use the **service_role** key for the backend (bypasses RLS). Never expose it in a frontend.

### 2c. Run schema migrations

Open the Supabase **SQL Editor** and run each block:

**Block 1 — Enable pgvector**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Block 2 — Main chunks table**
```sql
CREATE TABLE knowledge_chunks (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    embedding       VECTOR(384),
    doc_id          TEXT GENERATED ALWAYS AS (metadata->>'doc_id') STORED,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast ANN search
CREATE INDEX idx_knowledge_chunks_embedding
    ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 128);

-- Index on doc_id for fast delete-by-doc
CREATE INDEX idx_knowledge_chunks_doc_id ON knowledge_chunks (doc_id);

-- GIN index on metadata for fast filtering
CREATE INDEX idx_knowledge_chunks_metadata ON knowledge_chunks USING gin (metadata);
```

**Block 3 — Document registry (dedup / staleness)**
```sql
CREATE TABLE doc_registry (
    doc_id      TEXT PRIMARY KEY,
    source_hash TEXT NOT NULL,
    file_name   TEXT,
    chunk_count INT DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Block 4 — Similarity search function**
```sql
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding VECTOR(384),
    match_threshold FLOAT DEFAULT 0.4,
    match_count     INT   DEFAULT 10,
    filter_doc_id   TEXT  DEFAULT NULL
)
RETURNS TABLE (
    id         BIGINT,
    content    TEXT,
    metadata   JSONB,
    doc_id     TEXT,
    similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        id,
        content,
        metadata,
        doc_id,
        1 - (embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks
    WHERE
        1 - (embedding <=> query_embedding) > match_threshold
        AND (filter_doc_id IS NULL OR doc_id = filter_doc_id)
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

### 2d. Populate `.env`

```bash
# .env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...

OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free

EMBEDDING_MODEL=all-MiniLM-L6-v2
CHUNK_SIZE=500
CHUNK_OVERLAP=100
TOP_K=10
MATCH_THRESHOLD=0.4
```

---

## Step 3 — Core Modules

**Estimated time: 45 minutes**

### `config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    openrouter_api_key: str
    openrouter_model: str = "mistralai/mistral-7b-instruct:free"
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = 500
    chunk_overlap: int = 100
    top_k: int = 10
    match_threshold: float = 0.4

    class Config:
        env_file = ".env"

settings = Settings()
```

### `db/client.py`

```python
from supabase import create_client, Client
from config import settings

_client: Client | None = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client
```

### `ingestion/loader.py`

```python
from pathlib import Path
from unstructured.partition.pdf import partition_pdf

def load_pdf(file_path: str | Path) -> str:
    """Extract text from a PDF using unstructured."""
    elements = partition_pdf(filename=str(file_path))
    return "\n\n".join(str(el) for el in elements if str(el).strip())
```

### `ingestion/chunker.py`

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from transformers import AutoTokenizer
from config import settings

_tokenizer = AutoTokenizer.from_pretrained(f"sentence-transformers/{settings.embedding_model}")

def _token_len(text: str) -> int:
    return len(_tokenizer.encode(text, add_special_tokens=False))

splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap,
    separators=["\n\n", "\n", ".", " ", ""],
    length_function=_token_len,
)

def chunk_text(text: str) -> list[str]:
    return splitter.split_text(text)
```

### `ingestion/embedder.py`

```python
from sentence_transformers import SentenceTransformer
from config import settings

_model = SentenceTransformer(settings.embedding_model)

def embed(texts: list[str]) -> list[list[float]]:
    """Returns a list of 384-dim embedding vectors."""
    return _model.encode(texts, show_progress_bar=False).tolist()
```

### `ingestion/pipeline.py`

```python
import hashlib
from pathlib import Path
from db.client import get_client
from ingestion.loader import load_pdf
from ingestion.chunker import chunk_text
from ingestion.embedder import embed

def _file_hash(path: Path) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

def _make_chunk_id(doc_id: str, chunk_order: int, page: int | None = None) -> str:
    """
    Stable chunk identifier format: {doc_id}:p{page}:c{chunk_order}
    This is used for citation fidelity — do NOT use retrieval rank as a citation handle.
    See plan/architecture/rag-system-design.md §5 and DECISIONS.md D-005.
    """
    page_part = f"p{page:03d}" if page is not None else "p000"
    return f"{doc_id}:{page_part}:c{chunk_order:04d}"

def ingest_pdf(file_path: Path, doc_id: str | None = None, extra_metadata: dict = {}) -> dict:
    """
    Full ingestion pipeline for a single PDF:
      1. Resolve doc_id (explicit > namespaced stem fallback)
      2. Compute file hash — skip if unchanged
      3. Delete stale chunks
      4. Load → chunk → embed → store (with stable chunk_id per chunk)
    Returns a summary dict.
    """
    db = get_client()

    # doc_id resolution — prefer explicit caller-supplied ID over filename stem.
    # filename stem alone is collision-prone (see DECISIONS.md O-001).
    # For the MVP, bare stem is acceptable locally; supply an explicit ID in production.
    if doc_id is None:
        doc_id = file_path.stem

    current_hash = _file_hash(file_path)

    # --- Staleness check ---
    registry = db.table("doc_registry") \
        .select("source_hash") \
        .eq("doc_id", doc_id) \
        .maybe_single() \
        .execute()

    if registry.data and registry.data["source_hash"] == current_hash:
        return {"doc_id": doc_id, "status": "skipped", "reason": "unchanged"}

    # --- Delete old chunks ---
    db.table("knowledge_chunks").delete().eq("doc_id", doc_id).execute()

    # --- Load and chunk ---
    raw_text = load_pdf(file_path)
    chunks = chunk_text(raw_text)

    # --- Embed ---
    vectors = embed(chunks)

    # --- Store (chunk_order and chunk_id are stable identifiers, not retrieval rank) ---
    rows = [
        {
            "content": chunk,
            "embedding": vector,
            "metadata": {
                "doc_id": doc_id,
                "source": file_path.name,
                "source_hash": current_hash,
                "chunk_order": chunk_order,
                "chunk_id": _make_chunk_id(doc_id, chunk_order),
                **extra_metadata,
            },
        }
        for chunk_order, (chunk, vector) in enumerate(zip(chunks, vectors), start=1)
    ]
    db.table("knowledge_chunks").insert(rows).execute()

    # --- Update registry ---
    db.table("doc_registry").upsert({
        "doc_id": doc_id,
        "source_hash": current_hash,
        "file_name": file_path.name,
        "chunk_count": len(rows),
    }).execute()

    return {
        "doc_id": doc_id,
        "file_name": file_path.name,
        "chunks_indexed": len(rows),
        "status": "indexed",
    }
```

### `retrieval/search.py`

```python
from db.client import get_client
from ingestion.embedder import embed
from config import settings

def similarity_search(question: str, top_k: int | None = None, doc_id: str | None = None) -> list[dict]:
    """
    Embed the question and retrieve top-K chunks from pgvector.
    Returns list of { content, metadata, doc_id, similarity }.
    """
    db = get_client()
    k = top_k or settings.top_k

    question_vector = embed([question])[0]

    result = db.rpc("match_knowledge_chunks", {
        "query_embedding": question_vector,
        "match_threshold": settings.match_threshold,
        "match_count": k,
        "filter_doc_id": doc_id,
    }).execute()

    return result.data or []
```

### `retrieval/prompt.py`

```python
import httpx
from config import settings

def build_prompt(question: str, chunks: list[dict]) -> str:
    # Use stable chunk_id in citations, NOT retrieval rank (rank changes query to query).
    context_blocks = "\n\n".join(
        f"[Source: {c['metadata'].get('source', 'unknown')} | chunk_id: {c['metadata'].get('chunk_id', 'unknown')}]\n{c['content']}"
        for c in chunks
    )
    return f"""You are a knowledge assistant for the organisation.
Answer the user's question based ONLY on the context provided below.
If the context does not contain enough information, say "I don't have enough information in the available documents."
Always cite the source file name and chunk number from the context.

CONTEXT:
{context_blocks}

---

QUESTION: {question}

ANSWER:"""

def generate_answer(prompt: str) -> str:
    response = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.openrouter_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        },
        timeout=60.0,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]
```

---

## Step 4 — API Routers

**Estimated time: 30 minutes**

### `routers/ingest.py`

```python
import shutil, tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form
from typing import Annotated
from ingestion.pipeline import ingest_pdf

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

@router.post("")
async def ingest_files(
    files: list[UploadFile] = File(...),
    doc_id: Annotated[str | None, Form()] = None,
):
    """
    Accept one or more PDF files and index them into Supabase pgvector.

    doc_id (optional): stable logical identifier for the document.
      - If ingesting a single file you can supply an explicit doc_id (e.g. "hr/handbook-2024").
      - If omitted, defaults to the filename stem (acceptable for local MVP but collision-prone
        across different folders or renamed files — see DECISIONS.md O-001).
      - When ingesting multiple files, doc_id is ignored and filename stem is used per file.

    Returns a result summary per file.
    """
    results = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for i, upload in enumerate(files):
            if not upload.filename.endswith(".pdf"):
                results.append({"file": upload.filename, "status": "skipped", "reason": "not a PDF"})
                continue

            dest = Path(tmpdir) / upload.filename
            with open(dest, "wb") as f:
                shutil.copyfileobj(upload.file, f)

            # Use explicit doc_id only when ingesting a single file
            effective_doc_id = doc_id if (doc_id and len(files) == 1) else None

            try:
                result = ingest_pdf(dest, doc_id=effective_doc_id)
                results.append(result)
            except Exception as e:
                results.append({"file": upload.filename, "status": "error", "error": str(e)})

    return {"results": results}
```

### `routers/query.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from retrieval.search import similarity_search
from retrieval.prompt import build_prompt, generate_answer

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    question: str
    top_k: int = 10
    doc_id: str | None = None          # optional: restrict search to one document
    llm: bool = True                   # set False to return raw chunks only (debug mode)

class Source(BaseModel):
    source: str           # original filename (e.g. "hr-handbook-2024.pdf")
    doc_id: str           # logical document identifier
    chunk_id: str         # stable chunk identifier: {doc_id}:p{page}:c{order}
    chunk_order: int      # position within the document (1-based)
    similarity: float
    excerpt: str          # first 200 chars of the chunk

class QueryResponse(BaseModel):
    question: str
    answer: str | None
    sources: list[Source]

@router.post("", response_model=QueryResponse)
def query(req: QueryRequest):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    chunks = similarity_search(req.question, top_k=req.top_k, doc_id=req.doc_id)

    if not chunks:
        return QueryResponse(
            question=req.question,
            answer="No relevant documents found. Please ingest some PDFs first.",
            sources=[],
        )

    # Citations are built from stored metadata, NOT retrieval rank.
    # chunk_id and chunk_order are stable across queries; retrieval rank (i+1) is not.
    sources = [
        Source(
            source=c["metadata"].get("source", "unknown"),
            doc_id=c["metadata"].get("doc_id", "unknown"),
            chunk_id=c["metadata"].get("chunk_id", "unknown"),
            chunk_order=c["metadata"].get("chunk_order", 0),
            similarity=round(c["similarity"], 4),
            excerpt=c["content"][:200],
        )
        for c in chunks
    ]

    answer = None
    if req.llm:
        prompt = build_prompt(req.question, chunks)
        answer = generate_answer(prompt)

    return QueryResponse(question=req.question, answer=answer, sources=sources)
```

### `routers/documents.py`

```python
from fastapi import APIRouter, HTTPException
from db.client import get_client

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("")
def list_documents():
    """List all indexed documents from the registry."""
    db = get_client()
    result = db.table("doc_registry").select("*").order("updated_at", desc=True).execute()
    return {"documents": result.data}

@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    """Delete all chunks and registry entry for a given doc_id."""
    db = get_client()
    db.table("knowledge_chunks").delete().eq("doc_id", doc_id).execute()
    db.table("doc_registry").delete().eq("doc_id", doc_id).execute()
    return {"doc_id": doc_id, "status": "deleted"}
```

---

## Step 5 — Main App Entry Point

**Estimated time: 5 minutes**

### `main.py`

```python
from fastapi import FastAPI
from db.client import get_client
from routers import ingest, query, documents

app = FastAPI(
    title="Org Wiki RAG API",
    description="PDF ingestion and semantic search over organisational knowledge.",
    version="0.1.0",
)

app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(documents.router)

@app.get("/health", tags=["Health"])
def health():
    """Check API and Supabase connectivity."""
    try:
        db = get_client()
        db.table("doc_registry").select("doc_id").limit(1).execute()
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
```

---

## Step 6 — Local Development Workflow

**Estimated time: 5 minutes to set up**

```bash
# Start the API server (hot reload)
uvicorn main:app --reload --port 8000
```

Interactive API docs available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## Step 7 — End-to-End Test

**Estimated time: 15 minutes**

Work through these steps in order to validate the full pipeline.

### 7a. Health check
```bash
curl http://localhost:8000/health
# Expected: {"status": "ok", "supabase": "connected"}
```

### 7b. Ingest a PDF (with explicit doc_id)
```bash
# Supply an explicit doc_id to avoid filename-stem collisions
curl -X POST http://localhost:8000/ingest \
  -F "files=@/path/to/hr-handbook.pdf" \
  -F "doc_id=hr/handbook-2024"

# Expected:
# {
#   "results": [{
#     "doc_id": "hr/handbook-2024",
#     "file_name": "hr-handbook.pdf",
#     "chunks_indexed": 42,
#     "status": "indexed"
#   }]
# }

# Without doc_id — falls back to filename stem (fine for local MVP)
curl -X POST http://localhost:8000/ingest \
  -F "files=@/path/to/your-document.pdf"
```

### 7c. Ingest multiple PDFs at once
```bash
# doc_id is ignored for multi-file uploads; filename stem is used per file
curl -X POST http://localhost:8000/ingest \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.pdf" \
  -F "files=@doc3.pdf"
```

### 7d. List indexed documents
```bash
curl http://localhost:8000/documents
```

### 7e. Query without LLM (retrieval only — fast debug)
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the deployment process?", "llm": false}'

# Expected: answer=null, sources=[...chunks with similarity scores...]
```

### 7f. Full query with LLM answer + citations
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the deployment process?", "top_k": 5}'

# Expected:
# {
#   "question": "What is the deployment process?",
#   "answer": "According to [Source: your-document.pdf | chunk_id: your-document:p000:c0003], the deployment process...",
#   "sources": [
#     {
#       "source": "your-document.pdf",
#       "doc_id": "your-document",
#       "chunk_id": "your-document:p000:c0003",
#       "chunk_order": 3,
#       "similarity": 0.87,
#       "excerpt": "..."
#     },
#     ...
#   ]
# }
```

### 7g. Query scoped to a single document
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the leave policy?", "doc_id": "hr-handbook-2024"}'
```

### 7h. Delete a document
```bash
curl -X DELETE http://localhost:8000/documents/your-document
```

### 7i. Re-ingest (idempotency check)
```bash
# Ingest the same file again — should return status: "skipped"
curl -X POST http://localhost:8000/ingest \
  -F "files=@/path/to/your-document.pdf"
# Expected: {"status": "skipped", "reason": "unchanged"}
```

---

## Acceptance Criteria

Phase 1 is complete when all of the following pass:

- [ ] `/health` returns `{"status": "ok", "supabase": "connected"}`
- [ ] `/ingest` successfully chunks and stores a real PDF with correct chunk count in `doc_registry`
- [ ] `/ingest` on the same file returns `"status": "skipped"` (no duplicate chunks)
- [ ] `/query` with `"llm": false` returns at least 3 chunks with similarity > 0.4
- [ ] `/query` with `"llm": true` returns a coherent answer that cites the source filename
- [ ] `/documents` lists all ingested docs with correct `chunk_count`
- [ ] `DELETE /documents/{doc_id}` removes all chunks (verify via Supabase SQL Editor)
- [ ] Re-ingest after deletion re-indexes correctly

---

## Known Constraints & Notes

| Item | Detail |
|---|---|
| **First startup** | `sentence-transformers` downloads ~80MB model on first run. Subsequent starts use the local cache. |
| **`unstructured` PDF parsing** | Requires `poppler` on the system for some PDF types. Install via `brew install poppler` (macOS) or `apt install poppler-utils` (Linux). |
| **OpenRouter free tier** | ~20 req/min. Use `"llm": false` during heavy retrieval testing to avoid rate limits. |
| **Supabase free tier** | 500MB storage, 2GB bandwidth/month. Sufficient for an MVP with hundreds of docs. |
| **HNSW index** | Only kicks in above ~1000 rows. Below that pgvector falls back to a sequential scan — still correct, just not using the index. |

---

## Phase 2 Preview (out of scope now)

Once Phase 1 is validated, natural next steps are:

- **Auth layer** — JWT validation + Supabase RLS for department-scoped access
- **Embedding Service** — Extract embedder into a separate FastAPI service for Vercel-compatible deployment
- **Frontend** — Next.js chat UI connecting to this API
- **Hybrid search** — Combine pgvector with BM25 for exact-match recall
- **Re-ranking** — Cross-encoder (bge-reranker) for precision after top-50 retrieval
