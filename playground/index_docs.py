"""
Usage:
    python3 playground/index_docs.py <path> [path ...] [--org <name>] [--store local|supabase|both]

Examples:
    # Local JSON mode (default):
    python3 playground/index_docs.py handbook.pdf --org example_org
    python3 playground/index_docs.py handbook.pdf --org example_org --store local

    # Supabase pgvector mode:
    python3 playground/index_docs.py handbook.pdf --org example_org --store supabase

    # Both modes at once:
    python3 playground/index_docs.py docs/ --org example_org --store both

Output (local mode): saves one .json file per PDF into playground/embeddings/<org>/
Output (supabase mode): inserts rows into knowledge_chunks and updates doc_registry

Dependencies: PyMuPDF, sentence-transformers, numpy, python-dotenv, supabase
"""

import argparse
import hashlib
import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=FutureWarning)

import numpy as np
from sentence_transformers import SentenceTransformer


# --- Config ----------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent / "embeddings"
MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_BUDGET_CHARS = 992


# === SHARED HELPERS (no existing-file dependencies) ========================

def load_dotenv_if_present():
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


def get_supabase_client():
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("  ✗ SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
        return None
    return create_client(url, key)


def extract_text(path: str) -> str:
    import fitz
    doc = fitz.open(path)
    pages = []
    for page in doc:
        t = page.get_text()
        if t:
            pages.append(t)
    doc.close()
    return "\n".join(pages)


def chunk_text(text: str) -> list[str]:
    paragraphs = text.replace("\r", "").split("\n\n")
    if len(paragraphs) == 1:
        paragraphs = text.split("\n")
        if len(paragraphs) < 3:
            paragraphs = text.replace(". ", ".\n").split("\n")

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def flush(overlap=True):
        nonlocal current, current_len
        if current:
            block = "\n\n".join(current).strip()
            if block:
                chunks.append(block)
            if overlap and len(current) > 1:
                current = [current[-1]]
                current_len = len(current[-1])
            else:
                current = []
                current_len = 0

    def split_long(block: str):
        sentences = [s.strip() + "." for s in block.replace("\n", " ").split(". ") if s.strip()]
        buf, buf_len = [], 0
        for s in sentences:
            sl = len(s)
            if buf_len + sl > CHUNK_BUDGET_CHARS and buf:
                c = " ".join(buf).strip()
                if c:
                    chunks.append(c)
                carry = buf[-1] if len(buf) > 1 else ""
                buf = [carry] if carry else []
                buf_len = len(carry)
            if sl > CHUNK_BUDGET_CHARS:
                s = s[:CHUNK_BUDGET_CHARS]
                sl = len(s)
            buf.append(s)
            buf_len += sl
        if buf:
            c = " ".join(buf).strip()
            if c:
                chunks.append(c)

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        pl = len(para)
        if pl > CHUNK_BUDGET_CHARS:
            flush(overlap=True)
            split_long(para)
            continue
        if current_len + pl > CHUNK_BUDGET_CHARS:
            flush(overlap=True)
        current.append(para)
        current_len += pl

    flush(overlap=False)
    return [c.strip() for c in chunks if c.strip()]


def get_source_hash(file_path: Path) -> str:
    return hashlib.sha256(file_path.read_bytes()).hexdigest()


def make_doc_id(org_name: str, pdf_stem: str) -> str:
    org_slug = org_name.strip().lower().replace(" ", "_")
    stem_slug = pdf_stem.strip().replace(" ", "_")
    return f"{org_slug}/{stem_slug}"


def make_chunk_id(doc_id: str, chunk_order: int) -> str:
    return f"{doc_id}:c{chunk_order:04d}"


def collect_pdfs(path_args: list[str]) -> list[Path]:
    pdfs: list[Path] = []
    for p in path_args:
        p = Path(p)
        if p.is_dir():
            pdfs.extend(sorted(p.rglob("*.pdf")))
        elif p.is_file():
            if p.suffix.lower() == ".pdf":
                pdfs.append(p)
            else:
                print(f"⚠ Skipping (not PDF): {p}")
        else:
            print(f"⚠ Not found: {p}")
    return pdfs


# === LOCAL STORAGE =========================================================

def save_local_json(
    pdf_path: Path,
    org_name: str,
    model: SentenceTransformer,
    chunks: list[str],
    embeddings: np.ndarray,
) -> dict | None:
    out_dir = BASE_DIR / org_name
    out_dir.mkdir(parents=True, exist_ok=True)
    out_name = pdf_path.stem.replace(" ", "_") + ".json"
    out_path = out_dir / out_name

    data = {
        "organisation": org_name,
        "source": str(pdf_path.resolve()),
        "chunk_count": len(chunks),
        "embedding_model": MODEL_NAME,
        "embedding_dimension": embeddings.shape[1],
        "chunks": [
            {
                "chunk_order": i,
                "text": chunks[i],
                "embedding": embeddings[i].tolist(),
            }
            for i in range(len(chunks))
        ],
    }

    with open(out_path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  → JSON: {out_name}  ({os.path.getsize(out_path) / 1024:.0f} KB)")
    return data


# === SUPABASE STORAGE ======================================================

def _check_registry(supabase, doc_id: str) -> str | None:
    query = supabase.table("doc_registry") \
        .select("source_hash") \
        .eq("doc_id", doc_id) \
        .maybe_single()
    if query is None:
        return None
    result = query.execute()
    if result and result.data:
        return result.data.get("source_hash")
    return None


def _delete_existing_chunks(supabase, doc_id: str):
    supabase.table("knowledge_chunks") \
        .delete() \
        .eq("doc_id", doc_id) \
        .execute()


def _insert_chunks(supabase, rows: list[dict]):
    supabase.table("knowledge_chunks").insert(rows).execute()


def _upsert_registry(supabase, doc_id: str, source_hash: str, file_name: str, chunk_count: int):
    supabase.table("doc_registry").upsert({
        "doc_id": doc_id,
        "source_hash": source_hash,
        "file_name": file_name,
        "chunk_count": chunk_count,
    }).execute()


def store_supabase(
    pdf_path: Path,
    org_name: str,
    doc_id: str,
    source_hash: str,
    chunks: list[str],
    embeddings: np.ndarray,
    supabase,
) -> str:
    existing_hash = _check_registry(supabase, doc_id)
    if existing_hash == source_hash:
        return "skipped"

    if existing_hash is not None:
        _delete_existing_chunks(supabase, doc_id)
        status = "replaced"
    else:
        status = "indexed"

    rows = []
    for i, (chunk_text, vec) in enumerate(zip(chunks, embeddings), start=1):
        rows.append({
            "content": chunk_text,
            "embedding": vec.tolist(),
            "metadata": {
                "doc_id": doc_id,
                "source": pdf_path.name,
                "organisation": org_name,
                "chunk_id": make_chunk_id(doc_id, i),
                "chunk_order": i,
                "source_hash": source_hash,
            },
        })

    _insert_chunks(supabase, rows)
    _upsert_registry(supabase, doc_id, source_hash, pdf_path.name, len(rows))
    return status


# === DOCUMENT PROCESSING ===================================================

def process_pdf(
    pdf_path: Path,
    model: SentenceTransformer,
    org_name: str,
    store_mode: str,
    supabase=None,
) -> dict | None:
    file_hash = get_source_hash(pdf_path)
    doc_id = make_doc_id(org_name, pdf_path.stem)

    print(f"\n  File: {pdf_path.name}")
    print(f"  doc_id: {doc_id}")

    # --- Early skip for supabase mode ---
    if store_mode in ("supabase", "both") and supabase is not None:
        existing_hash = _check_registry(supabase, doc_id)
        if existing_hash == file_hash:
            print(f"  Status: skipped (unchanged)")
            print(f"  Store: {store_mode}")
            return {"doc_id": doc_id, "status": "skipped", "reason": "unchanged"}

    text = extract_text(str(pdf_path))
    if not text.strip():
        print("  ⚠ Skipped: empty text (scanned PDF?)")
        return None

    chunks = chunk_text(text)
    if not chunks:
        print("  ⚠ Skipped: no chunks generated")
        return None

    print(f"  Chunks: {len(chunks)}  Characters: {len(text):,}")

    embeddings = model.encode(chunks, show_progress_bar=True)
    assert isinstance(embeddings, np.ndarray)
    dim = embeddings.shape[1]
    print(f"  Embedding dim: {dim}")

    local_result = None
    supabase_status = None

    if store_mode in ("local", "both"):
        local_result = save_local_json(pdf_path, org_name, model, chunks, embeddings)

    if store_mode in ("supabase", "both") and supabase is not None:
        supabase_status = store_supabase(
            pdf_path, org_name, doc_id, file_hash, chunks, embeddings, supabase
        )
        print(f"  DB: {supabase_status} ({len(chunks)} chunks)")

    status = supabase_status or ("indexed" if local_result else "failed")
    print(f"  Store: {store_mode}  |  Status: {status}")

    return {"doc_id": doc_id, "status": status, "chunk_count": len(chunks)}


# === CLI ===================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Index PDF documents into local JSON files and/or Supabase pgvector."
    )
    parser.add_argument("paths", nargs="+", help="PDF files or directories to index")
    parser.add_argument("--org", default="default_org", help="Organisation name (default: default_org)")
    parser.add_argument(
        "--store",
        default="local",
        choices=["local", "supabase", "both"],
        help="Storage target (default: local)",
    )
    args = parser.parse_args()

    org_name = args.org.strip().lower().replace(" ", "_") if args.org else "default_org"
    store_mode = args.store

    pdfs = collect_pdfs(args.paths)
    if not pdfs:
        print("No PDF files found.")
        sys.exit(1)

    supabase = None
    if store_mode in ("supabase", "both"):
        load_dotenv_if_present()
        supabase = get_supabase_client()
        if supabase is None:
            sys.exit(1)

    print(f"Loading model: {MODEL_NAME} …")
    model = SentenceTransformer(MODEL_NAME)
    dim = model.get_sentence_embedding_dimension()
    print(f"  Dimension: {dim}  |  Max tokens: {model.max_seq_length}")
    print(f"  Organisation: {org_name}  |  Documents: {len(pdfs)}  |  Store: {store_mode}")

    success = 0
    skipped = 0
    for pdf in pdfs:
        try:
            result = process_pdf(pdf, model, org_name, store_mode, supabase)
            if result:
                if result.get("status") == "skipped":
                    skipped += 1
                else:
                    success += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")

    print(f"\n{'='*50}")
    print(f"  Done: {success} indexed, {skipped} skipped, {len(pdfs)} total")
    print(f"  Organisation: {org_name}  |  Store: {store_mode}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
