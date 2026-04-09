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

const BURNDOWN_WIDTH = 640;
const BURNDOWN_HEIGHT = 220;
const CHART_PADDING = 28;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value) {
  return toNumber(value).toFixed(1).replace(/\.0$/, "");
}

function formatPercent(value) {
  return `${clampPercent(toNumber(value)).toFixed(1).replace(/\.0$/, "")}%`;
}

function formatShortDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function parseRequirementCount(text) {
  const content = (text || "").trim();
  if (!content) return 0;

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) return lines.length;

  return content
    .split(/[.;]+/)
    .map((part) => part.trim())
    .filter(Boolean).length || 1;
}

function getTaskEffort(task) {
  return toNumber(task.estimated_hours) || toNumber(task.ai_estimated_hours) || 1;
}

function getCompletionDate(task) {
  if (task.status !== "DONE") return null;
  return task.updated_at || task.created_at || null;
}

function buildScopeMetrics({ tasks, contributions, members }) {
  const taskCount = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === "DONE");
  const totalRequirements = tasks.reduce((sum, task) => sum + parseRequirementCount(task.requirements), 0);
  const completedRequirements = doneTasks.reduce((sum, task) => sum + parseRequirementCount(task.requirements), 0);
  const expectedStoryPoints = contributions.reduce((sum, entry) => sum + toNumber(entry.story_points), 0);
  const hoursWorked = contributions.reduce((sum, entry) => sum + toNumber(entry.hours_worked), 0);
  const plannedHours = tasks.reduce((sum, task) => sum + getTaskEffort(task), 0);
  const completedHours = doneTasks.reduce((sum, task) => sum + getTaskEffort(task), 0);
  const completionRate = taskCount ? (doneTasks.length / taskCount) * 100 : 0;
  const requirementRate = totalRequirements ? (completedRequirements / totalRequirements) * 100 : 0;
  const storyPointFallbackTotal = contributions.reduce((sum, entry) => sum + (toNumber(entry.story_points) > 0 ? toNumber(entry.story_points) : toNumber(entry.hours_worked)), 0);

  const memberShares = members
    .map((member) => {
      const entries = contributions.filter((entry) => entry.member === member.id);
      const storyPoints = entries.reduce((sum, entry) => sum + toNumber(entry.story_points), 0);
      const workedHours = entries.reduce((sum, entry) => sum + toNumber(entry.hours_worked), 0);
      const handledTasks = new Set(entries.flatMap((entry) => entry.tasks_handled || [])).size;
      const denominator = expectedStoryPoints > 0 ? expectedStoryPoints : storyPointFallbackTotal;
      const numerator = expectedStoryPoints > 0 ? storyPoints : workedHours;

      return {
        id: member.id,
        name: member.name,
        storyPoints,
        hoursWorked: workedHours,
        handledTasks,
        percent: denominator > 0 ? (numerator / denominator) * 100 : 0,
      };
    })
    .filter((member) => member.storyPoints > 0 || member.hoursWorked > 0 || member.handledTasks > 0)
    .sort((left, right) => right.percent - left.percent || right.storyPoints - left.storyPoints || right.hoursWorked - left.hoursWorked);

  return {
    taskCount,
    doneTaskCount: doneTasks.length,
    completionRate,
    totalRequirements,
    completedRequirements,
    requirementRate,
    expectedStoryPoints,
    hoursWorked,
    plannedHours,
    completedHours,
    memberShares,
  };
}

