# Codebase Concerns

**Analysis Date:** 2026-05-10

## Tech Debt

### Single-file backend (`backend/server.py`) — 868 lines

- **Issue:** All backend logic lives in a single 868-line `server.py` file. Routes, models, auth, DB access, NIM client, and business logic are all in one module. This makes the file hard to navigate, test in isolation, and modify safely.
- **Files:** `backend/server.py`
- **Impact:** High risk of merge conflicts, hard to reason about dependency chains, no separation of concerns. Adding new features requires careful scrolling through hundreds of lines.
- **Fix approach:** Split into modules (`auth.py`, `routes/`, `models/`, `nim_client.py`, `db.py`) using FastAPI's `APIRouter` (already partially used but all routes are registered in one file).

### `_serialize_prompt` mutates its input dict

- **Issue:** `_serialize_prompt()` at line 460 modifies `d[k] = datetime.fromisoformat(d[k])` directly on the passed-in dict. This mutates the caller's copy of the document, which could cause subtle cross-request side effects if the same dict object is reused.
- **Files:** `backend/server.py:460-477`
- **Impact:** If any caller passes a dict that's shared (e.g., a cached reference), mutation could corrupt data or cause hard-to-debug datetime formatting errors.
- **Fix approach:** Clone the dict before mutating, or create a new `PromptOut` without modifying the input.

### SSE stream persists empty output on failure

- **Issue:** The `event_generator()` in `optimize_prompt_stream` (line 747) persists the optimization result AND logs a run AFTER the stream completes. If the NIM stream yields an error (e.g., `_stream_nim` returns an error event), the generator continues: it builds `full_output = "".join(accumulated)` (which is empty), then persists it to MongoDB. This overwrites a previously saved prompt's `optimized_output` with an empty string.
- **Files:** `backend/server.py:747-813`
- **Impact:** If a streaming optimization fails mid-way or immediately, the user's existing saved prompt can be silently overwritten with an empty output. No rollback mechanism.
- **Fix approach:** Check if `full_output.strip()` is truly empty before persisting. Skip DB writes when the stream had an error (track via a flag).

### `test_health_ok` asserts `nim_configured` is True

- **Issue:** `test_backend.py` line 16 asserts `data["nim_configured"] is True`. This test will fail on any deployment or local setup where `NIM_API_KEY` is not configured (which is optional per the codebase).
- **Files:** `backend/tests/test_backend.py:16`
- **Impact:** Tests are not portable across environments. A developer running tests locally without a NIM key will get a spurious failure.
- **Fix approach:** Make the assertion conditional, or separate NIM-dependent tests into a different test class with a skip-if-not-configured marker.

### `@emergentbase/visual-edits` external `.tgz` dependency

- **Issue:** `frontend/craco.config.js` conditionally requires `@emergentbase/visual-edits/craco` from an external `.tgz` URL. If the URL is unavailable or the package changes, it silently swallows the error. This creates an invisible external dependency that could break the dev build without clear error messaging.
- **Files:** `frontend/package.json:78`, `frontend/craco.config.js:85-98`
- **Impact:** Dev server behavior differs depending on whether this package is available. Silent failure mode makes debugging difficult. Security risk from loading arbitrary code from an external URL at build time.
- **Fix approach:** Wrap with explicit error logging, add a version pin, or vendor the plugin.

### Massive requirements.txt with unused packages

- **Issue:** `backend/requirements.txt` contains 124 pinned packages, many of which are never imported in `server.py`: `boto3`, `stripe`, `google-genai`, `google-generativeai`, `passlib`, `bcrypt`, `PyJWT`, `litellm`, `s3transfer`, `oauthlib`, `tiktoken`, `tokenizers`, etc. This creates dependency bloat, increases the attack surface, and adds maintenance burden.
- **Files:** `backend/requirements.txt`
- **Impact:** Larger Docker image, more CVEs to track, longer install times, harder to audit supply chain.
- **Fix approach:** Audit and remove unused packages. Generate requirements with `pip freeze` from a dedicated virtualenv that only installs used packages.

