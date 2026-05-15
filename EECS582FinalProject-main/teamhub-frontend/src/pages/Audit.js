import React, { useEffect, useState } from "react";
import { getAuditEvents } from "../lib/audit";

export default function Audit() {
  const [events, setEvents] = useState(() => getAuditEvents());

  // refresh on load (simple)
  useEffect(() => {
    setEvents(getAuditEvents());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Trail</h1>
        <p className="text-gray-600">Tracks basic activity events in local storage.</p>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="text-sm text-gray-600">No events yet.</div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="rounded border bg-white p-4">
              <div className="font-semibold">{e.message}</div>
              <div className="text-xs text-gray-500">{new Date(e.at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
