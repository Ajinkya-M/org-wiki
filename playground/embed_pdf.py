"""
Usage:
    python3 playground/embed_pdf.py <path_to_pdf> [output_json_path]

Examples:
    python3 playground/embed_pdf.py docs/manual.pdf
    python3 playground/embed_pdf.py docs/manual.pdf embeddings.json

Dependencies (all pre-installed in this environment):
    PyMuPDF, sentence-transformers, torch, numpy
"""

import argparse
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

import numpy as np
from sentence_transformers import SentenceTransformer


# ---------------------------------------------------------------------------
# PDF text extraction  (PyMuPDF / fitz)
# ---------------------------------------------------------------------------

def extract_text_from_pdf(path: str) -> str:
    import fitz
    doc = fitz.open(path)
    pages = []
    for page in doc:
        text = page.get_text()
        if text:
            pages.append(text)
    doc.close()
    return "\n".join(pages)


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

# Rough estimate: 1 token ≈ 4 characters for English text
_CHARS_PER_TOKEN = 4


def chunk_text(text: str, model: SentenceTransformer) -> list[str]:
    """Split text into chunks that fit the model's max sequence length.

    Uses character-based estimation (fast, no tokenizer calls).
    Accumulates paragraphs, then splits on sentence boundaries when needed.
    Each chunk has ~1 paragraph overlap for context continuity.
    """
    max_tokens = model.max_seq_length
    budget_chars = (max_tokens - 8) * _CHARS_PER_TOKEN  # leave room for special tokens

    paragraphs = text.replace("\r", "").split("\n\n")
    if len(paragraphs) == 1:
        # fallback: split on newlines or sentence boundaries
        paragraphs = text.split("\n")
        if len(paragraphs) < 3:
            paragraphs = text.replace(". ", ".\n").split("\n")

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def _flush(with_overlap: bool = True):
        nonlocal current, current_len
        if current:
            block = "\n\n".join(current).strip()
            if block:
                chunks.append(block)
            if with_overlap and len(current) > 1:
                overlap_sz = len(current[-1])
                current = [current[-1]]
                current_len = overlap_sz
            else:
                current = []
                current_len = 0

    def _split_long_block(block: str):
        """Split a single block that exceeds budget on sentence boundaries."""
        sentences = block.replace("\n", " ").split(". ")
        sentences = [s.strip() + ("." if not s.endswith(".") else "") for s in sentences if s.strip()]
        buf: list[str] = []
        buf_len = 0
        for sent in sentences:
            sl = len(sent)
            if buf_len + sl > budget_chars and buf:
                s = " ".join(buf).strip()
                if s:
                    chunks.append(s)
                if len(buf) > 1:
                    carry = buf[-1]
                    buf = [carry]
                    buf_len = len(carry)
                else:
                    buf = []
                    buf_len = 0
            # if a single sentence still exceeds budget, hard-truncate it
            if sl > budget_chars:
                sent = sent[:budget_chars]
                sl = len(sent)
            buf.append(sent)
            buf_len += sl
        if buf:
            s = " ".join(buf).strip()
            if s:
                chunks.append(s)

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        pl = len(para)

        # Single long paragraph — split on sentence boundaries
        if pl > budget_chars:
            _flush(with_overlap=True)
            _split_long_block(para)
            continue

        # Accumulate until budget exceeded
        if current_len + pl > budget_chars:
            _flush(with_overlap=True)

        current.append(para)
        current_len += pl

    _flush(with_overlap=False)

    return [c.strip() for c in chunks if c.strip()]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extract text from a PDF, chunk it, and generate embeddings."
    )
    parser.add_argument("pdf_path", help="Path to the input PDF file")
    parser.add_argument(
        "output_path",
        nargs="?",
        default=None,
        help="Optional JSON output path for chunks + embeddings",
    )
    args = parser.parse_args()

    # --- Validate input ----------------------------------------------------
    pdf_path = args.pdf_path
    if not os.path.isfile(pdf_path):
        print(f"Error: file not found -> {pdf_path}", file=sys.stderr)
        sys.exit(1)
    if not pdf_path.lower().endswith(".pdf"):
        print(f"Error: input is not a PDF (extension != .pdf) -> {pdf_path}", file=sys.stderr)
        sys.exit(1)

    # --- Extract text ------------------------------------------------------
    print(f"Reading PDF: {pdf_path}")
    try:
        text = extract_text_from_pdf(pdf_path)
    except Exception as exc:
        print(f"Error: failed to read PDF -> {exc}", file=sys.stderr)
        sys.exit(1)

    char_count = len(text)
    if char_count == 0:
        print("Error: extracted text is empty (PDF may contain only images or scanned pages)", file=sys.stderr)
        sys.exit(1)

    print(f"Extracted {char_count:,} characters")

    # --- Embedding model ---------------------------------------------------
    model_name = "all-MiniLM-L6-v2"
    print(f"Loading embedding model: {model_name} …")
    model = SentenceTransformer(model_name)
    dim = model.get_sentence_embedding_dimension()
    print(f"  Embedding dimension: {dim}")
    print(f"  Max sequence length: {model.max_seq_length} tokens")
    print(f"  Chunk budget: ~{(model.max_seq_length - 8) * _CHARS_PER_TOKEN:,} chars per chunk")

    # --- Chunk -------------------------------------------------------------
    print("Chunking text …")
    chunks = chunk_text(text, model)
    if not chunks:
        print("Error: no chunks were created", file=sys.stderr)
        sys.exit(1)
    print(f"  Created {len(chunks):,} chunks")

    # --- Embed -------------------------------------------------------------
    print("Generating embeddings …")
    embeddings = model.encode(chunks, show_progress_bar=True)
    assert isinstance(embeddings, np.ndarray)
    print(f"  Embedding shape: {embeddings.shape}")

    # --- Summary -----------------------------------------------------------
    print()
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print(f"  Source file         : {pdf_path}")
    print(f"  Total characters    : {char_count:,}")
    print(f"  Number of chunks    : {len(chunks):,}")
    print(f"  Embedding model     : {model_name}")
    print(f"  Embedding dimension : {dim}")
    print(f"  Chunk sizes (chars) : {len(min(chunks, key=len))}–{len(max(chunks, key=len))}")
    print(f"  First chunk preview : {chunks[0][:80].strip()!r}…")
    print("=" * 60)

    # --- Save JSON ---------------------------------------------------------
    if args.output_path:
        out_path = args.output_path
        data = {
            "source": os.path.abspath(pdf_path),
            "chunk_count": len(chunks),
            "embedding_model": model_name,
            "embedding_dimension": dim,
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
        print(f"Saved output to: {out_path}")
        file_size = os.path.getsize(out_path)
        print(f"  File size: {file_size:,} bytes")


if __name__ == "__main__":
    main()
