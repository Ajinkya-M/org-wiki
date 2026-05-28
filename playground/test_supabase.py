import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("FAIL: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env")
    sys.exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("PASS: Supabase client initialised")
except Exception as e:
    print(f"FAIL: Supabase client initialisation — {e}")
    sys.exit(1)

all_pass = True

try:
    result = supabase.table("doc_registry").select("count", count="exact").limit(0).execute()
    count = result.count
    print(f"PASS: doc_registry count = {count}")
except Exception as e:
    print(f"FAIL: doc_registry query — {e}")
    all_pass = False

try:
    result = supabase.table("knowledge_chunks").select("count", count="exact").limit(0).execute()
    count = result.count
    print(f"PASS: knowledge_chunks count = {count}")
except Exception as e:
    print(f"FAIL: knowledge_chunks query — {e}")
    all_pass = False

try:
    dummy_vec = [0.0] * 384
    resp = supabase.rpc("match_knowledge_chunks", {
        "query_embedding": dummy_vec,
        "match_threshold": 0.0,
        "match_count": 1,
    }).execute()
    print(f"PASS: match_knowledge_chunks() returned {len(resp.data)} rows")
except Exception as e:
    print(f"FAIL: match_knowledge_chunks() — {e}")
    all_pass = False

if all_pass:
    print("\nAll checks passed.")
    sys.exit(0)
else:
    print("\nSome checks failed.")
    sys.exit(1)
