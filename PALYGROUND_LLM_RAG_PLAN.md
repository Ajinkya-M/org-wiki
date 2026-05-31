# Playground LLM RAG Plan

## Goal

Extend the existing playground query flow (`playground/ask.py`) so that instead of only printing raw top-K chunks, it can pass those chunks to an OpenRouter free LLM and return a natural-language answer with source citations — completing the classic RAG loop entirely within the playground.

## Current Baseline

The repository already has:

- `playground/index_docs.py`
  - PDF → text extraction (PyMuPDF) → chunking (character-budget) → embedding (`all-MiniLM-L6-v2`)
  - Local JSON storage under `playground/embeddings/<org>/`
  - Supabase pgvector storage via `--store supabase|both`
  - SHA-256 idempotency, stable `doc_id`/`chunk_id`
- `playground/ask.py`
  - Loads all `.json` embedding files for a given `--org`
  - Encodes user query with the same model
  - Returns top-K chunks ranked by cosine similarity
  - **No LLM call** — output is raw chunks only
- `.env` at project root (already has `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`)
  - `httpx` already installed

## Feature Target

Add a new path to `playground/ask.py`:

```
User Question → Embed → Cosine Search → Top-K Chunks → Prompt Builder → OpenRouter LLM → Answer + Citations
```

When the `--llm` flag is provided:
1. Retrieve top-K chunks as today
2. Build a structured prompt with system instructions + chunk context + user question
3. Call OpenRouter API with the prompt
4. Print the LLM-generated answer (with source citations)

When `--llm` is omitted, behaviour is identical to the current script.

## Non-Goals

This change should not:

- modify `playground/index_docs.py`
- add FastAPI or any server component
- add Supabase-backed retrieval to the playground query path (Phase 1 concern)
- add auth, RLS, or frontend
- replace the existing `--llm`-less output mode
- store or cache LLM responses

## Recommended Implementation Shape

### Option A (recommended): Extend `ask.py` with `--llm` flag

Add to `playground/ask.py`:

| Flag | Type | Default | Description |
|---|---|---|---|
| `--llm` | flag | `False` | Pass top-K chunks to OpenRouter LLM for answer generation |

Model and temperature are **not CLI flags**:
- **Model**: always read from `OPENROUTER_MODEL` env var (fallback: `mistralai/mistral-7b-instruct:free`). No `--model` flag.
- **Temperature**: fixed constant `0.3` in the script. No `--temperature` flag.

When `--llm` is absent, output is identical to today. When present, print both the answer and the source chunks.

### Option B (alternative): Separate `ask_llm.py`

New file `playground/ask_llm.py` that calls `ask.py`-like retrieval internally, then adds the LLM step.

**Why Option A is better:**
- Single entry point for all query modes
- Easier to compare LLM vs non-LLM output in the same run
- Less code duplication (shared loading, embedding, search logic)
- Cleaner mental model for users

## Prompt Template

```python
prompt = f"""You are a knowledge assistant for the organisation.
Answer the user's question based ONLY on the context provided below.
If the context does not contain enough information, say "I don't have enough information in the available documents."
Always cite the source file name and chunk number from the context.

CONTEXT:
[Source: {source_name} | chunk_id: {chunk_id}]
{chunk_text}

---

QUESTION: {user_question}

ANSWER:"""
```

### Context Budget

`all-MiniLM-L6-v2` produces chunks up to ~256 tokens. For top_K=5:

| Component | Estimated tokens |
|---|---|
| System instructions | ~100 |
| 5 chunks × 256 tokens | ~1,280 |
| User question | ~30 |
| Reserved for answer | ~512 |
| **Total** | **~1,922** |

This fits well within Mistral 7B (8K context) and Llama 3.1 8B (128K context). Default `-n 3` uses even less.

## Data Flow

```
ask.py (current)
─────────────────────────────────────────────────────────
  Question → Embed → Cosine Search → Print top-K chunks

ask.py with --llm (new)
─────────────────────────────────────────────────────────
  Question → Embed → Cosine Search → Build Prompt → POST /v1/chat/completions → Print Answer + Sources
                                         ↑
                              OPENROUTER_API_KEY from .env
                              OPENROUTER_MODEL  from .env  (fallback: mistralai/mistral-7b-instruct:free)
                              temperature = 0.3            (fixed constant)
```

## Step-by-Step Implementation Plan

### Step 1: Load OpenRouter config in ask.py

Read from `.env` at project root:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (fallback: `mistralai/mistral-7b-instruct:free`)

Both values are read from the environment — neither is exposed as a CLI flag.
Temperature is a fixed constant (`0.3`) defined at the top of the script.

