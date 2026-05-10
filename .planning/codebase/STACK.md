# Technology Stack

**Analysis Date:** 2026-05-10

## Languages

**Primary:**
- Python 3.x — Backend API (`backend/server.py`, `backend/patterns_seed.py`, `backend/tests/`)
- JavaScript (no TypeScript) — Frontend all `.js`/`.jsx` (`frontend/src/`)

**Secondary:**
- HTML — SPA shell (`frontend/public/index.html`)
- CSS — Tailwind CSS utility classes + custom CSS (`frontend/src/index.css`)

## Runtime

**Environment:**
- Node.js — Frontend build/dev server (via react-scripts & Craco 7)
- Python 3 — Backend ASGI server (via Uvicorn 0.25.0)

**Package Managers:**
- Yarn 1.22.22 — Frontend (`frontend/package.json`)
- pip — Backend (`backend/requirements.txt`)
- Lockfile: Not detected (no `yarn.lock` or `requirements.lock` found)

## Frameworks

**Core:**
- React 19 — Frontend UI (`frontend/package.json` → `react: ^19.0.0`)
- FastAPI 0.110.1 — Backend REST API (`backend/requirements.txt` → `fastapi==0.110.1`)
- Tailwind CSS 3.4 — Utility-first CSS (`frontend/tailwind.config.js`)
- shadcn/ui (New York style, non-RSC, JSX) — Component library (`frontend/components.json`)
  - Uses Radix UI primitives + `tailwindcss-animate` + `class-variance-authority`

**Routing:**
- React Router DOM 7.5.1 — Frontend routing (`frontend/src/App.js`)
- FastAPI `APIRouter(prefix="/api")` — Backend routing (`backend/server.py:42`)

**Testing:**
- pytest 9.0.3 — Backend integration tests (`backend/tests/`)
- Craco test (Jest via react-scripts) — Frontend (no test files detected)

**Build/Dev:**
- @craco/craco 7.1.0 — CRA build customization (`frontend/craco.config.js`)
- react-scripts 5.0.1 — Underlying CRA toolchain
- PostCSS 8.4 + Autoprefixer 10.4 — CSS processing (`frontend/postcss.config.js`)
- uvicorn 0.25.0 — ASGI dev server (`backend/server.py`)
- ESLint 9.23 (flat config) — Linting (`frontend/package.json` devDeps)
  - Plugins: react, react-hooks, jsx-a11y, import

## Key Dependencies

**Critical:**
- `openai==1.99.9` — OpenAI-compatible client used to call Nvidia NIM LLM (`backend/server.py:22`)
- `motor==3.3.1` — Async MongoDB driver (`backend/server.py:11`)
- `pydantic==2.13.4` — Request/response models (`backend/server.py:18`)
- `httpx==0.28.1` — Async HTTP client (auth session exchange, line 178)
- `axios@^1.8.4` — Frontend HTTP client (`frontend/src/lib/api.js`)
- `@radix-ui/*` (26 packages) — Headless UI primitives (`frontend/package.json`)
- `lucide-react@^0.507.0` — Icon library (`frontend/package.json`)

**Infrastructure:**
- `uvicorn==0.25.0` — ASGI server
- `starlette==0.37.2` — ASGI framework (FastAPI base) + CORS middleware
- `python-dotenv==1.2.2` — `.env` loading
- `python-multipart==0.0.27` — Form data parsing
- `PyJWT==2.12.1` — JWT support (present but not used in server.py)
- `passlib==1.7.4` / `bcrypt==4.1.3` — Password hashing (present but not used)

**Other backend packages present (not directly used in `server.py`):**
- `stripe==15.1.0` — Listed in requirements, not imported in server.py
- `boto3==1.43.5` / `s3transfer==0.17.0` — AWS SDK, not imported in server.py
- `google-genai==1.75.0` / `google-generativeai==0.8.6` — Google AI, not imported in server.py
- `litellm==1.80.0` — Multi-provider LLM wrapper, not imported in server.py
- `tiktoken==0.12.0` — Tokenizer, present but not imported in server.py
- `recharts@^3.6.0` — Frontend charting lib (present but usage not confirmed)

## Configuration

**Environment:**
- Backend loads `backend/.env` via `dotenv.load_dotenv()` (`backend/server.py:28`)
- Frontend uses `process.env.REACT_APP_*` vars (`frontend/src/lib/api.js:3`)

**Required env vars:**
- `MONGO_URL` — MongoDB connection string (backend)
- `DB_NAME` — MongoDB database name (backend)
- `REACT_APP_BACKEND_URL` — Backend API base URL (frontend)

**Optional env vars:**
- `NIM_API_KEY` — Nvidia NIM API key (backend, enables LLM calls)
- `NIM_BASE_URL` — NIM API base URL (backend, default: `https://integrate.api.nvidia.com/v1`)
- `NIM_MODEL` — Model name (backend, default: `meta/llama-3.3-70b-instruct`)
- `CORS_ORIGINS` — Comma-separated CORS origins (backend, default: `*`)

**Build:**
- `frontend/craco.config.js` — Craco configuration (alias `@/` → `src/`, ESLint, webpack watcher ignores)
- `frontend/jsconfig.json` — Path alias `@/*` → `src/*`
- `frontend/tailwind.config.js` — Tailwind CSS configuration (dark mode via class, shadcn theme colors, keyframes)
- `frontend/postcss.config.js` — PostCSS with Tailwind + Autoprefixer
- `frontend/components.json` — shadcn/ui configuration (New York, non-RSC, JSX)

## Platform Requirements

**Development:**
- Node.js (compatible with react-scripts 5) — v18+ or v20+
- Python 3.10+ — For FastAPI + async features
- MongoDB — Local or remote instance
- Yarn 1.x — Frontend package management

**Production:**
- Container-based via Emergent platform (`backend/server.py` runs via Uvicorn)
- `frontend/` built via `craco build` → static files served separately or via backend
- MongoDB Atlas or self-hosted MongoDB
- Nvidia NIM endpoint (cloud or self-hosted)

---

*Stack analysis: 2026-05-10*
