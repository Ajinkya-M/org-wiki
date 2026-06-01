# Playground Layout

This directory contains the working prototype vertical slice.

## Structure

- `app/` - runnable playground scripts and API module.
- `tests/` - connectivity and smoke-test scripts.
- `data/input/` - local sample PDFs (gitignored).
- `data/embeddings/` - local JSON embeddings by organisation (gitignored).

## Common Commands

```bash
python3 playground/app/index_docs.py playground/data/input --org default_org --store local
python3 playground/app/ask.py "What is the roadside assistance policy?" --org default_org --llm
uvicorn playground.app.api:app --reload
python3 playground/tests/test_supabase.py
python3 playground/tests/test_openrouter.py
```
