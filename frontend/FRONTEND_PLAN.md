# Frontend Plan — Org Wiki Next.js App

> **Status:** Plan written 2026-06-04 Europe/London. Implementation will follow section 8 (Implementation Order) of this document.
>
> **Backend contract reference:** `playground/app/api.py` (FastAPI, runs at `http://localhost:8000` for local dev).

---

## 0. Goals & Non-Goals

### Goals

- Provide a usable web UI for the existing RAG backend (PDF ingest, question answering with cited sources).
- Enforce the `org` scoping rules and stable `chunk_id` citation policy from the architecture docs.
- Hide the FastAPI base URL behind a single Next.js Route Handler proxy so the browser never talks to the backend directly.
- Be deployable to Vercel with zero additional backend changes for the local-dev experience (proxy mode for dev, see §9).

### Non-Goals (out of scope for this task)

- Authentication / Supabase RLS (deferred to a later phase per `plan/architecture/rag-system-design.md` §5).
- Server-side rendering of answers (answers are streamed/slow; client rendering with skeletons is sufficient).
- A document registry page backed by `GET /documents` (backend does not implement it; UI shows a placeholder).
- Document deletion UI.
- Streaming responses / SSE — accept a single blocking `POST /query` and show elapsed time.

---

## 1. Project Structure

All frontend code lives under `frontend/` at the project root. File tree below shows every file the implementation will create; one-line descriptions are inline.

```
frontend/
├── .env.local.example                # Template for NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_DEFAULT_ORG
├── .gitignore                        # Frontend-specific ignores (node_modules, .next, .env.local, out)
├── .eslintrc.json                    # Next.js default ESLint config
├── README.md                         # How to run the frontend locally
├── next.config.mjs                   # Next.js config (Next.js 14 does not support .ts configs)
├── package.json                      # Dependencies and scripts
├── postcss.config.mjs                # Tailwind PostCSS config
├── tailwind.config.ts                # Tailwind theme + shadcn/ui tokens
├── tsconfig.json                     # TypeScript config (strict, path alias @/*)
├── components.json                   # shadcn/ui CLI config
├── FRONTEND_PLAN.md                  # This document
│
├── public/
│   └── favicon.ico                   # Default favicon
│
└── src/
    ├── app/
    │   ├── layout.tsx                # Root layout: Providers, Navbar, global Tailwind
    │   ├── globals.css               # Tailwind base + shadcn/ui CSS variables
    │   ├── page.tsx                  # Query page (/) — primary
    │   ├── ingest/
    │   │   └── page.tsx              # Document management (/ingest) — drag/drop + status
    │   ├── settings/
    │   │   └── page.tsx              # Settings (/settings) — API URL, defaults, test connection
    │   └── api/
    │       ├── health/route.ts       # GET  /api/health  → proxy GET  /health
    │       ├── ingest/route.ts       # POST /api/ingest  → proxy POST /ingest (multipart)
    │       └── query/route.ts        # POST /api/query   → proxy POST /query  (json)
    │
    ├── components/
    │   ├── ui/                       # shadcn/ui primitives (button, input, textarea, card, slider, badge, label, sonner)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── textarea.tsx
    │   │   ├── card.tsx
    │   │   ├── slider.tsx
    │   │   ├── badge.tsx
    │   │   ├── label.tsx
    │   │   └── sonner.tsx
    │   ├── layout/
    │   │   ├── navbar.tsx            # Top nav: app name, org selector, links
    │   │   └── providers.tsx         # Wraps app with QueryClientProvider + Toaster
    │   ├── org/
    │   │   └── org-selector.tsx      # Dropdown + free-text input for current org
    │   ├── query/
    │   │   ├── question-form.tsx     # Textarea + submit, Ctrl+Enter, history chips
    │   │   ├── answer-card.tsx       # Markdown render of LLM answer + elapsed time
    │   │   ├── sources-list.tsx      # Collapsible list of cited sources
    │   │   ├── source-item.tsx       # One source row (filename, %, chunk_id, doc_id)
    │   │   ├── query-history.tsx     # Chips of last 10 queries from sessionStorage
    │   │   └── query-empty-state.tsx # Centered "Ask a question to get started" panel
    │   ├── ingest/
    │   │   ├── dropzone.tsx          # react-dropzone wrapper (PDF only)
    │   │   ├── file-list.tsx         # Staged files with size + remove button
    │   │   ├── upload-progress.tsx   # Per-file status: queued → uploading → indexed/error
    │   │   └── registry-placeholder.tsx # "Document registry coming soon" panel
    │   └── settings/
    │       ├── settings-form.tsx     # Form fields bound to localStorage
    │       └── test-connection-button.tsx # Calls /api/health and shows result inline
    │
    ├── hooks/
    │   ├── use-org.ts                # Reads/writes current org from OrgContext
    │   ├── use-settings.ts           # Reads/writes settings to localStorage
    │   ├── use-health.ts             # React Query wrapper for GET /api/health
    │   ├── use-query-rag.ts          # React Query mutation for POST /api/query
    │   └── use-ingest.ts             # React Query mutation for POST /api/ingest
    │
    ├── lib/
    │   ├── api-client.ts             # Browser-side fetcher that targets /api/* proxy routes
    │   ├── backend.ts                # Server-side helper to call FastAPI from Route Handlers
    │   ├── org-context.tsx           # React context providing { org, setOrg }
    │   ├── query-history.ts          # sessionStorage helpers for last 10 queries
    │   ├── settings-storage.ts       # localStorage helpers for settings
    │   ├── format.ts                 # formatSimilarity (0.874 → "87%"), formatBytes
    │   └── utils.ts                  # shadcn/ui cn() helper
    │
    └── types/
        └── api.ts                    # HealthResponse, IngestResponse, QueryRequest, QueryResponse, Source, etc.
```

