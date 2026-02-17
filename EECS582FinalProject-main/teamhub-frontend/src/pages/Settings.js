import React, { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

export default function Settings() {
  const [settings, setSettings] = useState(() =>
    readJSON("teamhub_settings", {
      darkMode: false,
      notifications: true
    })
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    writeJSON("teamhub_settings", settings);
  }, [settings]);

  function save() {
    addAuditEvent("Settings saved");
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Local preferences for this demo app.</p>
      </div>

      <div className="rounded border bg-white p-4 max-w-xl space-y-4">
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

      <div className="text-xs text-gray-500">
        Note: This stores to <code className="rounded bg-gray-100 px-1">localStorage</code>.
      </div>
    </div>
  );
}

