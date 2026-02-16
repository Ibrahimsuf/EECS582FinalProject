import React, { useMemo, useState } from "react";
import { getCurrentUser, getUsers } from "../lib/auth";
import { writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

export default function Profile() {
  const user = getCurrentUser();
  const allUsers = useMemo(() => getUsers(), []);
  const [name, setName] = useState(user?.name || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [groups, setGroups] = useState(user?.groups || []);
  const [saved, setSaved] = useState(false);

  function onSave() {
    setSaved(false);
    const updated = allUsers.map((u) => (u.id === user.id ? {
        ...u, name, 
        first_name: firstName,
        last_name: lastName
    } : u));
    writeJSON("teamhub_users", updated);
    addAuditEvent(`Profile updated (name changed) for ${user.email}`);
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">Edit your user profile.</p>
      </div>

      <div className="rounded border bg-white p-4 max-w-xl space-y-3">
        <div>
          <div className="text-sm font-medium">Email</div>
          <div className="text-sm text-gray-700">{user?.email}</div>
        </div>

        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={onSave}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Save
        </button>

        {saved ? <div className="text-sm text-green-700">Saved.</div> : null}
      </div>
    </div>
  );
}
