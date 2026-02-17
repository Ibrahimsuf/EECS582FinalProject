import React, { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

export default function Logs() {
  const [logs, setLogs] = useState(() => readJSON("teamhub_logs", []));
  const [text, setText] = useState("");
  const [hours, setHours] = useState("");

  useEffect(() => {
    writeJSON("teamhub_logs", logs);
  }, [logs]);

  function addLog(e) {
    e.preventDefault();
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text: text.trim(),
      hours: Number(hours || 0),
      at: new Date().toISOString()
    };
    if (!entry.text) return;
    setLogs((prev) => [entry, ...prev]);
    addAuditEvent(`Contribution log added (${entry.hours}h): "${entry.text}"`);
    setText("");
    setHours("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contribution Logs</h1>
        <p className="text-gray-600">Enter and review contribution logs.</p>
      </div>

      <form onSubmit={addLog} className="rounded border bg-white p-4 space-y-3 max-w-2xl">
        <div>
          <label className="text-sm font-medium">What did you do?</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Finished tasks UI + routing"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Hours (optional)</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g., 2"
          />
        </div>

        <button className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
          Add log
        </button>
      </form>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-sm text-gray-600">No logs yet.</div>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="rounded border bg-white p-4">
              <div className="font-semibold">{l.text}</div>
              <div className="text-xs text-gray-500">
                {l.hours ? `${l.hours} hour(s) • ` : ""}
                {new Date(l.at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
