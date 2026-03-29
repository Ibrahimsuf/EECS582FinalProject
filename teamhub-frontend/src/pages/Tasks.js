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

const VIEWS = [
  { key: "list", label: "List" },
  { key: "day", label: "Day" },
  { key: "sprint", label: "Sprint" },
  { key: "timeline", label: "Timeline" },
];

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
  const [view, setView] = useState("list");

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

      {/* Filters + View Toggle */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
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

        <div className="flex items-center rounded border overflow-hidden">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 text-sm font-medium border-r last:border-r-0 transition-colors ${
                view === v.key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
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
        <>
          {view === "list" && (
            <ListView
              tasks={displayTasks}
              user={user}
              isManager={isManager}
              onUpdateStatus={updateStatus}
              onDelete={deleteTask}
            />
          )}
          {view === "day" && (
            <DayView
              tasks={displayTasks}
              user={user}
              isManager={isManager}
              onUpdateStatus={updateStatus}
              onDelete={deleteTask}
            />
          )}
          {view === "sprint" && (
            <SprintView
              tasks={displayTasks}
              sprints={sprints}
              user={user}
              isManager={isManager}
              onUpdateStatus={updateStatus}
              onDelete={deleteTask}
            />
          )}
          {view === "timeline" && (
            <TimelineView
              tasks={displayTasks}
              sprints={sprints}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ── Shared task card ──────────────────────────────────────────────── */
function TaskCard({ t, user, isManager, onUpdateStatus, onDelete }) {
  const badgeStyle = STATUS_STYLES[t.status] || STATUS_STYLES.TODO;
  const assignedNames = (t.assigned_members || []).map((m) => m.name).filter(Boolean).join(", ");
  const isAssigned = t.member.includes(user.id);

  return (
    <div className="rounded border bg-white p-4 flex items-start justify-between gap-4">
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
          onChange={(e) => onUpdateStatus(t.id, e.target.value)}
          disabled={!isAssigned && !isManager}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {isManager && (
          <button
            onClick={() => onDelete(t.id)}
            className="rounded border border-red-300 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ── List view (original) ──────────────────────────────────────────── */
function ListView({ tasks, user, isManager, onUpdateStatus, onDelete }) {
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          t={t}
          user={user}
          isManager={isManager}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

/* ── Day view (Kanban columns by status) ───────────────────────────── */
function DayView({ tasks, user, isManager, onUpdateStatus, onDelete }) {
  const columns = {
    BACKLOG: { label: "Backlog", tasks: [] },
    TODO: { label: "To Do", tasks: [] },
    IN_PROGRESS: { label: "In Progress", tasks: [] },
    DONE: { label: "Done", tasks: [] },
  };
  tasks.forEach((t) => {
    if (columns[t.status]) columns[t.status].tasks.push(t);
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{today}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(columns).map(([status, col]) => (
          <div key={status} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
                {col.label}
              </span>
              <span className="text-xs text-gray-400">{col.tasks.length}</span>
            </div>
            {col.tasks.length === 0 ? (
              <div className="rounded border border-dashed bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
                No tasks
              </div>
            ) : (
              col.tasks.map((t) => {
                const assignedNames = (t.assigned_members || []).map((m) => m.name).filter(Boolean).join(", ");
                const isAssigned = t.member.includes(user.id);
                return (
                  <div key={t.id} className="rounded border bg-white p-3 space-y-1.5 shadow-sm">
                    <Link to={`/tasks/${t.id}`} className="text-sm font-semibold hover:underline leading-tight block">
                      {t.title}
                    </Link>
                    {t.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                    )}
                    <div className="text-xs text-gray-400">{assignedNames || "Unassigned"}</div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <select
                        className="rounded border px-1.5 py-0.5 text-xs flex-1"
                        value={t.status}
                        onChange={(e) => onUpdateStatus(t.id, e.target.value)}
                        disabled={!isAssigned && !isManager}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {isManager && (
                        <button
                          onClick={() => onDelete(t.id)}
                          className="rounded border border-red-300 px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sprint view (grouped by sprint) ──────────────────────────────── */
function SprintView({ tasks, sprints, user, isManager, onUpdateStatus, onDelete }) {
  const sortedSprints = sprints.slice().sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const groups = sortedSprints.map((s) => ({
    sprint: s,
    tasks: tasks.filter((t) => t.sprint === s.id),
  }));
  const unassigned = tasks.filter((t) => !t.sprint);

  return (
    <div className="space-y-6">
      {groups.map(({ sprint, tasks: sprintTasks }) => (
        <SprintGroup
          key={sprint.id}
          sprint={sprint}
          tasks={sprintTasks}
          user={user}
          isManager={isManager}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
        />
      ))}
      {unassigned.length > 0 && (
        <SprintGroup
          sprint={null}
          tasks={unassigned}
          user={user}
          isManager={isManager}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
        />
      )}
      {groups.length === 0 && unassigned.length === 0 && (
        <p className="text-sm text-gray-500">No tasks to display.</p>
      )}
    </div>
  );
}

function SprintGroup({ sprint, tasks, user, isManager, onUpdateStatus, onDelete }) {
  const [open, setOpen] = useState(true);
  const doneCt = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="rounded border bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold">{sprint ? sprint.name : "No Sprint"}</span>
          {sprint?.is_active && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800 font-medium">Active</span>
          )}
          {sprint && (
            <span className="text-xs text-gray-500">{sprint.start_date} → {sprint.end_date}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{doneCt}/{tasks.length} done</span>
          <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="divide-y">
          {tasks.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No tasks in this sprint.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <TaskCard
                  t={t}
                  user={user}
                  isManager={isManager}
                  onUpdateStatus={onUpdateStatus}
                  onDelete={onDelete}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Timeline view ─────────────────────────────────────────────────── */
function TimelineView({ tasks, sprints }) {
  if (sprints.length === 0) {
    return <p className="text-sm text-gray-500">No sprints to display on the timeline. Create sprints to use this view.</p>;
  }

  const sorted = sprints.slice().sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const rangeStart = new Date(sorted[0].start_date);
  const rangeEnd = new Date(sorted[sorted.length - 1].end_date);
  const totalMs = rangeEnd - rangeStart || 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPct = Math.min(100, Math.max(0, ((today - rangeStart) / totalMs) * 100));
  const showTodayMarker = today >= rangeStart && today <= rangeEnd;

  const STATUS_COLORS = {
    BACKLOG: "#9ca3af",
    TODO: "#fbbf24",
    IN_PROGRESS: "#60a5fa",
    DONE: "#34d399",
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-600">
        {STATUS_OPTIONS.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
            {s}
          </span>
        ))}
        {showTodayMarker && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-0.5 h-3 bg-red-500" />
            Today
          </span>
        )}
      </div>

      {/* Date range header */}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>{rangeStart.toLocaleDateString()}</span>
        <span>{rangeEnd.toLocaleDateString()}</span>
      </div>

      {/* Timeline rows */}
      <div className="space-y-3 relative">
        {/* Today marker (vertical line) */}
        {showTodayMarker && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
            style={{ left: `${todayPct}%` }}
          />
        )}

        {sorted.map((sprint) => {
          const sprintStart = new Date(sprint.start_date);
          const sprintEnd = new Date(sprint.end_date);
          const leftPct = ((sprintStart - rangeStart) / totalMs) * 100;
          const widthPct = Math.max(2, ((sprintEnd - sprintStart) / totalMs) * 100);

          const sprintTasks = tasks.filter((t) => t.sprint === sprint.id);
          const noSprintTasks = sprint === sorted[0] ? [] : [];
          const statusCounts = STATUS_OPTIONS.reduce((acc, s) => {
            acc[s] = sprintTasks.filter((t) => t.status === s).length;
            return acc;
          }, {});

          return (
            <div key={sprint.id} className="relative h-auto">
              {/* Sprint bar */}
              <div
                className="relative rounded overflow-hidden"
                style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
              >
                <div
                  className={`px-3 py-2 rounded text-white text-xs font-semibold flex items-center justify-between gap-2 ${
                    sprint.is_active ? "bg-gray-800" : "bg-gray-500"
                  }`}
                >
                  <span className="truncate">{sprint.name}</span>
                  {sprint.is_active && (
                    <span className="shrink-0 rounded bg-green-400 text-gray-900 px-1.5 py-0.5 text-xs font-bold">Active</span>
                  )}
                </div>

                {/* Status bar */}
                {sprintTasks.length > 0 && (
                  <div className="flex h-1.5">
                    {STATUS_OPTIONS.map((s) => {
                      const pct = (statusCounts[s] / sprintTasks.length) * 100;
                      return pct > 0 ? (
                        <div
                          key={s}
                          style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }}
                          title={`${s}: ${statusCounts[s]}`}
                        />
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Task list for this sprint */}
              {sprintTasks.length > 0 && (
                <div
                  className="mt-1 space-y-1"
                  style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {sprintTasks.map((t) => {
                    const assignedNames = (t.assigned_members || []).map((m) => m.name).filter(Boolean).join(", ");
                    return (
                      <div key={t.id} className="rounded border bg-white px-2 py-1.5 text-xs flex items-center gap-2">
                        <span
                          className="shrink-0 w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS[t.status] }}
                        />
                        <Link to={`/tasks/${t.id}`} className="font-medium hover:underline truncate">
                          {t.title}
                        </Link>
                        {assignedNames && (
                          <span className="text-gray-400 shrink-0 truncate">{assignedNames}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned tasks */}
        {tasks.filter((t) => !t.sprint).length > 0 && (
          <div className="rounded border border-dashed bg-gray-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 mb-2">No Sprint</p>
            {tasks
              .filter((t) => !t.sprint)
              .map((t) => {
                const assignedNames = (t.assigned_members || []).map((m) => m.name).filter(Boolean).join(", ");
                return (
                  <div key={t.id} className="rounded border bg-white px-2 py-1.5 text-xs flex items-center gap-2">
                    <span
                      className="shrink-0 w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[t.status] }}
                    />
                    <Link to={`/tasks/${t.id}`} className="font-medium hover:underline truncate">
                      {t.title}
                    </Link>
                    {assignedNames && (
                      <span className="text-gray-400 shrink-0">{assignedNames}</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Date ticks */}
      <div className="relative h-4">
        {sorted.map((sprint) => {
          const sprintStart = new Date(sprint.start_date);
          const leftPct = ((sprintStart - rangeStart) / totalMs) * 100;
          return (
            <span
              key={sprint.id}
              className="absolute text-xs text-gray-400 -translate-x-1/2"
              style={{ left: `${leftPct}%` }}
            >
              {sprintStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          );
        })}
      </div>
    </div>
  );
}