---

## 2. Environment & Setup

### 2.1 npm Packages (exact versions, latest stable as of plan date)

**dependencies**

| Package | Version | Purpose |
|---|---|---|
| `next` | `14.2.18` | App Router framework |
| `react` | `18.3.1` | UI runtime |
| `react-dom` | `18.3.1` | DOM renderer |
| `@tanstack/react-query` | `5.59.0` | Server-state cache + mutations |
| `@tanstack/react-query-devtools` | `5.59.0` | Dev-only cache inspector |
| `react-markdown` | `9.0.1` | Render LLM answer markdown safely |
| `remark-gfm` | `4.0.0` | GitHub-flavoured markdown (tables, lists) |
| `react-dropzone` | `14.2.10` | Drag-and-drop file input for PDFs |
| `sonner` | `1.7.0` | Toast notifications (lightweight, shadcn/ui-compatible) |
| `lucide-react` | `0.460.0` | Icon set used by shadcn/ui |
| `class-variance-authority` | `0.7.0` | Variants helper for shadcn/ui |
| `clsx` | `2.1.1` | ClassName merge |
| `tailwind-merge` | `2.5.4` | ClassName merge with Tailwind awareness |
| `@radix-ui/react-slot` | `1.1.0` | shadcn/ui `asChild` prop |
| `@radix-ui/react-slider` | `1.2.0` | shadcn/ui Slider |
| `@radix-ui/react-label` | `2.1.0` | shadcn/ui Label |

**devDependencies**

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `5.6.3` | Type system |
| `@types/node` | `22.9.0` | Node typings |
| `@types/react` | `18.3.12` | React typings |
| `@types/react-dom` | `18.3.1` | React DOM typings |
| `tailwindcss` | `3.4.14` | Utility-first CSS |
| `tailwindcss-animate` | `1.0.7` | shadcn/ui animation utility |
| `postcss` | `8.4.49` | PostCSS for Tailwind |
| `autoprefixer` | `10.4.20` | Vendor prefixes |
| `eslint` | `8.57.1` | Linter |
| `eslint-config-next` | `14.2.18` | Next.js ESLint rules |

### 2.2 `.env.local.example`

```bash
# Public base URL of the FastAPI backend. Used by Next.js Route Handlers (server-side).
# In Vercel production, this must point to the deployed backend URL.
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Default org value when the user has not yet picked one in the UI.
NEXT_PUBLIC_DEFAULT_ORG=default_org
```

> Note: `NEXT_PUBLIC_*` values are exposed to the browser. We use them only for the **proxy route** base URL (the proxy itself runs server-side; we still read it in the client only to display the configured value in Settings). The actual backend URL is read server-side from `process.env.NEXT_PUBLIC_API_BASE_URL` inside `src/lib/backend.ts`.

