# Testing Patterns

**Analysis Date:** 2026-05-10

## Test Framework

**Runner:**
- Backend: pytest 9.0.3
  - Config: Implicit via `pytest.ini` or `pyproject.toml` (not explicitly found; uses pytest defaults)
  - Location: `backend/tests/`
- Frontend: `craco test` (underlying Jest via react-scripts)
  - Config: Built into CRA/Craco; no separate jest.config.js found

**Assertion Library:**
- Backend: Python `assert` statement (pytest style)
- Frontend: Jest expects (built into react-scripts)

**Run Commands:**
```bash
# Backend integration tests (from backend/ or root)
pytest tests/ -v              # Run all tests
pytest tests/ -v -k "not test_optimize_real_nim and not test_rerun"  # Skip expensive NIM tests

# Frontend tests (from frontend/)
yarn test                      # Interactive watch mode
yarn test --watchAll=false     # Single run
yarn test --coverage           # Coverage
```

## Test File Organization

**Location:**
- Backend: Tests are in separate `backend/tests/` directory, NOT co-located
- Frontend: CRA expects `*.test.js` or `*.spec.js` files; none currently present in the codebase

**Naming:**
- Test files: `test_<feature>.py` (e.g., `test_backend.py`, `test_iteration2.py`)
- Test classes: `Test<Feature>` (e.g., `TestHealth`, `TestOptimize`, `TestShare`)
- Test methods: `test_<description>` (e.g., `test_health_ok`, `test_optimize_empty_input`)

**Structure:**
```
backend/
├── server.py                 # Code under test
├── patterns_seed.py
└── tests/
    ├── conftest.py           # Fixtures and session setup
    ├── test_backend.py       # Core functionality tests
    └── test_iteration2.py    # Iteration 2 features tests
```

## Test Structure

**Suite Organization:**
```python
class TestHealth:
    def test_health_ok(self, api_client):
        r = api_client.get(f"{BASE}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
```

**Patterns:**
- Setup: Handled via pytest fixtures in `conftest.py` (session-scoped)
- Teardown: Fixture yield + cleanup; also explicit `try/finally` in tests
- Assertion: Direct `assert` statements on response status, JSON fields, and side effects

**Key Characteristics:**
- Tests are **integration tests**, not unit tests
- They hit a **live running backend** at `REACT_APP_BACKEND_URL`
- They read/write to a **real MongoDB** via `MONGO_URL`
- Some tests make **real NIM/LLM calls** (tagged: `test_optimize_real_nim`, `test_rerun`)

## Fixtures (conftest.py)

**Available Fixtures:**

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `base_url` | session | Backend URL from env var |
| `mongo_db` | session | PyMongo database connection for direct assertions/cleanup |
| `test_session` | session | Creates synthetic user + session in MongoDB; cleans up after |
| `auth_headers` | session | `{Authorization: Bearer <token>, Content-Type: application/json}` |
| `api_client` | session | `requests.Session()` with default Content-Type header |

**Fixture Pattern Example:**
```python
@pytest.fixture(scope="session")
def test_session(mongo_db):
    """Create a synthetic user + session in MongoDB."""
    # ... setup insert ...
    yield {"user_id": user_id, "session_token": session_token, "email": email}
    # cleanup
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})
    mongo_db.prompts.delete_many({"user_id": user_id})
```

## Mocking

**Framework:** Not used for primary tests

**Patterns:**
- **No mocking of backend API calls** — tests hit the live backend
- **No mocking of MongoDB** — tests read/write real collections via `pymongo`
- **No mocking of NIM** — the "expensive" tests (`test_optimize_real_nim`, `test_rerun`, stream tests) make actual LLM calls

**When Mocking Would Apply:**
- Not applicable to current test suite design
- Consider for future unit tests if added

**Test Isolation:**
- Isolation via synthetic test users (each test session gets a unique `test-user-{timestamp}`)
- Tests clean up after themselves via fixture teardown and explicit `try/finally` blocks
- Example from `test_backend.py`:
```python
finally:
    for pid in created:
        api_client.delete(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
```

## Environment Configuration

**Required Environment Variables:**

| Variable | Purpose | Default |
|----------|---------|---------|
| `REACT_APP_BACKEND_URL` | Backend base URL for tests | `https://pattern-refine.preview.emergentagent.com` |
| `MONGO_URL` | MongoDB connection for test setup/assertions | `mongodb://localhost:27017` |
| `DB_NAME` | Database name for test isolation | `test_database` |

**Notes:**
- Backend must already be running when tests execute
- NIM calls require the backend itself to have `NIM_API_KEY` configured
- Tests point to `REACT_APP_BACKEND_URL`, NOT a localhost-only test server by default

