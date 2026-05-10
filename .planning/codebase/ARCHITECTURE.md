<!-- refreshed: 2026-05-10 -->
# Architecture

**Analysis Date:** 2026-05-10

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                              │
│  `frontend/src/`                                                     │
├──────────────────────┬──────────────────────┬───────────────────────┤
│  Pages               │  Components           │  Lib / Context       │
│  `pages/Workbench.jsx`│  `components/`        │  `lib/api.js`        │
│  `pages/Login.jsx`   │  Sidebar, Toolbar,     │  `context/AuthContext`│
│  `pages/ShareView.jsx`│  EditorPane,OutputPane,│  `lib/utils.js`      │
│                       │  MetaBar               │                      │
└──────────┬───────────┴──────────┬──────────┴──────────┬────────────┘
           │ HTTP/SSE (fetch/axios)│                     │
           │ withCredentials:true  │                     │
           ▼                      ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                                │
│  `backend/server.py`  (single-file, 868 lines)                      │
│                                                                      │
│  API Routes (APIRouter prefix="/api"):                                │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Auth      │  │ Patterns      │  │ Optimize    │  │ Prompts CRUD│  │
│  │ /auth/*   │  │ /patterns     │  │ /optimize*  │  │ /prompts/*  │  │
│  └───────────┘  └──────────────┘  └─────┬───────┘  └──────┬──────┘  │
│                                          │                  │         │
│                                          ▼                  ▼         │
│                              ┌──────────────────────────────┐        │
│                              │  Nvidia NIM (OpenAI client)   │        │
│                              │  meta/llama-3.3-70b-instruct  │        │
│                              └──────────────┬───────────────┘        │
└─────────────────────────────────────────────┼────────────────────────┘
                                              │
                                              ▼
                    ┌──────────────────────────────────────────────┐
                    │              MongoDB (via Motor)              │
                    │  DB: pattern_refine                            │
                    │  Collections: users, user_sessions, patterns,  │
                    │    prompts, optimization_runs                  │
                    └──────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Backend App** | FastAPI entry point, route registration, CORS, shutdown | `backend/server.py` |
| **Patterns Seed** | 6 Fabric-style system prompt templates | `backend/patterns_seed.py` |
| **Frontend Entry** | React root render, global CSS | `frontend/src/index.js` |
| **App Shell** | Router setup, dark mode class, AuthProvider wrapper | `frontend/src/App.js` |
| **AuthContext** | User state, session check (skipped on OAuth callback), logout | `frontend/src/context/AuthContext.jsx` |
| **API Client** | Axios instance (withCredentials), all endpoint wrappers, SSE stream handler | `frontend/src/lib/api.js` |
| **Utils** | `cn()` Tailwind class merge helper | `frontend/src/lib/utils.js` |
| **Login Page** | Google OAuth redirect, full-screen marketing layout | `frontend/src/pages/Login.jsx` |
| **AuthCallback** | Session exchange, hash cleanup, redirect to /app | `frontend/src/pages/AuthCallback.jsx` |
| **Workbench** | Main app: state management for active prompt, autosave, optimize, fork, share, export, keyboard shortcuts | `frontend/src/pages/Workbench.jsx` |
| **ShareView** | Public read-only prompt view by token | `frontend/src/pages/ShareView.jsx` |
| **Sidebar** | Brand, user menu, search, new-prompt button, tabs (History/Patterns/Library), grouped prompt list with tag filters | `frontend/src/components/Sidebar.jsx` |
| **Toolbar** | Pattern selector dropdown, action buttons (Copy/Save/Fork/Share/Export), optimize/cancel, usage readout | `frontend/src/components/Toolbar.jsx` |
| **EditorPane** | Raw input textarea, suggestion bar | `frontend/src/components/EditorPane.jsx` |
| **OutputPane** | Optimized output renderer, shimmer loading, empty state | `frontend/src/components/OutputPane.jsx` |
| **MetaBar** | Title input, group selector dropdown, tag chips with input | `frontend/src/components/MetaBar.jsx` |
| **Backend Tests** | Integration test suite (3 files) | `backend/tests/` |
| **Root Tests** | Empty `__init__.py` | `tests/__init__.py` |

## Pattern Overview

**Overall:** Monorepo-style with separate frontend/backend directories. Backend is a single-file FastAPI application. Frontend is a Create React App with Craco overlay.

**Key Characteristics:**
- **Single-file backend** — All routes, models, auth, DB logic, and LLM calls live in `backend/server.py` (868 lines). Helpers in `backend/patterns_seed.py`.
- **Pages-as-route-components** — Four page components route-matched in `App.js` via React Router v7.
- **Workbench-as-controller** — `Workbench.jsx` (603 lines) holds all state and orchestrates all data flow. Child components are stateless presentational.
- **Unidirectional data flow** — Parent Workbench passes state down via props; children communicate back via callback functions (no state management library).
- **SSE streaming** — Optimize endpoint uses Server-Sent Events for real-time token-by-token output.

## Layers

**Frontend Pages Layer:**
- Purpose: Route-level components that compose app layout
- Location: `frontend/src/pages/`
- Contains: `Workbench.jsx`, `Login.jsx`, `AuthCallback.jsx`, `ShareView.jsx`
- Depends on: `context/AuthContext`, `lib/api`, `components/`
- Used by: `App.js` (React Router)

**Frontend Components Layer:**
- Purpose: Reusable UI panels and controls
- Location: `frontend/src/components/`
- Contains: 5 page-specific components + 50+ shadcn/ui primitives in `components/ui/`
- Depends on: `lib/utils`, `lib/api` (Sidebar only)
- Used by: Pages

**Frontend API/Context Layer:**
- Purpose: Backend communication, auth state management, shared utilities
- Location: `frontend/src/lib/`, `frontend/src/context/`, `frontend/src/hooks/`
- Contains: `api.js`, `utils.js`, `AuthContext.jsx`, `use-toast.js`
- Depends on: Axios, React context
- Used by: All page and component files

**Backend API Routes Layer:**
- Purpose: HTTP endpoints for auth, patterns, optimize, prompts CRUD, share, health
- Location: `backend/server.py` (all routes under `api` APIRouter)
- Contains: 15+ route handlers grouped by domain (auth, patterns, optimize, suggest, prompts, share, health)
- Depends on: MongoDB (Motor), Nvidia NIM (OpenAI SDK), Pydantic models
- Used by: Frontend API client

**Backend Data Access Layer:**
- Purpose: Direct MongoDB operations via Motor (async)
- Location: Inline in `backend/server.py`
- Contains: collections (`users`, `user_sessions`, `patterns`, `prompts`, `optimization_runs`), index creation on startup
- Depends on: `motor.motor_asyncio.AsyncIOMotorClient`
- Used by: All route handlers

**Backend LLM Integration Layer:**
- Purpose: Nvidia NIM communication
- Location: `backend/server.py` (functions `_call_nim`, `_stream_nim`)
- Contains: OpenAI-compatible client wrapper, reference pricing, cost estimation
- Depends on: `openai.AsyncOpenAI`
- Used by: Optimize endpoints, suggest endpoint (optional)

## Data Flow

### Primary Request Path — Optimize (Sync)

1. User clicks "Optimize" in Toolbar → `handleOptimize()` in `Workbench.jsx:199`
2. Workbench calls `streamOptimize()` from `lib/api.js:71` (always uses SSE stream path)
3. Frontend sends `POST /api/optimize-prompt/stream` with `{ raw_input, pattern_slug, prompt_id, save: true }`
4. Backend validates auth (`get_current_user` dependency at `server.py:140`)
5. Backend fetches pattern template from MongoDB (`server.py:734`)
6. Backend replaces `{{INPUT}}` placeholder with raw input (`server.py:738`)
7. Backend calls NIM via `_stream_nim()` with streaming=True (`server.py:693`)
8. SSE events flow: `meta` → multiple `delta` events → `usage` event → `done` event
9. On completion, backend persists result to MongoDB (`server.py:766-807`)
10. Frontend accumulates deltas in real-time into `output` state
11. Frontend shows total tokens, cost, and latency in Toolbar usage readout

### OAuth Authentication Flow

1. User clicks "Continue with Google" → redirected to `auth.emergentagent.com` (`Login.jsx:20`)
2. After Google consent, user lands back at `/app#session_id=xxx` (`AuthCallback.jsx`)
3. Frontend `App.js:13` detects `session_id` in hash → renders `<AuthCallback />`
4. `AuthCallback` sends `POST /api/auth/session` with session_id (`server.py:172`)
5. Backend contacts Emergent OAuth API to validate session_id (`server.py:178`)
6. Backend creates/updates user in MongoDB, creates session with 7d expiry (`server.py:196-216`)
7. Backend sets `session_token` cookie (httponly, secure, samesite=none) (`server.py:218-226`)
8. Frontend stores user in AuthContext, cleans hash from URL, navigates to `/app`
9. On subsequent loads, `AuthContext` calls `GET /api/auth/me` to validate session

### Prompts CRUD Flow

1. Workbench loads prompts via `GET /api/prompts` on mount (`Workbench.jsx:82-97`)
2. Selecting a prompt in Sidebar → `handleSelect()` populates all Workbench state from prompt data
3. Editing triggers `dirty=true`, setting up debounced autosave (1s) via `PUT /api/prompts/:id` or `POST /api/prompts` (`Workbench.jsx:151-196`)
4. Fork creates a copy with `parent_prompt_id` reference
5. Share generates a `share_token`, accessible at `GET /api/share/:token` (no auth required)

### Suggest Flow

1. Debounced (600ms) `POST /api/suggest` fires on `rawInput` changes (`Workbench.jsx:133-148`)
2. Backend runs heuristic keyword matching (`server.py:395-417`)
3. Optionally calls NIM for next-line completions if `use_nim=true`
4. Returns `{ suggested_pattern, suggested_tags, completions, source }`
5. Frontend shows suggestion bar in EditorPane with pattern/tag recommendations

**State Management:**
- **No external state library** — Workbench manages all application state via `useState` hooks
- Auth state lives in AuthContext (React Context)
- Toast notifications handled by `sonner` library
- Search, tag filter, and pagination are local state in Workbench

## Key Abstractions

**Pydantic Models (Backend):**
- Purpose: Request/response validation and serialization
- Examples: `User`, `PatternOut`, `PromptCreate`, `PromptUpdate`, `PromptOut`, `OptimizeRequest`, `OptimizeResponse`, `TokenUsage`, `SuggestRequest`, `SuggestResponse`, `RerunRequest`, `SharePromptResponse`, `SharedPromptOut` — all in `backend/server.py`
- Pattern: Pydantic v2 `BaseModel` with `model_dump()` for serialization

**Auth Dependency (Backend):**
- Purpose: Session validation extracted as a reusable FastAPI dependency
- Location: `backend/server.py:140` — `async def get_current_user(request: Request) -> User`
- Pattern: FastAPI `Depends()` — all authenticated routes inject this

**API Client (Frontend):**
- Purpose: Axios wrapper with `withCredentials: true` for cookie-based auth
- Location: `frontend/src/lib/api.js`
- Pattern: Named export functions per endpoint domain (auth, patterns, prompts, optimize, suggest, meta, share)

**Workbench as Controller (Frontend):**
- Purpose: Single component owning all state and action handlers for the main workspace
- Location: `frontend/src/pages/Workbench.jsx`
- Pattern: Stateful parent with purely presentational children (Sidebar, Toolbar, EditorPane, OutputPane, MetaBar)
- Data passed as props, mutations passed as callback props

## Entry Points

**Backend Entry Point:**
- Location: `backend/server.py:41`
- Triggers: `uvicorn server:app --reload`
- Responsibilities: FastAPI app instantiation, route registration via `app.include_router(api)`, CORS middleware, startup/shutdown event handlers, MongoDB index creation

**Frontend Entry Point:**
- Location: `frontend/src/index.js`
- Triggers: CRA/Craco build — ReactDOM.createRoot -> `<App />`
- Responsibilities: Mount React app, apply global styles

**Frontend App Router:**
- Location: `frontend/src/App.js`
- Triggers: Browser load/hash change
- Responsibilities: OAuth callback detection (hash check), route rendering: `/` → redirect to `/app`, `/login` → Login, `/app` → Workbench, `/share/:token` → ShareView

**API Router:**
- Location: `backend/server.py:42` — `api = APIRouter(prefix="/api")`
- Responsibilities: All route registrations under `/api` prefix, attached to app at `server.py:860`

**Startup Event:**
- Location: `backend/server.py:838` — `@app.on_event("startup")`
- Responsibilities: Seed 6 system patterns from `patterns_seed.py` into MongoDB, create indexes on users, user_sessions, and prompts collections

## Architectural Constraints

- **Threading:** Async single-threaded event loop via FastAPI + `async def` handlers. MongoDB operations use Motor's async driver. NIM calls use `httpx` via OpenAI SDK (async). No worker threads or background tasks used.
- **Global state:** MongoDB client (`mongo_client`), database reference (`db`), and NIM client (`nim_client`) are module-level singletons in `backend/server.py`. This means the server holds one connection pool shared across all requests.
- **Circular imports:** None detected. Backend is single-file. Frontend has no circular dependency chains.
- **Single-file backend:** All backend logic lives in `backend/server.py` (868 lines). While this simplifies development, it creates a monolith that mixes models, auth, routes, DB operations, and LLM calls in one file.
- **No TypeScript:** Frontend is pure JSX (`.js`/`.jsx`). No type checking on the frontend side.

## Anti-Patterns

### Single-File Backend Monolith

**What happens:** `backend/server.py` at 868 lines contains models, auth logic, route handlers, MongoDB operations, LLM client wrappers, utility functions, startup/shutdown logic, and seeding — all in one file.
**Why it's wrong:** Makes the file hard to navigate, test in isolation, and modify without side effects. Increases merge conflicts. No separation of concerns.
**Do this instead:** Split into `routes/`, `models/`, `services/`, `db/` directories. See `backend/server.py` for the current monolith — it should be refactored into at least: `backend/app.py` (FastAPI setup), `backend/routes/auth.py`, `backend/routes/optimize.py`, `backend/routes/prompts.py`, `backend/models.py`, `backend/services/nim.py`, `backend/db.py`.

### Workbench as God Component

**What happens:** `frontend/src/pages/Workbench.jsx` at 603 lines manages ~20 state variables and ~15 handler functions while orchestrating all data flow for the entire main application.
**Why it's wrong:** All state lives in one component, making it impossible to reuse logic, difficult to test, and prone to unnecessary re-renders. Adding features requires modifying this single file.
**Do this instead:** Extract state management into custom hooks (e.g., `usePromptState`, `useOptimize`, `useAutosave`) and split into smaller context providers. Each hook should own a specific domain concern.

### Magic Numbers and Strings

**What happens:** Hardcoded values scattered through the codebase (e.g., `_estimate_cost` formula at `backend/server.py:262-267`, debounce timers 600ms and 1000ms at `Workbench.jsx:146,183`, keyboard shortcut labels at `Workbench.jsx:477-484`).
**Why it's wrong:** Makes configuration changes require code changes. No single source of truth for constants.
**Do this instead:** Extract to `constants.py`/`constants.js` files or environment variables.

### Inline MongoDB Operations

**What happens:** Every route handler directly calls `db.collection.find/insert/update/delete` instead of using repository/DAO abstractions (`backend/server.py` throughout).
**Why it's wrong:** MongoDB query logic is duplicated across handlers. Changing a collection schema requires changes in multiple places. Impossible to unit test without a live MongoDB.
**Do this instead:** Create repository classes (e.g., `class PromptRepository`) that encapsulate all queries for a collection.

## Error Handling

**Strategy:** FastAPI exceptions with HTTPException. Backend returns structured error responses with a `detail` field. Errors propagate up through Depends() for auth failures.

**Patterns:**
- Auth errors → `HTTPException(401, "Not authenticated")` or `HTTPException(401, "Session expired")` at `server.py:148,160,166`
- Validation errors → `HTTPException(400, detail=...)` for missing fields
- Not found → `HTTPException(404, detail="Not found")` for prompts/patterns
- NIM failures → `HTTPException(502, detail=f"NIM error: ...")` at `server.py:296,299`
- Generic → try/except in route handlers, logged via `logger.error()`
- Frontend: `try/catch` in every handler, `toast.error()` for user-facing messages

## Cross-Cutting Concerns

**Logging:** Python `logging` module with basicConfig at `backend/server.py:44`. Single logger `__name__` used throughout. No structured logging, no log levels tailored per-module.

**Validation:** Pydantic v2 `BaseModel` for all request/response schemas. No custom validators. Input validation is minimal (empty string checks).

**Authentication:** Cookie-based session auth via FastAPI `Depends()`. Cookie is `httponly`, `secure`, `samesite=none`. Bearer token fallback in `Authorization` header. Session stored in MongoDB `user_sessions` collection with 7-day expiry.

---

*Architecture analysis: 2026-05-10*
