import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useGroup } from "../lib/GroupContext";

export default function InstructorDashboard() {
  const { activeGroup } = useGroup();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeGroup?.id) return;
    setLoading(true);
    setError("");

    apiFetch(`/api/dashboard/instructor-discrepancy/?group_id=${activeGroup.id}`)
      .then((response) => setData(response))
      .catch((err) => setError(err.message || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [activeGroup?.id]);

  if (loading) return <div className="text-sm text-gray-500">Loading instructor dashboard…</div>;
  if (error) return <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Instructor Discrepancy Monitoring</h1>
        <p className="text-gray-600">Real-time view of discrepancy ratings and at-risk groups.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Groups monitored" value={data?.group_count || 0} />
        <MetricCard label="At-risk groups" value={data?.at_risk_groups || 0} />
        <MetricCard label="Total outliers" value={data?.total_outliers || 0} />
        <MetricCard label="Avg discrepancy" value={data?.overall_average_discrepancy || "0.00"} />
      </div>

      <div className="rounded border bg-white overflow-hidden">
        <div className="border-b bg-gray-50 px-4 py-3 font-semibold">Group watchlist</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Group</th>
                <th className="px-4 py-3 text-left">Tasks</th>
                <th className="px-4 py-3 text-left">Avg discrepancy</th>
                <th className="px-4 py-3 text-left">Outliers</th>
                <th className="px-4 py-3 text-left">Risk</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.groups || []).map((group) => (
                <tr key={group.group_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{group.group_name}</td>
                  <td className="px-4 py-3">{group.task_count}</td>
                  <td className="px-4 py-3">{group.average_discrepancy_rating}</td>
                  <td className="px-4 py-3">{group.outlier_count}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${riskStyles(group.risk_level)}`}>{group.risk_level}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {group.needs_attention ? "Early intervention recommended" : "No action needed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function riskStyles(level) {
  if (level === "HIGH") return "bg-red-100 text-red-700";
  if (level === "MEDIUM") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-700";
}
