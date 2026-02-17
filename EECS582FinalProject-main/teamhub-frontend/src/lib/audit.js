import { readJSON, writeJSON } from "./storage";

const AUDIT_KEY = "teamhub_audit";

export function getAuditEvents() {
  return readJSON(AUDIT_KEY, []);
}

export function addAuditEvent(message) {
  const events = getAuditEvents();
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    message,
    at: new Date().toISOString()
  };
  events.unshift(event);
  writeJSON(AUDIT_KEY, events.slice(0, 200));
  return event;
}
