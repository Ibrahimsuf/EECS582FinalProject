import { readJSON, writeJSON } from "./storage";
import { apiFetch } from "./api";

const SESSION_KEY = "teamhub_session";
const CURRENT_USER_KEY = "teamhub_current_user";

export async function registerUser({ name, email, password, first_name, last_name, username }) {
  const user = await apiFetch("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ name, email, password, first_name, last_name, username })
  });

  writeJSON(SESSION_KEY, { memberId: user.id });
  writeJSON(CURRENT_USER_KEY, user);
  return user;
}

export async function loginUser({ identifier, password }) {
  const user = await apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });

  writeJSON(SESSION_KEY, { memberId: user.id });
  writeJSON(CURRENT_USER_KEY, user);
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getSession() {
  return readJSON(SESSION_KEY, null);
}

export function isAuthed() {
  const s = getSession();
  return !!s?.memberId;
}

export function getCachedUser() {
  return readJSON(CURRENT_USER_KEY, null);
}

export async function refreshCurrentUser() {
  const s = getSession();
  if (!s?.memberId) return null;
  const user = await apiFetch(`/members/${s.memberId}/`, { method: "GET" });
  writeJSON(CURRENT_USER_KEY, user);
  return user;
}

export async function updateCurrentUser(patch) {
  const s = getSession();
  if (!s?.memberId) throw new Error("Not logged in.");
  const updated = await apiFetch(`/members/${s.memberId}/`, {
    method: "PUT",
    body: JSON.stringify(patch)
  });
  writeJSON(CURRENT_USER_KEY, updated);
  return updated;
}
