import os
import time
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


@pytest.fixture(scope="session")
def test_session(mongo_db):
    """Create a synthetic user + session in MongoDB."""
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}"
    session_token = f"test_session_{ts}"
    email = f"test.user.{ts}@example.com"
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": "Test User",
        "picture": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": user_id, "session_token": session_token, "email": email}
    # cleanup
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})
    mongo_db.prompts.delete_many({"user_id": user_id})
    mongo_db.optimization_runs.delete_many({"user_id": user_id})


@pytest.fixture(scope="session")
def auth_headers(test_session):
    return {
        "Authorization": f"Bearer {test_session['session_token']}",
        "Content-Type": "application/json",
    }


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
