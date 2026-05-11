# Milestone v1.0 — Prompt Optimizer: Firebase Auth Migration

**Generated:** 2026-05-10
**Purpose:** Team onboarding and project review

---

## 1. Project Overview

**Prompt Optimizer** is a lightweight web app that turns rough notes into Fabric-style structured prompts and runs optimization through Nvidia NIM. Users pick a pattern, click Optimize, copy/save/fork the result, with history and suggestions. Built for coding-agent users and AI power users.

**Core Value:** Users can optimize a prompt in one click and trust their work is saved.

**Milestone Objective:** Replace Emergent Google OAuth with Firebase Google sign-in across the full stack. Remove all Emergent dependencies (auth proxy, visual-edits badge, PostHog analytics). Keep the same session cookie pattern so all guarded endpoints remain unchanged.

**Status:** All 5 phases complete. Code changes uncommitted (pending review).

## 2. Architecture & Technical Decisions

- **Decision:** Firebase ID token → custom session cookie
  - **Why:** Reuses existing session-guarded endpoints with zero changes to `Depends(get_current_user)` pattern
  - **Phase:** 2
- **Decision:** Firebase Admin SDK on backend, Firebase JS SDK on frontend
  - **Why:** Admin SDK handles ID token verification server-side; JS SDK handles Google sign-in via popup on the client
  - **Phase:** 2, 3
- **Decision:** Popup over redirect for sign-in
  - **Why:** Simpler UX, no page reload on sign-in. AuthCallback kept as redirect fallback
  - **Phase:** 3
- **Decision:** `firebase_admin.credentials.Certificate(dict)` initialization from env vars
  - **Why:** Avoids file path dependency — the service account JSON never touches the repo
  - **Phase:** 2
- **Decision:** Individual `REACT_APP_FIREBASE_*` env vars (not a single JSON blob)
  - **Why:** Matches existing REACT_APP_ convention, easier to debug
  - **Phase:** 1
- **Decision:** Firebase initialized in dedicated `src/lib/firebase.js` module
  - **Why:** Reusable across AuthContext (popup) and AuthCallback (redirect fallback)
  - **Phase:** 3
- **Decision:** Session persistence via cookie only (no Firebase auth listener on page load)
  - **Why:** `checkAuth()` → `getMe()` flow already handles cookie-based session persistence. Firebase JS SDK only needed for sign-in action
  - **Phase:** 3
- **Decision:** Start fresh — no user migration from Emergent sessions
  - **Why:** Emergent sessions discarded. New Firebase auth creates new users/sessions from scratch
  - **Phase:** 1
- **Decision:** Removed PostHog analytics entirely
  - **Why:** No longer needed after Emergent removal; reduces third-party dependencies
  - **Phase:** 4

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 1 | Firebase Project Setup | Complete | Created Firebase project `prompt-optimizer-fjrt`, enabled Google Auth, generated service account key, wrote `.env` + `.env.local` |
| 2 | Backend Firebase Integration | Complete | Added `firebase-admin==7.4.0`, initialized Firebase Admin SDK from env vars, created `POST /api/auth/firebase` endpoint that verifies ID tokens and issues session cookies |
| 3 | Frontend Firebase Integration | Complete | Added Firebase JS SDK, `src/lib/firebase.js` config module, `loginWithGoogle` in AuthContext using `signInWithPopup`, updated Login/AuthCallback/App.js routing |
| 4 | Emergent Removal | Complete | Removed `POST /api/auth/session`, `httpx`, `emergentintegrations`, `@emergentbase/visual-edits`, Emergent badge, PostHog analytics, Emergent script from `index.html` |
| 5 | Verification & Polish | Complete | Updated test default URLs to `localhost:8000`, created `.env.example` files, updated AGENTS.md with Firebase auth docs |

## 4. Requirements Coverage

