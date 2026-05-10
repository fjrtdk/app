# Roadmap: Prompt Optimizer — Firebase Auth Migration

## Overview

Replace Emergent Google OAuth with Firebase Google sign-in across the full stack. Backend gets Firebase Admin SDK for ID token verification, frontend gets Firebase JS SDK for sign-in. Session cookie format stays the same so all guarded endpoints keep working without changes. Then strip all Emergent dependencies and clean up.

## Phases

- [ ] **Phase 1: Firebase Project Setup** — Create Firebase project, service account, configure env vars
- [ ] **Phase 2: Backend Firebase Integration** — Add firebase-admin, new `/api/auth/firebase` endpoint, session creation
- [ ] **Phase 3: Frontend Firebase Integration** — Add Firebase JS SDK, Google sign-in popup, rewrite AuthContext/Login/AuthCallback
- [ ] **Phase 4: Emergent Removal** — Strip Emergent auth, badge, PostHog, visual-edits
- [ ] **Phase 5: Verification & Polish** — Update tests, verify all endpoints, env docs

## Phase Details

### Phase 1: Firebase Project Setup
**Goal**: Firebase project ready with credentials
**Depends on**: Nothing
**Requirements**: AUTH-08, AUTH-09
**Success Criteria** (what must be TRUE):
  1. Firebase project exists with Google sign-in enabled
  2. Service account key downloaded
  3. Web app configured with Firebase config object
  4. `.env` files created for both backend and frontend with Firebase vars
**Plans**: 1 plan

Plans:
- [ ] 01-01: Create Firebase project via CLI, enable Google auth, generate credentials, write env files

### Phase 2: Backend Firebase Integration
**Goal**: Backend accepts Firebase ID tokens and issues session cookies
**Depends on**: Phase 1
**Requirements**: AUTH-02, AUTH-03, AUTH-08
**Success Criteria** (what must be TRUE):
  1. `firebase-admin` SDK initialized on backend
  2. `POST /api/auth/firebase` accepts ID token, verifies it, creates session
  3. Session cookie uses same format/storage as existing Emergent sessions
  4. All existing auth-guarded endpoints (`/optimize-prompt`, `/prompts/*`, etc.) work with new session cookies
  5. Existing Emergent session flow still works (no regressions yet)
**Plans**: 2 plans

Plans:
- [ ] 02-01: Add firebase-admin, init Firebase in server.py, create verify_firebase_token helper
- [ ] 02-02: Add POST /api/auth/firebase endpoint that verifies token, creates user doc, sets session cookie

### Phase 3: Frontend Firebase Integration
**Goal**: Frontend signs in with Google via Firebase, gets session
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-04, AUTH-05, AUTH-09
**Success Criteria** (what must be TRUE):
  1. Login page shows "Sign in with Google" button powered by Firebase
  2. Google sign-in popup works end-to-end: popup → token → backend session → cookie
  3. AuthCallback page handles Firebase flow seamlessly
  4. AuthContext uses Firebase auth state, calls POST /api/auth/firebase on sign-in
  5. User stays logged in across page refreshes (cookie-based)
**Plans**: 2 plans

Plans:
- [ ] 03-01: Add Firebase JS SDK to frontend, create firebase config, update AuthContext
- [ ] 03-02: Rewrite Login and AuthCallback pages for Firebase Google sign-in

### Phase 4: Emergent Removal
**Goal**: All Emergent dependencies and code removed
**Depends on**: Phase 3
**Requirements**: AUTH-06, AUTH-10
**Success Criteria** (what must be TRUE):
  1. `POST /api/auth/session` endpoint removed
  2. `GET /api/auth/logout` updated (no longer needs Emergent)
  3. Emergent script tag removed from `public/index.html`
  4. PostHog analytics removed from `public/index.html`
  5. Emergent badge removed from `public/index.html`
  6. `@emergentbase/visual-edits` removed from craco and package.json
  7. Emergent-related env vars no longer required
**Plans**: 2 plans

Plans:
- [ ] 04-01: Remove Emergent backend code (auth session endpoint, visual-edits, emergent.yml)
- [ ] 04-02: Clean up frontend (remove Emergent badge, PostHog, visual-edits from index.html, craco, package.json)

### Phase 5: Verification & Polish
**Goal**: Everything works, tests pass, docs updated
**Depends on**: Phase 4
**Requirements**: AUTH-07
**Success Criteria** (what must be TRUE):
  1. All existing backend tests pass with new auth flow
  2. Manual auth flow works (login → optimize → save → logout → login → see history)
  3. `.env.example` files document required Firebase vars
  4. No Emergent references remain in the codebase
**Plans**: 2 plans

Plans:
- [ ] 05-01: Update backend tests for Firebase auth, add .env.example files
- [ ] 05-02: Full manual verification of auth flow end-to-end

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Firebase Project Setup | 0/1 | Not started | - |
| 2. Backend Firebase Integration | 0/2 | Not started | - |
| 3. Frontend Firebase Integration | 0/2 | Not started | - |
| 4. Emergent Removal | 0/2 | Not started | - |
| 5. Verification & Polish | 0/2 | Not started | - |
