import React, { useEffect, useMemo, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

export default function Tasks() {
  const [tasks, setTasks] = useState(() => readJSON("teamhub_tasks", []));
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");

  useEffect(() => {
    writeJSON("teamhub_tasks", tasks);
  }, [tasks]);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    return { done, total: tasks.length };
  }, [tasks]);

  function addTask(e) {
    e.preventDefault();
    const t = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title.trim(),
      assignee: assignee.trim(),
      status: "todo",
      createdAt: new Date().toISOString()
    };
    if (!t.title) return;
    setTasks((prev) => [t, ...prev]);
    addAuditEvent(`Task created: "${t.title}"`);
    setTitle("");
    setAssignee("");
  }

  function toggleDone(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t))
    );
    addAuditEvent(`Task status toggled (${id})`);
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    addAuditEvent(`Task deleted (${id})`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-gray-600">
          Manage tasks, assignments, and progress. ({stats.done}/{stats.total} done)
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

        <div>
          <label className="text-sm font-medium">Assignee (optional)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="e.g., Abhiroop"
          />
        </div>

        <button className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
          Add task
        </button>
      </form>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-sm text-gray-600">No tasks yet. Add one above.</div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="rounded border bg-white p-4 flex items-start justify-between">
              <div>
                <div className="font-semibold">
                  {t.title}{" "}
                  {t.status === "done" ? (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      DONE
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      TODO
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {t.assignee ? `Assignee: ${t.assignee} • ` : ""}
                  Created: {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleDone(t.id)}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Toggle
                </button>
                <button
                  onClick={() => removeTask(t.id)}
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
