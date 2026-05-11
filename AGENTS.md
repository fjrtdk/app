# Prompt Optimizer — Agent Guide

## Structure
- `backend/` — single-file FastAPI + Motor (async MongoDB) + Nvidia NIM (OpenAI-compatible LLM)
- `frontend/` — CRA with Craco (for `@/` alias), pure JSX (no TS), Tailwind v3, shadcn/ui (New York, non-RSC, JSX)
- `design_guidelines.json` — source of truth for design tokens (dark theme, Volt Lime `#C4F159` accent, IBM Plex Sans / JetBrains Mono)
- `memory/PRD.md` — product requirements doc

## Commands
```
# Frontend (from frontend/)
yarn start        # craco start (dev server with hot reload)
yarn build        # craco build
yarn test         # craco test (interactive watch mode)

# Backend (from backend/)
uvicorn server:app --reload

# Backend tests (need live MongoDB + running backend)
# Points at REACT_APP_BACKEND_URL (default: http://localhost:8000)
pytest tests/ -v
```

## Architecture
- **Auth**: Firebase Google sign-in (popup via `signInWithPopup`). Frontend sends ID token to `POST /api/auth/firebase`, backend verifies via Firebase Admin SDK, creates session cookie `session_token` (7d expiry). Backend validates via `Depends(get_current_user)`. Frontend AuthContext calls `getMe()` on load for session persistence.
- **Optimize**: Two endpoints — `POST /api/optimize-prompt` (sync) and `POST /api/optimize-prompt/stream` (SSE). Both auth-required.
- **Patterns**: 6 Fabric-style system patterns seeded in `patterns_seed.py` on startup. Template uses `{{INPUT}}` placeholder.
- **Cost**: Uses reference pricing `$0.20/M input, $0.60/M output` for `meta/llama-3.3-70b-instruct`.

## Testing
- Backend tests are **integration tests** — they hit a live backend + MongoDB (no mocks).
- `conftest.py` creates/cleans up synthetic users + sessions in MongoDB.
- `test_backend.py` — health, patterns, auth, optimize (real NIM call), suggest, CRUD, fork, rerun.
- `test_iteration2.py` — usage tracking, SSE streaming, groups/tags meta, share lifecycle.
- Some tests make real NIM calls (3-8s, 90s timeout). Tag `test_optimize_real_nim` and `test_rerun` are the expensive ones.
- `auth_testing.md` documents manual MongoDB session creation for ad-hoc testing.
- `test_result.md` is a protocol file between main + testing agents (not a standard test report).

## Quirks
- **No TypeScript** — all frontend is `.js`/`.jsx`.
- **No prettier config** found; ESLint via Craco with react-hooks plugin.
- **Package manager**: Yarn 1.22.22 (per `packageManager` in package.json).
- **Env vars required**: See `.env.example` files in `backend/` and `frontend/`. Backend needs `MONGO_URL`, `DB_NAME`, `FIREBASE_*` vars. Frontend needs `REACT_APP_BACKEND_URL`, `REACT_APP_FIREBASE_*` vars.
- **Key elements** should have `data-testid` attributes (per `design_guidelines.json`).

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Prompt Optimizer**

A lightweight web app that turns rough notes into Fabric-style structured prompts and runs optimization through Nvidia NIM. Users pick a pattern, click Optimize, copy/save/fork the result, with history and suggestions. Built for coding-agent users and AI power users.

**Core Value:** Users can optimize a prompt in one click and trust their work is saved.

### Constraints

