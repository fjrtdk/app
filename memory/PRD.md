# Prompt Optimizer — PRD

## Original problem
A lightweight web app that turns rough notes into Fabric-style structured prompts and runs optimization through the Nvidia NIM provider. Users pick a pattern, click Optimize, copy/save/fork the result. Library of system patterns and user history.

## Architecture
- Frontend: React + Tailwind + shadcn (dark theme, Volt Lime accent, IBM Plex Sans + JetBrains Mono)
- Backend: FastAPI on /api prefix
- DB: MongoDB
- LLM: Nvidia NIM (OpenAI-compatible) — model `meta/llama-3.3-70b-instruct`
- Auth: Emergent Google Auth (cookie session, 7d)

## Personas
- Coding-agent users (Cursor / OpenCode / Pi)
- AI power users
- Teams standardizing prompt quality

## Core requirements
- Split-pane editor (raw notes ↔ optimized output)
- Pattern selector with system patterns: improve_prompt, create_coding_prompt, extract_wisdom, summarize, analyze_claims, create_agent_brief
- Optimize via NIM, save/copy/fork, history with search & tags
- Live suggestions (heuristic with optional NIM fallback)

## Implemented (2026-02)
- Backend: auth (Google), patterns seed, /optimize-prompt + /optimize-prompt/stream (SSE), /suggest, prompts CRUD, fork, rerun, share/unshare, public /share/{token}, prompts-meta groups + tags
- Frontend: Login + AuthCallback + Workbench (split-pane, sidebar tabs, toolbar, MetaBar with title/tags/group, group-collapsible history, tag-filter chips, share dropdown, export dropdown), public ShareView page
- NIM integration with token usage + estimated cost, streaming with cancellable abort
- Dark theme + Volt Lime tokens

## Backlog
- P2: Custom user patterns (deferred — out of V1 by user choice)
- P2: Browser extension
- P3: Pattern marketplace, multi-provider
- P3: Prompt quality scoring
