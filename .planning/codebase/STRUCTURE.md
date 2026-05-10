# Codebase Structure

**Analysis Date:** 2026-05-10

## Directory Layout

```
app/
├── .emergent/                # Emergent platform config
│   └── emergent.yml
├── .planning/                # GSD planning artifacts (codebase docs)
│   └── codebase/
├── backend/                  # Python/FastAPI backend (single-file)
│   ├── server.py             # Main app: routes, auth, DB, LLM (868 lines)
│   ├── patterns_seed.py      # 6 Fabric-style system prompt templates (167 lines)
│   ├── requirements.txt      # Python dependencies (124 lines, pinned)
│   └── tests/
│       ├── conftest.py       # Integration test fixtures (session auth, MongoDB)
│       ├── test_backend.py   # Core endpoint tests
│       └── test_iteration2.py# Streaming, usage, share tests
├── frontend/                 # React SPA (CRA + Craco, JSX, no TS)
│   ├── public/
│   │   └── index.html        # HTML shell, PostHog analytics, Emergent badge
│   ├── plugins/
│   │   └── health-check/     # Optional dev-server health endpoints
│   │       ├── webpack-health-plugin.js
│   │       └── health-endpoints.js
│   ├── src/
│   │   ├── index.js          # React entry point
│   │   ├── index.css         # Tailwind base, shadcn dark theme, custom scrollbar
│   │   ├── App.js            # Router + AuthProvider wrapper (44 lines)
│   │   ├── App.css           # Base styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Auth state provider (52 lines)
│   │   ├── hooks/
│   │   │   └── use-toast.js      # shadcn toast hook (155 lines)
│   │   ├── lib/
│   │   │   ├── api.js            # Axios client + all endpoint wrappers (152 lines)
│   │   │   └── utils.js          # cn() Tailwind class merge (6 lines)
│   │   ├── pages/
│   │   │   ├── Workbench.jsx     # Main app controller (603 lines)
│   │   │   ├── Login.jsx         # Auth landing page (121 lines)
│   │   │   ├── AuthCallback.jsx  # OAuth session exchange (49 lines)
│   │   │   └── ShareView.jsx     # Public read-only prompt view (174 lines)
│   │   └── components/
│   │       ├── Sidebar.jsx       # Nav, search, prompt list, tabs (359 lines)
│   │       ├── Toolbar.jsx       # Pattern selector, actions, usage (353 lines)
│   │       ├── EditorPane.jsx    # Raw input textarea + suggestions (55 lines)
│   │       ├── OutputPane.jsx    # Optimized output display (65 lines)
│   │       ├── MetaBar.jsx       # Title, tags, group editor (162 lines)
│   │       └── ui/               # shadcn/ui primitives (50+ files)
│   │           ├── button.jsx, card.jsx, input.jsx, ...
│   │           ├── dropdown-menu.jsx, dialog.jsx, ...
│   │           ├── tooltip.jsx, scroll-area.jsx, ...
│   │           └── ... (all shadcn New York, non-RSC, JSX)
│   ├── craco.config.js       # Craco config: @ alias, ESLint, health check, visual-edits
│   ├── tailwind.config.js    # Tailwind v3 config (dark mode, extended theme)
│   ├── postcss.config.js     # PostCSS with Tailwind + autoprefixer
│   ├── jsconfig.json         # @/ alias path mapping
│   ├── components.json       # shadcn/ui config (New York style, no TS)
│   └── package.json          # Dependencies, scripts (yarn start/build/test)
├── tests/                    # Root-level tests directory (currently empty)
│   └── __init__.py
├── memory/
│   └── PRD.md                # Product requirements document
├── test_reports/             # Test result artifacts (CI-generated)
│   ├── pytest/
│   │   ├── pytest_results.xml
│   │   └── iteration2_results.xml
│   ├── iteration_1.json
│   └── iteration_2.json
├── design_guidelines.json    # Design token source of truth (134 lines)
├── AGENTS.md                 # Agent onboarding/guide
├── auth_testing.md           # Manual auth testing docs
├── test_result.md            # Protocol file between agents
└── README.md                 # Project overview
```

## Directory Purposes

**`backend/`:**
- Purpose: All server-side code — FastAPI application, routes, MongoDB access, LLM integration
- Contains: 1 main Python file, 1 seed file, 1 requirements file, 3 test files
- Key files: `backend/server.py` (868 lines — the entire backend), `backend/patterns_seed.py` (167 lines — prompt templates)

