# Roadmap: Prompt Optimizer — Firebase Auth Migration

## Milestones

- ✅ **v1.0 Firebase Auth Migration** — Phases 1-5 (shipped 2026-05-11)

## Phases

<details>
<summary>✅ v1.0 Firebase Auth Migration (Phases 1-5) — SHIPPED 2026-05-11</summary>

### Phase 1: Firebase Project Setup
**Goal**: Firebase project ready with credentials
**Depends on**: Nothing
**Plans**: 1 plan

Plans:
- [x] 01-01: Create Firebase project via CLI, enable Google auth, generate credentials, write env files

### Phase 2: Backend Firebase Integration
**Goal**: Backend accepts Firebase ID tokens and issues session cookies
**Depends on**: Phase 1
**Plans**: 2 plans

Plans:
- [x] 02-01: Add firebase-admin, init Firebase in server.py, create verify_firebase_token helper
- [x] 02-02: Add POST /api/auth/firebase endpoint that verifies token, creates user doc, sets session cookie

### Phase 3: Frontend Firebase Integration
**Goal**: Frontend signs in with Google via Firebase, gets session
**Depends on**: Phase 2
**Plans**: 2 plans

Plans:
- [x] 03-01: Add Firebase JS SDK to frontend, create firebase config, update AuthContext
- [x] 03-02: Rewrite Login and AuthCallback pages for Firebase Google sign-in

### Phase 4: Emergent Removal
**Goal**: All Emergent dependencies and code removed
**Depends on**: Phase 3
**Plans**: 2 plans

Plans:
- [x] 04-01: Remove Emergent backend code (auth session endpoint, visual-edits, emergent.yml)
- [x] 04-02: Clean up frontend (remove Emergent badge, PostHog, visual-edits from index.html, craco, package.json)

### Phase 5: Verification & Polish
**Goal**: Everything works, tests pass, docs updated
**Depends on**: Phase 4
**Plans**: 2 plans (1 complete, 1 deferred)

Plans:
- [x] 05-01: Update backend tests for Firebase auth, add .env.example files
- [ ] 05-02: Manual E2E auth flow verification (deferred — needs live infrastructure)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Firebase Project Setup | v1.0 | 1/1 | ✅ Complete | 2026-05-10 |
| 2. Backend Firebase Integration | v1.0 | 2/2 | ✅ Complete | 2026-05-10 |
| 3. Frontend Firebase Integration | v1.0 | 2/2 | ✅ Complete | 2026-05-10 |
| 4. Emergent Removal | v1.0 | 2/2 | ✅ Complete | 2026-05-10 |
| 5. Verification & Polish | v1.0 | 1/2 | ◐ Partial (1 deferred) | 2026-05-10 |
