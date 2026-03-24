import React, { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";
import { getCurrentUser, refreshCurrentUser, updateCurrentUser } from "../lib/auth";

export default function Settings() {
  const [settings, setSettings] = useState(() =>
    readJSON("teamhub_settings", {
      darkMode: false,
      notifications: true
    })
  );
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(() => getCurrentUser());
  const [linkedForm, setLinkedForm] = useState({
    github_username: "",
    github_token: "",
    google_account: "",
  });
  const [linkedSaved, setLinkedSaved] = useState(false);
  const [linkedErr, setLinkedErr] = useState("");

  useEffect(() => {
    writeJSON("teamhub_settings", settings);
  }, [settings]);

  useEffect(() => {
    (async () => {
      try {
        const u = await refreshCurrentUser();
        if (u) {
          setUser(u);
          setLinkedForm({
            github_username: u.github_username || "",
            github_token: "",
            google_account: u.google_account || "",
          });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  function save() {
    addAuditEvent("Settings saved");
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  async function saveGitHub() {
    setLinkedErr("");
    setLinkedSaved(false);
    try {
      const patch = {
        github_username: linkedForm.github_username,
        github_linked: linkedForm.github_username ? true : false,
      };
      if (linkedForm.github_token) {
        patch.github_token = linkedForm.github_token;
      }
      const updated = await updateCurrentUser(patch);
      setUser(updated);
      setLinkedForm((p) => ({ ...p, github_token: "" }));
      setLinkedSaved(true);
      setTimeout(() => setLinkedSaved(false), 1500);
    } catch (e) {
      setLinkedErr(e.message || "Failed to save.");
    }
  }

  async function saveGoogle() {
    setLinkedErr("");
    setLinkedSaved(false);
    try {
      const patch = {
        google_account: linkedForm.google_account,
        google_linked: linkedForm.google_account ? true : false,
      };
      const updated = await updateCurrentUser(patch);
      setUser(updated);
      setLinkedSaved(true);
      setTimeout(() => setLinkedSaved(false), 1500);
    } catch (e) {
      setLinkedErr(e.message || "Failed to save.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Local preferences and linked accounts.</p>
      </div>

      {/* App Settings */}
      <div className="rounded border bg-white p-4 max-w-xl space-y-4">
        <h2 className="text-lg font-semibold">App Preferences</h2>
        
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.darkMode}
            onChange={(e) => setSettings((s) => ({ ...s, darkMode: e.target.checked }))}
          />
          <span className="text-sm">Dark mode (demo toggle)</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => setSettings((s) => ({ ...s, notifications: e.target.checked }))}
          />
          <span className="text-sm">Notifications enabled (demo toggle)</span>
        </label>

        <button
          onClick={save}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Save Settings
        </button>

        {saved ? <div className="text-sm text-green-700">Saved.</div> : null}
      </div>

      {/* Linked Accounts */}
      <div className="rounded border bg-white p-4 max-w-xl space-y-6">
        <h2 className="text-lg font-semibold">Linked Accounts</h2>

        {linkedErr && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{linkedErr}</div>
        )}

        {/* GitHub Section */}
        <div className="space-y-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">GitHub</h3>
            {user?.github_linked ? (
              <>
                <span className="text-green-600 text-lg" title="Linked">✓</span>
                <span className="text-xs text-gray-500">
                  Linked as <span className="font-mono">{user.github_username}</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-red-500 text-lg" title="Not linked">✗</span>
                <span className="text-xs text-gray-500">Not linked</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GitHub Username</label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="your-github-username"
                value={linkedForm.github_username}
                onChange={(e) => setLinkedForm((p) => ({ ...p, github_username: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personal Access Token</label>
              <input
                type="password"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="ghp_xxxxxxxxxxxx (leave empty to keep current)"
                value={linkedForm.github_token}
                onChange={(e) => setLinkedForm((p) => ({ ...p, github_token: e.target.value }))}
              />
            </div>
            <button
              onClick={saveGitHub}
              className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Save GitHub
            </button>
          </div>
        </div>

        {/* Google Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Google</h3>
            {user?.google_linked ? (
              <>
                <span className="text-green-600 text-lg" title="Linked">✓</span>
                <span className="text-xs text-gray-500">
                  Linked as <span className="font-mono">{user.google_account}</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-red-500 text-lg" title="Not linked">✗</span>
                <span className="text-xs text-gray-500">Not linked</span>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Google Account Email</label>
              <input
                type="email"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="your.email@gmail.com"
                value={linkedForm.google_account}
                onChange={(e) => setLinkedForm((p) => ({ ...p, google_account: e.target.value }))}
              />
            </div>
            <button
              onClick={saveGoogle}
              className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Save Google
            </button>
          </div>
        </div>

        {linkedSaved ? <div className="text-sm text-green-700">Saved.</div> : null}
      </div>

      <div className="text-xs text-gray-500">
        Note: App preferences are stored in <code className="rounded bg-gray-100 px-1">localStorage</code>. 
        Linked accounts are synced with the backend.
      </div>
    </div>
  );
}
