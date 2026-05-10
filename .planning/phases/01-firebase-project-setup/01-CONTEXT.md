# Phase 1: Firebase Project Setup - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a Firebase project with Google sign-in enabled, generate service account credentials, and write environment configuration files for both backend (`backend/.env`) and frontend (`frontend/.env.local`). This is pure setup — no code changes to the app.

</domain>

<decisions>
## Implementation Decisions

### Firebase Project
- **D-01:** Project name: `prompt-optimizer`
- **D-02:** GCP location: `us-central1` (default)
- **D-03:** Use Firebase CLI (`firebase-tools`) for setup — `firebase init` + `firebase apps:create`

### Authentication
- **D-04:** Enable Google sign-in only (no email/password, no other providers)
- **D-05:** Use default OAuth consent screen configuration

### Credentials
- **D-06:** Service account JSON key — download but NEVER commit. Reference via env vars only.
- **D-07:** Firebase Web SDK config — use individual env vars (not a single JSON blob)

### Environment Variables
- **D-08:** Backend (`backend/.env`):
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `FIREBASE_DATABASE_URL` (if needed)
- **D-09:** Frontend (`frontend/.env.local`):
  - `REACT_APP_FIREBASE_API_KEY`
  - `REACT_APP_FIREBASE_AUTH_DOMAIN`
  - `REACT_APP_FIREBASE_PROJECT_ID`
  - `REACT_APP_FIREBASE_STORAGE_BUCKET`
  - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
  - `REACT_APP_FIREBASE_APP_ID`

### CLI Setup
- **D-10:** Use `npx firebase-tools` (no global install) to avoid version conflicts
- **D-11:** Create project via `firebase projects:create` or Firebase Console if CLI auth is complex
- **D-12:** Enable Google auth via `firebase auth:export` or `gcloud` CLI

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Requirements, constraints, key decisions
- `.planning/ROADMAP.md` — Phase structure and dependencies

### Codebase
- `.planning/codebase/STACK.md` — Current stack (Python 3, FastAPI, React 19, CRA)
- `.planning/codebase/ARCHITECTURE.md` — Auth flow, session handling, API structure
- `.planning/codebase/CONCERNS.md` — Known issues and fragile areas

### Environment
- `backend/server.py` — Backend entrypoint (where Firebase Admin SDK will be initialized)
- `backend/.env` — Backend environment file (will be updated)
- `frontend/.env.local` — Frontend environment file (will be created)
- `AGENTS.md` — Agent instruction file with architecture notes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/server.py:136-168` — `get_current_user` dependency (session auth pattern to preserve)
- `backend/server.py:170-246` — Emergent auth session endpoint (will be replaced, but session cookie pattern stays same)

### Established Patterns
- Cookie-based sessions with `session_token` cookie, `user_sessions` MongoDB collection
- Auth guarded via FastAPI `Depends(get_current_user)`
- Env vars loaded via `python-dotenv` from `backend/.env`

### Integration Points
- `backend/server.py` — New Firebase Admin init block (after NIM client init)
- `backend/server.py` — New `POST /api/auth/firebase` endpoint
- `backend/.env` — New Firebase env vars
- `frontend/.env.local` — New Firebase frontend config

</code_context>

<specifics>
## Specific Ideas

- Use `npx firebase-tools` for CLI operations to avoid global dependency
- Create separate Firebase project for dev vs production if needed later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Firebase Project Setup*
*Context gathered: 2026-05-10*
