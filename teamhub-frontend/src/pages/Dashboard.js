import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getSession } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const STATUS_STYLES = {
  BACKLOG: "bg-gray-100 text-gray-700",
  TODO: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
};

export default function Dashboard() {
  const { activeGroup } = useGroup();
  const memberId = getSession()?.memberId;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroup?.id) return;
    setLoading(true);

    async function load() {
      const [allTasks, allMembers, sprints, allContributions] = await Promise.all([
        apiFetch("/api/tasks/"),
        apiFetch("/api/members/"),
        apiFetch(`/api/sprints/?group_id=${activeGroup.id}`),
        apiFetch("/api/contributions/").catch(() => []),
      ]);

      const groupMembers = allMembers.filter((m) => m.group.includes(activeGroup.id));
      const groupMemberIds = new Set(groupMembers.map((m) => m.id));
      const groupTasks = allTasks.filter((t) => t.member.some((mid) => groupMemberIds.has(mid)));

      const sprint = sprints.find((s) => s.is_active) || null;
      const sprintContributions = sprint
        ? allContributions.filter((c) => c.sprint === sprint.id)
        : [];

      setMembers(groupMembers);
      setTasks(groupTasks);
      setActiveSprint(sprint);
      setContributions(sprintContributions);
    }

    load().catch(() => {}).finally(() => setLoading(false));
  }, [activeGroup?.id]); // eslint-disable-line

  const byStatus = (status) => tasks.filter((t) => t.status === status).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          {activeGroup ? `${activeGroup.name} — ` : ""}overview
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Active sprint banner */}
          <div className={`rounded border p-4 ${activeSprint ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            {activeSprint ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-green-800">Active Sprint</div>
                  <div className="text-lg font-bold text-green-900">{activeSprint.name}</div>
                  <div className="text-xs text-green-700 mt-0.5">
                    {activeSprint.start_date} → {activeSprint.end_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-900">{contributions.length}</div>
                  <div className="text-xs text-green-700">contribution{contributions.length !== 1 ? "s" : ""} logged</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-800">No active sprint — go to Sprints to activate one.</p>
            )}
          </div>

          {/* Task status cards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tasks</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["BACKLOG", "TODO", "IN_PROGRESS", "DONE"].map((status) => (
                <div key={status} className="rounded border bg-white p-4">
                  <div className={`inline-block rounded px-2 py-0.5 text-xs font-medium mb-2 ${STATUS_STYLES[status]}`}>
                    {status.replace("_", " ")}
                  </div>
                  <div className="text-3xl font-bold">{byStatus(status)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Members + their task counts */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Members ({members.length})
            </h2>
            <div className="space-y-2">
              {members.map((m) => {
                const memberTasks = tasks.filter((t) => t.member.includes(m.id));
                const done = memberTasks.filter((t) => t.status === "DONE").length;
                const inProgress = memberTasks.filter((t) => t.status === "IN_PROGRESS").length;
                const hasContrib = contributions.some((c) => c.member === m.id);
                return (
                  <div key={m.id} className="rounded border bg-white px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {m.name}
                        {m.id === memberId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        {m.roles === "PROJECT_MANAGER" && (
                          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">PM</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{inProgress} in progress</span>
                      <span>{done}/{memberTasks.length} done</span>
                      {activeSprint && (
                        <span className={hasContrib ? "text-green-700 font-medium" : "text-gray-400"}>
                          {hasContrib ? "✓ logged" : "no log"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="text-sm text-gray-500">No members in this group yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
