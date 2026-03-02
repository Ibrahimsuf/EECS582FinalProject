import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default function Groups() {
  const user = getCurrentUser();
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [joinMsg, setJoinMsg] = useState({ type: "", text: "" });
  const [newGroupName, setNewGroupName] = useState("");
  const [createMsg, setCreateMsg] = useState({ type: "", text: "" });
  const [sprintsByGroup, setSprintsByGroup] = useState({});
  const [sprintForm, setSprintForm] = useState({ name: "", start_date: "", end_date: "" });
  const [sprintMsg, setSprintMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, []); // eslint-disable-line

  async function fetchData() {
    setFetchError("");
    try {
    const [memberRes, groupRes, taskRes] = await Promise.all([
      fetch(`${API}/members/${user.id}/`),
      fetch(`${API}/groups/`),
      fetch(`${API}/tasks/`),
    ]);

    const memberData = await memberRes.json();
    const allGroups = await groupRes.json();
    const allTasks = await taskRes.json();

    const myGroupIds = memberData.group || [];
    setGroups(allGroups.filter((g) => myGroupIds.includes(g.id)));

    const mRes = await fetch(`${API}/members/`);
    const allMembers = await mRes.json();
    setMembers(allMembers);

    setTasks(allTasks);
    } catch (err) {
      setFetchError(err.message || "Failed to load groups.");
    }
  }

  function groupMembers(groupId) {
    return members.filter((m) => m.group.includes(groupId));
  }

  function groupTasks(groupId) {
    const gMembers = groupMembers(groupId).map((m) => m.id);
    return tasks.filter((t) =>
      t.member.some((memberId) => gMembers.includes(memberId))
    );
  }

  async function createTask(groupId) {
    if (!newTaskTitle.trim()) return;

    const res = await fetch(`${API}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle,
        status: "TODO",
        member: assignTo ? [parseInt(assignTo)] : [],
      }),
    });

    if (res.ok) {
      // reset inputs after success
      setNewTaskTitle("");
      setAssignTo("");
      fetchData();
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    setCreateMsg({ type: "", text: "" });
    if (!newGroupName.trim()) return;

    // generate a random 6-digit code
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
      // auto-join the creator
      await fetch(`${API}/groups/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_code: code, member_id: user.id }),
      });
      setCreateMsg({ type: "success", text: `Group "${data.name}" created. Share code: ${code}` });
      setNewGroupName("");
      fetchData();
    } catch {
      setCreateMsg({ type: "error", text: "Network error. Is the backend running?" });
    }
  }

  async function joinGroup(e) {
    e.preventDefault();
    setJoinMsg({ type: "", text: "" });
    // ensure groupCode isn't empty
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
    } catch {
      setJoinMsg({ type: "error", text: "Network error. Is the backend running?" });
    }
  }

  async function fetchSprints(groupId) {
    const res = await fetch(`${API}/sprints/?group_id=${groupId}`);
    const data = await res.json();
    // concatenate the fetched sprints to the cached group sprints
    setSprintsByGroup((prev) => ({ ...prev, [groupId]: data }));
  }

  async function createSprint(e, groupId) {
    e.preventDefault();
    setSprintMsg({ type: "", text: "" });
    const { name, start_date, end_date } = sprintForm; // fetch current form
    if (!name.trim() || !start_date || !end_date) {
      setSprintMsg({ type: "error", text: "Name, start date, and end date are required." });
      return;
    }
    try {
      const res = await fetch(`${API}/sprints/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start_date, end_date, is_active: false, group: groupId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSprintMsg({ type: "error", text: data.error || "Failed to create sprint." });
        return;
      }
      setSprintsByGroup((prev) => ({ ...prev, [groupId]: [...(prev[groupId] || []), data] }));
      setSprintForm({ name: "", start_date: "", end_date: "" }); // reset form after success
      setSprintMsg({ type: "success", text: `Sprint "${data.name}" created.` }); // confirmation msg
    } catch {
      setSprintMsg({ type: "error", text: "Network error." });
    }
  }

  async function toggleSprintActive(sprint, groupId) {
    const groupSprints = sprintsByGroup[groupId] || [];
    try {
      if (!sprint.is_active) {
        await Promise.all(
          groupSprints
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
        body: JSON.stringify({ is_active: !sprint.is_active }) // toggling by own state
      });
      const data = await res.json();
      setSprintsByGroup((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((s) => {
          // replace matching sprint w/ new server data
          if (s.id === sprint.id) return data;
          if (!sprint.is_active) return { ...s, is_active: false };
          return s;
        }),
      }));
    } catch {
      // silently fail
    }
  }

  async function deleteSprint(id, groupId) {
    try {
      await fetch(`${API}/sprints/${id}/`, { method: "DELETE" });
      setSprintsByGroup((prev) => ({
        ...prev,
        // keep every sprint except one being deleted
        [groupId]: (prev[groupId] || []).filter((s) => s.id !== id),
      }));
    } catch {
      // silently fail
    }
  }

  async function updateStatus(taskId, newStatus) {
    const res = await fetch(`${API}/tasks/${taskId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        member_id: user.id,
      }),
    });

    if (!res.ok) {
      alert("You are not assigned to this task.");
      return;
    }

    fetchData();
  }

  const statusOptions = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Groups</h1>
        <p className="text-sm text-gray-500">Loading user session…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Groups</h1>

      {/* Create group form */}
      <form onSubmit={createGroup} className="rounded border bg-white p-4 max-w-md space-y-3">
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

      {/* Join group form */}
      <form onSubmit={joinGroup} className="rounded border bg-white p-4 max-w-md space-y-3">
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

      {groups.map((group) => (
        <div key={group.id} className="border rounded bg-white">
          <button
            className="w-full text-left px-4 py-3 font-semibold"
            onClick={() => {
              const next = expandedGroup === group.id ? null : group.id;
              setExpandedGroup(next);
              if (next && !sprintsByGroup[next]) fetchSprints(next);
            }}
          >
            {group.name} (Code: {group.group_code})
          </button>

          {expandedGroup === group.id && (
            <div className="px-4 py-4 space-y-6 border-t">

              {/* MEMBERS */}
              <div>
                <h2 className="font-semibold mb-2">Members</h2>
                <div className="space-y-1 text-sm">
                  {groupMembers(group.id).map((m) => (
                    <div key={m.id}>
                      {m.name} ({m.email})
                    </div>
                  ))}
                </div>
              </div>

              {/* SPRINTS */}
              <div>
                <h2 className="font-semibold mb-2">Sprints</h2>

                <div className="space-y-2 mb-3">
                  {(sprintsByGroup[group.id] || []).length === 0 ? (
                    <p className="text-sm text-gray-500">No sprints yet.</p>
                  ) : (
                    (sprintsByGroup[group.id] || []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {s.start_date} → {s.end_date}
                          </span>
                          {s.is_active && (
                            <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSprintActive(s, group.id)}
                            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            {s.is_active ? "Deactivate" : "Set Active"}
                          </button>
                          <button
                            onClick={() => deleteSprint(s.id, group.id)}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={(e) => createSprint(e, group.id)} className="space-y-2 border rounded p-3 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Sprint</div>
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Sprint name"
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Start date</label>
                      <input
                        type="date"
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={sprintForm.start_date}
                        onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End date</label>
                      <input
                        type="date"
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={sprintForm.end_date}
                        onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  {sprintMsg.text && (
                    <p className={`text-xs ${sprintMsg.type === "error" ? "text-red-600" : "text-green-700"}`}>
                      {sprintMsg.text}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded bg-gray-900 px-3 py-1 text-sm font-semibold text-white hover:bg-black"
                  >
                    Create Sprint
                  </button>
                </form>
              </div>

              {/* CREATE TASK */}
              <div>
                <h2 className="font-semibold mb-2">Create Task</h2>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <select
                    className="border rounded px-2 py-1"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Assign</option>
                    {groupMembers(group.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => createTask(group.id)}
                    className="bg-black text-white px-3 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* TASK LIST */}
              <div>
                <h2 className="font-semibold mb-2">Tasks</h2>
                <div className="space-y-2">
                  {groupTasks(group.id).map((task) => (
                    <div
                      key={task.id}
                      className="flex justify-between items-center border rounded px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-500">
                          Assigned to:{" "}
                          {task.member
                            .map((id) => members.find((m) => m.id === id)?.name)
                            .join(", ") || "Unassigned"}
                        </div>
                      </div>

                      {task.member.includes(user.id) ? (
                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Only assigned member can update
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      ))}
    </div>
  );
}