**`frontend/`:**
- Purpose: React single-page application — UI components, pages, API client, design tokens
- Contains: CRA project structure with Craco configuration
- Key files: `frontend/src/pages/Workbench.jsx` (603 lines — app controller), `frontend/src/lib/api.js` (152 lines — backend client)

**`frontend/src/pages/`:**
- Purpose: Route-level page components — each maps to a URL path
- Contains: 4 page components, each self-contained (state, layout, event handlers)
- Key files: `Workbench.jsx` (main app), `Login.jsx` (auth gate), `ShareView.jsx` (public view)

**`frontend/src/components/`:**
- Purpose: Reusable UI panels and shadcn/ui primitives
- Contains: 5 app-specific components (Sidebar, Toolbar, EditorPane, OutputPane, MetaBar) + 50+ shadcn/ui primitives in `ui/` subdirectory
- Key files: `Sidebar.jsx` (359 lines), `Toolbar.jsx` (353 lines)

**`frontend/src/components/ui/`:**
- Purpose: shadcn/ui component primitives generated by `npx shadcn add`
- Contains: 50+ unstyled Radix UI wrapper components (button, card, dialog, dropdown-menu, etc.)
- Key files: `button.jsx`, `dropdown-menu.jsx`, `tooltip.jsx`, `scroll-area.jsx`, `input.jsx`

**`frontend/src/lib/`:**
- Purpose: Shared utilities and backend communication layer
- Contains: Axios-based API client, Tailwind class merge helper
- Key files: `api.js` (all backend endpoint wrappers + SSE stream handler)

**`frontend/src/context/`:**
- Purpose: React Context providers for global state
- Contains: AuthContext (user session, login state, logout)
- Key files: `AuthContext.jsx`

**`frontend/plugins/health-check/`:**
- Purpose: Optional dev-server health check plugin (disabled by default, enabled via `ENABLE_HEALTH_CHECK=true`)
- Contains: Webpack plugin and dev server middleware
- Key files: `webpack-health-plugin.js`, `health-endpoints.js`

**`memory/`:**
- Purpose: Long-lived product documentation
- Contains: PRD with core requirements, architecture notes, and backlog
- Key files: `PRD.md`

**`test_reports/`:**
- Purpose: CI-generated test result artifacts (XML + JSON)
- Contains: pytest XML output, JSON test reports
- Generated: Yes
- Committed: Yes

## Key File Locations

**Entry Points:**
- `frontend/src/index.js`: React app mount — `ReactDOM.createRoot` rendering `<App />`
- `frontend/src/App.js`: Page-level routing — BrowserRouter with Routes for `/`, `/login`, `/app`, `/share/:token`
- `backend/server.py:41`: FastAPI app instantiation — `app = FastAPI(title="Prompt Optimizer")`
- `backend/server.py:42`: API router — `api = APIRouter(prefix="/api")`
- `backend/server.py:860-861`: Router attachment — `app.include_router(api)`

**Configuration:**
- `frontend/craco.config.js`: Craco config — `@` alias, ESLint, optional health check, optional visual-edits plugin
- `frontend/tailwind.config.js`: Tailwind v3 — dark mode, shadcn CSS variables, Radix UI animations
- `frontend/jsconfig.json`: Path alias mapping — `@/` → `src/`
- `frontend/components.json`: shadcn/ui config — New York style, non-RSC, JSX, `@/` aliases
- `frontend/postcss.config.js`: PostCSS — Tailwind CSS + autoprefixer
- `backend/requirements.txt`: Python dependencies (pinned exact versions)

**Core Logic:**
- `backend/server.py`: All backend routes, models, auth, MongoDB queries, LLM calls, startup/seeding
- `backend/patterns_seed.py`: 6 Fabric-style system patterns with template bodies
- `frontend/src/pages/Workbench.jsx`: Main app state management, optimize flow, autosave, fork, share
- `frontend/src/lib/api.js`: All backend API calls, SSE stream handler
- `frontend/src/context/AuthContext.jsx`: Session lifecycle management

**Testing:**
- `backend/tests/conftest.py`: Session-scoped fixtures — synthetic MongoDB user/session, API client, auth headers
- `backend/tests/test_backend.py`: Core integration tests — health, patterns, auth, optimize, suggest, CRUD, fork, rerun
- `backend/tests/test_iteration2.py`: Extended integration tests — usage tracking, SSE, groups/tags, share lifecycle

