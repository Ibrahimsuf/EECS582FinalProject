import React, { useState, useEffect } from "react";
import { tasks, groups } from "../lib/api";
import { readJSON } from "../lib/storage";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tasksDone: 0, tasksTodo: 0, groupCount: 0 });
  const [loading, setLoading] = useState(true);
  const logs = readJSON("teamhub_logs", []);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const [taskData, groupData] = await Promise.all([
        tasks.getAll(),
        groups.getAll()
      ]);
      
      const done = taskData.filter((t) => t.status === "DONE").length;
      const todo = taskData.length - done;
      
      setStats({
        tasksDone: done,
        tasksTodo: todo,
        groupCount: groupData.length
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name || user?.email}!</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Tasks (To-Do)" value={String(stats.tasksTodo)} color="yellow" />
        <Card title="Tasks (Done)" value={String(stats.tasksDone)} color="green" />
        <Card title="Groups" value={String(stats.groupCount)} color="blue" />
        <Card title="Contribution Logs" value={String(logs.length)} color="purple" />
      </div>

      <div className="rounded border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Getting Started</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-2">
          <li>Create and manage tasks in the <strong>Tasks</strong> page</li>
          <li>Create groups or join existing ones using join codes in the <strong>Groups</strong> page</li>
          <li>Log your contributions in <strong>Contribution Logs</strong> for sprint tracking</li>
          <li>Review all activity in the <strong>Audit Trail</strong></li>
          <li>Update your profile and change password in <strong>Profile</strong> settings</li>
        </ul>
      </div>

      <div className="rounded border bg-blue-50 p-4 shadow-sm">
        <h3 className="font-semibold text-blue-900 mb-2">🔒 Secure Authentication</h3>
        <p className="text-sm text-blue-800">
          Your data is protected with JWT-based authentication. All tasks, groups, and logs are 
          private to your account and isolated from other users.
        </p>
      </div>
    </div>
  );
}

function Card({ title, value, color = "gray" }) {
  const colorClasses = {
    yellow: "bg-yellow-50 border-yellow-200",
    green: "bg-green-50 border-green-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    gray: "bg-gray-50 border-gray-200"
  };

  return (
    <div className={`rounded border ${colorClasses[color]} p-4 shadow-sm`}>
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