### Debug CSS artifact in index.css

- **Issue:** `frontend/src/index.css` line 112-114 has `[data-debug-wrapper="true"] { display: contents !important; }` — this appears to be leftover debug infrastructure from visual editing. The `!important` override could cause unexpected layout issues.
- **Files:** `frontend/src/index.css:112-114`
- **Impact:** If any element gets `data-debug-wrapper="true"`, it will have `display: contents` forced, potentially breaking layout. Unlikely in production but indicates incomplete cleanup.
- **Fix approach:** Remove the block or move to a debug-only stylesheet that is not loaded in production.

### No pagination on `/prompts` listing

- **Issue:** Both `list_prompts()` (`to_list(500)`) and `list_groups()` (`limit(2000)`) use hard limits with no cursor-based pagination. Users with many prompts will silently see truncated results.
- **Files:** `backend/server.py:498`, `backend/server.py:607`
- **Impact:** Data loss from the user's perspective — prompts beyond the limit are invisible through the API.
- **Fix approach:** Add query parameter pagination (`skip`/`limit` or cursor-based) to both endpoints.

---

## Known Bugs

### Keyboard shortcut handler stale closure

- **Issue:** The `keydown` handler in `Workbench.jsx` (line 474-492) uses the dependency `// eslint-disable-next-line react-hooks/exhaustive-deps` to suppress the exhaustive-deps warning. The closure captures `rawInput`, `output`, `selectedPattern`, `activeId`, `tags`, `group`, `title`, and `optimizing`, but the rule is suppressed so if new state dependencies are added, the keyboard handler may use stale values.
- **Files:** `frontend/src/pages/Workbench.jsx:474-492`
- **Impact:** Potential for keyboard shortcuts to fire with stale state if the dependency list grows. More critically, future changes won't trigger a lint warning.
- **Fix approach:** Use a `useRef`-based approach or properly list all dependencies.

### Stream cancel leaks AbortController

- **Issue:** `handleOptimize` in `Workbench.jsx` sets `cancelStreamRef.current` to a new abort function each time. If a user clicks Optimize while a previous stream is still running (before the cancel function is set), the old stream's `cancelStreamRef.current` reference is overwritten. The old stream is never aborted.
- **Files:** `frontend/src/pages/Workbench.jsx:261-264`
- **Impact:** Orphaned SSE connections that continue to use bandwidth and may trigger unwanted database writes when they complete.
- **Fix approach:** Always cancel the previous stream before starting a new one (call `cancelStreamRef.current?.()` at the top of `handleOptimize`).

### Autosave triggers on mount for new prompts

- **Issue:** The autosave `useEffect` in `Workbench.jsx` (line 151-196) fires when `dirty` becomes `true`. If `rawInput` has default or persisted state after loading, the initial `setDirty(true)` from any onChange will trigger an immediate autosave. There's no protection against saving an empty prompt on initial mount.
- **Files:** `frontend/src/pages/Workbench.jsx:151-196`
- **Impact:** Spurious autosave creates empty or partially-filled prompt entries on initial interaction.
- **Fix approach:** Skip autosave if `!rawInput.trim()` and no `activeId`, or use a `hasMounted` ref guard.

### Inline SVG `fill-rule` and `clip-rule` attributes use kebab-case in JSX

- **Issue:** `frontend/public/index.html` lines 69-70 contain SVG attributes `fill-rule` and `clip-rule` in kebab-case. Since this is in an HTML file (not JSX), kebab-case is correct here — this is actually OK. But the PostHog initialization script (line 88-157) uses `window.posthog` as a global, which requires the PostHog script to load from their CDN.
- **Impact:** If the PostHog CDN is unreachable, the `posthog.init(...)` call on line 149 throws a ReferenceError. This is caught by the error listener on line 26, but it creates a console error.
- **Fix approach:** Guard `posthog.init` with `typeof posthog !== 'undefined'`.

---

## Security Considerations

### CORS wide-open defaults to `*`

