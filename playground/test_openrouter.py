"""
Quick OpenRouter connectivity test for free chat models.

Usage:
    python3 playground/test_openrouter.py
    python3 playground/test_openrouter.py --model mistralai/mistral-7b-instruct:free
    python3 playground/test_openrouter.py --prompt "Reply with OK"
"""

import argparse
import os
import sys

import httpx
from openrouter_client import (
    chat_completion,
    get_api_key,
    get_default_model,
    load_env,
    pick_free_model,
)


def main() -> int:
    load_env()

    parser = argparse.ArgumentParser(description="Test OpenRouter API connectivity.")
    parser.add_argument(
        "--model",
        default=os.getenv("OPENROUTER_MODEL", get_default_model()),
        help="Model name to call (default: OPENROUTER_MODEL or mistral free model).",
    )
    parser.add_argument(
        "--prompt",
        default="Return exactly: OPENROUTER_CONNECTION_OK",
        help="Prompt sent to the model.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="HTTP timeout in seconds.",
    )
    args = parser.parse_args()

    api_key = get_api_key()

    if not api_key:
        print("FAIL: OPENROUTER_API_KEY not set in environment or .env")
        return 1

    print("=== OpenRouter Connectivity Test ===")
    try:
        selected_model = pick_free_model(
            api_key=api_key,
            preferred_model=args.model,
            timeout=args.timeout,
        )
        print(f"Model: {selected_model}")
        answer = chat_completion(
            api_key=api_key,
            model=selected_model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise assistant. Reply in one short sentence.",
                },
                {"role": "user", "content": args.prompt},
            ],
            temperature=0.1,
            max_tokens=80,
            timeout=max(30.0, args.timeout),
        )
        print("PASS: API call succeeded")
        print(f"Response: {answer}")
        return 0
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response is not None else "unknown"
        body = exc.response.text[:500] if exc.response is not None else str(exc)
        print(f"FAIL: HTTP {status}")
        print(body)
        return 1
    except httpx.TimeoutException:
        print("FAIL: request timed out")
        return 1
    except Exception as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
