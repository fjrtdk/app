---
status: complete
one_liner: "Firebase project prompt-optimizer-fjrt created, Google Auth enabled, service account generated, env files written"
---

# Phase 1: Firebase Project Setup — Summary

**Executed:** 2026-05-10
**Plan:** 01-01 (4 tasks, all complete)

## Accomplishments

1. Created Firebase project `prompt-optimizer-fjrt` via CLI (firebase-tools v15)
2. Enabled Google sign-in provider in Firebase Console
3. Registered web app and obtained Firebase Web SDK config
4. Generated and downloaded service account private key
5. Saved service account JSON to `~/.credentials/prompt-optimizer-fjrt-firebase-admin.json` (outside repo)
6. Wrote `backend/.env` with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
7. Wrote `frontend/.env.local` with 6 `REACT_APP_FIREBASE_*` vars (API key, authDomain, projectId, storageBucket, senderId, appId)
8. Updated `.gitignore` to cover both env files

## Key Decisions

- **Project ID:** `prompt-optimizer-fjrt` (`prompt-optimizer` was globally taken)
- **Credentials strategy:** Individual env vars for backend (FIREBASE_*) and frontend (REACT_APP_FIREBASE_*), no JSON file commited
- **Service account key:** Stored at `~/.credentials/`, never in repo
- **Google sign-in only:** No email/password or other providers

## Verification

- Firebase project listed in `firebase projects:list`
- Both env files written and gitignored
- Service account JSON outside repo