## Coverage

**Requirements:** None enforced

**Frontend Coverage:**
```bash
yarn test --coverage --watchAll=false
```

**Backend Coverage:**
```bash
pytest tests/ --cov=server --cov-report=term-missing
```
(Requires `pytest-cov`; not in current requirements.txt but installable)

## Test Types

**Unit Tests:**
- Not currently present
- All tests exercise full request/response cycles

**Integration Tests:**
- Backend API tests: Full round-trip from HTTP → FastAPI route → MongoDB → response
- **Auth tests**: `TestAuth` class (`test_backend.py:37-54`)
- **CRUD tests**: `TestPromptsCRUD`, `TestForkRerun`
- **Patterns/health**: `TestHealth`, `TestPatterns`
- **Optimize (real LLM)**: `TestOptimize.test_optimize_real_nim` (90s timeout)
- **SSE streaming**: `TestOptimizeStream` in `test_iteration2.py`
- **Groups/tags/filters**: `TestPromptsMeta`
- **Share lifecycle**: `TestShare`

**E2E Tests:**
- Not used. Backend integration tests are the highest level.
- Frontend has no test files currently.

## Common Patterns

**Making Authenticated Requests:**
```python
def test_something(self, api_client, auth_headers):
    r = api_client.post(
        f"{BASE}/api/optimize-prompt",
        json={"raw_input": "...", "pattern_slug": "improve_prompt"},
        headers=auth_headers,
        timeout=90,
    )
    assert r.status_code == 200
```

**Unauthenticated Negative Test:**
```python
def test_optimize_unauth(self, api_client):
    r = api_client.post(
        f"{BASE}/api/optimize-prompt",
        json={"raw_input": "test", "pattern_slug": "improve_prompt"},
    )
    assert r.status_code == 401
```

**Direct MongoDB Assertions:**
```python
def test_share_lifecycle(self, api_client, auth_headers, mongo_db, test_session):
    # ... create + share via API ...
    doc = mongo_db.prompts.find_one({"prompt_id": pid, "user_id": test_session["user_id"]})
    assert doc is not None
    assert doc.get("share_token") == tok
```

**SSE Stream Testing (`requests` streaming):**
```python
def test_stream_emits_deltas_usage_done(self, api_client, auth_headers, mongo_db, test_session):
    with requests.post(url, json=payload, headers=auth_headers, stream=True, timeout=120) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers.get("content-type", "")
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            obj = json.loads(line[5:].strip())
            if "delta" in obj:
                saw_delta = True
            # ...
```

**Error Testing:**
```python
def test_optimize_empty_input(self, api_client, auth_headers):
    r = api_client.post(
        f"{BASE}/api/optimize-prompt",
        json={"raw_input": "   ", "pattern_slug": "improve_prompt", "save": False},
        headers=auth_headers,
    )
    assert r.status_code == 400  # FastAPI HTTPException
```

## Expensive Tests (Real NIM Calls)

**Tests that hit the actual LLM:**
1. `test_backend.py:82` — `test_optimize_real_nim` (3-8s, 90s timeout)
2. `test_backend.py:230` — `test_rerun` (calls `/rerun` which internally calls optimize)
3. `test_iteration2.py:11` — `test_optimize_returns_usage`
4. `test_iteration2.py:32` — `test_stream_emits_deltas_usage_done` (SSE + NIM)

**Skipping Expensive Tests:**
```bash
# Run only fast tests (no real NIM calls)
pytest backend/tests/ -v -k "not test_optimize_real_nim and not test_rerun and not test_optimize_returns_usage and not test_stream"
```

## Test Data Isolation

**Strategy:**
- Unique timestamp-based user ID per pytest session: `f"test-user-{ts}"`
- Fixture teardown deletes all docs for that user: `users`, `user_sessions`, `prompts`, `optimization_runs`
- Tests that create ad-hoc other users clean them up in `try/finally`

**Multi-tenant Isolation Test:**
```python
def test_list_only_own_prompts(self, api_client, auth_headers, mongo_db, test_session):
    # Insert a prompt for a DIFFERENT user
    mongo_db.prompts.insert_one({
        "prompt_id": "other-prompt-xyz",
        "user_id": "some-other-user",  # NOT test_session['user_id']
        ...
    })
    try:
        r = api_client.get(f"{BASE}/api/prompts", headers=auth_headers)
        ids = [p["id"] for p in r.json()]
        assert "other-prompt-xyz" not in ids  # Isolation works
    finally:
        mongo_db.prompts.delete_one({"prompt_id": "other-prompt-xyz"})
```

---

*Testing analysis: 2026-05-10*