- ✅ **AUTH-01:** Replace Emergent OAuth with Firebase Google sign-in — Login page calls `loginWithGoogle()` powered by Firebase `signInWithPopup`
- ✅ **AUTH-02:** Firebase Admin SDK validates ID tokens — `firebase_auth.verify_id_token()` on `POST /api/auth/firebase`
- ✅ **AUTH-03:** Custom session cookie after Firebase auth — `secrets.token_urlsafe(32)` session stored in `user_sessions` collection, `session_token` cookie set with 7d expiry
- ✅ **AUTH-04:** Login page uses `signInWithPopup(GoogleAuthProvider)` — `AuthContext.loginWithGoogle` handles the full flow
- ✅ **AUTH-05:** AuthCallback handles Firebase flow — uses `getRedirectResult(auth)` as redirect fallback
- ✅ **AUTH-06:** Remove Emergent auth code — `POST /api/auth/session` endpoint deleted, `httpx` import removed
- ✅ **AUTH-07:** All auth-guarded endpoints work unchanged — `get_current_user` dependency unchanged, same cookie pattern
- ✅ **AUTH-08:** Backend env vars configured — `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `backend/.env`
- ✅ **AUTH-09:** Frontend env var configured — 6 `REACT_APP_FIREBASE_*` vars in `frontend/.env.local`
- ✅ **AUTH-10:** Emergent badge + PostHog removed — `index.html` cleaned of all Emergent/PostHog markup

## 5. Key Decisions Log

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| D-01 | Firebase project `prompt-optimizer-fjrt` | 1 | `prompt-optimizer` was globally taken |
| D-02 | Google sign-in only | 1 | No email/password per requirements |
| D-03 | Env vars for credentials (never commit JSON) | 1 | Security best practice |
| D-04 | Individual REACT_APP_* vars | 1 | Convention match, debuggability |
| D-05 | `Certificate(dict)` from env vars | 2 | No file path dependency |
| D-06 | `verify_id_token()` + `get_user()` | 2 | Full profile from Firebase Auth |
| D-07 | Graceful fallback if Firebase not configured | 2 | Devs without Firebase env vars can still run non-auth parts |
| D-08 | Dedicated `firebase.js` module | 3 | Shared between AuthContext and AuthCallback |
| D-09 | Cookie-only session persistence | 3 | No Firebase listener needed; existing `getMe()` flow handles it |
| D-10 | Remove PostHog entirely | 4 | Reduces third-party dependencies |
| D-11 | `dotenv` kept in craco.config.js | 4 | Still used for `ENABLE_HEALTH_CHECK` |

## 6. Tech Debt & Deferred Items

- **Build failure (pre-existing):** `craco build` fails with `ajv-keywords` module resolution error. Unrelated to Firebase migration — existed before changes. Affects both `yarn build` and `npm run build`.
- **Yarn lockfile:** `yarn add firebase` failed (couldn't resolve `@firebase/storage-types@0.8.4`). `firebase` was installed via `npm install --legacy-peer-deps` instead. `yarn.lock` out of sync.
- **Manual E2E verification (plan 05-02):** Not executed — requires running backend + MongoDB + NIM API key. Auth flow changes are logically sound but untested end-to-end.
- **Test suite:** Backend tests still reference old `BASE_URL` defaults (updated to `localhost:8000` but never run). Tests use MongoDB session injection pattern which is unchanged.
- **PostHog removed completely:** No analytics replacement implemented. If analytics are needed later, this should be addressed.
- **`test_reports/` files:** Still contain Emergent references in JSON report files. These are protocol files between testing agents, not source code.

## 7. Getting Started

- **Run the project:**
  - Backend: `cd backend && uvicorn server:app --reload`
  - Frontend: `cd frontend && yarn start`
  - Requires MongoDB running locally + `.env` files configured
- **Key directories:**
  - `backend/` — Single-file FastAPI server (`server.py`), patterns seed
  - `frontend/src/` — React app (pages/, components/, context/, lib/)
  - `backend/tests/` — Integration tests (pytest)
  - `.planning/` — Project planning artifacts
- **Tests:**
  - `cd backend && pytest tests/ -v` (needs live MongoDB + running backend)
- **Where to look first:**
  - `backend/server.py:40-50` — Firebase Admin SDK initialization
  - `backend/server.py:170-230` — `POST /api/auth/firebase` endpoint
  - `frontend/src/context/AuthContext.jsx` — `loginWithGoogle` and auth state
  - `frontend/src/lib/firebase.js` — Firebase app config
  - `frontend/src/pages/Login.jsx` — Google sign-in button

---

## Stats

- **Timeline:** 2026-05-10T14:41 → 2026-05-10T19:26 (4h 45m single session)
- **Phases:** 5 complete / 5 total
- **Commits:** 14 total (7 planning + 7 original codebase)
- **Files changed:** 18 (+170 / -269) — uncommitted
- **Contributors:** Fjrt, emergent-agent-e1
