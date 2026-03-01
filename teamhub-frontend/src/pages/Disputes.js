import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getSession, getCachedUser } from "../lib/auth";

const STATUS_LABELS = {
  OPEN: { label: "Open", cls: "bg-yellow-100 text-yellow-800" },
  UNDER_REVIEW: { label: "Under Review", cls: "bg-blue-100 text-blue-800" },
  RESOLVED: { label: "Resolved", cls: "bg-green-100 text-green-800" },
  DISMISSED: { label: "Dismissed", cls: "bg-gray-100 text-gray-600" },
};

export default function Disputes() {
  const session = getSession();
  const currentUser = getCachedUser();
  const memberId = session?.memberId;
  const isManager = currentUser?.roles === "PROJECT_MANAGER";

  // static data
  const [myGroups, setMyGroups] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [view, setView] = useState("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // cascading form state
  const [groupId, setGroupId] = useState("");
  const [accusedId, setAccusedId] = useState("");
  const [contributions, setContributions] = useState([]);
  const [contributionId, setContributionId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!memberId) return;
    async function load() {
      const member = await apiFetch(`/api/members/${memberId}/`);
      const groupIds = member.group || [];
      const allGroups = await apiFetch("/api/groups/");
      setMyGroups(allGroups.filter((g) => groupIds.includes(g.id)));
      setAllMembers(await apiFetch("/api/members/"));
      fetchDisputes();
    }
    load().catch(() => {});
  }, [memberId]); // eslint-disable-line

  function fetchDisputes() {
    if (!memberId) return;
    const params = isManager ? `?role=PROJECT_MANAGER` : `?member_id=${memberId}`;
    apiFetch(`/api/disputes/${params}`).then(setDisputes).catch(() => {});
  }

  // When group changes, reset downstream
  function onGroupChange(gid) {
    setGroupId(gid);
    setAccusedId("");
    setContributions([]);
    setContributionId("");
  }

  // When accused member changes, fetch their contributions for this group
  async function onAccusedChange(mid) {
    setAccusedId(mid);
    setContributions([]);
    setContributionId("");
    if (!mid || !groupId) return;
    try {
      const data = await apiFetch(`/api/contributions/?member_id=${mid}&group_id=${groupId}`);
      setContributions(data);
    } catch {
      setContributions([]);
    }
  }

  function resetForm() {
    setGroupId("");
    setAccusedId("");
    setContributions([]);
    setContributionId("");
    setDescription("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!groupId) return setError("Please select a group.");
    if (!accusedId) return setError("Please select a team member.");
    if (!contributionId) return setError("Please select a contribution log.");
    if (!description.trim()) return setError("Please enter a description.");
    if (String(accusedId) === String(memberId))
      return setError("You cannot raise a dispute against yourself.");

    const selectedContribution = contributions.find((c) => String(c.id) === String(contributionId));

    const payload = {
      raised_by: memberId,
      accused_member: accusedId,
      sprint: selectedContribution?.sprint || null,
      contribution: contributionId,
      description: description.trim(),
      tasks_affected: [],
    };

    try {
      const saved = await apiFetch("/api/disputes/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDisputes((prev) => [saved, ...prev]);
      setSuccess("Dispute submitted successfully.");
      resetForm();
      setView("list");
    } catch (err) {
      setError(err.message);
    }
  }

  // Members in the selected group, excluding self
  const groupMembers = allMembers.filter(
    (m) => String(m.id) !== String(memberId) && m.group.includes(Number(groupId))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disputes</h1>
          <p className="text-gray-600">
            {isManager
              ? "View all contribution disputes across the team."
              : "Raise or view concerns about a team member's contributions."}
          </p>
        </div>
        {view === "list" ? (
          <button
            onClick={() => { resetForm(); setView("new"); }}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            + New Dispute
          </button>
        ) : (
          <button
            onClick={() => setView("list")}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      {view === "new" && (
        <form onSubmit={handleSubmit} className="rounded border bg-white p-5 space-y-4 max-w-2xl">
          <h2 className="text-lg font-semibold">Raise a Dispute</h2>

          {error && (
            <div className="rounded bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded bg-green-50 border border-green-300 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Step 1: Group */}
          <div>
            <label className="text-sm font-medium">Group *</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={groupId}
              onChange={(e) => onGroupChange(e.target.value)}
            >
              <option value="">— Select group —</option>
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Member from that group */}
          <div>
            <label className="text-sm font-medium">Team member in question *</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={accusedId}
              onChange={(e) => onAccusedChange(e.target.value)}
              disabled={!groupId}
            >
              <option value="">— Select member —</option>
              {groupMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.roles === "PROJECT_MANAGER" ? "PM" : "Member"})
                </option>
              ))}
            </select>
            {groupId && groupMembers.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">No other members in this group.</p>
            )}
          </div>

          {/* Step 3: Their contribution log */}
          <div>
            <label className="text-sm font-medium">Contribution log *</label>
            {accusedId && contributions.length === 0 ? (
              <p className="mt-1 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                This member has no contribution logs for this group.
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={contributionId}
                onChange={(e) => setContributionId(e.target.value)}
                disabled={!accusedId}
              >
                <option value="">— Select contribution —</option>
                {contributions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.sprint_name} — {c.story_points} pts, {c.hours_worked}h
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Contribution preview */}
          {contributionId && (() => {
            const c = contributions.find((x) => String(x.id) === String(contributionId));
            return c ? (
              <div className="rounded bg-gray-50 border px-3 py-2 text-sm space-y-1">
                <div className="font-medium text-gray-700">Contribution summary</div>
                <div className="text-gray-600">{c.description || <em>No description provided.</em>}</div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Story pts: <strong>{c.story_points}</strong></span>
                  <span>Hours: <strong>{c.hours_worked}</strong></span>
                  <span>Tasks: <strong>{c.tasks_handled.length}</strong></span>
                </div>
              </div>
            ) : null;
          })()}

          <div>
            <label className="text-sm font-medium">Description *</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              rows={5}
              placeholder="Describe the concern in detail — what was the issue and why is it a problem?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Submit Dispute
          </button>
        </form>
      )}

      {view === "list" && (
        <div className="space-y-3">
          {disputes.length === 0 ? (
            <div className="text-sm text-gray-500">No disputes found.</div>
          ) : (
            disputes.map((d) => {
              const badge = STATUS_LABELS[d.status] || STATUS_LABELS.OPEN;
              const isMine = String(d.raised_by) === String(memberId);
              return (
                <div key={d.id} className="rounded border bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">
                      {isMine ? "You" : d.raised_by_name} raised a dispute against{" "}
                      <span className="text-red-700">{d.accused_member_name}</span>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {d.contribution_summary && (
                    <div className="text-xs text-gray-500">
                      Contribution: {d.contribution_summary.sprint_name} —{" "}
                      {d.contribution_summary.story_points} pts, {d.contribution_summary.hours_worked}h
                    </div>
                  )}

                  {d.sprint_name && (
                    <div className="text-xs text-gray-500">Sprint: {d.sprint_name}</div>
                  )}

                  <p className="text-sm text-gray-700">{d.description}</p>

                  <div className="text-xs text-gray-400">
                    Submitted {new Date(d.created_at).toLocaleString()}
                  </div>

                  {isManager && d.status === "OPEN" && (
                    <div className="flex gap-2 pt-1">
                      <StatusButton disputeId={d.id} newStatus="UNDER_REVIEW" label="Mark Under Review" setDisputes={setDisputes} />
                      <StatusButton disputeId={d.id} newStatus="RESOLVED" label="Resolve" setDisputes={setDisputes} />
                      <StatusButton disputeId={d.id} newStatus="DISMISSED" label="Dismiss" setDisputes={setDisputes} />
                    </div>
                  )}
                  {isManager && d.status === "UNDER_REVIEW" && (
                    <div className="flex gap-2 pt-1">
                      <StatusButton disputeId={d.id} newStatus="RESOLVED" label="Resolve" setDisputes={setDisputes} />
                      <StatusButton disputeId={d.id} newStatus="DISMISSED" label="Dismiss" setDisputes={setDisputes} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function StatusButton({ disputeId, newStatus, label, setDisputes }) {
  async function handleClick() {
    try {
      const updated = await apiFetch(`/api/disputes/${disputeId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setDisputes((prev) => prev.map((d) => (d.id === disputeId ? updated : d)));
    } catch {
      // silently fail
    }
  }

  const colors = {
    UNDER_REVIEW: "border-blue-300 text-blue-700 hover:bg-blue-50",
    RESOLVED: "border-green-300 text-green-700 hover:bg-green-50",
    DISMISSED: "border-gray-300 text-gray-600 hover:bg-gray-50",
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded border px-3 py-1 text-xs font-medium ${colors[newStatus] || ""}`}
    >
      {label}
    </button>
  );
}