- **Issue:** `backend/server.py` line 864 sets `allow_origins=os.environ.get("CORS_ORIGINS", "*").split(",")`. When `CORS_ORIGINS` is not set, it defaults to `*` allowing all origins. Combined with `allow_credentials=True` (line 863), this is technically contradictory (cookies with `*` origin are dropped by browsers), but the wildcard default allows any origin when `CORS_ORIGINS` is explicitly set to `*`.
- **Files:** `backend/server.py:862-868`
- **Impact:** If `CORS_ORIGINS` is set to `*` explicitly, any website can make credentialed requests. In production, this should be locked to the frontend's actual origin.
- **Current mitigation:** The `*` default with `allow_credentials=True` is ignored by browsers for credentialed requests, but explicit `*` assignment is dangerous.
- **Recommendations:** Remove the `*` default. Require explicit origin configuration: `os.environ["CORS_ORIGINS"]`.

### PostHog API key exposed in public HTML

- **Issue:** `frontend/public/index.html` line 149 hardcodes the PostHog API key `phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs` in plaintext. This key is visible to every visitor and could be used to send arbitrary events to the project's PostHog instance.
- **Files:** `frontend/public/index.html:149`
- **Risk:** Anyone can use this key to inject fake analytics data, pollute user events, or potentially access PostHog API if the key is write+read.
- **Current mitigation:** PostHog public keys typically only allow event ingestion, not reading data. Still, the key should be environment-variable-backed.
- **Recommendations:** Move PostHog API key to an environment variable (`REACT_APP_POSTHOG_KEY`) and inject at build time.

### Session tokens stored in plaintext in MongoDB

- **Issue:** The `user_sessions` collection stores `session_token` values in plaintext. If the MongoDB database is breached, all active session tokens are exposed, allowing an attacker to impersonate any user.
- **Files:** `backend/server.py:209-216`, `backend/tests/conftest.py:39-44`
- **Risk:** A database breach compromises all active user sessions. The 7-day session duration means tokens are valid for up to a week.
- **Current mitigation:** Session tokens are random (sourced from `data["session_token"]` returned by Emergent OAuth), but stored without hashing.
- **Recommendations:** Hash session tokens with a fast hash (SHA-256) before storing. Compare against the hash on lookup.

### Third-party Emergent scripts and badge with inline styles

- **Issue:** `frontend/public/index.html` loads `https://assets.emergent.sh/scripts/emergent-main.js` (line 27) and contains a hardcoded Emergent badge with inline styles (lines 42-86). This external script runs in the user's browser with full access to the page DOM and cookies.
- **Files:** `frontend/public/index.html:27,42-86`
- **Risk:** The external script could exfiltrate session cookies or user data. If the `assets.emergent.sh` domain is compromised, all users of the app are compromised.
- **Current mitigation:** The script is served over HTTPS from a first-party domain.
- **Recommendations:** Move the badge to an environment-flag-controlled component. Subresource Integrity (SRI) hash the external script.

### Emergent badge `target="_blank"` without `rel="noopener"`

- **Issue:** The anchor tag on line 43-44 uses `target="_blank"` but does NOT include `rel="noopener noreferrer"`. This is a standard security issue: the opened page (`app.emergent.sh`) gains a reference to the app's `window` object via `window.opener`.
- **Files:** `frontend/public/index.html:42-66`
- **Risk:** The target page can redirect the app's tab to a phishing page, or access the app's DOM and potentially steal session tokens.
- **Fix approach:** Add `rel="noopener noreferrer"` to the badge link.

---

## Performance Bottlenecks

### Every authenticated request hits MongoDB for auth

- **Issue:** `get_current_user()` (line 140-167) performs TWO MongoDB queries on EVERY protected endpoint — one to look up the session, one to look up the user. There is no caching layer.
- **Files:** `backend/server.py:140-167`
- **Cause:** No in-memory cache (Redis, local cache) for session or user data.
- **Improvement path:** Add an in-memory TTL cache (e.g., `cachetools.TTLCache`) for session lookups with a short expiry (30-60s). Or use a JWT-based session scheme to avoid DB hits entirely.

