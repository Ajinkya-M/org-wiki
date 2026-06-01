"""
Usage:
    python3 playground/app/ask.py "your question here" [--org <name>] [-n top-k] [-t threshold] [--llm]

Examples:
    python3 playground/app/ask.py "what is the support helpline number?" --org example_org -n 5
    python3 playground/app/ask.py "how do I submit expenses?" --org example_org -t 0.3
    python3 playground/app/ask.py "where is the office located?" --org example_org -n 10 -t 0.25

Looks up all .json embedding files in playground/data/embeddings/<org>/ and returns
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

from playground.app.openrouter_client import (
    chat_completion_with_payload,
    get_api_key,
    get_default_model,
    load_env,
    pick_free_model,
)


# --- Config ----------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent / "data" / "embeddings"
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
                "chunk_id": chunk.get("chunk_id") or f"{Path(data['source']).stem}:c{int(chunk['chunk_order']):04d}",
                "text": chunk["text"],
                "embedding": np.array(chunk["embedding"], dtype=np.float32),
            })
    return sources


def build_rag_prompt(question: str, top_chunks: list[tuple[float, dict]]) -> str:
    context_parts = []
    for score, item in top_chunks:
        src = Path(item["source"]).name
        context_parts.append(
            f"[Source: {src} | chunk_id: {item['chunk_id']} | score: {score:.4f}]\n{item['text']}"
        )

    context = "\n\n".join(context_parts)
    return (
        "You are a knowledge assistant for the organisation. "
        "Answer the user's question based ONLY on the context provided below. "
        "If the context is insufficient, say so clearly. "
        "Always cite source file names and chunk_id values from the context.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION: {question}\n\n"
        "ANSWER:"
    )


def print_sources(top_chunks: list[tuple[float, dict]]) -> None:
    print("\n=== Sources ===")
    for i, (score, item) in enumerate(top_chunks, 1):
        src = Path(item["source"]).name
        print(
            f"  #{i}  |  Score: {score:.4f}  |  Source: {src}  "
            f"|  chunk_id: {item['chunk_id']}"
        )


def try_llm_answer(
    question: str,
    top_chunks: list[tuple[float, dict]],
    timeout: float,
    print_prompt: bool = False,
    print_raw_response: bool = False,
) -> str | None:
    load_env()
    api_key = get_api_key()
    if not api_key:
        print("\nLLM disabled: OPENROUTER_API_KEY (or OPEN_ROUTER_API_KEY) not set.")
        return None

    try:
        selected_model = pick_free_model(
            api_key=api_key,
            preferred_model=get_default_model(),
            timeout=timeout,
        )
        prompt = build_rag_prompt(question, top_chunks)
        if print_prompt:
            print("\n=== Prompt Sent To OpenRouter ===")
            print(prompt)
        messages = [
            {"role": "user", "content": prompt},
        ]
        answer, payload = chat_completion_with_payload(
            api_key=api_key,
            model=selected_model,
            messages=messages,
            temperature=0.3,
            max_tokens=700,
            timeout=max(30.0, timeout),
        )
        print(f"\nUsing LLM model: {selected_model}")
        if print_raw_response:
            print("\n=== Raw OpenRouter Response ===")
            print(payload)
        return answer
    except Exception as exc:
        print(f"\nLLM request failed: {exc}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Query indexed document embeddings for relevant answers."
    )
    parser.add_argument("query", help="Your natural-language question")
    parser.add_argument(
        "--org",
        default="default_org",
        help="Organisation name (subdirectory in playground/data/embeddings/, default: default_org)",
    )
    parser.add_argument("-n", type=int, default=3, help="Top-K results to return (default: 3)")
    parser.add_argument("-t", type=float, default=0.0, help="Similarity threshold (default: 0.0)")
    parser.add_argument("--llm", action="store_true", help="Generate grounded answer via OpenRouter free model")
    parser.add_argument("--timeout", type=float, default=30.0, help="Timeout for model catalog and API calls")
    parser.add_argument("--print-prompt", action="store_true", help="Print full prompt sent to OpenRouter")
    parser.add_argument("--print-raw-response", action="store_true", help="Print raw response payload from OpenRouter")
    args = parser.parse_args()

    if not args.query.strip():
        print("Please provide a non-empty query.")
        sys.exit(1)

    org_name = args.org.strip().lower().replace(" ", "_") if args.org else "default_org"
    embed_dir = BASE_DIR / org_name
    if not embed_dir.exists():
        print(f"Embeddings not found for organisation '{args.org}'")
        print(f"  Expected: {embed_dir / '*.json'}")
        print("Run playground/app/index_docs.py first (uses default_org when --org is omitted).")
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

    if args.llm:
        answer = try_llm_answer(
            args.query.strip(),
            top,
            timeout=args.timeout,
            print_prompt=args.print_prompt,
            print_raw_response=args.print_raw_response,
        )
        if answer:
            print("\n=== Answer ===")
            print(answer)
            print_sources(top)
            print(f"\n{'='*60}")
            sys.exit(0)
        print("\nFalling back to raw chunk output.")

    for i, (score, item) in enumerate(top, 1):
        src = Path(item["source"]).name
        print(f"\n{'='*60}")
        print(
            f"  #{i}  |  Score: {score:.4f}  |  Source: {src}  "
            f"|  Chunk #{item['chunk_order']}  |  chunk_id: {item['chunk_id']}"
        )
        print("-" * 60)
        print(f"  {item['text'][:1200]}")
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
