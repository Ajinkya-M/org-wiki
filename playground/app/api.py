"""
FastAPI playground service for:
1) ingesting a PDF into Supabase pgvector
2) answering questions with pgvector retrieval + OpenRouter LLM

Run:
    uvicorn playground.app.api:app --reload
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from playground.app.index_docs import get_supabase_client, load_dotenv_if_present, process_pdf
from playground.app.openrouter_client import (
    chat_completion,
    get_api_key,
    get_default_model,
    load_env,
    pick_free_model,
)


MODEL_NAME = "all-MiniLM-L6-v2"
DEFAULT_ORG = "default_org"

app = FastAPI(title="Org Wiki Playground API", version="0.1.0")

_model: SentenceTransformer | None = None
_supabase = None


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    org: str = DEFAULT_ORG
    top_k: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.2, ge=0.0, le=1.0)


def normalize_org(org: str | None) -> str:
    if not org:
        return DEFAULT_ORG
    return org.strip().lower().replace(" ", "_")


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def get_supabase():
    global _supabase
    if _supabase is None:
        load_dotenv_if_present()
        _supabase = get_supabase_client()
        if _supabase is None:
            raise HTTPException(status_code=500, detail="Supabase credentials are missing.")
    return _supabase


def build_prompt(question: str, chunks: list[dict]) -> str:
    context = []
    for chunk in chunks:
        metadata = chunk.get("metadata", {})
        source = metadata.get("source", "unknown")
        chunk_id = metadata.get("chunk_id", "unknown")
        similarity = float(chunk.get("similarity", 0.0))
        content = chunk.get("content", "")
        context.append(
            f"[Source: {source} | chunk_id: {chunk_id} | score: {similarity:.4f}]\n{content}"
        )

    return (
        "You are a knowledge assistant for the organisation. "
        "Answer using only the provided context. "
        "If the context is insufficient, say you do not have enough information. "
        "Always cite source and chunk_id.\n\n"
        f"CONTEXT:\n{chr(10).join(context)}\n\n"
        f"QUESTION: {question}\n\n"
        "ANSWER:"
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ingest")
async def ingest_pdf(
    file: UploadFile = File(...),
    org: str = Form(default=DEFAULT_ORG),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    org_name = normalize_org(org)

    suffix = Path(file.filename).suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        data = await file.read()
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        result = process_pdf(
            pdf_path=tmp_path,
            model=get_model(),
            org_name=org_name,
            store_mode="supabase",
            supabase=get_supabase(),
        )
    finally:
        tmp_path.unlink(missing_ok=True)

    if not result:
        raise HTTPException(status_code=500, detail="Failed to ingest PDF.")

    return {
        "org": org_name,
        "file_name": file.filename,
        "result": result,
    }


@app.post("/query")
def query_rag(payload: QueryRequest) -> dict:
    org_name = normalize_org(payload.org)
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    model = get_model()
    query_embedding = model.encode([question])[0].tolist()

    supabase = get_supabase()
    resp = supabase.rpc(
        "match_knowledge_chunks",
        {
            "query_embedding": query_embedding,
            "match_threshold": payload.match_threshold,
            "match_count": max(payload.top_k * 5, payload.top_k),
        },
    ).execute()

    rows = resp.data or []
    org_rows = []
    prefix = f"{org_name}/"
    for row in rows:
        metadata = row.get("metadata", {}) or {}
        doc_id = metadata.get("doc_id", "")
        if isinstance(doc_id, str) and doc_id.startswith(prefix):
            org_rows.append(row)
        if len(org_rows) >= payload.top_k:
            break

    if not org_rows:
        raise HTTPException(status_code=404, detail=f"No matches found for org '{org_name}'.")

    load_env()
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured.")

    selected_model = pick_free_model(
        api_key=api_key,
        preferred_model=get_default_model(),
        timeout=30.0,
    )

    prompt = build_prompt(question, org_rows)
    answer = chat_completion(
        api_key=api_key,
        model=selected_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=700,
        timeout=60.0,
    )

    sources = []
    for row in org_rows:
        metadata = row.get("metadata", {}) or {}
        sources.append(
            {
                "source": metadata.get("source"),
                "chunk_id": metadata.get("chunk_id"),
                "doc_id": metadata.get("doc_id"),
                "similarity": row.get("similarity"),
            }
        )

    return {
        "org": org_name,
        "model": selected_model,
        "question": question,
        "answer": answer,
        "sources": sources,
    }