### MongoDB queries without covered indexes

- **Issue:** The startup creates 4 indexes (line 847-850), but several common query patterns lack indexes:
  - `optimization_runs` collection has NO indexes (queries by `user_id` on insert).
  - `prompts` collection has an index on `(user_id, updated_at)` but queries also filter by `tags` and `group` and search via `$regex`.
  - `patterns` collection has no indexes (queries by `slug`).
- **Files:** `backend/server.py:841-851`, `backend/server.py:308,487-498,603-607,617-626`
- **Cause:** Indexes were only added for basic uniqueness and sorting. Query patterns for filters and regex search are not optimized.
- **Improvement path:** Add indexes for common filter patterns: `(user_id, group)`, `(user_id, tags)`. Consider text indexes for `$regex` queries.

### SSE stream accumulates full output in memory

- **Issue:** The `event_generator()` accumulates the full output in an `accumulated: List[str]` array (line 744) and joins it at the end. For long outputs (thousands of tokens), this is an O(n) memory allocation. Combined with multiple concurrent streams, this could exhaust memory.
- **Files:** `backend/server.py:744,763`
- **Cause:** The accumulation is needed for final persistence. No streaming write to the DB.
- **Improvement path:** Write output incrementally to DB during the stream, or use a temp file for large outputs. Consider using MongoDB's `$concat` update approach.

### Global CSS scrollbar styling

- **Issue:** `frontend/src/index.css` lines 60-74 apply `::-webkit-scrollbar` styling to ALL elements globally. This prevents OS-native scrollbar behavior across the entire app and forces WebKit-specific rendering that won't work on Firefox or other browsers.
- **Files:** `frontend/src/index.css:60-74`
- **Cause:** The global `*::-webkit-scrollbar` selector is too broad.
- **Improvement path:** Scope custom scrollbar styles to specific scrollable containers (`.sidebar-scroll`, `.output-scroll`). Remove the global selector.

---

## Fragile Areas

### SSE stream client disconnect handling

- **Issue:** The `event_generator()` in `optimize_prompt_stream` runs persistence logic AFTER the SSE stream is fully consumed. If the client disconnects mid-stream (e.g., closes the browser tab), the generator continues running on the server side, but the `StreamingResponse` may abort the coroutine. FastAPI/Starlette does NOT guarantee that the generator will be awaited fully after client disconnect.
- **Files:** `backend/server.py:730-823`
- **Why fragile:** Client disconnect behavior depends on the ASGI server (uvicorn). Some servers kill the generator, others let it complete. The DB persistence and optimization run logging may or may not execute.
- **Safe modification:** Use `asyncio.shield()` for critical persistence, or move persistence to the stream start (before SSE) and only update on completion.

### Emergent OAuth dependency (external auth provider)

- **Issue:** The entire auth system depends on `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` (hardcoded in `backend/server.py:180`). If this endpoint is down, changes, or the session validation logic changes, ALL authentication breaks and the app becomes unusable.
- **Files:** `backend/server.py:178-184`
- **Why fragile:** Hardcoded URL to an external service with no fallback, no retry, no circuit breaker. The endpoint response shape is assumed (`data["email"]`, `data["session_token"]`, `data.get("name")`).
- **Test coverage:** None — there are no tests that exercise the real OAuth flow (tests use synthetic sessions injected directly into MongoDB).
- **Safe modification:** Add retry with exponential backoff, response validation, and a health check that verifies the OAuth endpoint is reachable. Document the expected response schema.

### `get_current_user` string-datetime parsing

- **Issue:** `get_current_user()` (line 155-158) performs manual `isinstance` checks and `.replace(tzinfo=timezone.utc)` on parsed dates. If the database contains inconsistent datetime formats (e.g., from different app versions), this parsing could fail with a `ValueError`.
- **Files:** `backend/server.py:155-158,165-166`
- **Why fragile:** Date storage is a mix of ISO strings and potentially other formats across collections (`expires_at` in sessions, `created_at` in users). Different collections use different code paths for serialization, increasing the risk of inconsistency.
- **Safe modification:** Standardize all datetime fields to UTC-aware `datetime` objects in the Pydantic models. Use MongoDB's native `datetime` type instead of ISO strings.

