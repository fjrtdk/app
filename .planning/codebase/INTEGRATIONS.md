# External Integrations

**Analysis Date:** 2026-05-10

## APIs & External Services

**LLM Provider — Nvidia NIM:**
- Service: Nvidia NIM (OpenAI-compatible API endpoint)
- Used for: Prompt optimization (structured output generation via `meta/llama-3.3-70b-instruct`)
- SDK: `openai` Python package (`AsyncOpenAI` client) — `backend/server.py:22,39`
- Auth: `NIM_API_KEY` env var (optional; without it LLM calls return 503)
- Endpoint: `NIM_BASE_URL` (default `https://integrate.api.nvidia.com/v1`)
- Model: `NIM_MODEL` (default `meta/llama-3.3-70b-instruct`)
- Pricing reference: $0.20/M input tokens, $0.60/M output tokens (`backend/server.py:258-259`)
- Usage: Two modes — sync (`POST /api/optimize-prompt`) and SSE streaming (`POST /api/optimize-prompt/stream`)
- Endpoint in code: `backend/server.py:270-299` (sync call), `backend/server.py:693-727` (streaming), `backend/server.py:436-449` (suggest fallback)

**Auth Provider — Emergent Google OAuth:**
- Service: Emergent.sh Google OAuth
- Used for: User authentication (Google SSO)
- OAuth initiation URL: `https://auth.emergentagent.com/?redirect=<redirect_url>` — `frontend/src/pages/Login.jsx:20`
- Session exchange endpoint: `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` — `backend/server.py:179-181`
  - Method: GET with `X-Session-ID` header
  - Returns: `email`, `session_token`, `name`, `picture`
- Session mechanism: Cookie-based. Backend sets `session_token` cookie (httponly, secure, samesite=none, 7d expiry) — `backend/server.py:218-225`
- Auth flow:
  1. User clicks Google login → redirected to `auth.emergentagent.com`
  2. After OAuth, user lands back at `/app#session_id=...`
  3. `AuthCallback.jsx` catches hash, calls `POST /api/auth/session` with `session_id`
  4. Backend exchanges session_id for user data via Emergent backend, creates/updates user, sets cookie
  5. Frontend `AuthContext` checks `GET /api/auth/me` on subsequent loads
- Frontend auth context: `frontend/src/context/AuthContext.jsx`
- Session validation: `backend/server.py:140-167` (`get_current_user` dependency)

**Analytics — PostHog:**
- Service: PostHog (self-hosted cloud)
- Used for: Product analytics, session recording
- Project API key: `phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs`
- Host: `https://us.i.posthog.com`
- Integration: Inlined in `frontend/public/index.html:87-157`
- Configuration:
  - Person profiles: `identified_only`
  - Session recording enabled (cross-origin iframes on, performance capture off)
- Emergent badge also injected via external script: `https://assets.emergent.sh/scripts/emergent-main.js` — `frontend/public/index.html:27`

**Fonts — Google Fonts:**
- Service: Google Fonts API
- Fonts loaded: `IBM Plex Sans` (UI), `JetBrains Mono` (editor/code), `Inter` (badge)
- Link: `frontend/public/index.html:8-11`
- Design system reference: `design_guidelines.json:40-43`

## Data Storage

**Databases:**
- MongoDB (via both async and sync drivers)
  - Async: `motor` (`AsyncIOMotorClient`) — main backend operations (`backend/server.py:36-37`)
  - Sync: `pymongo` (`MongoClient`) — integration test fixtures (`backend/tests/conftest.py:20-21`)
  - Connection: `MONGO_URL` env var
  - Database: `DB_NAME` env var

**Collections (6):**
| Collection | Purpose | Created In |
|---|---|---|
| `users` | User profiles (user_id, email, name, picture) | `server.py:197-204` |
| `user_sessions` | Auth sessions (session_token, user_id, expires_at) | `server.py:209-215` |
| `patterns` | System patterns (slug, name, category, template_body) | `server.py:841-846` |
| `prompts` | User prompt entries with raw/optimized content | `server.py:358-372` |
| `optimization_runs` | LLM call audit log (tokens, cost, latency) | `server.py:323-338` |

