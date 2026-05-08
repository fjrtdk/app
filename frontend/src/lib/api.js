import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

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
export async function listPatterns() {
  const r = await api.get("/patterns");
  return r.data;
}
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
export async function optimizePrompt(payload) {
  const r = await api.post("/optimize-prompt", payload);
  return r.data;
}
export async function suggest(raw_input, use_nim = false) {
  const r = await api.post("/suggest", { raw_input, use_nim });
  return r.data;
}
