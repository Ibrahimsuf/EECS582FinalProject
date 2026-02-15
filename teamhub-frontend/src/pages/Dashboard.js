import React from "react";
import { readJSON } from "../lib/storage";

export default function Dashboard() {
  const tasks = readJSON("teamhub_tasks", []);
  const logs = readJSON("teamhub_logs", []);

  const done = tasks.filter((t) => t.status === "done").length;
  const todo = tasks.length - done;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome to the team productivity dashboard.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Tasks (Todo)" value={String(todo)} />
        <Card title="Tasks (Done)" value={String(done)} />
        <Card title="Contribution Entries" value={String(logs.length)} />
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Next Steps</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Add tasks in the Tasks page and mark them complete.</li>
          <li>Log contributions in Contribution Logs for sprint tracking.</li>
          <li>Check Audit Trail to see activity events.</li>
        </ul>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
