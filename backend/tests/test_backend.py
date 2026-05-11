"""Backend tests for Prompt Optimizer."""
import os
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")


# ---------- Health & Patterns ----------
class TestHealth:
    def test_health_ok(self, api_client):
        r = api_client.get(f"{BASE}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["model"] == "meta/llama-3.3-70b-instruct"
        assert data["nim_configured"] is True


class TestPatterns:
    def test_patterns_six(self, api_client):
        r = api_client.get(f"{BASE}/api/patterns")
        assert r.status_code == 200
        data = r.json()
        slugs = {p["slug"] for p in data}
        expected = {
            "improve_prompt", "create_coding_prompt", "extract_wisdom",
            "summarize", "analyze_claims", "create_agent_brief",
        }
        assert expected.issubset(slugs), f"Missing patterns: {expected - slugs}"
        # validate one fully
        improve = next(p for p in data if p["slug"] == "improve_prompt")
        assert "{{INPUT}}" in improve["template_body"]
        assert improve["is_system"] is True


# ---------- Auth ----------
class TestAuth:
    def test_auth_me_unauthenticated(self, api_client):
        r = api_client.get(f"{BASE}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_with_bearer(self, api_client, auth_headers, test_session):
        r = api_client.get(f"{BASE}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == test_session["user_id"]
        assert data["email"] == test_session["email"]

    def test_auth_me_invalid_token(self, api_client):
        r = api_client.get(
            f"{BASE}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_xyz"},
        )
        assert r.status_code == 401


# ---------- Optimize Prompt ----------
class TestOptimize:
    def test_optimize_empty_input(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/optimize-prompt",
            json={"raw_input": "   ", "pattern_slug": "improve_prompt", "save": False},
            headers=auth_headers,
        )
        assert r.status_code == 400

    def test_optimize_unknown_pattern(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/optimize-prompt",
            json={"raw_input": "Build something cool", "pattern_slug": "does_not_exist", "save": False},
            headers=auth_headers,
        )
        assert r.status_code == 404

    def test_optimize_unauth(self, api_client):
        r = api_client.post(
            f"{BASE}/api/optimize-prompt",
            json={"raw_input": "test", "pattern_slug": "improve_prompt"},
        )
        assert r.status_code == 401

    def test_optimize_real_nim(self, api_client, auth_headers):
        # Real NIM call (3-8s)
        payload = {
            "raw_input": "build a fastapi endpoint that lists user prompts with pagination",
            "pattern_slug": "create_coding_prompt",
            "save": True,
        }
        r = api_client.post(f"{BASE}/api/optimize-prompt", json=payload, headers=auth_headers, timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data["optimized_output"], str)
        assert len(data["optimized_output"]) > 30
        assert data["pattern_slug"] == "create_coding_prompt"
        assert data["model"] == "meta/llama-3.3-70b-instruct"
        assert data["latency_ms"] > 0
        assert data["prompt_id"]
        # verify persisted
        g = api_client.get(f"{BASE}/api/prompts/{data['prompt_id']}", headers=auth_headers)
        assert g.status_code == 200
        assert g.json()["optimized_output"] == data["optimized_output"]


# ---------- Suggest ----------
class TestSuggest:
    def test_suggest_short_input(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/suggest",
            json={"raw_input": "hi", "use_nim": False},
            headers=auth_headers,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["suggested_pattern"] is None
        assert d["suggested_tags"] == []
        assert d["source"] == "heuristic"

    def test_suggest_heuristic_coding(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/suggest",
            json={"raw_input": "fix the react frontend bug in the api endpoint", "use_nim": False},
            headers=auth_headers,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["source"] == "heuristic"
        assert d["suggested_pattern"] in {
            "create_coding_prompt", "improve_prompt", "extract_wisdom",
            "summarize", "analyze_claims", "create_agent_brief",
        }
        assert "frontend" in d["suggested_tags"] or "backend" in d["suggested_tags"]


# ---------- Prompts CRUD ----------
class TestPromptsCRUD:
    def test_full_crud_and_isolation(self, api_client, auth_headers, mongo_db, test_session):
        # CREATE
        r = api_client.post(
            f"{BASE}/api/prompts",
            json={"title": "TEST_p1", "raw_input": "hello world", "tags": ["t1"]},
            headers=auth_headers,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        assert r.json()["title"] == "TEST_p1"
        assert r.json()["user_id"] == test_session["user_id"]

        # GET
        r = api_client.get(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["raw_input"] == "hello world"

        # PATCH
        r = api_client.patch(
            f"{BASE}/api/prompts/{pid}",
            json={"title": "TEST_p1_updated", "tags": ["t1", "t2"]},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_p1_updated"
        # verify persistence
        r2 = api_client.get(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
        assert r2.json()["title"] == "TEST_p1_updated"
        assert set(r2.json()["tags"]) == {"t1", "t2"}

        # LIST -- should include
        r = api_client.get(f"{BASE}/api/prompts", headers=auth_headers)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert pid in ids
        for p in r.json():
            assert p["user_id"] == test_session["user_id"]

        # DELETE
        r = api_client.delete(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
        assert r.status_code == 200
        # confirm 404
        r = api_client.get(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
        assert r.status_code == 404

    def test_list_only_own_prompts(self, api_client, auth_headers, mongo_db, test_session):
        # Insert a prompt for a different user
        from datetime import datetime, timezone
        other_pid = "other-prompt-xyz"
        mongo_db.prompts.insert_one({
            "prompt_id": other_pid,
            "user_id": "some-other-user",
            "title": "OTHER",
            "raw_input": "x",
            "optimized_output": "",
            "selected_pattern": None,
            "tags": [],
            "group": None,
            "parent_prompt_id": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        try:
            r = api_client.get(f"{BASE}/api/prompts", headers=auth_headers)
            assert r.status_code == 200
            ids = [p["id"] for p in r.json()]
            assert other_pid not in ids
            # also direct access should 404
            r = api_client.get(f"{BASE}/api/prompts/{other_pid}", headers=auth_headers)
            assert r.status_code == 404
        finally:
            mongo_db.prompts.delete_one({"prompt_id": other_pid})


# ---------- Fork & Rerun ----------
class TestForkRerun:
    def test_fork(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/prompts",
            json={"title": "TEST_fork_src", "raw_input": "source body", "optimized_output": "out", "tags": ["x"]},
            headers=auth_headers,
        )
        assert r.status_code == 200
        parent = r.json()
        r = api_client.post(f"{BASE}/api/prompts/{parent['id']}/fork", headers=auth_headers)
        assert r.status_code == 200
        forked = r.json()
        assert forked["parent_prompt_id"] == parent["id"]
        assert forked["raw_input"] == "source body"
        assert forked["title"].startswith("Fork of")
        # cleanup
        api_client.delete(f"{BASE}/api/prompts/{forked['id']}", headers=auth_headers)
        api_client.delete(f"{BASE}/api/prompts/{parent['id']}", headers=auth_headers)

    def test_rerun(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/prompts",
            json={"title": "TEST_rerun", "raw_input": "summarize the article about quantum computing breakthroughs"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        r = api_client.post(
            f"{BASE}/api/prompts/{pid}/rerun",
            json={"pattern_slug": "summarize"},
            headers=auth_headers,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["prompt_id"] == pid
        assert len(data["optimized_output"]) > 20
        # verify update persisted
        g = api_client.get(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
        assert g.json()["selected_pattern"] == "summarize"
        assert g.json()["optimized_output"] == data["optimized_output"]
        # cleanup
        api_client.delete(f"{BASE}/api/prompts/{pid}", headers=auth_headers)
