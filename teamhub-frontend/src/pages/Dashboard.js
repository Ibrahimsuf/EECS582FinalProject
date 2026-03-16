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
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [esitmates, setEsitmates] = useState([]);

  useEffect(() => {
    if (!activeGroup?.id) return;
    setLoading(true);

    async function load() {
      const [allTasks, allMembers, sprints, allContributions, allEstimates] = await Promise.all([
        apiFetch("/api/tasks/"),
        apiFetch("/api/members/"),
        apiFetch(`/api/sprints/?group_id=${activeGroup.id}`),
        apiFetch("/api/contributions/").catch(() => []),
        apiFetch("/api/storyPointEstimates/").catch(() => []),
      ]);

      const groupMembers = allMembers.filter((m) => m.group.includes(activeGroup.id));
      const groupMemberIds = new Set(groupMembers.map((m) => m.id));
      const groupTasks = allTasks.filter((t) => t.member.some((mid) => groupMemberIds.has(mid)));

      const sprint = sprints.find((s) => s.is_active) || null;
      const sprintContributions = sprint
        ? allContributions.filter((c) => c.sprint === sprint.id)
        : [];
        //
      // Calculate urgent tasks (<24h before sprint end) for current user
      const urgent = getUrgentTasks(groupTasks, sprint, memberId);
      const sprintEstimates = sprint
        ? allEstimates.filter((e) => e.sprint === sprint.id)
        :[];
      setMembers(groupMembers);
      setTasks(groupTasks);
      setActiveSprint(sprint);
      setContributions(sprintContributions);
      setUrgentTasks(urgent);
      setEsitmates(sprintEstimates);
    }

    load().catch(() => {}).finally(() => setLoading(false));
  }, [activeGroup?.id]); // eslint-disable-line

  // get all tasks for current user that aren't DONE and are less than 24 until sprint.end_date
  function getUrgentTasks(allTasks, sprint, userId) {
    if (!sprint || !userId) return [];

    const now = new Date();
    const sprintEndDate = new Date(sprint.end_date);

    const hoursUntilDeadline = (sprintEndDate - now) / (1000 * 60 * 60);

    // only show if less than 24 hours (1 day) remaining
    if (hoursUntilDeadline >= 24) return [];

    // Filter: assigned to current user, not DONE, in this sprint
    return allTasks.filter(
    (task) =>
      task.member.includes(userId) &&
      task.status === "IN_PROGRESS" &&
      task.sprint === sprint.id
    );
  }

  const byStatus = (status) => tasks.filter((t) => t.status === status).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          {activeGroup ? `${activeGroup.name} — ` : ""}Overview
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {/* URGENT DEADLINE REMINDER */}
          {urgentTasks.length > 0 && activeSprint && (
            <div className="rounded border border-red-300 bg-red-50 p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Deadline Reminder</h3>
                  <p className="text-sm text-red-700 mt-1">
                    You have {urgentTasks.length} task{urgentTasks.length !== 1 ? "s" : ""} not yet completed.
                    Sprint ends in <span className="font-bold">less than a day!</span>
                  </p>
                  <div className="mt-3 space-y-1">
                    {urgentTasks.map((task) => (
                      <div key={task.id} className="text-sm text-red-800 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                        <span className="font-medium">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLES[task.status]}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <div>
                  <div className ="text-right">
                  <div className="text-2xl font-bold text-green-900">{esitmates.length}</div>
                  <div className="text-xs text-green-700">estimated story points</div>
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