- **Auth**: Must use Firebase Google sign-in only (no email/password)
- **Session**: Keep cookie-based sessions so existing guarded endpoints work unchanged
- **Start fresh**: No user migration — existing sessions discarded
- **Design**: Dark theme, Volt Lime accent preserved
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- Python 3.x — Backend API (`backend/server.py`, `backend/patterns_seed.py`, `backend/tests/`)
- JavaScript (no TypeScript) — Frontend all `.js`/`.jsx` (`frontend/src/`)
- HTML — SPA shell (`frontend/public/index.html`)
- CSS — Tailwind CSS utility classes + custom CSS (`frontend/src/index.css`)
## Runtime
- Node.js — Frontend build/dev server (via react-scripts & Craco 7)
- Python 3 — Backend ASGI server (via Uvicorn 0.25.0)
- Yarn 1.22.22 — Frontend (`frontend/package.json`)
- pip — Backend (`backend/requirements.txt`)
- Lockfile: Not detected (no `yarn.lock` or `requirements.lock` found)
## Frameworks
- React 19 — Frontend UI (`frontend/package.json` → `react: ^19.0.0`)
- FastAPI 0.110.1 — Backend REST API (`backend/requirements.txt` → `fastapi==0.110.1`)
- Tailwind CSS 3.4 — Utility-first CSS (`frontend/tailwind.config.js`)
- shadcn/ui (New York style, non-RSC, JSX) — Component library (`frontend/components.json`)
- React Router DOM 7.5.1 — Frontend routing (`frontend/src/App.js`)
- FastAPI `APIRouter(prefix="/api")` — Backend routing (`backend/server.py:42`)
- pytest 9.0.3 — Backend integration tests (`backend/tests/`)
- Craco test (Jest via react-scripts) — Frontend (no test files detected)
- @craco/craco 7.1.0 — CRA build customization (`frontend/craco.config.js`)
- react-scripts 5.0.1 — Underlying CRA toolchain
- PostCSS 8.4 + Autoprefixer 10.4 — CSS processing (`frontend/postcss.config.js`)
- uvicorn 0.25.0 — ASGI dev server (`backend/server.py`)
- ESLint 9.23 (flat config) — Linting (`frontend/package.json` devDeps)
## Key Dependencies
- `openai==1.99.9` — OpenAI-compatible client used to call Nvidia NIM LLM (`backend/server.py:22`)
- `motor==3.3.1` — Async MongoDB driver (`backend/server.py:11`)
- `pydantic==2.13.4` — Request/response models (`backend/server.py:18`)
- `firebase-admin==7.4.0` — Firebase Admin SDK (ID token verification, `server.py:26`)
- `axios@^1.8.4` — Frontend HTTP client (`frontend/src/lib/api.js`)
- `@radix-ui/*` (26 packages) — Headless UI primitives (`frontend/package.json`)
- `lucide-react@^0.507.0` — Icon library (`frontend/package.json`)
- `uvicorn==0.25.0` — ASGI server
- `starlette==0.37.2` — ASGI framework (FastAPI base) + CORS middleware
- `python-dotenv==1.2.2` — `.env` loading
- `python-multipart==0.0.27` — Form data parsing
- `PyJWT==2.12.1` — JWT support (present but not used in server.py)
- `passlib==1.7.4` / `bcrypt==4.1.3` — Password hashing (present but not used)
- `stripe==15.1.0` — Listed in requirements, not imported in server.py
- `boto3==1.43.5` / `s3transfer==0.17.0` — AWS SDK, not imported in server.py
- `google-genai==1.75.0` / `google-generativeai==0.8.6` — Google AI, not imported in server.py
- `litellm==1.80.0` — Multi-provider LLM wrapper, not imported in server.py
- `tiktoken==0.12.0` — Tokenizer, present but not imported in server.py
- `recharts@^3.6.0` — Frontend charting lib (present but usage not confirmed)
## Configuration
- Backend loads `backend/.env` via `dotenv.load_dotenv()` (`backend/server.py:28`)
- Frontend uses `process.env.REACT_APP_*` vars (`frontend/src/lib/api.js:3`)
- `MONGO_URL` — MongoDB connection string (backend)
- `DB_NAME` — MongoDB database name (backend)
- `REACT_APP_BACKEND_URL` — Backend API base URL (frontend)
- `NIM_API_KEY` — Nvidia NIM API key (backend, enables LLM calls)
- `NIM_BASE_URL` — NIM API base URL (backend, default: `https://integrate.api.nvidia.com/v1`)
- `NIM_MODEL` — Model name (backend, default: `meta/llama-3.3-70b-instruct`)
- `CORS_ORIGINS` — Comma-separated CORS origins (backend, default: `*`)
- `FIREBASE_PROJECT_ID` — Firebase project ID (backend)
- `FIREBASE_CLIENT_EMAIL` — Firebase service account client email (backend)
- `FIREBASE_PRIVATE_KEY` — Firebase service account private key (backend)
- `REACT_APP_FIREBASE_API_KEY` — Firebase Web API key (frontend)
- `REACT_APP_FIREBASE_AUTH_DOMAIN` — Firebase auth domain (frontend)
- `REACT_APP_FIREBASE_PROJECT_ID` — Firebase project ID (frontend)
- `REACT_APP_FIREBASE_STORAGE_BUCKET` — Firebase storage bucket (frontend)
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` — Firebase sender ID (frontend)
- `REACT_APP_FIREBASE_APP_ID` — Firebase app ID (frontend)
- `frontend/craco.config.js` — Craco configuration (alias `@/` → `src/`, ESLint, webpack watcher ignores)
- `frontend/jsconfig.json` — Path alias `@/*` → `src/*`
- `frontend/tailwind.config.js` — Tailwind CSS configuration (dark mode via class, shadcn theme colors, keyframes)
- `frontend/postcss.config.js` — PostCSS with Tailwind + Autoprefixer
- `frontend/components.json` — shadcn/ui configuration (New York, non-RSC, JSX)
## Platform Requirements
- Node.js (compatible with react-scripts 5) — v18+ or v20+
- Python 3.10+ — For FastAPI + async features
- MongoDB — Local or remote instance
- Yarn 1.x — Frontend package management
- `backend/server.py` runs via Uvicorn
- `frontend/` built via `craco build` → static files served separately or via backend
- MongoDB Atlas or self-hosted MongoDB
- Nvidia NIM endpoint (cloud or self-hosted)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Frontend components: `PascalCase.jsx` (e.g., `Workbench.jsx`, `Button.jsx`)
- Frontend hooks/utils: `kebab-case.js` (e.g., `use-toast.js`, `api.js`)
- shadcn/ui components: `lowercase.jsx` (e.g., `button.jsx`, `dialog.jsx`)
- Backend Python: `snake_case.py` (e.g., `server.py`, `patterns_seed.py`)
- Test files: `test_*.py` (e.g., `test_backend.py`, `conftest.py`)
- Frontend: `camelCase` for functions and hooks (e.g., `useAuth`, `handleOptimize`, `listPrompts`)
- Backend: `snake_case` for all functions (e.g., `get_current_user`, `_call_nim`, `list_prompts`)
- Private helpers: prefixed with underscore (e.g., `_serialize_prompt`, `_heuristic_pattern`)
- Frontend: `camelCase` (e.g., `rawInput`, `selectedPattern`, `activeId`)
- Backend: `snake_case` (e.g., `raw_input`, `selected_pattern`, `prompt_id`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `SESSION_COOKIE_NAME`, `PRICE_INPUT_PER_M`, `TOAST_LIMIT`)
- Python Pydantic: `PascalCase` (e.g., `User`, `OptimizeRequest`, `PromptOut`)
- No TypeScript in this codebase — all frontend is pure JSX
## Code Style
- Backend: `black` formatter (listed in requirements.txt)
- Frontend: No Prettier config detected; ESLint via Craco
- Imports: `isort` configured for backend (in requirements.txt)
- Frontend: ESLint 9.23.0 configured in `craco.config.js`
- Backend: `flake8` + `mccabe` + `pycodestyle` + `pyflakes` (in requirements.txt)
## Import Organization
- `@/` → `frontend/src/` (configured in `craco.config.js` webpack alias)
- Example: `import { cn } from "@/lib/utils"` instead of `../../lib/utils`
## Error Handling
- Try/catch blocks around async API calls with error logging
- Toast notifications via `sonner` for user-facing errors
- Axios errors accessed via `err?.response?.status`
- Example from `AuthContext.jsx`:
- `HTTPException(status_code, detail)` for API errors
- Status codes used: 400 (bad request), 401 (unauthorized), 404 (not found), 502 (bad gateway), 503 (service unavailable)
- Try/except around external calls (NIM API, httpx requests)
- Example from `server.py`:
## Logging
- Uses native `console.error()` with bracketed prefixes (e.g., `[checkAuth]`, `[autosave]`)
- Example: `console.error("[loadWorkspace]", err)`
- Uses Python `logging` module
- Configured at INFO level with format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- Logger instance: `logger = logging.getLogger(__name__)`
- Usage: `logger.info(...)`, `logger.error(...)`, `logger.warning(...)`
## Comments
- Module-level docstrings at top of files
- Complex logic or non-obvious behavior
- Critical business rules (e.g., OAuth callback handling in `AuthContext.jsx`)
- TODO/FIXME not observed in the current codebase
- Minimal JSDoc in frontend (only `streamOptimize` in `api.js` has a docstring)
- Python docstrings: Module-level at top, functions generally lack individual docstrings
- Example docstring from `api.js`:
## Function Design
- Backend route handlers are concise (~10-30 lines typical)
- Frontend `Workbench.jsx` is large (~600 lines) due to being the main application orchestrator
- Helper functions extracted where logical (e.g., `_serialize_prompt`, `_heuristic_pattern`)
- Python: Type-annotated via Pydantic models for request/response
- Named arguments preferred over positional in API calls
- Frontend: Props destructured in component parameters
- API functions: Return `response.data` directly (axios)
- Backend endpoints: Return Pydantic model instances or dicts
- Streaming endpoints return `StreamingResponse` (SSE)
## Module Design
- Frontend: Named exports preferred (e.g., `export function useAuth()`, `export { Button, buttonVariants }`)
- Default exports for page components (e.g., `export default function Workbench()`)
- Not commonly used. Direct imports from specific files (e.g., `@/lib/api`, `@/lib/utils`)
- `server.py` is the single entry point (~868 lines)
- `patterns_seed.py` contains only the `SYSTEM_PATTERNS` constant
- Tests in separate `tests/` subdirectory
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- **Single-file backend** — All routes, models, auth, DB logic, and LLM calls live in `backend/server.py` (868 lines). Helpers in `backend/patterns_seed.py`.
- **Pages-as-route-components** — Four page components route-matched in `App.js` via React Router v7.
- **Workbench-as-controller** — `Workbench.jsx` (603 lines) holds all state and orchestrates all data flow. Child components are stateless presentational.
- **Unidirectional data flow** — Parent Workbench passes state down via props; children communicate back via callback functions (no state management library).
- **SSE streaming** — Optimize endpoint uses Server-Sent Events for real-time token-by-token output.
## Layers
- Purpose: Route-level components that compose app layout
- Location: `frontend/src/pages/`
- Contains: `Workbench.jsx`, `Login.jsx`, `AuthCallback.jsx`, `ShareView.jsx`
- Depends on: `context/AuthContext`, `lib/api`, `components/`
- Used by: `App.js` (React Router)
- Purpose: Reusable UI panels and controls
- Location: `frontend/src/components/`
- Contains: 5 page-specific components + 50+ shadcn/ui primitives in `components/ui/`
- Depends on: `lib/utils`, `lib/api` (Sidebar only)
- Used by: Pages
- Purpose: Backend communication, auth state management, shared utilities
- Location: `frontend/src/lib/`, `frontend/src/context/`, `frontend/src/hooks/`
- Contains: `api.js`, `utils.js`, `AuthContext.jsx`, `use-toast.js`
- Depends on: Axios, React context
- Used by: All page and component files
- Purpose: HTTP endpoints for auth, patterns, optimize, prompts CRUD, share, health
- Location: `backend/server.py` (all routes under `api` APIRouter)
- Contains: 15+ route handlers grouped by domain (auth, patterns, optimize, suggest, prompts, share, health)
- Depends on: MongoDB (Motor), Nvidia NIM (OpenAI SDK), Pydantic models
- Used by: Frontend API client
- Purpose: Direct MongoDB operations via Motor (async)
- Location: Inline in `backend/server.py`
- Contains: collections (`users`, `user_sessions`, `patterns`, `prompts`, `optimization_runs`), index creation on startup
- Depends on: `motor.motor_asyncio.AsyncIOMotorClient`
- Used by: All route handlers
- Purpose: Nvidia NIM communication
- Location: `backend/server.py` (functions `_call_nim`, `_stream_nim`)
- Contains: OpenAI-compatible client wrapper, reference pricing, cost estimation
- Depends on: `openai.AsyncOpenAI`
- Used by: Optimize endpoints, suggest endpoint (optional)
## Data Flow
### Primary Request Path — Optimize (Sync)
### OAuth Authentication Flow
### Prompts CRUD Flow
### Suggest Flow
- **No external state library** — Workbench manages all application state via `useState` hooks
- Auth state lives in AuthContext (React Context)
- Toast notifications handled by `sonner` library
- Search, tag filter, and pagination are local state in Workbench
## Key Abstractions
- Purpose: Request/response validation and serialization
- Examples: `User`, `PatternOut`, `PromptCreate`, `PromptUpdate`, `PromptOut`, `OptimizeRequest`, `OptimizeResponse`, `TokenUsage`, `SuggestRequest`, `SuggestResponse`, `RerunRequest`, `SharePromptResponse`, `SharedPromptOut` — all in `backend/server.py`
- Pattern: Pydantic v2 `BaseModel` with `model_dump()` for serialization
- Purpose: Session validation extracted as a reusable FastAPI dependency
- Location: `backend/server.py:140` — `async def get_current_user(request: Request) -> User`
- Pattern: FastAPI `Depends()` — all authenticated routes inject this
- Purpose: Axios wrapper with `withCredentials: true` for cookie-based auth
- Location: `frontend/src/lib/api.js`
- Pattern: Named export functions per endpoint domain (auth, patterns, prompts, optimize, suggest, meta, share)
- Purpose: Single component owning all state and action handlers for the main workspace
- Location: `frontend/src/pages/Workbench.jsx`
- Pattern: Stateful parent with purely presentational children (Sidebar, Toolbar, EditorPane, OutputPane, MetaBar)
- Data passed as props, mutations passed as callback props
## Entry Points
- Location: `backend/server.py:41`
- Triggers: `uvicorn server:app --reload`
- Responsibilities: FastAPI app instantiation, route registration via `app.include_router(api)`, CORS middleware, startup/shutdown event handlers, MongoDB index creation
- Location: `frontend/src/index.js`
- Triggers: CRA/Craco build — ReactDOM.createRoot -> `<App />`
- Responsibilities: Mount React app, apply global styles
- Location: `frontend/src/App.js`
- Triggers: Browser load/hash change
- Responsibilities: OAuth callback detection (hash check), route rendering: `/` → redirect to `/app`, `/login` → Login, `/app` → Workbench, `/share/:token` → ShareView
- Location: `backend/server.py:42` — `api = APIRouter(prefix="/api")`
- Responsibilities: All route registrations under `/api` prefix, attached to app at `server.py:860`
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
### Workbench as God Component
### Magic Numbers and Strings
### Inline MongoDB Operations
## Error Handling
- Auth errors → `HTTPException(401, "Not authenticated")` or `HTTPException(401, "Session expired")` at `server.py:148,160,166`
- Validation errors → `HTTPException(400, detail=...)` for missing fields
- Not found → `HTTPException(404, detail="Not found")` for prompts/patterns
- NIM failures → `HTTPException(502, detail=f"NIM error: ...")` at `server.py:296,299`
- Generic → try/except in route handlers, logged via `logger.error()`
- Frontend: `try/catch` in every handler, `toast.error()` for user-facing messages
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
