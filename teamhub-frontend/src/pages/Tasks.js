import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

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
  const { activeGroup } = useGroup();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [newStatus, setNewStatus] = useState("TODO");
  const [assignTo, setAssignTo] = useState("");
  const [sprints, setSprints] = useState([]);
  const [sprintId, setSprintId] = useState("");
  const [filterMember, setFilterMember] = useState("me");
  const [search, setSearch] = useState("");

  const isManager = user?.roles === "PROJECT_MANAGER";

  useEffect(() => {
    if (!user?.id || !activeGroup?.id) return;
    fetchData();
  }, [activeGroup?.id]); // eslint-disable-line

  async function fetchData() {
    setError("");
    setLoading(true);
    try {
      const [taskRes, memberRes, sprintRes] = await Promise.all([
        fetch(`${API}/tasks/?group_id=${activeGroup.id}`),
        fetch(`${API}/members/`),
        fetch(`${API}/sprints/?group_id=${activeGroup.id}`),
      ]);
      const allTasks = await taskRes.json();
      const allMembers = await memberRes.json();
      const groupMembers = allMembers.filter((m) => m.group.includes(activeGroup.id));
      setMembers(groupMembers);
      setTasks(allTasks);
      setSprints(await sprintRes.json());
    } catch (err) {
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const memberIds = assignTo ? [parseInt(assignTo)] : (user?.id ? [user.id] : []);
    try {
      const body = {
        actor_id: user.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        status: newStatus,
        member: memberIds,
      };
      if (sprintId) body.sprint = parseInt(sprintId);
      const res = await fetch(`${API}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task.");
      setTitle("");
      setDescription("");
      setRequirements("");
      setNewStatus("TODO");
      setAssignTo("");
      setSprintId("");
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
        body: JSON.stringify({ status: value, actor_id: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
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
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: user?.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task.");
      }
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete task.");
    }
  }

  const displayTasks = tasks
    .filter((t) => {
      if (filterMember === "me") return t.member.includes(user?.id);
      if (filterMember) return t.member.includes(parseInt(filterMember));
      return true;
    })
    .filter((t) => {
      const haystack = `${t.title} ${t.description || ""} ${t.requirements || ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

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
          {activeGroup ? `${activeGroup.name} — ` : ""}
          {done}/{displayTasks.length} done
        </p>
      </div>

      {isManager ? (
        <form onSubmit={addTask} className="rounded border bg-white p-4 space-y-3 max-w-3xl">
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
            <label className="text-sm font-medium">Task description</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 min-h-[90px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the task is and its purpose."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Requirements</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 min-h-[120px]"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="List acceptance criteria, constraints, expected output, dependencies, and notes."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

            <div>
              <label className="text-sm font-medium">Sprint</label>
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
              >
                <option value="">No sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
            Add task
          </button>
        </form>
      ) : (
        <div className="rounded border bg-blue-50 border-blue-200 p-4 text-sm text-blue-900">
          Task pages can only be created or fully edited by project managers. Team members can still open a task page and update the status of tasks assigned to them.
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="rounded border px-3 py-1.5 text-sm w-56"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border px-3 py-1.5 text-sm"
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
        >
          <option value="me">My tasks</option>
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : displayTasks.length === 0 ? (
        <div className="text-sm text-gray-600">No tasks match your filters.</div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((t) => {
            const badgeStyle = STATUS_STYLES[t.status] || STATUS_STYLES.TODO;
            const assignedNames = (t.assigned_members || [])
              .map((m) => m.name)
              .filter(Boolean)
              .join(", ");
            const isAssigned = t.member.includes(user.id);
            return (
              <div key={t.id} className="rounded border bg-white p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/tasks/${t.id}`} className="font-semibold hover:underline">
                      {t.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>
                      {t.status}
                    </span>
                  </div>
                  {t.description ? <p className="mt-1 text-sm text-gray-600 line-clamp-2">{t.description}</p> : null}
                  {t.requirements ? <p className="mt-1 text-xs text-gray-500 line-clamp-2">Requirements: {t.requirements}</p> : null}
                  <div className="mt-2 text-xs text-gray-500">
                    Assigned to: {assignedNames || "Unassigned"}
                    {t.created_by_name ? ` • Created by: ${t.created_by_name}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    disabled={!isAssigned && !isManager}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {isManager && (
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="rounded border border-red-300 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
