import React, { useEffect, useState } from "react";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default function Sprints() {
  const { activeGroup } = useGroup();
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });
  const [formMsg, setFormMsg] = useState({ type: "", text: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", start_date: "", end_date: "" });
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!activeGroup?.id) return;
    fetchSprints();
  }, [activeGroup?.id]); // eslint-disable-line

  async function fetchSprints() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/sprints/?group_id=${activeGroup.id}`);
      setSprints(await res.json());
    } catch (err) {
      setError(err.message || "Failed to load sprints.");
    } finally {
      setLoading(false);
    }
  }

  async function createSprint(e) {
    e.preventDefault();
    setFormMsg({ type: "", text: "" });
    const { name, start_date, end_date } = form;
    if (!name.trim() || !start_date || !end_date) {
      setFormMsg({ type: "error", text: "Name, start date, and end date are required." });
      return;
    }
    try {
      const res = await fetch(`${API}/sprints/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start_date, end_date, is_active: false, group: activeGroup.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMsg({ type: "error", text: data.error || "Failed to create sprint." });
        return;
      }
      setSprints((prev) => [...prev, data]);
      setForm({ name: "", start_date: "", end_date: "" });
      setFormMsg({ type: "success", text: `Sprint "${data.name}" created.` });
    } catch {
      setFormMsg({ type: "error", text: "Network error." });
    }
  }

  async function toggleActive(sprint) {
    try {
      // Deactivate all others first if activating this one
      if (!sprint.is_active) {
        await Promise.all(
          sprints
            .filter((s) => s.is_active)
            .map((s) =>
              fetch(`${API}/sprints/${s.id}/`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: false }),
              })
            )
        );
      }
      const res = await fetch(`${API}/sprints/${sprint.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sprint.is_active }),
      });
      const updated = await res.json();
      setSprints((prev) =>
        prev.map((s) => {
          if (s.id === sprint.id) return updated;
          if (!sprint.is_active) return { ...s, is_active: false };
          return s;
        })
      );
    } catch {
      // silently fail
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditForm({ name: s.name, start_date: s.start_date, end_date: s.end_date });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function saveEdit(id) {
    setEditError("");
    const { name, start_date, end_date } = editForm;
    if (!name.trim() || !start_date || !end_date) {
      setEditError("All fields are required.");
      return;
    }
    try {
      const res = await fetch(`${API}/sprints/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start_date, end_date }),
      });
      const updated = await res.json();
      if (!res.ok) {
        setEditError(updated.error || "Failed to save changes.");
        return;
      }
      setSprints((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setEditingId(null);
    } catch {
      setEditError("Network error.");
    }
  }

  async function deleteSprint(id) {
    try {
      await fetch(`${API}/sprints/${id}/`, { method: "DELETE" });
      setSprints((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sprints</h1>
        <p className="text-gray-600">
          {activeGroup ? `${activeGroup.name} — ` : ""}
          Manage sprint periods for this group.
        </p>
      </div>

      {/* Create sprint form */}
      <form onSubmit={createSprint} className="rounded border bg-white p-4 space-y-3 max-w-2xl">
        <h2 className="font-semibold">New Sprint</h2>
        <div>
          <label className="text-sm font-medium">Sprint name</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="e.g., Sprint 1"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Start date</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={form.start_date}
              onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">End date</label>
            <input
              type="date"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={form.end_date}
              onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
            />
          </div>
        </div>
        {formMsg.text && (
          <p className={`text-sm ${formMsg.type === "error" ? "text-red-600" : "text-green-700"}`}>
            {formMsg.text}
          </p>
        )}
        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Create Sprint
        </button>
      </form>

      {error && (
        <div className="rounded bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : sprints.length === 0 ? (
        <p className="text-sm text-gray-500">No sprints yet. Create one above.</p>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {sprints
            .slice()
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
            .map((s) => (
              <div key={s.id} className="rounded border bg-white px-4 py-3">
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded border px-3 py-1.5 text-sm"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Sprint name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Start date</label>
                        <input
                          type="date"
                          className="mt-0.5 w-full rounded border px-3 py-1.5 text-sm"
                          value={editForm.start_date}
                          onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">End date</label>
                        <input
                          type="date"
                          className="mt-0.5 w-full rounded border px-3 py-1.5 text-sm"
                          value={editForm.end_date}
                          onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(s.id)}
                        className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-black"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.name}</span>
                        {s.is_active && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.start_date} → {s.end_date}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(s)}
                        className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(s)}
                        className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                      >
                        {s.is_active ? "Deactivate" : "Set Active"}
                      </button>
                      <button
                        onClick={() => deleteSprint(s.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
