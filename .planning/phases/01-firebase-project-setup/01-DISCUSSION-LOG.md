# Phase 1: Firebase Project Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 1-Firebase Project Setup
**Areas discussed:** Firebase project name, GCP location, service account handling, env var convention

---

## Firebase Project Name

| Option | Description | Selected |
|--------|-------------|----------|
| `prompt-optimizer` | Use the app name | ✓ |
| `prompt-optimizer-dev` | Separate dev project | |
| Let user decide | | |

**User's choice:** auto-selected: `prompt-optimizer`

## GCP Location

| Option | Description | Selected |
|--------|-------------|----------|
| `us-central1` | Default, lowest latency for US users | ✓ |
| `europe-west1` | EU region | |
| `asia-east1` | Asia region | |

**User's choice:** auto-selected: `us-central1`

## Service Account Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Env var reference only | Download JSON, reference via env, never commit | ✓ |
| Mount as secret file | File path env var | |
| Firestore-only | Use default compute SA | |

**User's choice:** auto-selected: Env var reference

## Environment Variable Convention

| Option | Description | Selected |
|--------|-------------|----------|
| `FIREBASE_*` + `REACT_APP_FIREBASE_*` | Standard prefix per layer | ✓ |
| Single JSON blob | One env var with full config | |
| Mix of approaches | | |

**User's choice:** auto-selected: Standard prefix per layer

---

*Mode: auto (new-project auto-advance chain)*
