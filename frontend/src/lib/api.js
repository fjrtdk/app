import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// ---------- auth ----------
export async function getMe() {
  const r = await api.get("/auth/me");
  return r.data;
}
export async function postSession(session_id) {
  const r = await api.post("/auth/session", { session_id });
  return r.data;
}
export async function logout() {
  await api.post("/auth/logout");
}

// ---------- patterns ----------
export async function listPatterns() {
  const r = await api.get("/patterns");
  return r.data;
}

// ---------- prompts ----------
export async function listPrompts(params = {}) {
  const r = await api.get("/prompts", { params });
  return r.data;
}
export async function getPrompt(id) {
  const r = await api.get(`/prompts/${id}`);
  return r.data;
}
export async function createPrompt(payload) {
  const r = await api.post("/prompts", payload);
  return r.data;
}
export async function updatePrompt(id, payload) {
  const r = await api.patch(`/prompts/${id}`, payload);
  return r.data;
}
export async function deletePrompt(id) {
  const r = await api.delete(`/prompts/${id}`);
  return r.data;
}
export async function forkPrompt(id) {
  const r = await api.post(`/prompts/${id}/fork`);
  return r.data;
}
export async function rerunPrompt(id, pattern_slug) {
  const r = await api.post(`/prompts/${id}/rerun`, { pattern_slug });
  return r.data;
}

// ---------- optimize ----------
export async function optimizePrompt(payload) {
  const r = await api.post("/optimize-prompt", payload);
  return r.data;
}

/**
 * Stream optimization via SSE.
 * onEvent receives parsed JSON payloads: {meta:{...}} | {delta:"..."} | {usage:{...}} | {done:true,...} | {error:"..."}
 * Returns a function to cancel.
 */
export function streamOptimize(payload, onEvent) {
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${API}/optimize-prompt/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          detail = j.detail || detail;
        } catch (_) {}
        onEvent({ error: detail });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            onEvent(JSON.parse(json));
          } catch (_) {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        onEvent({ error: e.message });
      }
    }
  })();
  return () => controller.abort();
}

// ---------- suggest ----------
export async function suggest(raw_input, use_nim = false) {
  const r = await api.post("/suggest", { raw_input, use_nim });
  return r.data;
}

// ---------- meta ----------
export async function listGroups() {
  const r = await api.get("/prompts-meta/groups");
  return r.data;
}
export async function listTags() {
  const r = await api.get("/prompts-meta/tags");
  return r.data;
}

// ---------- share ----------
export async function sharePrompt(id) {
  const r = await api.post(`/prompts/${id}/share`);
  return r.data;
}
export async function unsharePrompt(id) {
  const r = await api.delete(`/prompts/${id}/share`);
  return r.data;
}
export async function getSharedPrompt(token) {
  const r = await api.get(`/share/${token}`);
  return r.data;
}
