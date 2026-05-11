# Prompt Optimizer

## What This Is

A lightweight web app that turns rough notes into Fabric-style structured prompts and runs optimization through Nvidia NIM. Users pick a pattern, click Optimize, copy/save/fork the result, with history and suggestions. Built for coding-agent users and AI power users.

## Core Value

Users can optimize a prompt in one click and trust their work is saved.

## Requirements

### Validated

- ✓ Prompt optimization via NIM (sync POST + SSE stream) — existing
- ✓ 6 Fabric-style system patterns (improve_prompt, create_coding_prompt, etc.) — existing
- ✓ Prompt CRUD with fork, rerun, share (public read-only links) — existing
- ✓ Auth-gated sessions (Google OAuth, cookie, 7d expiry) — existing (Emergent)
- ✓ Heuristic + NIM suggest endpoint — existing
- ✓ Split-pane editor (raw notes ↔ optimized output) — existing
- ✓ Dark theme, Volt Lime accent, IBM Plex Sans + JetBrains Mono — existing
- ✓ History with search, tags, group filtering — existing
- ✓ Token usage tracking + cost estimation — existing

### Active

All requirements are complete. See implementation details below.

### Out of Scope

- **User migration** — start fresh with new Firebase auth (existing Emergent sessions discarded)
- **Multi-provider LLM** — stays Nvidia NIM only
- **Custom user patterns** — not in scope
- **Browser extension** — not in scope
- **Email/password auth** — Google sign-in only

## Context

Brownfield project. Existing codebase is a working Prompt Optimizer with FastAPI backend, React frontend (CRA + Craco), MongoDB, and Nvidia NIM LLM. Auth is via Emergent's Google OAuth proxy (`auth/session` exchanges a session_id for user data + creates cookie). The Firebase migration replaces the Emergent dependency while keeping the same session cookie pattern so all guarded endpoints remain unchanged.

Key files affected:
- `backend/server.py` — add Firebase Admin init, new `/api/auth/firebase` endpoint, remove Emergent `/api/auth/session`
- `frontend/src/context/AuthContext.jsx` — Firebase `loginWithGoogle` via `signInWithPopup`
- `frontend/src/pages/Login.jsx` — calls `loginWithGoogle` from AuthContext
- `frontend/src/pages/AuthCallback.jsx` — Firebase redirect fallback via `getRedirectResult`
- `frontend/src/lib/api.js` — added `postFirebaseSession(idToken)`
- `frontend/src/lib/firebase.js` — Firebase app config + auth exports
- `frontend/public/index.html` — removed Emergent script + PostHog + badge
- `backend/requirements.txt` — added `firebase-admin`
- `frontend/package.json` — added `firebase`, removed `@emergentbase/visual-edits`
- `backend/server.py` — Firebase Admin init + `POST /api/auth/firebase` endpoint, removed `POST /api/auth/session`

## Constraints

- **Auth**: Must use Firebase Google sign-in only (no email/password)
- **Session**: Keep cookie-based sessions so existing guarded endpoints work unchanged
- **Start fresh**: No user migration — existing sessions discarded
- **Design**: Dark theme, Volt Lime accent preserved

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase ID token → custom session cookie | Reuses existing session-guarded endpoints with zero changes | Implemented |
| Firebase Admin SDK on backend | Handles ID token verification server-side | Implemented |
| Firebase JS SDK on frontend | Handles Google sign-in via popup/redirect | Implemented |
| Popup over redirect | Simpler UX, no page reload on sign-in | Implemented |

## Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01: Replace Emergent OAuth with Firebase Google sign-in | 3 | Complete |
| AUTH-02: Firebase Admin SDK validates ID tokens | 2 | Complete |
| AUTH-03: Custom session cookie after Firebase auth | 2 | Complete |
| AUTH-04: Login page uses Firebase signInWithPopup | 3 | Complete |
| AUTH-05: AuthCallback handles Firebase flow | 3 | Complete |
| AUTH-06: Remove Emergent auth code | 4 | Complete |
| AUTH-07: All auth-guarded endpoints work unchanged | 5 | Complete |
| AUTH-08: Backend env vars for Firebase | 1 | Complete |
| AUTH-09: Frontend env var for Firebase config | 1 | Complete |
| AUTH-10: Remove Emergent badge + PostHog | 4 | Complete |

---
*Last updated: 2026-05-10 after roadmap creation*
