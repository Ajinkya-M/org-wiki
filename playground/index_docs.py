"""
Usage:
    python3 playground/index_docs.py <path> [path ...] --org <name>

Examples:
    # Index a single PDF for an organisation:
    python3 playground/index_docs.py handbook.pdf --org example_org

    # Index all PDFs in a directory for an organisation:
    python3 playground/index_docs.py docs/ --org example_org

    # Index multiple files/directories:
    python3 playground/index_docs.py handbook.pdf policy.pdf docs/ --org example_org

Output: saves one .json file per PDF into playground/embeddings/<org>/

Dependencies (pre-installed): PyMuPDF, sentence-transformers, numpy
"""

import argparse
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
CHUNK_BUDGET_CHARS = 992  # ~256 tokens - 8 for special tokens, × 4 chars/token


# --- PDF Extraction (PyMuPDF) ---------------------------------------------
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


# --- Chunking (character-based, no tokenizer calls) -----------------------
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


# --- Document processing --------------------------------------------------
def process_pdf(pdf_path: Path, model: SentenceTransformer, out_dir: Path) -> dict | None:
    print(f"\n  Processing: {pdf_path.name}")

    text = extract_text(str(pdf_path))
    if not text.strip():
        print(f"  ⚠ Skipped: empty text (scanned PDF?)")
        return None

    chunks = chunk_text(text)
    if not chunks:
        print(f"  ⚠ Skipped: no chunks generated")
        return None

    print(f"  Chunks: {len(chunks)}  Characters: {len(text):,}")

    embeddings = model.encode(chunks, show_progress_bar=True)
    assert isinstance(embeddings, np.ndarray)

    out_name = pdf_path.stem.replace(" ", "_") + ".json"
    out_path = out_dir / out_name

    data = {
        "organisation": out_dir.name,
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

    print(f"  → Saved: {out_name}  ({os.path.getsize(out_path) / 1024:.0f} KB)")
    return data


# --- CLI ------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Index PDF documents and save org-scoped embeddings to playground/embeddings/<org>/"
    )
    parser.add_argument("paths", nargs="+", help="PDF files or directories to index")
    parser.add_argument("--org", required=True, help="Organisation name (creates subdir in playground/embeddings/)")
    args = parser.parse_args()

    org_name = args.org.strip().lower().replace(" ", "_")
    out_dir = BASE_DIR / org_name
    out_dir.mkdir(parents=True, exist_ok=True)

    # Collect all PDFs
    pdfs: list[Path] = []
    for p in args.paths:
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

    if not pdfs:
        print("No PDF files found.")
        sys.exit(1)

    print(f"Loading model: {MODEL_NAME} …")
    model = SentenceTransformer(MODEL_NAME)
    dim = model.get_sentence_embedding_dimension()
    print(f"  Dimension: {dim}  |  Max tokens: {model.max_seq_length}  |  Output: {out_dir}")
    print(f"  Organisation: {args.org}  |  Documents to index: {len(pdfs)}")

    success = 0
    for pdf in pdfs:
        try:
            result = process_pdf(pdf, model, out_dir)
            if result:
                success += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")

    print(f"\n{'='*50}")
    print(f"  Done: {success}/{len(pdfs)} documents indexed")
    print(f"  Organisation: {args.org}")
    print(f"  Output: {out_dir / '*.json'}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
