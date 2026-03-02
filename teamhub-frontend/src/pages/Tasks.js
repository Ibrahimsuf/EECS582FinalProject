import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

const STATUS_STYLES = {
  BACKLOG: "bg-gray-100 text-gray-700",
  TODO: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
};

export default function Tasks() {
  const user = getCurrentUser();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [newStatus, setNewStatus] = useState("TODO");
  const [assignTo, setAssignTo] = useState("");
  const [filterMine, setFilterMine] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, []); // eslint-disable-line

  async function fetchData() {
    setError("");
    setLoading(true);
    try {
      const [taskRes, memberRes] = await Promise.all([
        fetch(`${API}/tasks/`),
        fetch(`${API}/members/`),
      ]);
      // using await below to confirm arrival of both responses
      setTasks(await taskRes.json());
      setMembers(await memberRes.json());
    } catch (err) {
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    // do notahing if title is empty
    if (!title.trim()) return;
    const memberIds = assignTo ? [parseInt(assignTo)] : (user?.id ? [user.id] : []);
    try {
      const res = await fetch(`${API}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), status: newStatus, member: memberIds }),
      });
      if (!res.ok) throw new Error("Failed to create task.");
      setTitle("");
      setNewStatus("TODO");
      setAssignTo("");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, value) {
    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value, member_id: user?.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Cannot update status.");
        return;
      }
      fetchData();
    } catch {
      setError("Failed to update task.");
    }
  }

  async function deleteTask(id) {
    try {
      await fetch(`${API}/tasks/${id}/`, { method: "DELETE" });
      fetchData();
    } catch {
      setError("Failed to delete task.");
    }
  }

  // filter for only the user's tasks
  const displayTasks = filterMine
    ? tasks.filter((t) => t.member.includes(user?.id))
    : tasks;

  const done = displayTasks.filter((t) => t.status === "DONE").length;

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-sm text-gray-500">Loading user session…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-gray-600">
          Manage tasks, assignments, and progress. ({done}/{displayTasks.length} done)
        </p>
      </div>

      <form onSubmit={addTask} className="rounded border bg-white p-4 space-y-3 max-w-2xl">
        <div>
          <label className="text-sm font-medium">Task title</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Implement login UI"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Assign to</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            >
              <option value="">Me ({user.name})</option>
              {members.filter((m) => m.id !== user.id).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
          Add task
        </button>
      </form>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterMine(true)}
          className={`text-sm px-3 py-1 rounded border ${filterMine ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"}`}
        >
          My tasks
        </button>
        <button
          onClick={() => setFilterMine(false)}
          className={`text-sm px-3 py-1 rounded border ${!filterMine ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"}`}
        >
          All tasks
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : displayTasks.length === 0 ? (
        <div className="text-sm text-gray-600">No tasks yet. Add one above.</div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((t) => {
            const badgeStyle = STATUS_STYLES[t.status] || STATUS_STYLES.TODO;
            const assignedNames = t.member
              .map((id) => members.find((m) => m.id === id)?.name)
              .filter(Boolean)
              .join(", ");
            const isAssigned = t.member.includes(user.id);
            return (
              <div key={t.id} className="rounded border bg-white p-4 flex items-start justify-between">
                <div>
                  <div className="font-semibold">
                    {t.title}{" "}
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs ${badgeStyle}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {assignedNames ? `Assigned to: ${assignedNames} • ` : "Unassigned • "}
                    Created: {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAssigned ? (
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not assigned</span>
                  )}
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
