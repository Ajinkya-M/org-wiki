# Org Wiki — Frontend (Next.js 14)

Web UI for the Org Wiki RAG backend (`playground/app/api.py`).

## Quick start (local dev)

```bash
# 1) Install dependencies
npm install

# 2) Copy env template
cp .env.local.example .env.local

# 3) Make sure the FastAPI backend is running on http://localhost:8000
#    uvicorn playground.app.api:app --reload --port 8000

# 4) Start the Next.js dev server
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (port 3000) with hot reload. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build (requires `build` first). |
| `npm run lint` | Lint with `next lint`. |
| `npm run typecheck` | TypeScript check only. |

## Environment variables

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the FastAPI backend. Read server-side by `/api/*` route handlers. |
| `NEXT_PUBLIC_DEFAULT_ORG` | Default org name when the user has not yet picked one. |

See `FRONTEND_PLAN.md` for the full design, component inventory, and UX specification.