### 2.3 shadcn/ui components to initialise

The implementation will not run the shadcn CLI (offline-friendly manual init). Instead, the **exact source for these primitives** will be copied into `src/components/ui/`:

- `button` — used in forms and CTAs.
- `input` — text input in settings + org selector.
- `textarea` — question input on `/`.
- `card` — sections of the query answer and ingest page.
- `slider` — match threshold on settings page.
- `badge` — display similarity percent, org name in navbar.
- `label` — form labels in settings.
- `sonner` — toast notifications for upload success / query errors.

A minimal `components.json` will be present so the shadcn CLI can be used later to add more components.

### 2.4 `next.config.mjs` requirements

Note: Next.js 14 does not support `.ts` config files — use `.mjs` or `.js`.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- No image domains configured (no images in MVP).
- No rewrites needed for local dev (proxy route handlers handle the conversion).
- For Vercel production, see §9.

### 2.5 `tsconfig.json` requirements

- `"strict": true`
- `"target": "ES2022"`
- `"module": "esnext"`
- `"moduleResolution": "bundler"`
- `"jsx": "preserve"`
- `"paths": { "@/*": ["./src/*"] }`
- `"plugins": [{ "name": "next" }]`
- `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`
- `"exclude": ["node_modules"]`

### 2.6 `tailwind.config.ts` requirements

- Enable Tailwind content scanning for `src/**/*.{ts,tsx}`.
- shadcn/ui CSS variables under `:root` and `.dark` (light theme only for MVP).
- `darkMode: ["class"]` (so a dark mode toggle can be added later without refactor).
- `plugins: [require("tailwindcss-animate")]`.

### 2.7 Root dependencies vs frontend isolation

The frontend is fully decoupled from the Python project. There is no monorepo tooling (no workspaces, no turbo) — `npm install` happens in `frontend/` only. The Python backend runs separately as documented in the task prompt.

---

## 3. Routing & Pages

All routes use the Next.js App Router. Every page is a client component **except** the root `layout.tsx` and the API Route Handlers (which are server-only by default).

### 3.1 `/` — Query Page (primary)

| Field | Value |
|---|---|
| **Path** | `/` |
| **Purpose** | Ask a question, view LLM answer with cited sources, browse recent history. |
| **Key components** | `QuestionForm`, `AnswerCard`, `SourcesList`, `QueryHistory`, `QueryEmptyState` |
| **Data fetching** | Client-only via React Query. `useQueryRag` is a `useMutation` triggered by form submit; no SSR fetch. |
| **Loading state** | Skeleton placeholder for answer area (3 gray bars), elapsed seconds counter ("Thinking... 4s"), disabled submit button. |
| **Error state** | Inline `Card` with destructive border showing `error.message` (FastAPI may return `"No matches found for org ..."` for 404). Provide "Retry" button. |
| **Empty state** | Centered illustration + copy when no query has been run yet (`QueryEmptyState`). |
| **Layout** | Full-height column: navbar → history chips → question form → (skeleton or answer+source list). |

### 3.2 `/ingest` — Document Management

| Field | Value |
|---|---|
| **Path** | `/ingest` |
| **Purpose** | Upload one or more PDFs to the configured org, observe per-file indexing status. |
| **Key components** | `Dropzone`, `FileList`, `UploadProgress`, `RegistryPlaceholder` |
| **Data fetching** | Client-only. `useIngest` mutation per file (sequential to avoid backend overload). On page load, `useHealth` calls `/api/health` to display backend reachability. |
| **Loading state** | Per-file status badge changes colour; upload button shows spinner while in flight. |
| **Error state** | Inline error text on the file row + a toast via `sonner` for top-level errors (e.g. backend down). |
| **Empty state** | No files staged: dropzone is the only visible element. Below it: registry placeholder. |
| **Layout** | Navbar → org field → dropzone → file list → "Indexed Documents" section with placeholder. |

### 3.3 `/settings` — Settings

