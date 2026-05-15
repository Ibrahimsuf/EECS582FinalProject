import React, { useEffect, useMemo, useState } from "react";
import { tasks as tasksAPI } from "../lib/api";
import { addAuditEvent } from "../lib/audit";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      setLoading(true);
      setError("");
      const data = await tasksAPI.getAll();
      setTasks(data);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "DONE").length;
    return { done, total: tasks.length };
  }, [tasks]);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setError("");
      const newTask = await tasksAPI.create({
        title: title.trim(),
        description: description.trim(),
        status: "TODO"
      });
      setTasks((prev) => [newTask, ...prev]);
      addAuditEvent(`Task created: "${newTask.title}"`);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err.message || "Failed to create task");
    }
  }

  async function toggleStatus(task) {
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    try {
      setError("");
      const updated = await tasksAPI.partialUpdate(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      addAuditEvent(`Task status changed: "${task.title}" to ${newStatus}`);
    } catch (err) {
      setError(err.message || "Failed to update task");
    }
  }

  async function removeTask(id, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      setError("");
      await tasksAPI.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      addAuditEvent(`Task deleted: "${title}"`);
    } catch (err) {
      setError(err.message || "Failed to delete task");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-gray-600">
          Manage your tasks and track progress. ({stats.done}/{stats.total} done)
        </p>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={addTask} className="rounded border bg-white p-4 space-y-3 max-w-2xl shadow-sm">
        <div>
          <label className="text-sm font-medium">Task title</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Implement login UI"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details about this task..."
            rows="3"
          />
        </div>

        <button className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
          Add task
        </button>
      </form>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="rounded border bg-white p-6 text-center text-gray-600">
            No tasks yet. Add one above to get started!
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="rounded border bg-white p-4 flex items-start justify-between shadow-sm">
              <div className="flex-1">
                <div className="font-semibold">
                  {t.title}{" "}
                  {t.status === "DONE" ? (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 font-medium">
                      DONE
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 font-medium">
                      TODO
                    </span>
                  )}
                </div>
                {t.description && <p className="mt-1 text-sm text-gray-600">{t.description}</p>}
                <div className="mt-2 text-xs text-gray-500">
                  Owner: {t.owner_email} • Created: {new Date(t.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => toggleStatus(t)}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Toggle
                </button>
                <button
                  onClick={() => removeTask(t.id, t.title)}
                  className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