**Indexes created on startup** (`backend/server.py:847-850`):
- `users.email` — unique
- `users.user_id` — unique
- `user_sessions.session_token` — unique
- `prompts` — compound `(user_id, updated_at)`

**File Storage:**
- Local filesystem only (no S3/blob storage integration, despite `boto3` in requirements)

**Caching:**
- None detected (no Redis, in-memory cache, or CDN caching layer)

## Authentication & Identity

**Auth Provider:**
- Emergent.sh Google OAuth (custom implementation, not standard OAuth middleware)
- Implementation approach:
  - Frontend redirects to Emergent's OAuth page
  - Backend exchanges session_id for user data via Emergent session-data API
  - Custom cookie-based session stored in MongoDB (`user_sessions` collection)
  - No JWT generation on backend (sessions are opaque tokens)
- Logout: Backend deletes session from DB + clears cookie (`backend/server.py:240-246`)
- Auth check middleware: FastAPI `Depends(get_current_user)` on all protected routes
- Test auth: Synthetic users/sessions created directly in MongoDB (`backend/tests/conftest.py:26-50`)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, or similar)

**Logs:**
- Standard library `logging` to stdout (`backend/server.py:44`)
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- Logger name: `__main__` (root logger for server.py)
- Console errors in frontend (`console.error` scattered throughout components)

## CI/CD & Deployment

**Hosting:**
- Emergent platform (inferred from `.emergent/emergent.yml`)
  - Base image: `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-07052026-1`

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, etc. files in repo)

**Health Check System:**
- Dev-only: Webpack health check plugin with monitoring endpoints (`frontend/plugins/health-check/`)
  - `GET /health`, `GET /health/simple`, `GET /health/ready`, `GET /health/live`, `GET /health/errors`, `GET /health/stats`
  - Enabled via `ENABLE_HEALTH_CHECK=true` env var
- Backend health endpoint: `GET /api/health` returns model status + NIM config state (`backend/server.py:827-829`)

## Environment Configuration

**Required env vars:**
| Variable | Where Used | Purpose |
|---|---|---|
| `MONGO_URL` | `backend/server.py:30` | MongoDB connection string |
| `DB_NAME` | `backend/server.py:31` | MongoDB database name |
| `REACT_APP_BACKEND_URL` | `frontend/src/lib/api.js:3` | Backend API base URL |

**Optional env vars:**
| Variable | Default | Where Used | Purpose |
|---|---|---|---|
| `NIM_API_KEY` | `""` | `backend/server.py:32` | Nvidia NIM API key |
| `NIM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | `backend/server.py:33` | NIM endpoint URL |
| `NIM_MODEL` | `meta/llama-3.3-70b-instruct` | `backend/server.py:34` | NIM model name |
| `CORS_ORIGINS` | `*` | `backend/server.py:865` | CORS allowed origins |
| `ENABLE_HEALTH_CHECK` | not set | `frontend/craco.config.js:11` | Enables health endpoints |

**Secrets location:**
- `.env` file at `backend/.env` (not committed — in `.gitignore` via wildcard pattern)
- `NIM_API_KEY` is the only credential secret (no DB passwords, no JWT secrets in code)

## Webhooks & Callbacks

**Incoming:**
- OAuth callback via URL hash: Frontend catches `#session_id=<token>` on redirect from Emergent auth (`frontend/src/pages/AuthCallback.jsx:17`)
- No standard webhooks (Stripe, GitHub, etc.) — `stripe` package in requirements but not wired

**Outgoing:**
- None (no outbound webhooks or event publishing)

## Third-Party Packages in Requirements (Not Currently Wired)

The following packages are listed in `backend/requirements.txt` but are **not imported** in `backend/server.py`:
- `stripe==15.1.0` — Payment processing (not wired)
- `boto3==1.43.5` / `botocore==1.43.5` / `s3transfer==0.17.0` — AWS SDK (not wired)
- `google-genai==1.75.0` / `google-generativeai==0.8.6` — Google AI SDK (not wired)
- `litellm==1.80.0` — Multi-provider LLM wrapper (not wired)
- `tiktoken==0.12.0` — Token counting (not wired)
- `pandas==3.0.2` / `numpy==2.4.4` — Data analysis (not wired)

---

*Integration audit: 2026-05-10*