function buildBurndownData(tasks, startDate, endDate) {
  if (!startDate || !endDate) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const dates = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(new Date(cursor));
  }

  const totalEffort = tasks.reduce((sum, task) => sum + getTaskEffort(task), 0);

  return dates.map((date, index) => {
    const isoDate = date.toISOString().slice(0, 10);
    const completed = tasks
      .filter((task) => {
        const completionDate = getCompletionDate(task);
        return completionDate && completionDate.slice(0, 10) <= isoDate;
      })
      .reduce((sum, task) => sum + getTaskEffort(task), 0);

    const remaining = Math.max(totalEffort - completed, 0);
    const idealRemaining = dates.length > 1 ? totalEffort - (totalEffort * index) / (dates.length - 1) : 0;

    return {
      label: formatShortDate(isoDate),
      actualRemaining: remaining,
      idealRemaining: Math.max(idealRemaining, 0),
    };
  });
}

function getProjectRange(tasks, sprints) {
  const sprintStarts = sprints.map((sprint) => sprint.start_date).filter(Boolean);
  const sprintEnds = sprints.map((sprint) => sprint.end_date).filter(Boolean);
  const taskDates = tasks.flatMap((task) => [task.created_at, task.updated_at]).filter(Boolean);
  const allStarts = [...sprintStarts, ...taskDates];
  const allEnds = [...sprintEnds, ...taskDates];

  if (!allStarts.length || !allEnds.length) {
    return { start: null, end: null };
  }

  return {
    start: allStarts.slice().sort()[0],
    end: allEnds.slice().sort()[allEnds.length - 1],
  };
}

