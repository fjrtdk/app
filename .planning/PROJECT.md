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
- ✓ Auth-gated sessions (Firebase Google sign-in via popup, cookie-based, 7d expiry) — v1.0
- ✓ Heuristic + NIM suggest endpoint — existing
- ✓ Split-pane editor (raw notes ↔ optimized output) — existing
- ✓ Dark theme, Volt Lime accent, IBM Plex Sans + JetBrains Mono — existing
- ✓ History with search, tags, group filtering — existing
- ✓ Token usage tracking + cost estimation — existing
- ✓ Emergent dependency removed (auth, badge, PostHog, visual-edits) — v1.0
- ✓ Firebase Admin SDK validates ID tokens server-side — v1.0
- ✓ Firebase JS SDK for Google sign-in popup — v1.0
- ✓ .env.example files document all required env vars — v1.0

### Active

- No new requirements defined for next milestone

### Out of Scope

- **User migration** — start fresh with new Firebase auth (existing Emergent sessions discarded)
- **Multi-provider LLM** — stays Nvidia NIM only
- **Custom user patterns** — not in scope
- **Browser extension** — not in scope
- **Email/password auth** — Google sign-in only

## Context

Shipped v1.0 (Firebase Auth Migration) on 2026-05-11. Codebase is a working Prompt Optimizer with FastAPI backend, React frontend (CRA + Craco), MongoDB, Nvidia NIM LLM, and Firebase Auth.

**v1.0 Stats:**
- 36 files changed (+1300/-269)
- 5 phases, 8 plans completed
- Firebase replaces Emergent for Google sign-in
- Same session cookie pattern — all guarded endpoints unchanged

**Key files (post-migration):**
- `backend/server.py` — Firebase Admin init + POST /api/auth/firebase
- `frontend/src/context/AuthContext.jsx` — loginWithGoogle via signInWithPopup
- `frontend/src/lib/firebase.js` — Firebase app config + auth exports
- `frontend/src/lib/api.js` — postFirebaseSession(idToken)

**Known issues:**
- Pre-existing craco build failure (ajv-keywords — unrelated to migration)
- Yarn lockfile needs regeneration (firebase installed via npm --legacy-peer-deps)
- Plan 05-02 (E2E manual verification) deferred

## Constraints

- **Auth**: Must use Firebase Google sign-in only (no email/password)
- **Session**: Keep cookie-based sessions so existing guarded endpoints work unchanged
- **Start fresh**: No user migration — existing sessions discarded
- **Design**: Dark theme, Volt Lime accent preserved

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Firebase ID token → custom session cookie | Reuses existing session-guarded endpoints with zero changes | ✅ Good |
| Firebase Admin SDK on backend | Handles ID token verification server-side | ✅ Good |
| Firebase JS SDK on frontend | Handles Google sign-in via popup/redirect | ✅ Good |
| Popup over redirect | Simpler UX, no page reload on sign-in | ✅ Good |
| Certificate(dict) from env vars | No file path dependency, never commit creds | ✅ Good |
| Start fresh, no user migration | Clean break from Emergent sessions | ✅ Good |

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
*Last updated: 2026-05-11 after v1.0 milestone*
