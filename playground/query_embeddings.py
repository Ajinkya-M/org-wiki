"""
Usage:
    python3 playground/query_embeddings.py <embeddings.json> "your question here"

Examples:
    python3 playground/query_embeddings.py playground/handbook_embeddings.json \
        "What is the Ayvens helpline number?"

    python3 playground/query_embeddings.py playground/handbook_embeddings.json \
        "How do I report an accident?"

Dependencies (all pre-installed):
    sentence-transformers, numpy
"""

import argparse
import json
import sys
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

import numpy as np
from sentence_transformers import SentenceTransformer


def load_embeddings(path: str) -> dict:
    with open(path, "r") as f:
        data = json.load(f)
    return data


def search(
    data: dict,
    query: str,
    model: SentenceTransformer,
    top_k: int = 5,
) -> list[dict]:
    q_vec = model.encode([query])[0]
    embeds = np.array([c["embedding"] for c in data["chunks"]], dtype=np.float32)
    norms = np.linalg.norm(embeds, axis=1)
    q_norm = np.linalg.norm(q_vec)
    scores = embeds @ q_vec / (norms * q_norm + 1e-10)

    top_idx = np.argsort(scores)[-top_k:][::-1]
    results = []
    for idx in top_idx:
        results.append({
            "chunk_order": data["chunks"][idx]["chunk_order"],
            "similarity": float(scores[idx]),
            "text": data["chunks"][idx]["text"],
        })
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Query a local embeddings JSON file with natural language."
    )
    parser.add_argument("embeddings_path", help="Path to the embeddings JSON file")
    parser.add_argument("query", help="Your question in natural language")
    parser.add_argument(
        "-k", "--top-k",
        type=int,
        default=5,
        help="Number of top chunks to return (default: 5)",
    )
    parser.add_argument(
        "-t", "--threshold",
        type=float,
        default=0.0,
        help="Minimum similarity threshold (default: 0.0 = no filter)",
    )
    parser.add_argument(
        "-m", "--model",
        default="all-MiniLM-L6-v2",
        help="Embedding model name (must match the one used for indexing)",
    )
    args = parser.parse_args()

    # --- Load embeddings ---------------------------------------------------
    print(f"Loading embeddings from: {args.embeddings_path}", file=sys.stderr)
    try:
        data = load_embeddings(args.embeddings_path)
    except FileNotFoundError:
        print(f"Error: file not found -> {args.embeddings_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON -> {e}", file=sys.stderr)
        sys.exit(1)

    required = {"source", "chunk_count", "embedding_dimension", "chunks"}
    missing = required - set(data.keys())
    if missing:
        print(f"Error: missing keys in embeddings file: {missing}", file=sys.stderr)
        sys.exit(1)
    if not data["chunks"]:
        print("Error: embeddings file contains no chunks", file=sys.stderr)
        sys.exit(1)

    print(f"  Source file      : {data['source']}", file=sys.stderr)
    print(f"  Chunks available : {data['chunk_count']}", file=sys.stderr)
    print(f"  Embedding dim    : {data['embedding_dimension']}", file=sys.stderr)
    print(f"  Model            : {args.model}", file=sys.stderr)
    print(file=sys.stderr)

    # --- Load model --------------------------------------------------------
    print(f"Loading model: {args.model} …", file=sys.stderr)
    model = SentenceTransformer(args.model)

    # --- Search ------------------------------------------------------------
    print(f"Searching for: {args.query}", file=sys.stderr)
    print(file=sys.stderr)

    results = search(data, args.query, model, top_k=args.top_k)

    # --- Filter by threshold -----------------------------------------------
    results = [r for r in results if r["similarity"] >= args.threshold]
    if not results:
        print("No chunks found above the similarity threshold.", file=sys.stderr)
        sys.exit(0)

    # --- Print results -----------------------------------------------------
    for i, r in enumerate(results):
        bar = "─" * 60
        print(bar)
        print(f"  Result {i+1}  |  Chunk #{r['chunk_order']}  |  Similarity: {r['similarity']:.4f}")
        print(bar)
        print(r["text"].strip())
        print()

    # --- Summary -----------------------------------------------------------
    print("─" * 60)
    print(f"Top {len(results)} result(s) | Model: {args.model}")


if __name__ == "__main__":
    main()
