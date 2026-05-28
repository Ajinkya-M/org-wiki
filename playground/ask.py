"""
Usage:
    python3 playground/ask.py "your question here" --org <name> [-n top-k] [-t threshold]

Examples:
    python3 playground/ask.py "what is the support helpline number?" --org example_org -n 5
    python3 playground/ask.py "how do I submit expenses?" --org example_org -t 0.3
    python3 playground/ask.py "where is the office located?" --org example_org -n 10 -t 0.25

Looks up all .json embedding files in playground/embeddings/<org>/ and returns
the most relevant chunks ranked by cosine similarity.
"""

import argparse
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=FutureWarning)

import numpy as np
from sentence_transformers import SentenceTransformer


# --- Config ----------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent / "embeddings"
MODEL_NAME = "all-MiniLM-L6-v2"


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


def load_embeddings(embed_dir: Path):
    """Load all .json embedding files and return a flat list of results."""
    files = sorted(embed_dir.glob("*.json"))
    if not files:
        print(f"No embedding files found in {embed_dir / '*.json'}")
        sys.exit(1)

    sources = []
    for f in files:
        with open(f) as fh:
            data = json.load(fh)
        for chunk in data["chunks"]:
            sources.append({
                "source": data["source"],
                "chunk_order": chunk["chunk_order"],
                "text": chunk["text"],
                "embedding": np.array(chunk["embedding"], dtype=np.float32),
            })
    return sources


def main():
    parser = argparse.ArgumentParser(
        description="Query indexed document embeddings for relevant answers."
    )
    parser.add_argument("query", help="Your natural-language question")
    parser.add_argument("--org", required=True, help="Organisation name (subdirectory in playground/embeddings/)")
    parser.add_argument("-n", type=int, default=3, help="Top-K results to return (default: 3)")
    parser.add_argument("-t", type=float, default=0.0, help="Similarity threshold (default: 0.0)")
    args = parser.parse_args()

    if not args.query.strip():
        print("Please provide a non-empty query.")
        sys.exit(1)

    org_name = args.org.strip().lower().replace(" ", "_")
    embed_dir = BASE_DIR / org_name
    if not embed_dir.exists():
        print(f"Embeddings not found for organisation '{args.org}'")
        print(f"  Expected: {embed_dir / '*.json'}")
        print("Run playground/index_docs.py with --org <name> first.")
        sys.exit(1)

    print(f"Loading model: {MODEL_NAME} …")
    model = SentenceTransformer(MODEL_NAME)
    print(f"Organisation: {args.org}")
    print(f"Loading embeddings from: {embed_dir / '*.json'} …")
    corpus = load_embeddings(embed_dir)
    print(f"Total chunks loaded: {len(corpus)}")

    print(f"\nQuery: {args.query}")
    print("-" * 60)

    query_emb = model.encode([args.query.strip()])[0]

    results = []
    for item in corpus:
        score = cosine_similarity(query_emb, item["embedding"])
        if score >= args.t:
            results.append((score, item))

    results.sort(key=lambda x: x[0], reverse=True)
    top = results[: args.n]

    if not top:
        print("No results above threshold.")
        sys.exit(0)

    for i, (score, item) in enumerate(top, 1):
        src = Path(item["source"]).name
        print(f"\n{'='*60}")
        print(f"  #{i}  |  Score: {score:.4f}  |  Source: {src}  |  Chunk #{item['chunk_order']}")
        print("-" * 60)
        print(f"  {item['text'][:1200]}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
