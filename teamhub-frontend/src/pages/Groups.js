import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

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
      setGroups(allGroups.filter((g) => myGroupIds.includes(g.id)));

      const mRes = await fetch(`${API}/members/`);
      setMembers(await mRes.json());
    } catch (err) {
      setFetchError(err.message || "Failed to load groups.");
    }
  }

  function groupMembers(groupId) {
    return members.filter((m) => m.group.includes(groupId));
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
        {groups.map((group) => (
          <div key={group.id} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">{group.name}</div>
                <div className="text-xs text-gray-500">Code: <span className="font-mono font-medium">{group.group_code}</span></div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Members</div>
              <div className="space-y-1">
                {groupMembers(group.id).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{m.email}</span>
                    {m.roles === "PROJECT_MANAGER" && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">PM</span>
                    )}
                  </div>
                ))}
                {groupMembers(group.id).length === 0 && (
                  <p className="text-sm text-gray-400">No members yet.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
