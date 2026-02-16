import React, { useMemo, useState, useEffect } from "react";
import { getCurrentUser, getUsers } from "../lib/auth";
import { readJSON, writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

export default function Groups() {
  const user = getCurrentUser();
  const allUsers = useMemo(() => getUsers(), []);
  // const [groupName, setGroupName] = useState(user?.name || "");
  const [newGroupCode, setNewGroupCode] = useState("");
  // core idea is that everyone has a group ID and can add others
  const [groups, setGroups] = useState(user?.groups || []);
  const [saved, setSaved] = useState(false);

  // Load group codes from storage when component mounts
  useEffect(() => {
    if (user) {
      const users = readJSON("teamhub_users") || [];
      const currentUser = users.find(u => u.id === user.id);
      if (currentUser?.groups) {
        setGroups(currentUser.groups);
      }
    }
  }, [user]);


  function onSave() {
    setSaved(false);
    writeJSON("teamhub_users", updated);
    addAuditEvent(`Group list updated (name changed) for ${user.email}`);
    setSaved(true);
  }

  function onAddGroup() {
    if (!newGroupCode.trim()) return;
    if (groups.includes(newGroupCode)) {
      alert("Group code already added");
      return;
    }

    setGroups([...groups, newGroupCode]);
    setNewGroupCode("");
  }

  function onRemoveGroup(codeToRemove) {
    // sets groups for everything but the removed code
    setGroups(groups.filter(code => code !== codeToRemove));
  }

  function onSave() {
    setSaved(false);
    const updated = allUsers.map((u) =>
      u.id === user.id ? { ...u, groups: groups } : u
    );
    writeJSON("teamhub_users", updated);
    addAuditEvent(`Group codes updated for ${user.email}`);
    setSaved(true);

    setTimeout(() => setSaved(false), 3000);
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Groups</h1>
        <p className="text-gray-600">Manage groups you're a member of.</p>
      </div>

      <div className="rounded border bg-white p-4 max-w-xl space-y-4">
        <div>
          <div className="text-sm font-medium">Email</div>
          <div className="text-sm text-gray-700">{user?.email}</div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Join a Group</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupCode}
              onChange={(e) => setNewGroupCode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && onAddGroup()}
              placeholder="Enter group code"
              className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={onAddGroup}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Groups</label>
          {groups.length > 0 ? (
            <div className="space-y-2">
              {groups.map((code) => (
                <div
                  key={code}
                  className="flex justify-between items-center bg-gray-50 p-3 rounded border"
                >
                  <span className="font-mono font-semibold">{code}</span>
                  <button
                    onClick={() => onRemoveGroup(code)}
                    className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm bg-gray-50 p-3 rounded">
              No groups joined yet. Enter a group code above to join one.
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={onSave}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Save
          </button>

          {saved && (
            <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
              ✓ Groups saved.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  }
