"""
Usage:
    # Run all connection and data checks:
    python3 playground/tests/test_supabase.py

    # Optionally verify a specific doc_id was indexed:
    python3 playground/tests/test_supabase.py --doc-id example_org/Driver_Handbook

    # Quick check with match_knowledge_chunks (optional):
    python3 playground/tests/test_supabase.py --doc-id example_org/Driver_Handbook --query
"""

import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

import os
import argparse


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def get_client():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("FAIL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def check_connection(supabase) -> bool:
    try:
        _ = supabase.table("doc_registry").select("count", count="exact").limit(0).execute()
        print("PASS: Supabase client initialised and connected")
        return True
    except Exception as e:
        print(f"FAIL: Supabase connection — {e}")
        return False


def check_table_exists(supabase, table: str) -> bool:
    try:
        result = supabase.table(table).select("count", count="exact").limit(0).execute()
        count = result.count
        print(f"PASS: {table} exists (total rows: {count})")
        return True
    except Exception as e:
        print(f"FAIL: {table} — {e}")
        return False


def check_doc_id(supabase, doc_id: str) -> int | None:
    try:
        reg = supabase.table("doc_registry") \
            .select("*") \
            .eq("doc_id", doc_id) \
            .maybe_single() \
            .execute()
        if not reg or not reg.data:
            print(f"FAIL: doc_registry has no entry for '{doc_id}'")
            return None

        data = reg.data
        print(f"PASS: doc_registry entry for '{doc_id}'")
        print(f"       source_hash: {data.get('source_hash', '?')[:16]}…")
        print(f"       file_name:   {data.get('file_name', '?')}")
        print(f"       chunk_count: {data.get('chunk_count', '?')}")

        rows = supabase.table("knowledge_chunks") \
            .select("count", count="exact") \
            .eq("doc_id", doc_id) \
            .execute()
        chunk_count = rows.count
        print(f"PASS: {chunk_count} chunks in knowledge_chunks for '{doc_id}'")

        expected = data.get("chunk_count", 0)
        if expected and chunk_count != expected:
            print(f"WARN: chunk count mismatch — registry says {expected}, actual is {chunk_count}")

        return chunk_count
    except Exception as e:
        print(f"FAIL: lookup for '{doc_id}' — {e}")
        return None


def check_match_function(supabase) -> bool:
    try:
        dummy_vec = [0.0] * 384
        resp = supabase.rpc("match_knowledge_chunks", {
            "query_embedding": dummy_vec,
            "match_threshold": 0.0,
            "match_count": 5,
        }).execute()
        print(f"PASS: match_knowledge_chunks() returned {len(resp.data)} rows")
        if resp.data:
            for r in resp.data[:3]:
                cid = r.get("metadata", {}).get("chunk_id", "?")
                sim = float(r.get("similarity", 0))
                print(f"       chunk_id={cid} similarity={sim:.4f}")
        return True
    except Exception as e:
        print(f"FAIL: match_knowledge_chunks() — {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Verify Supabase connection, schema, and indexed data."
    )
    parser.add_argument("--doc-id", help="Optional: check a specific doc_id in the registry")
    parser.add_argument("--query", action="store_true", help="Run a sample match query after checks")
    args = parser.parse_args()

    supabase = get_client()
    all_pass = True

    print("=== Supabase Verification ===\n")

    all_pass &= check_connection(supabase)
    all_pass &= check_table_exists(supabase, "doc_registry")
    all_pass &= check_table_exists(supabase, "knowledge_chunks")

    if args.doc_id:
        print("")
        result = check_doc_id(supabase, args.doc_id)
        all_pass &= (result is not None)

    if args.query:
        print("")
        all_pass &= check_match_function(supabase)

    print("")
    if all_pass:
        print("All checks passed.")
        sys.exit(0)
    else:
        print("Some checks failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()
