import { readJSON, writeJSON } from "./storage";

const USERS_KEY = "teamhub_users";
const SESSION_KEY = "teamhub_session";

export function getUsers() {
  return readJSON(USERS_KEY, []);
}

export function registerUser({ name, email, password }) {
  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error("A user with this email already exists.");
  }
  const newUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    email,
    password
  };
  users.push(newUser);
  writeJSON(USERS_KEY, users);
  return newUser;
}

export function loginUser({ email, password }) {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) throw new Error("Invalid email or password.");
  writeJSON(SESSION_KEY, { userId: user.id });
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const session = readJSON(SESSION_KEY, null);
  if (!session?.userId) return null;
  const users = getUsers();
  return users.find((u) => u.id === session.userId) || null;
}

export function isAuthed() {
  return !!getCurrentUser();
}