| Field | Value |
|---|---|
| **Path** | `/settings` |
| **Purpose** | Persist user-tunable defaults (API base URL, default org, top-K, match threshold) and run a connection test. |
| **Key components** | `SettingsForm`, `TestConnectionButton` |
| **Data fetching** | No SSR. `useHealth` is reused to run a connection test. |
| **Loading state** | Test button shows spinner during the `/api/health` round trip. |
| **Error state** | Inline result card: red border for failure (with `error.message`), green for success ("Backend reachable"). |
| **Empty state** | None — form is always populated with current values (or defaults on first visit). |
| **Layout** | Navbar → card with four form fields → save button → test connection section. |

### 3.4 API Route Handlers (server-side)

| Path | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Proxy to `GET /health`; returns `{ status: "ok" }` on success. |
| `/api/ingest` | POST | Proxy to `POST /ingest`; accepts multipart form (`file`, optional `org`). |
| `/api/query` | POST | Proxy to `POST /query`; accepts JSON body, returns answer + sources. |

All three are server-only; they read `process.env.NEXT_PUBLIC_API_BASE_URL` (server-side) and forward to the FastAPI backend.

---

## 4. Component Inventory

### 4.1 Layout components

#### `src/components/layout/navbar.tsx`

- **Props:** none (reads context).
- **Responsibilities:** render top navbar with app name "Org Wiki", `OrgSelector` dropdown, navigation links to `/`, `/ingest`, `/settings`.
- **API touches:** none directly.

#### `src/components/layout/providers.tsx`

- **Props:** `{ children: ReactNode }`.
- **Responsibilities:** wrap tree in `QueryClientProvider`, mount `<Toaster />` from `sonner`, hydrate `OrgContext` from `localStorage` + `NEXT_PUBLIC_DEFAULT_ORG`.
- **API touches:** none.

### 4.2 Org components

#### `src/components/org/org-selector.tsx`

- **Props:** none.
- **Type:**
  ```ts
  // Reads OrgContext; no own props.
  ```
- **Responsibilities:** render a `Button` (current org as label) that toggles a small popover with: (a) a list of recent orgs from `localStorage`, (b) an `Input` for typing a new custom org, (c) a Save button. Closes on `Esc` or click outside.
- **API touches:** none.

### 4.3 Query page components

#### `src/components/query/question-form.tsx`

- **Props:** none.
- **Type:**
  ```ts
  interface QuestionFormProps {
    onSubmit: (question: string) => void;
    isPending: boolean;
  }
  ```
- **Responsibilities:** controlled `Textarea` (4 rows, resizable), `Button` (Submit), `Ctrl+Enter` keyboard shortcut, disabled while `isPending`, character counter at bottom-right.
- **API touches:** none directly; calls `onSubmit` from parent.

#### `src/components/query/answer-card.tsx`

- **Props:**
  ```ts
  interface AnswerCardProps {
    question: string;
    answer: string;
    model: string;
    org: string;
    elapsedSeconds: number;
  }
  ```
- **Responsibilities:** display a `Card` with the question as header, `react-markdown` body for the answer (with `remark-gfm`), small footer with `model` and `org` badges.
- **API touches:** none.

#### `src/components/query/sources-list.tsx`

- **Props:**
  ```ts
  interface SourcesListProps {
    sources: Source[];
  }
  ```
- **Responsibilities:** collapsible list of `SourceItem` rows. Default expanded when there is at least one source. Header shows count.
- **API touches:** none.

#### `src/components/query/source-item.tsx`

- **Props:** `{ source: Source }` (the type from `src/types/api.ts`).
- **Responsibilities:** render one source row: filename (truncated with tooltip), similarity percent badge, monospace `chunk_id`, small `doc_id` text. Hover reveals the source string.
- **API touches:** none.

#### `src/components/query/query-history.tsx`

- **Props:** `{ onSelect: (q: string) => void }`.
- **Responsibilities:** read the last 10 queries from `sessionStorage` and render them as clickable `Badge` chips. Empty if no history.
- **API touches:** none.

#### `src/components/query/query-empty-state.tsx`

- **Props:** none.
- **Responsibilities:** centered icon + copy ("Ask a question to get started"). No state.

### 4.4 Ingest page components

#### `src/components/ingest/dropzone.tsx`

- **Props:** `{ onFiles: (files: File[]) => void; disabled?: boolean }`.
- **Responsibilities:** wrap `react-dropzone` with `accept: { "application/pdf": [".pdf"] }`, `multiple: true`, `maxSize: 50 * 1024 * 1024`. Shows a dashed border, PDF icon, helper text. Rejects non-PDFs with a toast.
- **API touches:** none.

