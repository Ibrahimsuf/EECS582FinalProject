import React, { useState, useEffect } from "react";
import { groups } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { addAuditEvent } from "../lib/audit";

export default function Groups() {
  const { user } = useAuth();
  const [groupList, setGroupList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      setError("");
      const data = await groups.getAll();
      setGroupList(data);
    } catch (err) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setError("");
      const newGroup = await groups.create({ name: newGroupName.trim() });
      setGroupList([newGroup, ...groupList]);
      setNewGroupName("");
      setShowCreateForm(false);
      addAuditEvent(`Created group: ${newGroup.name}`);
    } catch (err) {
      setError(err.message || "Failed to create group");
    }
  }

  async function handleJoinGroup(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setError("");
      const response = await groups.join(joinCode.trim().toUpperCase());
      setGroupList([response.group, ...groupList]);
      setJoinCode("");
      setShowJoinForm(false);
      addAuditEvent(`Joined group: ${response.group.name}`);
    } catch (err) {
      setError(err.message || "Failed to join group");
    }
  }

  async function handleDeleteGroup(id, name) {
    if (!window.confirm(`Are you sure you want to delete the group "${name}"?`)) {
      return;
    }

    try {
      setError("");
      await groups.delete(id);
      setGroupList(groupList.filter((g) => g.id !== id));
      addAuditEvent(`Deleted group: ${name}`);
    } catch (err) {
      setError(err.message || "Failed to delete group");
    }
  }

  function copyJoinCode(code) {
    navigator.clipboard.writeText(code);
    alert(`Join code "${code}" copied to clipboard!`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-gray-600">Manage your groups and join new ones using join codes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowJoinForm(!showJoinForm);
              setShowCreateForm(false);
            }}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Join Group
          </button>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setShowJoinForm(false);
            }}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Create Group
          </button>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="rounded border bg-white p-4 max-w-md">
          <h3 className="font-semibold mb-3">Create New Group</h3>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., EECS 582 Team A"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Group Form */}
      {showJoinForm && (
        <div className="rounded border bg-white p-4 max-w-md">
          <h3 className="font-semibold mb-3">Join Group with Code</h3>
          <form onSubmit={handleJoinGroup} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Join Code</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 uppercase"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g., ABC12345"
                required
                maxLength="8"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-3">
        {groupList.length === 0 ? (
          <div className="rounded border bg-white p-6 text-center text-gray-600">
            <p>No groups yet.</p>
            <p className="mt-2 text-sm">Create a group or join one using a join code.</p>
          </div>
        ) : (
          groupList.map((group) => {
            const isOwner = group.owner_email === user?.email;
            return (
              <div key={group.id} className="rounded border bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                      {isOwner && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 font-medium">
                          OWNER
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Join Code:</span>{" "}
                        <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
                          {group.join_code}
                        </code>
                        <button
                          onClick={() => copyJoinCode(group.join_code)}
                          className="ml-2 text-blue-600 hover:underline text-xs"
                        >
                          Copy
                        </button>
                      </p>
                      <p>
                        <span className="font-medium">Members:</span> {group.member_count}
                      </p>
                      <p>
                        <span className="font-medium">Owner:</span> {group.owner_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(group.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
