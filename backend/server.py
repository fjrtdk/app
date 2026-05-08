"""Prompt Optimizer backend.

FastAPI + MongoDB + Nvidia NIM (OpenAI-compatible) + Emergent Google Auth.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import time
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import httpx
from openai import AsyncOpenAI, APIError

from patterns_seed import SYSTEM_PATTERNS

# ---------- Setup ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
NIM_API_KEY = os.environ.get("NIM_API_KEY", "")
NIM_BASE_URL = os.environ.get("NIM_BASE_URL", "https://integrate.api.nvidia.com/v1")
NIM_MODEL = os.environ.get("NIM_MODEL", "meta/llama-3.3-70b-instruct")

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

nim_client = AsyncOpenAI(api_key=NIM_API_KEY, base_url=NIM_BASE_URL) if NIM_API_KEY else None

app = FastAPI(title="Prompt Optimizer")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime


class PatternOut(BaseModel):
    slug: str
    name: str
    category: str
    description: str
    template_body: str
    is_system: bool = True


class PromptCreate(BaseModel):
    title: Optional[str] = None
    raw_input: str
    optimized_output: Optional[str] = ""
    selected_pattern: Optional[str] = None
    tags: List[str] = []
    group: Optional[str] = None
    parent_prompt_id: Optional[str] = None


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    raw_input: Optional[str] = None
    optimized_output: Optional[str] = None
    selected_pattern: Optional[str] = None
    tags: Optional[List[str]] = None
    group: Optional[str] = None


class PromptOut(BaseModel):
    id: str
    user_id: str
    title: str
    raw_input: str
    optimized_output: str
    selected_pattern: Optional[str] = None
    tags: List[str] = []
    group: Optional[str] = None
    parent_prompt_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OptimizeRequest(BaseModel):
    raw_input: str
    pattern_slug: str
    prompt_id: Optional[str] = None  # if provided, update that prompt with output
    save: bool = True


class OptimizeResponse(BaseModel):
    optimized_output: str
    pattern_slug: str
    model: str
    latency_ms: int
    prompt_id: Optional[str] = None


class SuggestRequest(BaseModel):
    raw_input: str
    use_nim: bool = False


class SuggestResponse(BaseModel):
    suggested_pattern: Optional[str]
    suggested_tags: List[str]
    completions: List[str]
    source: str  # "heuristic" or "nim"


# ---------- Auth helpers ----------
SESSION_COOKIE_NAME = "session_token"
SESSION_DURATION_DAYS = 7


async def get_current_user(request: Request) -> User:
    """Read session_token from cookie or Authorization header, return User or 401."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


# ---------- Auth routes ----------
@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", ""), "picture": data.get("picture", "")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": data.get("name", ""),
                "picture": data.get("picture", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)
    await db.user_sessions.insert_one(
        {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_DURATION_DAYS * 24 * 3600,
    )
    return {
        "user_id": user_id,
        "email": email,
        "name": data.get("name", ""),
        "picture": data.get("picture", ""),
    }


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump(mode="json")


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"status": "logged_out"}


# ---------- Patterns ----------
@api.get("/patterns", response_model=List[PatternOut])
async def list_patterns():
    docs = await db.patterns.find({}, {"_id": 0}).to_list(200)
    return [PatternOut(**d) for d in docs]


# ---------- NIM call ----------
async def _call_nim(messages: List[Dict[str, str]], temperature: float = 0.4, max_tokens: int = 1500) -> str:
    if not nim_client:
        raise HTTPException(status_code=503, detail="NIM not configured")
    try:
        resp = await nim_client.chat.completions.create(
            model=NIM_MODEL,
            messages=messages,
            temperature=temperature,
            top_p=0.9,
            max_tokens=max_tokens,
            timeout=60.0,
        )
        return resp.choices[0].message.content or ""
    except APIError as e:
        logger.error(f"NIM API error: {e}")
        raise HTTPException(status_code=502, detail=f"NIM error: {str(e)[:200]}")
    except Exception as e:
        logger.error(f"NIM call failed: {e}")
        raise HTTPException(status_code=502, detail=f"NIM call failed: {str(e)[:200]}")


