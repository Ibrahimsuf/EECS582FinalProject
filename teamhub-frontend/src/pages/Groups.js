import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default function Groups() {
  const user = getCurrentUser();
  const [tab, setTab] = useState("my-groups");

  // My Groups state
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState(null);

  // Create/Join state
  const [createName, setCreateName] = useState("");
  const [createMsg, setCreateMsg] = useState(null);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState(null);
  const [joining, setJoining] = useState(false);

  // New Task state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [assignTo, setAssignTo] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [memberRes, groupRes, taskRes, allMembersRes] = await Promise.all([
        fetch(`${API}/members/${user.id}/`),
        fetch(`${API}/groups/`),
        fetch(`${API}/tasks/`),
        fetch(`${API}/members/`),
      ]);

      const memberData = await memberRes.json();
      const allGroups = await groupRes.json();
      const allTasks = await taskRes.json();
      const allMembers = await allMembersRes.json();

      const myGroupIds = memberData.group || [];
      setGroups(allGroups.filter((g) => myGroupIds.includes(g.id)));
      setMembers(allMembers);
      setTasks(allTasks);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const code = Math.floor(100000 + Math.random() * 900000);
      const res = await fetch(`${API}/groups/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), group_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateMsg({ type: "error", text: data.error || "Failed to create group." });
      } else {
        await fetch(`${API}/groups/join//`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_code: code, member_id: user.id }),
        });
        setCreateMsg({ type: "success", text: `Group created! Code:`, code: code });
        setCreateName("");
        fetchData();
      }
    } catch {
      setCreateMsg({ type: "error", text: "Network error." });
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinMsg(null);
    try {
      const res = await fetch(`${API}/groups/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_code: parseInt(joinCode), member_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinMsg({ type: "error", text: data.error || "Failed to join." });
      } else {
        setJoinMsg({ type: "success", text: `Joined "${data.group_name}"!` });
        setJoinCode("");
        fetchData();
      }
    } catch {
      setJoinMsg({ type: "error", text: "Network error." });
    } finally {
      setJoining(false);
    }
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
      setNewTaskTitle("");
      setAssignTo("");
      fetchData();
    }
  }

  async function updateStatus(taskId, newStatus) {
    const res = await fetch(`${API}/tasks/${taskId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, member_id: user.id }),
    });
    if (!res.ok) {
      alert("Only assigned members can update this task.");
      return;
    }
    fetchData();
  }

  const groupMembers = (groupId) => members.filter((m) => m.group.includes(groupId));
  const groupTasks = (groupId) => {
    const gMemberIds = groupMembers(groupId).map((m) => m.id);
    return tasks.filter((t) => t.member.some((mId) => gMemberIds.includes(mId)));
  };

  const tabClass = (t) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  const statusOptions = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Groups</h1>
      </div>

      <div className="flex border-b">
        <button className={tabClass("my-groups")} onClick={() => setTab("my-groups")}>My Groups</button>
        <button className={tabClass("join")} onClick={() => setTab("join")}>Join / Create</button>
      </div>

      {tab === "my-groups" && (
        <div className="space-y-4">
          {loading ? <p>Loading...</p> : groups.length === 0 ? <p className="text-gray-500">No groups joined yet.</p> : (
            groups.map((group) => (
              <div key={group.id} className="border rounded bg-white overflow-hidden">
                <button className="w-full text-left px-4 py-3 font-semibold flex justify-between" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                  <span>{group.name}</span>
                  <span className="text-gray-400 text-sm font-mono">Code: {group.group_code}</span>
                </button>
                {expandedGroup === group.id && (
                  <div className="p-4 border-t space-y-6 bg-gray-50">
                    <div>
                      <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Members</h3>
                      <div className="flex flex-wrap gap-2">
                        {groupMembers(group.id).map(m => (
                          <span key={m.id} className="bg-white border px-2 py-1 rounded text-xs">{m.name}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Create Task</h3>
                      <div className="flex gap-2">
                        <input className="border rounded px-2 py-1 flex-1 text-sm" placeholder="Task title..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                        <select className="border rounded px-2 py-1 text-sm" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                          <option value="">Assign to...</option>
                          {groupMembers(group.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <button onClick={() => createTask(group.id)} className="bg-black text-white px-4 py-1 rounded text-sm">Add</button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Tasks</h3>
                      <div className="space-y-2">
                        {groupTasks(group.id).map(task => (
                          <div key={task.id} className="bg-white border rounded p-3 flex justify-between items-center shadow-sm">
                            <div>
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-gray-400">Assigned: {task.member.map(id => members.find(m => m.id === id)?.name).join(", ") || "None"}</p>
                            </div>
                            {task.member.includes(user.id) ? (
                              <select value={task.status} onChange={(e) => updateStatus(task.id, e.target.value)} className="border rounded px-2 py-1 text-xs font-semibold">
                                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <span className="text-xs font-bold text-gray-400">{task.status}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "join" && (
        <div className="max-w-md space-y-8">
          <div className="bg-white border rounded p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Create a Group</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input className="w-full border rounded px-3 py-2" placeholder="Group Name" value={createName} onChange={(e) => setCreateName(e.target.value)} required />
              <button type="submit" disabled={creating} className="w-full bg-black text-white py-2 rounded font-bold">{creating ? "Creating..." : "Create Group"}</button>
            </form>
            {createMsg && (
              <div className={`mt-4 p-3 rounded text-sm ${createMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {createMsg.text} {createMsg.code && <span className="block text-2xl font-mono font-bold mt-1">{createMsg.code}</span>}
              </div>
            )}
          </div>

          <div className="bg-white border rounded p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Join a Group</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <input className="w-full border rounded px-3 py-2 font-mono" placeholder="Enter 6-digit code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
              <button type="submit" disabled={joining} className="w-full bg-gray-200 text-black py-2 rounded font-bold">{joining ? "Joining..." : "Join Group"}</button>
            </form>
            {joinMsg && (
              <div className={`mt-4 p-3 rounded text-sm ${joinMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {joinMsg.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