#### `src/components/ingest/file-list.tsx`

- **Props:**
  ```ts
  interface FileListProps {
    files: StagedFile[];
    onRemove: (id: string) => void;
  }
  interface StagedFile {
    id: string;        // crypto.randomUUID()
    file: File;
    status: "queued" | "uploading" | "indexed" | "error";
    error?: string;
    result?: { doc_id: string; chunk_count: number };
  }
  ```
- **Responsibilities:** render each `StagedFile` as a row with name, size, status badge, remove button (only when `queued` or `error`).
- **API touches:** none directly.

#### `src/components/ingest/upload-progress.tsx`

- **Props:** `{ file: StagedFile }`.
- **Responsibilities:** visual status indicator: queued (gray), uploading (animated spinner + "Uploading…"), indexed (green check + chunk count), error (red x + message).
- **API touches:** none.

#### `src/components/ingest/registry-placeholder.tsx`

- **Props:** none.
- **Responsibilities:** render a `Card` with a note: "Document registry coming soon" and an explanation. No fetch attempts.

### 4.5 Settings page components

#### `src/components/settings/settings-form.tsx`

- **Props:** none.
- **Responsibilities:** controlled form for `apiBaseUrl`, `defaultOrg`, `topK`, `matchThreshold`. Save button writes to `localStorage` via `useSettings`. Show inline success toast.
- **API touches:** none.

#### `src/components/settings/test-connection-button.tsx`

- **Props:** none.
- **Responsibilities:** `Button` that triggers `useHealth` and renders an inline `Card` with the result: success ("Backend reachable at …") or error (the error message). Auto-dismisses on success after 4s.

### 4.6 Hooks

| Hook | Returns | Notes |
|---|---|---|
| `useOrg` | `{ org: string; setOrg: (s: string) => void; recentOrgs: string[] }` | Backed by `OrgContext` (in-memory + localStorage). |
| `useSettings` | `{ settings, update, reset }` | All reads/writes go through `lib/settings-storage.ts`. |
| `useHealth` | `UseQueryResult<HealthResponse>` | Calls `GET /api/health`. `staleTime: 30_000`. |
| `useQueryRag` | `UseMutationResult<QueryResponse, Error, QueryRequest>` | Calls `POST /api/query`. `retry: 0` (LLM is slow; no point retrying). |
| `useIngest` | `UseMutationResult<IngestResponse, Error, FormData>` | Calls `POST /api/ingest`. `retry: 0`. |

---

## 5. API Proxy Layer

All three Route Handlers live in `src/app/api/*/route.ts`. They are server-only (no `import` from `@/hooks` or React). They share one helper: `src/lib/backend.ts`, which:

- Reads `process.env.NEXT_PUBLIC_API_BASE_URL` once at module load and falls back to `http://localhost:8000` with a console warning.
- Exposes a thin `request(path, init)` function that uses the global `fetch` and propagates non-2xx responses with their JSON body.
- Adds a default `timeout` (30s for `query`, 120s for `ingest`, 10s for `health`) via `AbortController`.

### 5.1 `GET /api/health`

- **Input:** none.
- **Output:** `{ status: "ok" }` (200) or backend error JSON (502 with the original error body).
- **Backend call:** `GET ${API_BASE}/health`.
- **Error handling:** if backend unreachable, return `503 { error: "Backend not reachable at <url>" }`. Log to server console.

### 5.2 `POST /api/ingest`

- **Input:** multipart form with `file` (PDF) and optional `org`.
- **Output:** `IngestResponse` (200) on success.
- **Backend call:** `POST ${API_BASE}/ingest` with the same `FormData` forwarded.
- **Error handling:**
  - If `file` missing or not a PDF (by extension or `Content-Type` starting with `application/pdf`): return `400 { error: "Only PDF files are supported." }`.
  - If backend returns 4xx/5xx, forward the JSON body with the same status code.

### 5.3 `POST /api/query`

