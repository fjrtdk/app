# Coding Conventions

**Analysis Date:** 2026-05-10

## Naming Patterns

**Files:**
- Frontend components: `PascalCase.jsx` (e.g., `Workbench.jsx`, `Button.jsx`)
- Frontend hooks/utils: `kebab-case.js` (e.g., `use-toast.js`, `api.js`)
- shadcn/ui components: `lowercase.jsx` (e.g., `button.jsx`, `dialog.jsx`)
- Backend Python: `snake_case.py` (e.g., `server.py`, `patterns_seed.py`)
- Test files: `test_*.py` (e.g., `test_backend.py`, `conftest.py`)

**Functions:**
- Frontend: `camelCase` for functions and hooks (e.g., `useAuth`, `handleOptimize`, `listPrompts`)
- Backend: `snake_case` for all functions (e.g., `get_current_user`, `_call_nim`, `list_prompts`)
- Private helpers: prefixed with underscore (e.g., `_serialize_prompt`, `_heuristic_pattern`)

**Variables:**
- Frontend: `camelCase` (e.g., `rawInput`, `selectedPattern`, `activeId`)
- Backend: `snake_case` (e.g., `raw_input`, `selected_pattern`, `prompt_id`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `SESSION_COOKIE_NAME`, `PRICE_INPUT_PER_M`, `TOAST_LIMIT`)

**Types/Models:**
- Python Pydantic: `PascalCase` (e.g., `User`, `OptimizeRequest`, `PromptOut`)
- No TypeScript in this codebase — all frontend is pure JSX

## Code Style

**Formatting:**
- Backend: `black` formatter (listed in requirements.txt)
- Frontend: No Prettier config detected; ESLint via Craco
- Imports: `isort` configured for backend (in requirements.txt)

**Linting:**
- Frontend: ESLint 9.23.0 configured in `craco.config.js`
  - Extends: `plugin:react-hooks/recommended`
  - Rules: `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: warn`
  - ESLint plugins: `import`, `jsx-a11y`, `react`, `react-hooks`

- Backend: `flake8` + `mccabe` + `pycodestyle` + `pyflakes` (in requirements.txt)
  - Also `mypy` available for type checking

## Import Organization

**Frontend Order (`src/lib/api.js`, `src/context/AuthContext.jsx`):**
1. React imports (e.g., `import { useState, useEffect } from "react"`)
2. Third-party libraries (e.g., `import axios from "axios"`, `import { clsx } from "clsx"`)
3. Absolute path aliases (`@/`) (e.g., `import { getMe } from "@/lib/api"`)
4. Relative imports (less common due to `@/` alias)

**Path Aliases:**
- `@/` → `frontend/src/` (configured in `craco.config.js` webpack alias)
- Example: `import { cn } from "@/lib/utils"` instead of `../../lib/utils`

**Backend Order (`server.py`):**
1. Standard library imports (os, json, logging, datetime, etc.)
2. Third-party imports (fastapi, motor, pydantic, openai, httpx, etc.)
3. Local imports (e.g., `from patterns_seed import SYSTEM_PATTERNS`)

## Error Handling

**Frontend Patterns:**
- Try/catch blocks around async API calls with error logging
- Toast notifications via `sonner` for user-facing errors
- Axios errors accessed via `err?.response?.status`
- Example from `AuthContext.jsx`:
```javascript
try {
  const u = await getMe();
  setUser(u);
} catch (err) {
  if (err?.response?.status !== 401) console.error("[checkAuth]", err);
  setUser(null);
}
```

**Backend Patterns:**
- `HTTPException(status_code, detail)` for API errors
- Status codes used: 400 (bad request), 401 (unauthorized), 404 (not found), 502 (bad gateway), 503 (service unavailable)
- Try/except around external calls (NIM API, httpx requests)
- Example from `server.py`:
```python
try:
    resp = await nim_client.chat.completions.create(...)
    return content, usage
except APIError as e:
    logger.error(f"NIM API error: {e}")
    raise HTTPException(status_code=502, detail=f"NIM error: {str(e)[:200]}")
```

## Logging

**Frontend:**
- Uses native `console.error()` with bracketed prefixes (e.g., `[checkAuth]`, `[autosave]`)
- Example: `console.error("[loadWorkspace]", err)`

**Backend:**
- Uses Python `logging` module
- Configured at INFO level with format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
- Logger instance: `logger = logging.getLogger(__name__)`
- Usage: `logger.info(...)`, `logger.error(...)`, `logger.warning(...)`

## Comments

**When to Comment:**
- Module-level docstrings at top of files
- Complex logic or non-obvious behavior
- Critical business rules (e.g., OAuth callback handling in `AuthContext.jsx`)
- TODO/FIXME not observed in the current codebase

**JSDoc/TSDoc:**
- Minimal JSDoc in frontend (only `streamOptimize` in `api.js` has a docstring)
- Python docstrings: Module-level at top, functions generally lack individual docstrings
- Example docstring from `api.js`:
```javascript
/**
 * Stream optimization via SSE.
 * onEvent receives parsed JSON payloads: {meta:{...}} | {delta:"..."} | {usage:{...}} | {done:true,...} | {error:"..."}
 * Returns a function to cancel.
 */
```

## Function Design

**Size:**
- Backend route handlers are concise (~10-30 lines typical)
- Frontend `Workbench.jsx` is large (~600 lines) due to being the main application orchestrator
- Helper functions extracted where logical (e.g., `_serialize_prompt`, `_heuristic_pattern`)

**Parameters:**
- Python: Type-annotated via Pydantic models for request/response
- Named arguments preferred over positional in API calls
- Frontend: Props destructured in component parameters

**Return Values:**
- API functions: Return `response.data` directly (axios)
- Backend endpoints: Return Pydantic model instances or dicts
- Streaming endpoints return `StreamingResponse` (SSE)

## Module Design

**Exports:**
- Frontend: Named exports preferred (e.g., `export function useAuth()`, `export { Button, buttonVariants }`)
- Default exports for page components (e.g., `export default function Workbench()`)

**Barrel Files:**
- Not commonly used. Direct imports from specific files (e.g., `@/lib/api`, `@/lib/utils`)

**Backend Organization:**
- `server.py` is the single entry point (~868 lines)
- `patterns_seed.py` contains only the `SYSTEM_PATTERNS` constant
- Tests in separate `tests/` subdirectory

---

*Convention analysis: 2026-05-10*