## Naming Conventions

**Files:**
- Backend: `snake_case.py` (e.g., `patterns_seed.py`, `server.py`)
- Frontend: `PascalCase.jsx` for components/pages (e.g., `EditorPane.jsx`, `Workbench.jsx`), `camelCase.js` for utilities (e.g., `api.js`, `utils.js`)
- Tests: `test_` prefix (e.g., `test_backend.py`, `test_iteration2.py`)

**Functions:**
- Backend: `snake_case` (e.g., `get_current_user`, `_call_nim`, `_estimate_cost`, `_heuristic_pattern`)
- Frontend: `camelCase` (e.g., `handleOptimize`, `refreshPrompts`, `handleSelect`, `streamOptimize`)

**Variables:**
- All code: `camelCase` — e.g., `rawInput`, `session_token` (MongoDB fields), `activeId`, `optimizing`
- Environment variables: `UPPER_SNAKE_CASE` — e.g., `MONGO_URL`, `DB_NAME`, `NIM_API_KEY`, `REACT_APP_BACKEND_URL`

**Types:**
- Backend (Pydantic): `PascalCase` — e.g., `User`, `PromptOut`, `OptimizeRequest`, `TokenUsage`
- Frontend: No TypeScript — no type definitions

**Directories:**
- `frontend/src/`: Lowercase short names — `pages/`, `components/`, `context/`, `hooks/`, `lib/`
- `backend/`: Lowercase — `tests/`
- Subdirectories for shadcn: `components/ui/`

## Where to Add New Code

**New Feature (e.g., new capability):**
- Frontend page: `frontend/src/pages/{FeatureName}.jsx`
- Frontend component: `frontend/src/components/{FeaturePart}.jsx`
- API client methods: `frontend/src/lib/api.js` (add new function in appropriate section)
- Backend routes: `backend/server.py` (add new route to `api` router in appropriate domain section)
- Backend models: `backend/server.py` (add new Pydantic model in Models section near top)

**New UI Component:**
- App-specific components: `frontend/src/components/{Name}.jsx` — export default function
- shadcn primitives: `frontend/src/components/ui/{name}.jsx` — only via `npx shadcn add`
- Styling: Use Tailwind classes + `cn()` from `frontend/src/lib/utils.js` for conditional classes
- All interactive elements need `data-testid` attributes per `design_guidelines.json`

**New Backend Route:**
- Add route to `api` APIRouter in `backend/server.py` — group with related routes (auth, patterns, optimize, prompts, share, health)
- Use Pydantic models for request validation and response serialization
- Protect authenticated routes with `user: User = Depends(get_current_user)`

**New Tests:**
- Backend integration tests: `backend/tests/test_{feature}.py` — use conftest fixtures, tag expensive tests with `pytest.mark`
- Frontend tests: `frontend/src/__tests__/` — run via `craco test` (Jest)

**Utilities:**
- Shared helpers: `frontend/src/lib/{name}.js` (frontend), `backend/server.py` or new `backend/utils.py` (backend)

**Design Tokens:**
- Source of truth: `design_guidelines.json` — update here first
- CSS variables: `frontend/src/index.css` (shadcn CSS variable overrides)
- Tailwind theme: `frontend/tailwind.config.js` (extend theme)

## Special Directories

**`.emergent/`:**
- Purpose: Emergent.sh platform deployment configuration
- Generated: No
- Committed: Yes
- Contains: `emergent.yml`

**`.planning/`:**
- Purpose: GSD command artifacts — codebase analysis docs consumed by planning/execution commands
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes
- Contains: `codebase/` with STACK.md, ARCHITECTURE.md, STRUCTURE.md, INTEGRATIONS.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`memory/`:**
- Purpose: Long-lived product documentation that persists across sessions
- Generated: No (manually maintained)
- Committed: Yes
- Contains: `PRD.md`

**`test_reports/`:**
- Purpose: Test result artifacts from CI runs
- Generated: Yes (by test execution)
- Committed: Yes
- Contains: pytest XML output, JSON report files

**`frontend/plugins/health-check/`:**
- Purpose: Optional dev-server health check — only active when `ENABLE_HEALTH_CHECK=true`
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-05-10*