### React 19 with CRA 5 (react-scripts 5.0.1)

- **Issue:** `react-scripts@5.0.1` (Create React App) was last updated for React 18. Using it with `react@^19.0.0` and `react-dom@^19.0.0` is not officially supported. Webpack configs, babel presets, and ESLint configs baked into CRA may not be compatible with React 19 features.
- **Files:** `frontend/package.json:44-50`
- **Why fragile:** CRA 5 is in maintenance mode and is not tested against React 19. Future React 19 updates may break CRA's compilation pipeline. CRA is also deprecated by the React team in favor of frameworks like Next.js or Vite.
- **Test coverage:** None specific to build compatibility.
- **Safe modification:** Pin React 19 to a specific minor version. Test builds in CI. Plan migration to Vite or Next.js.

### BrowserRouter without server-side fallback

- **Issue:** The app uses `BrowserRouter` (in `frontend/src/App.js:35`), which requires the server to serve `index.html` for all routes (for client-side routing). There is no configuration for this server-side fallback in the deployment setup.
- **Files:** `frontend/src/App.js:35`
- **Why fragile:** Deploying to a static host (S3, vanilla Nginx, some PaaS) without a catch-all redirect to `index.html` causes 404 errors on direct navigation to `/app`, `/share/:token`, or any refresh on these routes.
- **Test coverage:** Not tested.
- **Safe modification:** Document the required server configuration (e.g., Nginx `try_files` or S3 redirect rules). Consider switching to `HashRouter` for truly static deployment.

---

## Scaling Limits

### Hard limit of 500 prompts per user

- **Issue:** `list_prompts()` has a hard-coded `to_list(500)` limit. No pagination mechanism exists. Heavy users with 500+ prompts will get silently truncated results.
- **Files:** `backend/server.py:498`
- **Current capacity:** 500 prompts/user
- **Limit:** No way to access prompts beyond the first 500
- **Scaling path:** Add `skip`/`limit` query parameters, return a paginated response with total count and next-page cursor.

### No rate limiting on optimization endpoints

- **Issue:** Both `/optimize-prompt` and `/optimize-prompt/stream` have no rate limiting. Each call costs real money (NIM API calls at ~$0.20/M input, $0.60/M output). A malicious or buggy client could generate thousands of calls and rack up significant costs.
- **Files:** `backend/server.py:303-381,730-823`
- **Current capacity:** Unlimited calls per user
- **Limit:** Budget (NIM API costs)
- **Scaling path:** Add per-user rate limiting (e.g., 10 optimizations/minute, 100/hour) using an in-memory rate limiter or Redis.

---

## Dependencies at Risk

### Create React App (CRA) / react-scripts

- **Risk:** CRA 5 (`react-scripts@5.0.1`) is in maintenance-only mode and has been officially deprecated by the React team. It will not receive updates for new React versions. Security vulnerabilities in the transitive webpack/babel dependency tree will not be fixed.
- **Impact:** Build pipeline becomes a security risk. Cannot upgrade to React 19+ features that require newer JSX transform or build tooling. No support for modern frontend tooling (SWC, Turbopack, etc.).
- **Migration plan:** Migrate from CRA to Vite. The `craco` configuration and `@emergentbase/visual-edits` integration will need rewriting for Vite's plugin system.

### `@emergentbase/visual-edits` remote `.tgz`

- **Risk:** An external npm `.tgz` from `https://assets.emergent.sh/npm/emergentbase-visual-edits-1.0.8.tgz` is loaded as a dev dependency. If this domain goes down or the file is removed, development builds will silently lose visual editing. The package's version is pinned in the URL but not in a lockfile.
- **Impact:** Lost developer productivity. Silent degradation (the error is caught and logged as a warning).
- **Migration plan:** Vendor the `.tgz` in the repo, or move the visual editing functionality to a first-party plugin.