- **Input:** `QueryRequest` JSON body.
- **Output:** `QueryResponse` JSON (200).
- **Backend call:** `POST ${API_BASE}/query` with JSON body.
- **Error handling:**
  - If `question` missing/empty: `400 { error: "Question cannot be empty." }`.
  - If backend 4xx: forward status + body. If 5xx or network error: return `502 { error: "Backend error: <message>" }`.
  - No request body size limit beyond Next.js default; the request is small JSON.

---

## 6. State & Data Flow

### 6.1 Where state lives

| State | Location | Why |
|---|---|---|
| `org` (current selection) | `OrgContext` (in-memory) + `localStorage` (persisted, key `orgwiki:org`) | Shared across pages; must survive refresh. |
| `recentOrgs` (last 5 orgs ever selected) | `localStorage` (`orgwiki:recent_orgs`) | Powers the dropdown suggestions. |
| `defaultOrg` (env fallback) | `NEXT_PUBLIC_DEFAULT_ORG` env, read in `Providers` once on mount | Default before any user choice. |
| `apiBaseUrl`, `topK`, `matchThreshold` | `localStorage` (`orgwiki:settings`) | User preferences, not org-scoped. |
| Server data (health, query, ingest results) | React Query cache | The right tool for server state; gives us loading/error/retry semantics for free. |
| Query history (last 10 questions) | `sessionStorage` (`orgwiki:query_history`) | Required by spec; session-scoped (cleared when tab closes). |
| Staged files for upload | Component-local `useState` in `/ingest` page | Ephemeral; lost on navigation by design. |

### 6.2 How `org` flows through the app

1. On first load, `OrgContext.Provider` reads `localStorage["orgwiki:org"]`. If missing, it uses `process.env.NEXT_PUBLIC_DEFAULT_ORG || "default_org"`.
2. `OrgSelector` calls `setOrg(newOrg)`, which updates context, writes to `localStorage`, and prepends to `recentOrgs` (deduped, capped at 5).
3. `useQueryRag`, `useIngest`, and the `/ingest` page read `org` from `useOrg()` and pass it into the request body / form field.
4. **Org switch semantics:** React Query queries are keyed by `[org, ...]`. Switching org does not auto-invalidate; the next user action (new question, new upload) creates a new cache entry. No pending mutations are aborted on org change (the user explicitly confirmed). In-flight responses are kept as-is; UI shows the new `org` badge.

### 6.3 Query history flow

