"""Iteration 2 backend tests: usage/cost, SSE stream, groups/tags meta, share links, list filters."""
import json
import os
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://pattern-refine.preview.emergentagent.com").rstrip("/")


# ---------- Usage object on /optimize-prompt ----------
class TestOptimizeUsage:
    def test_optimize_returns_usage(self, api_client, auth_headers):
        r = api_client.post(
            f"{BASE}/api/optimize-prompt",
            json={"raw_input": "explain dependency injection in 2 lines", "pattern_slug": "improve_prompt", "save": False},
            headers=auth_headers,
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "usage" in d and d["usage"] is not None
        u = d["usage"]
        assert u["prompt_tokens"] > 0
        assert u["completion_tokens"] > 0
        assert u["total_tokens"] >= u["prompt_tokens"] + u["completion_tokens"] - 1
        assert u["cost_usd"] >= 0.0
        # cost is roughly small for short prompt
        assert u["cost_usd"] < 0.01


# ---------- SSE Stream ----------
class TestOptimizeStream:
    def test_stream_emits_deltas_usage_done(self, api_client, auth_headers, mongo_db, test_session):
        url = f"{BASE}/api/optimize-prompt/stream"
        payload = {"raw_input": "list 3 ways to test fastapi endpoints", "pattern_slug": "improve_prompt", "save": True}
        with requests.post(url, json=payload, headers=auth_headers, stream=True, timeout=120) as r:
            assert r.status_code == 200, r.text
            ct = r.headers.get("content-type", "")
            assert "text/event-stream" in ct, ct
            saw_meta = False
            saw_delta = False
            saw_usage = False
            saw_done = False
            final_prompt_id = None
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                try:
                    obj = json.loads(line[5:].strip())
                except Exception:
                    continue
                if "meta" in obj:
                    saw_meta = True
                if "delta" in obj:
                    saw_delta = True
                if "usage" in obj:
                    saw_usage = True
                    u = obj["usage"]
                    assert u["prompt_tokens"] > 0
                    assert "cost_usd" in u
                if obj.get("done") is True:
                    saw_done = True
                    final_prompt_id = obj.get("prompt_id")
            assert saw_meta and saw_delta and saw_done, f"meta={saw_meta} delta={saw_delta} done={saw_done}"
            # usage may be sent — NIM does include it with stream_options
            assert saw_usage, "usage event not received from stream"
            # auto-saved
            assert final_prompt_id
            doc = mongo_db.prompts.find_one({"prompt_id": final_prompt_id, "user_id": test_session["user_id"]})
            assert doc is not None
            assert len(doc["optimized_output"]) > 10
            mongo_db.prompts.delete_one({"prompt_id": final_prompt_id})

    def test_stream_unauth(self, api_client):
        r = api_client.post(
            f"{BASE}/api/optimize-prompt/stream",
            json={"raw_input": "x", "pattern_slug": "improve_prompt"},
        )
        assert r.status_code == 401


# ---------- Groups & Tags meta ----------
class TestPromptsMeta:
    def test_groups_and_tags(self, api_client, auth_headers):
        # Create prompts with mixed groups/tags
        created = []
        try:
            for i, (g, tags) in enumerate([
                ("Work", ["alpha", "beta"]),
                ("Work", ["alpha"]),
                ("Personal", ["gamma"]),
                (None, ["alpha"]),
            ]):
                r = api_client.post(
                    f"{BASE}/api/prompts",
                    json={"title": f"TEST_meta_{i}", "raw_input": f"raw {i}", "group": g, "tags": tags},
                    headers=auth_headers,
                )
                assert r.status_code == 200
                created.append(r.json()["id"])

            # groups
            r = api_client.get(f"{BASE}/api/prompts-meta/groups", headers=auth_headers)
            assert r.status_code == 200
            groups = r.json()
            assert isinstance(groups, list)
            assert "Work" in groups and "Personal" in groups
            assert groups == sorted(groups)
            assert None not in groups

            # tags
            r = api_client.get(f"{BASE}/api/prompts-meta/tags", headers=auth_headers)
            assert r.status_code == 200
            tags_resp = r.json()
            assert isinstance(tags_resp, list)
            tag_map = {t["tag"]: t["count"] for t in tags_resp}
            assert tag_map.get("alpha") == 3
            assert tag_map.get("beta") == 1
            assert tag_map.get("gamma") == 1
            # sorted desc by count, then asc by tag
            counts = [t["count"] for t in tags_resp]
            assert counts == sorted(counts, reverse=True)
            assert tags_resp[0]["tag"] == "alpha"

            # list filter by tag
            r = api_client.get(f"{BASE}/api/prompts?tag=gamma", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert "gamma" in data[0]["tags"]

            # list filter by group
            r = api_client.get(f"{BASE}/api/prompts?group=Work", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 2
            assert all(p["group"] == "Work" for p in data)
        finally:
            for pid in created:
                api_client.delete(f"{BASE}/api/prompts/{pid}", headers=auth_headers)


# ---------- Share links ----------
class TestShare:
    def test_share_lifecycle(self, api_client, auth_headers, mongo_db, test_session):
        # create
        r = api_client.post(
            f"{BASE}/api/prompts",
            json={"title": "TEST_share", "raw_input": "shareable raw", "optimized_output": "shareable opt", "tags": ["pub"]},
            headers=auth_headers,
        )
        assert r.status_code == 200
        pid = r.json()["id"]
        try:
            # share -- creates token
            r = api_client.post(f"{BASE}/api/prompts/{pid}/share", headers=auth_headers)
            assert r.status_code == 200
            data = r.json()
            tok = data["share_token"]
            assert isinstance(tok, str) and len(tok) >= 8
            assert data["share_url_path"] == f"/share/{tok}"

            # idempotent — same token
            r2 = api_client.post(f"{BASE}/api/prompts/{pid}/share", headers=auth_headers)
            assert r2.status_code == 200
            assert r2.json()["share_token"] == tok

            # public access (no auth)
            pub = requests.get(f"{BASE}/api/share/{tok}", timeout=20)
            assert pub.status_code == 200
            pdata = pub.json()
            assert pdata["title"] == "TEST_share"
            assert pdata["raw_input"] == "shareable raw"
            assert pdata["optimized_output"] == "shareable opt"
            assert pdata["tags"] == ["pub"]
            assert pdata["author_name"] == "Test User"

            # ownership: another user cannot share
            other_user_id = f"other-user-{test_session['user_id']}"
            other_token = f"test_session_other_{test_session['user_id']}"
            from datetime import datetime, timezone, timedelta
            mongo_db.users.insert_one({
                "user_id": other_user_id,
                "email": f"test.other.{other_user_id}@example.com",
                "name": "Other User",
                "picture": "",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            mongo_db.user_sessions.insert_one({
                "user_id": other_user_id,
                "session_token": other_token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            try:
                r3 = api_client.post(
                    f"{BASE}/api/prompts/{pid}/share",
                    headers={"Authorization": f"Bearer {other_token}"},
                )
                assert r3.status_code == 404, r3.text
            finally:
                mongo_db.user_sessions.delete_one({"session_token": other_token})
                mongo_db.users.delete_one({"user_id": other_user_id})

            # unshare
            r4 = api_client.delete(f"{BASE}/api/prompts/{pid}/share", headers=auth_headers)
            assert r4.status_code == 200
            # public 404
            pub2 = requests.get(f"{BASE}/api/share/{tok}", timeout=20)
            assert pub2.status_code == 404

            # invalid token 404
            inv = requests.get(f"{BASE}/api/share/totally-invalid-token-xyz", timeout=20)
            assert inv.status_code == 404
        finally:
            api_client.delete(f"{BASE}/api/prompts/{pid}", headers=auth_headers)

    def test_share_unknown_prompt(self, api_client, auth_headers):
        r = api_client.post(f"{BASE}/api/prompts/nonexistent-xyz/share", headers=auth_headers)
        assert r.status_code == 404