### Nvidia NIM external API

- **Risk:** The entire app's core feature (optimization) depends on Nvidia NIM's OpenAI-compatible API. If the API is down, rate-limited, or changes its response format, the app's primary function breaks. The `NIM_API_KEY` is optional, meaning the app can run without it, but then optimization is impossible.
- **Impact:** App becomes a read-only history browser without optimization capabilities.
- **Migration plan:** Abstract the LLM client behind an interface. Support multiple providers (OpenAI, Anthropic, local Ollama). Add graceful degradation when NIM is unavailable.

---

## Missing Critical Features

### No .env.example template

- **Problem:** There's no `.env.example` file documenting required environment variables. A new developer must read the code to discover required env vars: `MONGO_URL`, `DB_NAME`, `NIM_API_KEY`, `NIM_BASE_URL`, `NIM_MODEL`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`.
- **Files:** Root and `backend/` directory
- **Blocks:** New developer onboarding, automated CI/CD setup.
- **Priority:** Medium

### No health check for NIM availability

- **Problem:** The `/api/health` endpoint (line 827-829) only reports whether NIM is configured, not whether it's actually reachable. A misconfigured `NIM_BASE_URL` or revoked `NIM_API_KEY` is only discovered when a user attempts to optimize.
- **Files:** `backend/server.py:827-829`
- **Blocks:** Proactive monitoring of the optimization pipeline.
- **Priority:** Low

### No prompt search index on MongoDB

- **Problem:** The `/prompts?q=` search uses `$regex` with no case-insensitive index support. For large prompt collections, this is a full collection scan. MongoDB does not use indexes for `$regex` with case-insensitive options unless a special collation index is created.
- **Files:** `backend/server.py:492-497`
- **Blocks:** Search performance degrades linearly with prompt count.
- **Priority:** Low (acceptable for personal use, problematic for teams)

---

## Test Coverage Gaps

### Real OAuth flow not tested

- **What's not tested:** The `POST /api/auth/session` endpoint (line 171-232) — which handles the actual Google OAuth callback, creates users, and sets session cookies — is never tested. Tests bypass this entirely by injecting synthetic sessions directly into MongoDB.
- **Files:** `backend/server.py:171-232`, `backend/tests/conftest.py:25-50`
- **Risk:** If the Emergent OAuth endpoint changes its response format, or if the session creation logic breaks, authentication silently fails. This would block all users from logging in, but no test would catch it.
- **Priority:** High

### SSE error recovery path not tested

- **What's not tested:** The streaming endpoint's resilience to NIM service failures, client disconnects mid-stream, and partial data delivery is not tested. The `_stream_nim` error handling (both in `_call_nim` and `_stream_nim`) is exercised only in happy-path tests.
- **Files:** `backend/server.py:693-727,747-813`
- **Risk:** Users may experience silent data loss (empty output persisted) that goes unnoticed.
- **Priority:** Medium

### Frontend components have no tests

- **What's not tested:** No frontend tests exist. All 7 components (`EditorPane`, `OutputPane`, `Sidebar`, `Toolbar`, `MetaBar`, `AuthCallback`, `ShareView`), 4 pages, 2 context providers, and the API library are untested. The test runner (`craco test`) works via Jest/CRA but has no test files.
- **Files:** All `frontend/src/` directory
- **Risk:** Frontend regressions are caught only through manual testing or user reports.
- **Priority:** High

### Token usage edge cases not tested

- **What's not tested:** No tests verify behavior when `NIM_API_KEY` is not configured (nim_client is `None`). The `_call_nim` function returns 503, but `_stream_nim` yields an error event — neither path has test coverage.
- **Files:** `backend/server.py:270-299,693-727`
- **Risk:** Deployment without a NIM key works for browsing history but fails on optimization. The 503 error path may have incorrect response format.
- **Priority:** Medium

---

*Concerns audit: 2026-05-10*