- On a successful `useQueryRag` mutation, `lib/query-history.ts` prepends the question text and trims to 10.
- `QueryHistory` is mounted on `/` and reads from `sessionStorage` on render (no React Query — it's purely client state).
- Clicking a chip calls `onSelect(q)` which the page uses to call `questionForm`'s `setValue` and submit immediately.

### 6.4 Settings flow

- `useSettings` exposes a `settings` object (with defaults) and an `update(partial)` method.
- `SettingsForm` is fully controlled by `useSettings`; no internal state.
- The Query and Ingest pages read `topK` and `matchThreshold` from `useSettings` (not env), so the user-tuned values take effect immediately. `apiBaseUrl` is **not** read by the client (it is read server-side by the proxy); the Settings page shows a "Restart required" hint if the user changes the API base URL.

---

## 7. UX Behaviour Spec

### 7.1 PDF upload flow (`/ingest`)

1. **Drop or select files.** `react-dropzone` shows a hover highlight; non-PDFs are rejected with a toast: "Only PDF files are supported."
2. **Stage files.** Accepted files appear in the file list with status `queued`. Each row has: filename, size (KB/MB), status badge, remove button.
3. **Click "Upload"** (disabled until at least one file is staged).
4. **Sequential upload** — for each staged file in order:
   - Status becomes `uploading` (animated).
   - `FormData` built with the file and the current org.
   - `useIngest` mutation fires; on success status becomes `indexed` (green check + "X chunks").
   - On error status becomes `error` (red x + message); the next file still tries.
5. **Toast summary** at the end: "N uploaded, M failed."
6. **Empty state:** no files → only the dropzone is visible.
7. **Network down:** the first file fails fast with a clear error; subsequent files abort early with a toast.

### 7.2 Ask question flow (`/`)

1. **Empty state:** centered icon + "Ask a question to get started." Below it, the question form is still mounted but the answer area is the empty state.
2. **Type a question** in the textarea. Submit via `Button` or `Ctrl+Enter`. `Shift+Enter` inserts a newline.
3. **On submit:**
   - Mutation triggers. Form disabled.
   - Elapsed-time counter starts at 0 and updates every 1s ("Thinking… 4s").
   - Answer area shows a 3-bar skeleton.
4. **On success:** skeleton replaced by `AnswerCard`; sources section appears below.
5. **On error:** skeleton replaced by an error card with the message and a Retry button that re-submits the same question.
6. **History chip click:** fills the textarea and submits immediately (no separate preview).
7. **Slow LLM (up to 60s):** elapsed counter ticks up; the spinner is always visible; no timeout from the client side. The proxy route's 30s `AbortController` is intentionally set high (e.g. 90s) to avoid cutting off valid responses.

### 7.3 Org switching

- `OrgSelector` dropdown shows: current org, recent orgs (up to 5), a free-text input + "Set org" button.
- Picking an org updates context + localStorage atomically.
- A small badge near the navbar always shows the **current org** (helps the user remember which namespace they're querying).
- If the user changes org while a request is in flight, the in-flight response is **discarded** by React Query (we key the mutation by `org` so the result is stored under the org it was sent for; if the user has moved on, the result is shown only if org matches — but the UI is currently single-result, so the latest success always wins. The org badge on the answer card shows which org the answer is for, preventing confusion).
- No automatic cache invalidation on org switch (the cache is per-query-key, so the old org's data remains warm).

### 7.4 Error states

| Scenario | Where it shows | Recovery |
|---|---|---|
| Backend down (network) | Inline error card on the page that triggered the call; toast for uploads. | "Retry" button (query) or "Upload" button (ingest). |
| FastAPI 4xx (e.g. 400 empty question, 404 no matches) | Inline error card with the FastAPI `detail` message. | "Retry" (query) or modify input. |
| FastAPI 5xx / timeout | Inline error card with a generic "Backend error: …" message. | "Retry" button. |
| No results (404 "No matches found for org …") | Inline card explaining the org has no indexed documents; CTA to `/ingest`. | Link to `/ingest` to upload a PDF. |
| Slow LLM (>20s) | Elapsed counter visible throughout; skeleton keeps animating. | Just wait — no client-side timeout. |
| Invalid file (non-PDF) | Toast: "Only PDF files are supported." File is not added. | Pick a PDF. |
| File too large (>50MB) | Toast: "File exceeds 50MB limit." File is not added. | Pick a smaller PDF. |

---

## 8. Implementation Order

Each task is small enough to implement and verify independently. Tasks are sequential — do not move on until the previous one builds and runs.

1. **Scaffold project** — `npm init`, install dependencies from §2.1, create `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `.gitignore`, `.env.local.example`. **Verify:** `npx tsc --noEmit` runs without errors.
2. **Type definitions** — write `src/types/api.ts` with all request/response shapes (§5). **Verify:** `npx tsc --noEmit` clean.
3. **shadcn/ui primitives** — copy the source for `button`, `input`, `textarea`, `card`, `slider`, `badge`, `label`, `sonner`, and `lib/utils.ts` into `src/components/ui/` and `src/lib/`. Write `src/app/globals.css` with the Tailwind base + shadcn variables. **Verify:** dev server starts; the home page renders a shadcn button.
4. **Backend proxy layer** — write `src/lib/backend.ts` and the three route handlers in `src/app/api/{health,ingest,query}/route.ts`. **Verify:** `curl http://localhost:3000/api/health` (with backend up) returns `{ status: "ok" }`.
5. **React Query setup + providers** — write `src/components/layout/providers.tsx` with `QueryClientProvider` and `Toaster`. **Verify:** dev server still starts.
6. **Org context + selector** — write `src/lib/org-context.tsx`, `src/hooks/use-org.ts`, `src/components/org/org-selector.tsx`. **Verify:** selecting an org persists across refresh.
7. **Settings storage + hook** — write `src/lib/settings-storage.ts`, `src/hooks/use-settings.ts`. **Verify:** in dev tools, `localStorage["orgwiki:settings"]` updates on change.
8. **Layout + navbar** — write `src/app/layout.tsx`, `src/components/layout/navbar.tsx`, register `globals.css`. **Verify:** all three routes render the navbar.
9. **Query history utility** — write `src/lib/query-history.ts`. **Verify:** unit-style assertion in the page that pushing a question and re-reading returns it.
10. **Hooks for API** — write `src/hooks/use-health.ts`, `use-query-rag.ts`, `use-ingest.ts`, and `src/lib/api-client.ts`. **Verify:** calling `useHealth` from a temporary debug page returns the FastAPI health.
11. **Settings page** — `src/app/settings/page.tsx`, `src/components/settings/{settings-form,test-connection-button}.tsx`. **Verify:** save + test connection work end-to-end.
12. **Query page** — `src/app/page.tsx`, `src/components/query/*`. **Verify:** submit a real question, see the markdown answer + sources, with elapsed counter.
13. **Ingest page** — `src/app/ingest/page.tsx`, `src/components/ingest/*`. **Verify:** drop a PDF, see status transitions, see "indexed" success.
14. **Build + lint pass** — `npm run build`, `npx tsc --noEmit`, `npm run lint`. **Verify:** zero errors. Fix any.

The completion of every task updates `AI_CONTEXT/CHANGELOG.md` and the `TASK_BOARD.md` row (single combined entry at the end is acceptable for the full implementation sweep).

---

## 9. Vercel Deployment Notes

### 9.1 Environment variables

Set in Vercel project settings (Production + Preview):

| Name | Value (example) | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.orgwiki.example.com` | URL of the FastAPI backend. Must be reachable from Vercel functions. |
| `NEXT_PUBLIC_DEFAULT_ORG` | `default_org` | Default org for first-time visitors. |

> ⚠️ The current FastAPI backend is designed to run locally on port 8000. To deploy the frontend to Vercel, the backend must be deployed somewhere reachable from the public internet (Fly.io / Render free tier, as suggested in `plan/architecture/rag-system-design.md` §4). This is **out of scope** for the frontend task — the proxy will use `NEXT_PUBLIC_API_BASE_URL` and fail with a clear error if the URL is unreachable.

### 9.2 `next.config.ts` rewrites

**None required for the MVP.** The Next.js Route Handlers (`/api/*`) handle the proxy. If the backend is later moved behind the same Vercel domain, we can add a `rewrites()` block, but the proxy architecture already isolates the browser from CORS issues.

### 9.3 CORS

By routing all backend calls through server-side Route Handlers, the browser only ever talks to the Next.js origin. No CORS configuration is needed in the FastAPI app for this frontend.

### 9.4 Backend reachability

For local dev: backend on `http://localhost:8000`, frontend on `http://localhost:3000`. They communicate via the proxy routes, which call `process.env.NEXT_PUBLIC_API_BASE_URL` (server-side) — there is no browser → backend direct call.

For Vercel preview/production: the user must set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL. If unset or unreachable, every API call will return a clear 502/503 error from the proxy with a useful message.

### 9.5 Build settings

- Framework preset: **Next.js** (auto-detected).
- Build command: `npm run build` (default).
- Output directory: `.next` (default).
- Node version: 20.x (Vercel default).
- No custom install command needed.

---

## 10. Open Questions / Risks

- **Risk:** `react-markdown` render of untrusted model output. We pass the LLM `answer` directly. Mitigation: rely on `react-markdown`'s safe-by-default rendering (no `dangerouslyAllow` plugins). Add `rehype-sanitize` only if we see XSS in testing — for MVP, default escaping is sufficient because the model output is text, not raw HTML.
- **Risk:** Long LLM responses can exceed Vercel's 10s function timeout on the **Hobby plan**. Mitigation: upgrade to **Pro plan** (60s timeout) for the production deploy, or stream responses via SSE in a later iteration. For MVP, the proxy route uses Node.js runtime (default for Route Handlers) which respects the configured function timeout.
- **Risk:** Org switch race condition (user submits, switches org, old answer arrives). Mitigation: include the request's `org` in the response and display it as a badge on the answer card so the user can see which org the answer belongs to. We do **not** auto-abandon in-flight mutations on org change to keep the code simple.
- **Open question:** Whether to add a dark mode toggle. **Decision:** ship light mode only; theme tokens are defined so adding dark mode later is a class-on-`<html>` change.
- **Open question:** Whether to add a "Clear history" button. **Decision:** out of scope for MVP; sessionStorage clears on tab close, which is the spec.