Reuse the `load_dotenv_if_present()` pattern from `index_docs.py`.

Expected outcome:
- `ask.py` can access OpenRouter credentials and model name when `--llm` is used
- Temperature and model cannot be accidentally overridden via CLI

### Step 2: Add CLI flag

Add a single new flag to the existing argparse:

| Flag | Behaviour |
|---|---|
| `--llm` | Enables LLM answer generation (default: False) |

No `--model` flag. No `--temperature` flag.

When `--llm` is absent, make no changes to current output.

Expected outcome:
- Backward-compatible CLI
- Model selection is governed by `.env`, not the command line

### Step 3: Build the prompt function

A function that takes `(question, chunks)` and returns a prompt string.

Each chunk contributed should cite:
- `source` (filename)
- `chunk_id` (stable identifier)
- `chunk_order` (for ordering)

Expected outcome:
- Structured prompt with clear separation of context and question
- Citations embedded in the prompt so the LLM can reference them

### Step 4: Implement the OpenRouter API call

`model_name` is read from `OPENROUTER_MODEL` env var at startup; `temperature` is the fixed constant `0.3`.

```python
import httpx

response = httpx.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {api_key}",
    },
    json={
        "model": model_name,          # from OPENROUTER_MODEL env var
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,           # fixed constant
    },
    timeout=60.0,
)
response.raise_for_status()
answer = response.json()["choices"][0]["message"]["content"]
```

Expected outcome:
- LLM-generated answer returned as a string

### Step 5: Wire the LLM path into main()

After retrieving top-K chunks:

```python
if args.llm:
    prompt = build_prompt(args.query, top_chunks)
    answer = call_openrouter(prompt, api_key, model_name)
    print_answer_and_sources(answer, top_chunks)
```

If the API call fails (network, rate limit, key not set), print a clear error and fall back to showing the raw chunks.

Expected outcome:
- Single run can produce both chunk output and LLM answer

### Step 6: Format the output

When `--llm` is specified, print in this order:

```
Query: <question>

=== Answer ===
<LLM-generated answer with citations>

=== Sources ===
  #1  |  Score: 0.94  |  Source: handbook.pdf  |  chunk_id: example_org/handbook:c0003
  #2  |  Score: 0.87  |  Source: handbook.pdf  |  chunk_id: example_org/handbook:c0007
  ...
```

Expected outcome:
- User sees the natural-language answer first, then can inspect the source chunks

### Step 7: Error handling

Handle these cases gracefully:

| Scenario | Behaviour |
|---|---|
| `--llm` specified but no `.env` or missing key | Print error message, fall back to raw chunk output |
| OpenRouter API returns 429 (rate limit) | Print rate-limit message, suggest waiting or rotating model |
| OpenRouter API times out | Print timeout message, chunks are still shown |
| Network error | Print error, chunks still shown |
| `--llm` not specified | Identical to current behaviour |

Expected outcome:
- No silent failures; user always gets actionable output

## Validation Checklist

The feature is complete when all of these are true:

- [ ] `python3 playground/ask.py "question" --org example_org` (no `--llm`) produces exactly the same output as before
- [ ] `python3 playground/ask.py "question" --org example_org --llm` prints an answer + sources
- [ ] The answer cites source filenames and chunk IDs from the context
- [ ] Running with a missing API key prints a clear error and falls back to chunks
- [ ] Output is readable and well-formatted
- [ ] No changes to `index_docs.py`
- [ ] No secrets hard-coded or committed

## Future Considerations (not in scope)

- **Caching**: Cache LLM responses keyed by query embedding to avoid repeated API calls for similar questions
- **Streaming**: SSE-style streaming of the LLM answer for a more interactive feel
- **Supabase-backed retrieval**: Query Supabase pgvector instead of JSON files (Phase 1)
- **Multiple models**: Let the user pick from a list in a config

## Risks

### 1. OpenRouter rate limits

Free tier is ~20 requests/min. A quick `--llm` test is fine, but repeated runs will hit limits.

**Mitigation**: The `--llm` flag is opt-in. The non-LLM path is unchanged.

### 2. Prompt quality

The default prompt template may produce poor answers for certain query types.

**Mitigation**: Keep the prompt simple and iterate based on real queries. The chunk output is always available for debugging.

### 3. Token limit overflow

If `-n` is set high (e.g., `-n 20`) with large chunks, the prompt may exceed the model's context window.

**Mitigation**: Default `-n 3` keeps the budget safe. To use a larger context model, set `OPENROUTER_MODEL` in `.env` to e.g. `meta-llama/llama-3.1-8b-instruct:free` (128K context).
