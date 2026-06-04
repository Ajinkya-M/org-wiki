# Org Wiki RAG

Organisational knowledge-base RAG system with PDF ingestion, semantic search, and LLM-generated answers with cited sources.

## Repository Structure

| Directory | Purpose |
|---|---|
| `playground/` | Python backend (FastAPI + Supabase pgvector + OpenRouter) |
| `frontend/` | Web UI (Next.js 14 App Router + Tailwind + TanStack Query) |
| `migrations/` | SQL schema for Supabase pgvector |
| `plan/` | Architecture and implementation plans |
| `AI_CONTEXT/` | Agent coordination state, decisions, task board |

---

## Backend — Local Development

### Prerequisites

- Python 3.10+
- A Supabase project with the schema from `migrations/001_initial_schema.sql` applied
- An OpenRouter API key (for LLM answer generation)

### Setup

```bash
# Install system deps (PDF parsing)
sudo apt-get update && sudo apt-get install -y poppler-utils

# Install Python packages (no virtualenv in this repo)
pip3 install --break-system-packages \
  pymupdf \
  sentence-transformers \
  numpy \
  supabase \
  python-dotenv \
  fastapi \
  "uvicorn[standard]" \
  httpx \
  python-multipart
```

### Environment

Create `.env` at the project root with:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
```

### Run

```bash
# Start the API server on port 8000
uvicorn playground.app.api:app --reload --port 8000

# Health check
curl http://localhost:8000/health
```

### CLI Tools

```bash
# Index PDFs into local JSON
python3 playground/app/index_docs.py playground/data/input --org my_org --store local

# Query from local embeddings
python3 playground/app/ask.py "What is the policy?" --org my_org -n 3

# Query with LLM-generated answer
python3 playground/app/ask.py "What is the policy?" --org my_org --llm
```

---

## Backend — Server Deployment

The backend can be deployed to any platform that runs Python + FastAPI (Fly.io, Render, Railway, etc.).

### Deploy to Fly.io (example)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
cd playground
fly launch
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OPENROUTER_API_KEY=...
fly deploy
```

### Environment variables required on the server

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | `service_role` key for backend access |
| `OPENROUTER_API_KEY` | No | Needed for LLM answer generation |
| `OPENROUTER_MODEL` | No | Model override (default: `mistralai/mistral-7b-instruct:free`) |

**Important:** The backend runs on CPU and loads an 80MB sentence-transformers model at startup (~10–30s cold start). Choose a host with sufficient RAM (≥512MB) and no cold-start timeout issues.

---

## Frontend — Local Development

### Prerequisites

- Node.js 18.17+ (the repo uses Node 24)
- The backend running on `http://localhost:8000`

### Setup

```bash
cd frontend

# Copy the environment template
cp .env.local.example .env.local

# Install dependencies (no postinstall scripts)
NEXT_TELEMETRY_DISABLED=1 npm install --ignore-scripts --no-audit
```

### Environment (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_ORG=default_org
```

`NEXT_PUBLIC_API_BASE_URL` is read server-side by the API Route Handlers (`/api/*`) to proxy requests to the FastAPI backend. The browser never calls the backend directly.

### Run

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Pages

| Path | Description |
|---|---|
| `/` | Ask questions, view markdown answers with cited sources |
| `/ingest` | Drag-and-drop PDF upload with per-file status |
| `/settings` | Configure API URL, default org, top-K, match threshold |

---

## Frontend — Vercel Deployment

The frontend is configured for Vercel deployment with zero additional config.

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the frontend/ directory
cd frontend
vercel
```

Or connect the GitHub repository in the Vercel dashboard — framework is auto-detected as Next.js.

### Environment variables (set in Vercel dashboard)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | URL of the deployed FastAPI backend (e.g. `https://org-wiki-api.fly.dev`) |
| `NEXT_PUBLIC_DEFAULT_ORG` | No | Default org for first-time visitors |

### Build settings (auto-detected)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Node version | 20.x (default) |

### Notes

- The API Route Handlers (`/api/*`) run as serverless functions and proxy to the backend.
- No CORS configuration is needed because the browser only talks to the Next.js origin.
- Free-tier Vercel functions have a 10s timeout. If LLM responses regularly exceed this, upgrade to the Pro plan (60s timeout) or implement streaming in a future iteration.
- The backend must be publicly reachable from Vercel. If the backend is behind a firewall or VPN, the proxy will return a 502 error.

---

## Running Full Stack Locally

```bash
# Terminal 1 — Backend (project root)
uvicorn playground.app.api:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend proxies API calls through `/api/health`, `/api/ingest`, and `/api/query` to the backend at `http://localhost:8000`.

---

## Project Status

See `AI_CONTEXT/PROJECT_STATE.md`, `AI_CONTEXT/TASK_BOARD.md`, and `AI_CONTEXT/DECISIONS.md` for the latest progress and coordination notes.
