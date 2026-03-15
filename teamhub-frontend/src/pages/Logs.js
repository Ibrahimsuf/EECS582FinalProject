import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getSession, getCachedUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

export default function Logs() {
  const session = getSession();
  const currentUser = getCachedUser();
  const memberId = session?.memberId;
  const { activeGroup } = useGroup();

  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // form state
  const [sprintId, setSprintId] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!memberId || !activeGroup?.id) return;

    async function load() {
      // Fetch all sprints for the active group (need all to filter contributions)
      // and active sprints separately for the form dropdown
      const [allGroupSprints, allTasks, allMembers, myContributions] = await Promise.all([
        apiFetch(`/api/sprints/?group_id=${activeGroup.id}`).catch(() => []),
        apiFetch("/api/tasks/"),
        apiFetch("/api/members/"),
        apiFetch(`/api/contributions/?member_id=${memberId}`),
      ]);

      const activeSprints = allGroupSprints.filter((s) => s.is_active);
      setSprints(activeSprints);

      // Auto-select if there is exactly one active sprint
      if (activeSprints.length === 1) {
        setSprintId(String(activeSprints[0].id));
      } else {
        setSprintId("");
      }

      // Scope tasks to group members
      const groupMemberIds = new Set(
        allMembers.filter((m) => m.group.includes(activeGroup.id)).map((m) => m.id)
      );
      setTasks(allTasks.filter((t) => t.member.some((mid) => groupMemberIds.has(mid))));

      // Filter contributions to only those belonging to this group's sprints
      const groupSprintIds = new Set(allGroupSprints.map((s) => s.id));
      setContributions(myContributions.filter((c) => groupSprintIds.has(c.sprint)));
    }

    load().catch(() => {});
  }, [memberId, activeGroup?.id]); // eslint-disable-line

  // Pre-populate form if an entry already exists for the selected sprint
  useEffect(() => {
    if (!sprintId) {
      resetForm(false);
      return;
    }
    const existing = contributions.find((c) => String(c.sprint) === String(sprintId));
    if (existing) {
      setEditing(existing.id);
      setDescription(existing.description);
      setStoryPoints(String(existing.story_points));
      setHoursWorked(String(existing.hours_worked));
      setSelectedTasks(existing.tasks_handled.map(String));
    } else {
      resetForm(false);
    }
  }, [sprintId]); // eslint-disable-line

  function resetForm(clearSprint = true) {
    if (clearSprint) setSprintId("");
    setDescription("");
    setStoryPoints("");
    setHoursWorked("");
    setSelectedTasks([]);
    setEditing(null);
  }

  function toggleTask(id) {
    setSelectedTasks((prev) =>
      prev.includes(String(id))
        ? prev.filter((t) => t !== String(id))
        : [...prev, String(id)]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!sprintId) {
      setError("Please select a sprint.");
      return;
    }

    const payload = {
      member: memberId,
      sprint: sprintId,
      description,
      story_points: Number(storyPoints) || 0,
      hours_worked: Number(hoursWorked) || 0,
      tasks_handled: selectedTasks.map(Number),
    };

    try {
      let saved;
      if (editing) {
        saved = await apiFetch(`/api/contributions/${editing}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setContributions((prev) => prev.map((c) => (c.id === editing ? saved : c)));
        setSuccess("Contribution updated.");
      } else {
        saved = await apiFetch("/api/contributions/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setContributions((prev) => [saved, ...prev]);
        setSuccess("Contribution submitted.");
      }
      setEditing(saved.id);
    } catch (err) {
      setError(err.message);
    }
  }

  const sprintTasks = sprintId
    ? tasks.filter((t) => String(t.sprint) === String(sprintId))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sprint Contributions</h1>
        <p className="text-gray-600">
          {activeGroup ? `${activeGroup.name} — ` : ""}
          Record your personal contribution for a sprint.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded border bg-white p-5 space-y-4 max-w-2xl">
        <h2 className="text-lg font-semibold">
          {editing ? "Edit Contribution" : "New Contribution"}
        </h2>

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

        <div>
          <label className="text-sm font-medium">Active Sprint *</label>
          {sprints.length === 0 ? (
            <div className="mt-1 rounded bg-yellow-50 border border-yellow-300 px-3 py-2 text-sm text-yellow-800">
              No active sprint in {activeGroup?.name || "this group"}. Ask your Project Manager to activate one in the Sprints tab.
            </div>
          ) : (
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
            >
              <option value="">— Select sprint —</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            rows={4}
            placeholder="What did you accomplish this sprint?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Story Points</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g., 8"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Hours Worked</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g., 12.5"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
            />
          </div>
        </div>

        {sprintTasks.length > 0 && (
          <div>
            <label className="text-sm font-medium">Tasks Handled</label>
            <div className="mt-1 max-h-40 overflow-y-auto rounded border p-2 space-y-1">
              {sprintTasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(String(t.id))}
                    onChange={() => toggleTask(t.id)}
                  />
                  {t.title}
                  <span className="text-xs text-gray-400">({t.status})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            {editing ? "Update" : "Submit"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => resetForm(true)}
              className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              New Entry
            </button>
          )}
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold mb-2">My Contributions</h2>
        {contributions.length === 0 ? (
          <div className="text-sm text-gray-500">No contributions submitted yet.</div>
        ) : (
          <div className="space-y-3">
            {contributions.map((c) => (
              <div key={c.id} className="rounded border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.sprint_name}</div>
                  <button
                    onClick={() => setSprintId(String(c.sprint))}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {c.description || <em className="text-gray-400">No description</em>}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Story pts: <strong>{c.story_points}</strong></span>
                  <span>Hours: <strong>{c.hours_worked}</strong></span>
                  <span>Tasks: <strong>{c.tasks_handled.length}</strong></span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Submitted {new Date(c.submitted_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