function getPath(points, key, maxValue) {
  if (!points.length || maxValue <= 0) return "";

  const innerWidth = BURNDOWN_WIDTH - CHART_PADDING * 2;
  const innerHeight = BURNDOWN_HEIGHT - CHART_PADDING * 2;

  return points
    .map((point, index) => {
      const x = CHART_PADDING + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
      const y = CHART_PADDING + innerHeight - (point[key] / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function ScopeMetricsCard({ title, subtitle, metrics }) {
  return (
    <div className="rounded border bg-white p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expected story points"
          value={formatNumber(metrics.expectedStoryPoints)}
          hint={`${metrics.memberShares.length} contributors logged`}
        />
        <MetricCard
          label="Contribution hours"
          value={formatNumber(metrics.hoursWorked)}
          hint={`${formatNumber(metrics.completedHours)}h of ${formatNumber(metrics.plannedHours)}h planned complete`}
        />
        <MetricCard
          label="Requirements complete"
          value={`${metrics.completedRequirements}/${metrics.totalRequirements}`}
          hint={formatPercent(metrics.requirementRate)}
        />
        <MetricCard
          label="Tasks complete"
          value={`${metrics.doneTaskCount}/${metrics.taskCount}`}
          hint={formatPercent(metrics.completionRate)}
        />
      </div>

      {metrics.memberShares.length ? (
        <ContributionChart members={metrics.memberShares} />
      ) : (
        <div className="rounded border border-dashed bg-gray-50 px-4 py-6 text-sm text-gray-500">
          No contribution logs are available for this scope yet.
        </div>
      )}
    </div>
  );
}

function ContributionChart({ members }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Contribution share</div>
          <div className="text-xs text-gray-500">Based on logged story points, with hours used as a fallback when points are missing.</div>
        </div>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="font-medium text-gray-800">{member.name}</div>
              <div className="text-xs text-gray-500">
                {formatPercent(member.percent)} · {formatNumber(member.storyPoints)} pts · {formatNumber(member.hoursWorked)}h
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-900" style={{ width: `${clampPercent(member.percent)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BurndownChart({ title, subtitle, points }) {
  if (!points.length) {
    return (
      <div className="rounded border bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        <div className="mt-4 rounded border border-dashed bg-gray-50 px-4 py-8 text-sm text-gray-500">
          Burndown data will appear once this group has sprint dates and planned work.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...points.flatMap((point) => [point.actualRemaining, point.idealRemaining]), 1);
  const actualPath = getPath(points, "actualRemaining", maxValue);
  const idealPath = getPath(points, "idealRemaining", maxValue);

  return (
    <div className="rounded border bg-white p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${BURNDOWN_WIDTH} ${BURNDOWN_HEIGHT}`} className="min-w-[640px]">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = CHART_PADDING + (BURNDOWN_HEIGHT - CHART_PADDING * 2) * tick;
            const value = ((1 - tick) * maxValue).toFixed(0);
            return (
              <g key={tick}>
                <line x1={CHART_PADDING} y1={y} x2={BURNDOWN_WIDTH - CHART_PADDING} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x="4" y={y + 4} fontSize="10" fill="#6b7280">
                  {value}
                </text>
              </g>
            );
          })}

          <path d={idealPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />
          <path d={actualPath} fill="none" stroke="#111827" strokeWidth="3" />

          {points.map((point, index) => {
            const x = CHART_PADDING + ((BURNDOWN_WIDTH - CHART_PADDING * 2) * index) / Math.max(points.length - 1, 1);
            const y = CHART_PADDING + (BURNDOWN_HEIGHT - CHART_PADDING * 2) - (point.actualRemaining / maxValue) * (BURNDOWN_HEIGHT - CHART_PADDING * 2);
            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r="3.5" fill="#111827" />
                {index < points.length - 1 ? null : (
                  <text x={x - 4} y={BURNDOWN_HEIGHT - 6} fontSize="10" fill="#6b7280">
                    {point.label}
                  </text>
                )}
                {index === 0 ? (
                  <text x={x - 8} y={BURNDOWN_HEIGHT - 6} fontSize="10" fill="#6b7280">
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-900" />
          Actual remaining effort
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-slate-400" />
          Ideal burndown
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeGroup } = useGroup();
  const memberId = getSession()?.memberId;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ averageDiscrepancy: "0.00", outlierCount: 0 });

  useEffect(() => {
    if (!activeGroup?.id) return;
    setLoading(true);

    async function load() {
      const [groupTasks, allMembers, sprintList, groupContributions] = await Promise.all([
        apiFetch(`/api/tasks/?group_id=${activeGroup.id}`),
        apiFetch("/api/members/"),
        apiFetch(`/api/sprints/?group_id=${activeGroup.id}`),
        apiFetch(`/api/contributions/?group_id=${activeGroup.id}`).catch(() => []),
      ]);

      const groupMembers = allMembers.filter((member) => (member.group || []).includes(activeGroup.id));
      const sprint = sprintList.find((item) => item.is_active) || null;
      const discrepancies = groupTasks.map((task) => Number(task.discrepancy_rating || 0));
      const averageDiscrepancy = discrepancies.length
        ? (discrepancies.reduce((sum, value) => sum + value, 0) / discrepancies.length).toFixed(2)
        : "0.00";
      const outlierCount = groupTasks.filter((task) => task.is_estimation_outlier).length;

      setTasks(groupTasks);
      setMembers(groupMembers);
      setSprints(sprintList);
      setActiveSprint(sprint);
      setContributions(groupContributions);
      setSummary({ averageDiscrepancy, outlierCount });
    }

    load().catch(() => {}).finally(() => setLoading(false));
  }, [activeGroup?.id]); // eslint-disable-line

  const byStatus = (status) => tasks.filter((task) => task.status === status).length;

  const sprintTasks = activeSprint ? tasks.filter((task) => task.sprint === activeSprint.id) : [];
  const sprintContributions = activeSprint ? contributions.filter((entry) => entry.sprint === activeSprint.id) : [];
  const projectMetrics = buildScopeMetrics({ tasks, contributions, members });
  const sprintMetrics = buildScopeMetrics({ tasks: sprintTasks, contributions: sprintContributions, members });
  const projectRange = getProjectRange(tasks, sprints);
  const projectBurndown = buildBurndownData(tasks, projectRange.start, projectRange.end);
  const sprintBurndown = activeSprint ? buildBurndownData(sprintTasks, activeSprint.start_date, activeSprint.end_date) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">{activeGroup ? `${activeGroup.name} — ` : ""}Overview</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className={`rounded border p-4 ${activeSprint ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            {activeSprint ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-green-800">Active Sprint</div>
                  <div className="text-lg font-bold text-green-900">{activeSprint.name}</div>
                  <div className="mt-0.5 text-xs text-green-700">
                    {activeSprint.start_date} to {activeSprint.end_date}
                  </div>
                </div>
                <div className="grid gap-4 text-right sm:grid-cols-3">
                  <div>
                    <div className="text-2xl font-bold text-green-900">{sprintTasks.length}</div>
                    <div className="text-xs text-green-700">sprint tasks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-900">{formatNumber(sprintMetrics.expectedStoryPoints)}</div>
                    <div className="text-xs text-green-700">story points</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-900">{formatPercent(sprintMetrics.completionRate)}</div>
                    <div className="text-xs text-green-700">task completion</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-800">No active sprint. Sprint-specific productivity metrics will populate when a sprint is activated.</p>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Tasks</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["BACKLOG", "TODO", "IN_PROGRESS", "DONE"].map((status) => (
                <div key={status} className="rounded border bg-white p-4">
                  <div className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
                    {status.replace("_", " ")}
                  </div>
                  <div className="text-3xl font-bold">{byStatus(status)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Productivity Metrics</h2>
            <div className="space-y-4">
              <ScopeMetricsCard
                title="Entire Project"
                subtitle="Team-wide completion, expected effort, requirements coverage, and contribution share across all logged work."
                metrics={projectMetrics}
              />
              <ScopeMetricsCard
                title="Current Sprint"
                subtitle={
                  activeSprint
                    ? `${activeSprint.name} from ${activeSprint.start_date} to ${activeSprint.end_date}.`
                    : "Activate a sprint to compare current sprint performance against the project totals."
                }
                metrics={sprintMetrics}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <BurndownChart
              title="Project Burndown"
              subtitle={
                projectRange.start && projectRange.end
                  ? `Remaining planned effort from ${formatShortDate(projectRange.start)} to ${formatShortDate(projectRange.end)}.`
                  : "Remaining planned effort across the project timeline."
              }
              points={projectBurndown}
            />
            <BurndownChart
              title="Sprint Burndown"
              subtitle={
                activeSprint
                  ? `Remaining sprint effort from ${formatShortDate(activeSprint.start_date)} to ${formatShortDate(activeSprint.end_date)}.`
                  : "Sprint burndown will appear when an active sprint exists."
              }
              points={sprintBurndown}
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Estimation Analysis</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Average discrepancy" value={summary.averageDiscrepancy} />
              <MetricCard label="Outlier tasks" value={summary.outlierCount} />
              <MetricCard label="Tasks with actuals logged" value={tasks.filter((task) => toNumber(task.actual_hours) > 0).length} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Members ({members.length})</h2>
            <div className="space-y-2">
              {members.map((member) => {
                const memberTasks = tasks.filter((task) => (task.member || []).includes(member.id));
                const done = memberTasks.filter((task) => task.status === "DONE").length;
                const projectContribution = projectMetrics.memberShares.find((entry) => entry.id === member.id);
                const hasSprintContrib = sprintContributions.some((entry) => entry.member === member.id);

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded border bg-white px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">
                        {member.name}
                        {member.id === memberId ? <span className="ml-2 text-xs text-gray-400">(you)</span> : null}
                        {member.roles === "PROJECT_MANAGER" ? <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">PM</span> : null}
                      </div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>
                        {done}/{memberTasks.length} done
                      </span>
                      <span>{memberTasks.filter((task) => task.is_estimation_outlier).length} outliers</span>
                      <span>{projectContribution ? `${formatPercent(projectContribution.percent)} contribution` : "0% contribution"}</span>
                      {activeSprint ? <span className={hasSprintContrib ? "font-medium text-green-700" : "text-gray-400"}>{hasSprintContrib ? "logged this sprint" : "no sprint log"}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