# ---------- Optimize ----------
@api.post("/optimize-prompt", response_model=OptimizeResponse)
async def optimize_prompt(req: OptimizeRequest, user: User = Depends(get_current_user)):
    if not req.raw_input.strip():
        raise HTTPException(status_code=400, detail="raw_input is empty")

    pattern = await db.patterns.find_one({"slug": req.pattern_slug}, {"_id": 0})
    if not pattern:
        raise HTTPException(status_code=404, detail="Unknown pattern")

    composed = pattern["template_body"].replace("{{INPUT}}", req.raw_input)
    messages = [
        {"role": "system", "content": "You execute structured prompt patterns precisely. Follow the OUTPUT INSTRUCTIONS exactly."},
        {"role": "user", "content": composed},
    ]

    started = time.time()
    output = await _call_nim(messages, temperature=0.3, max_tokens=2000)
    latency_ms = int((time.time() - started) * 1000)

    # log run
    await db.optimization_runs.insert_one(
        {
            "run_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "prompt_entry_id": req.prompt_id,
            "provider": "nvidia_nim",
            "model_name": NIM_MODEL,
            "pattern_slug": req.pattern_slug,
            "latency_ms": latency_ms,
            "status": "ok",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    prompt_id = req.prompt_id
    if req.save:
        now = datetime.now(timezone.utc).isoformat()
        if prompt_id:
            await db.prompts.update_one(
                {"prompt_id": prompt_id, "user_id": user.user_id},
                {
                    "$set": {
                        "raw_input": req.raw_input,
                        "optimized_output": output,
                        "selected_pattern": req.pattern_slug,
                        "updated_at": now,
                    }
                },
            )
        else:
            prompt_id = str(uuid.uuid4())
            title = (req.raw_input.strip().splitlines()[0] if req.raw_input.strip() else "Untitled")[:80]
            await db.prompts.insert_one(
                {
                    "prompt_id": prompt_id,
                    "user_id": user.user_id,
                    "title": title,
                    "raw_input": req.raw_input,
                    "optimized_output": output,
                    "selected_pattern": req.pattern_slug,
                    "tags": [],
                    "group": None,
                    "parent_prompt_id": None,
                    "created_at": now,
                    "updated_at": now,
                }
            )

    return OptimizeResponse(
        optimized_output=output,
        pattern_slug=req.pattern_slug,
        model=NIM_MODEL,
        latency_ms=latency_ms,
        prompt_id=prompt_id,
    )


# ---------- Suggest ----------
HEURISTIC_KEYWORDS = {
    "create_coding_prompt": ["function", "code", "fix", "bug", "implement", "refactor", "endpoint", "api", "react", "fastapi", "build", "ship"],
    "extract_wisdom": ["transcript", "podcast", "interview", "talk", "lecture", "essay", "article"],
    "summarize": ["summarize", "summary", "tl;dr", "tldr", "long", "compress"],
    "analyze_claims": ["claim", "argument", "fact-check", "debate", "evidence", "true", "false"],
    "improve_prompt": ["prompt", "instruction", "ask the model", "system message"],
    "create_agent_brief": ["agent", "autonomous", "mission", "brief", "delegate"],
}


def _heuristic_pattern(text: str) -> Optional[str]:
    t = text.lower()
    scores: Dict[str, int] = {}
    for slug, kws in HEURISTIC_KEYWORDS.items():
        scores[slug] = sum(1 for k in kws if k in t)
    best = max(scores.items(), key=lambda x: x[1])
    return best[0] if best[1] > 0 else "improve_prompt"


def _heuristic_tags(text: str) -> List[str]:
    tags: List[str] = []
    t = text.lower()
    if any(k in t for k in ["react", "frontend", "ui"]):
        tags.append("frontend")
    if any(k in t for k in ["fastapi", "backend", "api", "server"]):
        tags.append("backend")
    if any(k in t for k in ["mongodb", "postgres", "sql", "database"]):
        tags.append("database")
    if "test" in t:
        tags.append("testing")
    if any(k in t for k in ["llm", "prompt", "model", "agent"]):
        tags.append("ai")
    return tags[:4]


@api.post("/suggest", response_model=SuggestResponse)
async def suggest(req: SuggestRequest, user: User = Depends(get_current_user)):
    text = req.raw_input or ""
    if len(text.strip()) < 8:
        return SuggestResponse(
            suggested_pattern=None,
            suggested_tags=[],
            completions=[],
            source="heuristic",
        )

    pattern = _heuristic_pattern(text)
    tags = _heuristic_tags(text)
    completions: List[str] = []
    source = "heuristic"

    if req.use_nim and nim_client:
        try:
            messages = [
                {
                    "role": "system",
                    "content": "You suggest 3 short next-line completions for prompt notes. Reply with each completion on its own line, no numbering, no commentary.",
                },
                {"role": "user", "content": f"NOTES SO FAR:\n{text}\n\nGive 3 short next-line completions:"},
            ]
            raw = await asyncio.wait_for(_call_nim(messages, temperature=0.7, max_tokens=180), timeout=12.0)
            completions = [ln.strip("-• \t") for ln in raw.splitlines() if ln.strip()][:3]
            source = "nim"
        except Exception as e:
            logger.warning(f"NIM suggest failed, using heuristic: {e}")

    return SuggestResponse(
        suggested_pattern=pattern,
        suggested_tags=tags,
        completions=completions,
        source=source,
    )


# ---------- Prompts CRUD ----------
def _serialize_prompt(d: Dict[str, Any]) -> PromptOut:
    for k in ("created_at", "updated_at"):
        if isinstance(d.get(k), str):
            d[k] = datetime.fromisoformat(d[k])
    return PromptOut(
        id=d["prompt_id"],
        user_id=d["user_id"],
        title=d.get("title", "Untitled"),
        raw_input=d.get("raw_input", ""),
        optimized_output=d.get("optimized_output", ""),
        selected_pattern=d.get("selected_pattern"),
        tags=d.get("tags", []) or [],
        group=d.get("group"),
        parent_prompt_id=d.get("parent_prompt_id"),
        created_at=d["created_at"],
        updated_at=d["updated_at"],
    )


@api.get("/prompts", response_model=List[PromptOut])
async def list_prompts(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    group: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    query: Dict[str, Any] = {"user_id": user.user_id}
    if tag:
        query["tags"] = tag
    if group:
        query["group"] = group
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"raw_input": {"$regex": q, "$options": "i"}},
            {"optimized_output": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.prompts.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return [_serialize_prompt(d) for d in docs]


@api.post("/prompts", response_model=PromptOut)
async def create_prompt(payload: PromptCreate, user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    pid = str(uuid.uuid4())
    title = payload.title or (payload.raw_input.strip().splitlines()[0] if payload.raw_input.strip() else "Untitled")
    title = title[:80]
    doc = {
        "prompt_id": pid,
        "user_id": user.user_id,
        "title": title,
        "raw_input": payload.raw_input,
        "optimized_output": payload.optimized_output or "",
        "selected_pattern": payload.selected_pattern,
        "tags": payload.tags or [],
        "group": payload.group,
        "parent_prompt_id": payload.parent_prompt_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.prompts.insert_one(doc)
    return _serialize_prompt(doc)


@api.get("/prompts/{prompt_id}", response_model=PromptOut)
async def get_prompt(prompt_id: str, user: User = Depends(get_current_user)):
    doc = await db.prompts.find_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize_prompt(doc)


@api.patch("/prompts/{prompt_id}", response_model=PromptOut)
async def update_prompt(prompt_id: str, payload: PromptUpdate, user: User = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        doc = await db.prompts.find_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return _serialize_prompt(doc)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.prompts.update_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.prompts.find_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"_id": 0})
    return _serialize_prompt(doc)


@api.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, user: User = Depends(get_current_user)):
    res = await db.prompts.delete_one({"prompt_id": prompt_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "deleted"}


@api.post("/prompts/{prompt_id}/fork", response_model=PromptOut)
async def fork_prompt(prompt_id: str, user: User = Depends(get_current_user)):
    parent = await db.prompts.find_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    doc = {
        "prompt_id": new_id,
        "user_id": user.user_id,
        "title": f"Fork of {parent.get('title', 'Untitled')}",
        "raw_input": parent.get("raw_input", ""),
        "optimized_output": parent.get("optimized_output", ""),
        "selected_pattern": parent.get("selected_pattern"),
        "tags": list(parent.get("tags", []) or []),
        "group": parent.get("group"),
        "parent_prompt_id": prompt_id,
        "created_at": now,
        "updated_at": now,
    }
    await db.prompts.insert_one(doc)
    return _serialize_prompt(doc)


class RerunRequest(BaseModel):
    pattern_slug: str


@api.post("/prompts/{prompt_id}/rerun", response_model=OptimizeResponse)
async def rerun_prompt(prompt_id: str, payload: RerunRequest, user: User = Depends(get_current_user)):
    p = await db.prompts.find_one({"prompt_id": prompt_id, "user_id": user.user_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return await optimize_prompt(
        OptimizeRequest(
            raw_input=p.get("raw_input", ""),
            pattern_slug=payload.pattern_slug,
            prompt_id=prompt_id,
            save=True,
        ),
        user=user,
    )


# ---------- Health ----------
@api.get("/health")
async def health():
    return {"status": "ok", "model": NIM_MODEL, "nim_configured": bool(NIM_API_KEY)}


@api.get("/")
async def root():
    return {"app": "Prompt Optimizer", "status": "ok"}


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    # seed system patterns
    for p in SYSTEM_PATTERNS:
        await db.patterns.update_one(
            {"slug": p["slug"]},
            {"$set": {**p, "is_system": True}},
            upsert=True,
        )
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.prompts.create_index([("user_id", 1), ("updated_at", -1)])
    logger.info(f"Seeded {len(SYSTEM_PATTERNS)} system patterns. NIM configured: {bool(NIM_API_KEY)}")


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()


# ---------- App wire-up ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
