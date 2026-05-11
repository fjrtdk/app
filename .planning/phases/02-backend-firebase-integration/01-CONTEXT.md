# Phase 2: Backend Firebase Integration - Context

**Gathered:** 2026-05-10
**Status:** Complete (executed 2026-05-10)

<domain>
## Phase Boundary

Add Firebase Admin SDK to the backend, initialize it with service account credentials from env vars, and create a `POST /api/auth/firebase` endpoint that accepts a Firebase ID token from the frontend, verifies it, creates/updates a user in MongoDB, generates a session cookie, and returns user data. The existing Emergent auth endpoints remain untouched (removed in Phase 4).

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Use `firebase_admin.credentials.Certificate(dict)` to initialize from env vars (no file path dependency)
- **D-02:** Use `firebase_auth.verify_id_token()` for ID token verification
- **D-03:** Also call `firebase_auth.get_user(uid)` to get display_name and photo_url (preferred over token claims)
- **D-04:** Generate session cookie with `secrets.token_urlsafe(32)` instead of relying on Emergent
- **D-05:** Same session cookie format (name, expiry, httpOnly, secure, samesite) as existing Emergent sessions
- **D-06:** Keep existing auth endpoints untouched — will be removed in Phase 4
- **D-07:** Firebase Admin SDK initialized only when all 3 env vars are present (graceful fallback)
- **D-08:** Actual Firebase project ID: `prompt-optimizer-fjrt` (was `prompt-optimizer` but taken globally)

</decisions>

<canonical_refs>
## Canonical References

- `.planning/PROJECT.md` — Requirements AUTH-02, AUTH-03, AUTH-08
- `.planning/ROADMAP.md` — Phase 2 structure
- `backend/server.py` — Modified file (Firebase init + new auth endpoint)
- `backend/requirements.txt` — Added `firebase-admin==7.4.0`

</canonical_refs>

---

*Phase: 2-Backend Firebase Integration*
*Context gathered: 2026-05-10*
