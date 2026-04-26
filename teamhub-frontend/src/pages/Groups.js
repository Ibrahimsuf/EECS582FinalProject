import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL

export default function Groups() {
  const user = getCurrentUser();
  const { refreshGroups } = useGroup();
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [joinMsg, setJoinMsg] = useState({ type: "", text: "" });
  const [newGroupName, setNewGroupName] = useState("");
  const [createMsg, setCreateMsg] = useState({ type: "", text: "" });
  const [copiedCode, setCopiedCode] = useState(null);

  // Task assignment state per group
  const [taskForms, setTaskForms] = useState({});
  const [sprints, setSprints] = useState({});
  const [tasks, setTasks] = useState({});
  const [taskMsg, setTaskMsg] = useState({});
  const [loadingSprints, setLoadingSprints] = useState({});
  const [loadingTasks, setLoadingTasks] = useState({});

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, []); // eslint-disable-line

  async function fetchData() {
    setFetchError("");
    try {
      const [memberRes, groupRes] = await Promise.all([
        fetch(`${API}/members/${user.id}/`),
        fetch(`${API}/groups/`),
      ]);
      const memberData = await memberRes.json();
      const allGroups = await groupRes.json();
      const myGroupIds = memberData.group || [];
      const myGroups = allGroups.filter((g) => myGroupIds.includes(g.id));
      setGroups(myGroups);

      const mRes = await fetch(`${API}/members/`);
      setMembers(await mRes.json());

      // Fetch sprints and tasks for each group
      for (const g of myGroups) {
        fetchSprintsForGroup(g.id);
        fetchTasksForGroup(g.id);
      }
    } catch (err) {
      setFetchError(err.message || "Failed to load groups.");
    }
  }

  async function fetchSprintsForGroup(groupId) {
    setLoadingSprints((prev) => ({ ...prev, [groupId]: true }));
    try {
      const res = await fetch(`${API}/sprints/?group_id=${groupId}`);
      const data = await res.json();
      setSprints((prev) => ({ ...prev, [groupId]: data }));
    } catch (err) {
      console.error("Failed to fetch sprints for group", groupId, err);
    } finally {
      setLoadingSprints((prev) => ({ ...prev, [groupId]: false }));
    }
  }

  async function fetchTasksForGroup(groupId) {
    setLoadingTasks((prev) => ({ ...prev, [groupId]: true }));
    try {
      const res = await fetch(`${API}/tasks/?group_id=${groupId}`);
      const data = await res.json();
      setTasks((prev) => ({ ...prev, [groupId]: data }));
    } catch (err) {
      console.error("Failed to fetch tasks for group", groupId, err);
    } finally {
      setLoadingTasks((prev) => ({ ...prev, [groupId]: false }));
    }
  }

  function groupMembers(groupId) {
    return members.filter((m) => m.group.includes(groupId));
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(String(code));
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    setCreateMsg({ type: "", text: "" });
    if (!newGroupName.trim()) return;
    const code = Math.floor(100000 + Math.random() * 900000);
    try {
      const res = await fetch(`${API}/groups/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), group_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateMsg({ type: "error", text: data.error || "Failed to create group." });
        return;
      }
      await fetch(`${API}/groups/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_code: code, member_id: user.id }),
      });
      setCreateMsg({ type: "success", text: `Group "${data.name}" created. Share code: ${code}` });
      setNewGroupName("");
      fetchData();
      refreshGroups();
    } catch {
      setCreateMsg({ type: "error", text: "Network error. Is the backend running?" });
    }
  }

  async function joinGroup(e) {
    e.preventDefault();
    setJoinMsg({ type: "", text: "" });
    if (!groupCode.trim()) return;
    try {
      const res = await fetch(`${API}/groups/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_code: groupCode.trim(), member_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinMsg({ type: "error", text: data.error || "Failed to join group." });
        return;
      }
      setJoinMsg({ type: "success", text: `Joined "${data.group_name}" successfully.` });
      setGroupCode("");
      fetchData();
      refreshGroups();
    } catch {
      setJoinMsg({ type: "error", text: "Network error. Is the backend running?" });
    }
  }

  function getTaskForm(groupId) {
    return taskForms[groupId] || { title: "", description: "", sprint: "", status: "BACKLOG", member: "" };
  }

  function updateTaskForm(groupId, field, value) {
    setTaskForms((prev) => ({
      ...prev,
      [groupId]: { ...getTaskForm(groupId), [field]: value },
    }));
  }

  async function assignTask(e, groupId) {
    e.preventDefault();
    const form = getTaskForm(groupId);
    setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "", text: "" } }));

    if (!form.title.trim()) {
      setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "error", text: "Task title is required." } }));
      return;
    }
    if (!form.member) {
      setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "error", text: "Please select a member." } }));
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        sprint: form.sprint || null,
        status: form.status || "BACKLOG",
        member: form.member ? [parseInt(form.member)] : [],
        actor_id: user.id,
      };

      const res = await fetch(`${API}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "error", text: data.error || "Failed to assign task." } }));
        return;
      }
      setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "success", text: "Task assigned successfully!" } }));
      setTaskForms((prev) => ({ ...prev, [groupId]: { title: "", description: "", sprint: "", status: "BACKLOG", member: "" } }));
      fetchTasksForGroup(groupId);
    } catch {
      setTaskMsg((prev) => ({ ...prev, [groupId]: { type: "error", text: "Network error." } }));
    }
  }

  async function updateTaskStatus(taskId, newStatus, groupId) {
    try {
      const res = await fetch(`${API}/tasks/${taskId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, actor_id: user.id }),
      });
      if (res.ok) {
        fetchTasksForGroup(groupId);
      }
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  }

  function isAssignedMember(task) {
    const assignedIds = task.assigned_members?.map((m) => m.id) || task.member || [];
    return assignedIds.includes(user.id);
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Groups</h1>
        <p className="text-sm text-gray-500">Loading user session…</p>
      </div>
    );
  }

  const isProjectManager = user.roles === "PROJECT_MANAGER";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Groups</h1>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        {/* Create group */}
        <form onSubmit={createGroup} className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Create a Group</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button
              type="submit"
              className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Create
            </button>
          </div>
          {createMsg.text && (
            <p className={`text-sm ${createMsg.type === "error" ? "text-red-600" : "text-green-700"}`}>
              {createMsg.text}
            </p>
          )}
        </form>

        {/* Join group */}
        <form onSubmit={joinGroup} className="rounded border bg-white p-4 space-y-3">
          <h2 className="font-semibold">Join a Group</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="Enter group code"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
            />
            <button
              type="submit"
              className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Join
            </button>
          </div>
          {joinMsg.text && (
            <p className={`text-sm ${joinMsg.type === "error" ? "text-red-600" : "text-green-700"}`}>
              {joinMsg.text}
            </p>
          )}
        </form>
      </div>

      {fetchError && (
        <div className="rounded bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {!fetchError && groups.length === 0 && (
        <p className="text-sm text-gray-500">
          You are not in any groups yet. Enter a group code above to join one.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((group) => {
          const gMembers = groupMembers(group.id);
          const gSprints = sprints[group.id] || [];
          const gTasks = tasks[group.id] || [];
          const form = getTaskForm(group.id);
          const msg = taskMsg[group.id] || { type: "", text: "" };

          return (
            <div key={group.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-lg">{group.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Code: <span className="font-mono font-medium">{group.group_code}</span></span>
                    <button
                      type="button"
                      onClick={() => copyCode(group.group_code)}
                      className="ml-1 rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-gray-200"
                    >
                      {copiedCode === group.group_code ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Members</div>
                <div className="space-y-1">
                  {gMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{m.email}</span>
                      {m.roles === "PROJECT_MANAGER" && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">PM</span>
                      )}
                    </div>
                  ))}
                  {gMembers.length === 0 && (
                    <p className="text-sm text-gray-400">No members yet.</p>
                  )}
                </div>
              </div>

              {/* Task Assignment Section - Only for PROJECT_MANAGER */}
              {isProjectManager && (
                <div className="border-t pt-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assign Task</h3>
                  <form onSubmit={(e) => assignTask(e, group.id)} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Member</label>
                        <select
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={form.member}
                          onChange={(e) => updateTaskForm(group.id, "member", e.target.value)}
                        >
                          <option value="">Select member...</option>
                          {gMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Sprint</label>
                        <select
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={form.sprint}
                          onChange={(e) => updateTaskForm(group.id, "sprint", e.target.value)}
                        >
                          <option value="">No sprint</option>
                          {gSprints.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Task Title</label>
                      <input
                        className="w-full rounded border px-3 py-2 text-sm"
                        placeholder="Enter task title"
                        value={form.title}
                        onChange={(e) => updateTaskForm(group.id, "title", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea
                        className="w-full rounded border px-3 py-2 text-sm"
                        placeholder="Enter task description"
                        rows={2}
                        value={form.description}
                        onChange={(e) => updateTaskForm(group.id, "description", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select
                          className="rounded border px-3 py-2 text-sm"
                          value={form.status}
                          onChange={(e) => updateTaskForm(group.id, "status", e.target.value)}
                        >
                          <option value="BACKLOG">Backlog</option>
                          <option value="TODO">To-Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="mt-5 rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                      >
                        Assign Task
                      </button>
                    </div>
                    {msg.text && (
                      <p className={`text-sm ${msg.type === "error" ? "text-red-600" : "text-green-700"}`}>
                        {msg.text}
                      </p>
                    )}
                  </form>
                </div>
              )}

              {/* Task List */}
              {gTasks.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tasks ({gTasks.length})</h3>
                  <div className="space-y-2">
                    {gTasks.map((task) => {
                      const canEditStatus = isAssignedMember(task);
                      return (
                        <div key={task.id} className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm">
                          <div className="flex-1">
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-gray-500">
                              Assigned to: {task.assigned_members?.map((m) => m.name).join(", ") || "None"}
                            </div>
                          </div>
                          <select
                            className={`rounded border px-2 py-1 text-xs ${canEditStatus ? "bg-white" : "bg-gray-100 text-gray-500 cursor-not-allowed"
                              }`}
                            value={task.status}
                            disabled={!canEditStatus}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value, group.id)}
                            title={canEditStatus ? "Update status" : "Only assigned member can update status"}
                          >
                            <option value="BACKLOG">Backlog</option>
                            <option value="TODO">To-Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
