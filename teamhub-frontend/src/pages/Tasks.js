import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

const STATUS_STYLES = {
  BACKLOG: "bg-gray-100 text-gray-700",
  TODO: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
};

const TAG_COLORS = [
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
];

const getTagColor = (tagId) => {
  return TAG_COLORS[tagId % TAG_COLORS.length];
};

export default function Tasks() {
  const user = getCurrentUser();
  const { activeGroup } = useGroup();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [newStatus, setNewStatus] = useState("TODO");
  const [assignTo, setAssignTo] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterMember, setFilterMember] = useState("me");
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user?.id || !activeGroup?.id) return;
    fetchData();
  }, [activeGroup?.id, location.pathname]); // eslint-disable-line

  async function fetchData() {
    setError("");
    setLoading(true);
    try {
      const [taskRes, memberRes, sprintRes, tagRes] = await Promise.all([
        fetch(`${API}/tasks/?group_id=${activeGroup.id}`),
        fetch(`${API}/members/`),
        fetch(`${API}/sprints/?group_id=${activeGroup.id}`),
        fetch(`${API}/tags/?group_id=${activeGroup.id}`),
      ]);

      const allTasks = await taskRes.json();
      const allMembers = await memberRes.json();
      const groupMembers = allMembers.filter((m) => (m.group || []).includes(activeGroup.id));
      const sprintData = await sprintRes.json();
      const tagData = await tagRes.json();

      setTasks(allTasks);
      setMembers(groupMembers);
      setSprints(sprintData);
      setTags(tagData);
    } catch (err) {
      setError(err.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;

    try {
      const body = {
        name: newTagName.trim(),
        group: activeGroup.id,
        user_id: user.id,
      };

      const res = await fetch(`${API}/tags/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tag.");

      setTags([...tags, data]);
      setNewTagName("");
      setShowTagInput(false);
      setSelectedTags([...selectedTags, data.id]);
    } catch (err) {
      setError(err.message || "Failed to create tag.");
    }
  }


  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;

    const memberIds = assignTo ? [parseInt(assignTo, 10)] : (user?.id ? [user.id] : []);

    try {
      const body = {
        actor_id: user.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements.trim(),
        status: newStatus,
        member: memberIds,
        estimated_hours: estimatedHours || 0,
        actual_hours: actualHours || 0,
        // tags: tags.map(t => t.id),
        tag_ids: selectedTags,
      };

      console.log("Request body:", body); // 🔍 Debug log

      if (sprintId) body.sprint = parseInt(sprintId, 10);

      const res = await fetch(`${API}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task.");

      setTitle("");
      setDescription("");
      setRequirements("");
      setEstimatedHours("");
      setActualHours("");
      setNewStatus("TODO");
      setAssignTo("");
      setSprintId("");
      setShowForm(false);
      setSelectedTags([]);
      // setTags([]);
      setSelectedTags([]);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create task.");
    }
  }

  async function updateStatus(id, value) {
    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value, actor_id: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cannot update status.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to update task.");
    }
  }

  async function deleteTask(id) {
    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: user?.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task.");
      }
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete task.");
    }
  }

  const displayTasks = tasks
    .filter((t) => {
      if (filterMember === "me") return (t.member || []).includes(user?.id);
      if (filterMember) return (t.member || []).includes(parseInt(filterMember, 10));
      return true;
    })
    .filter((t) => {
      if (filterTag) {
        return (t.tags || []).some((tag) => tag.id === parseInt(filterTag, 10));
      }
      return true;
    })
    .filter((t) => {
      const haystack = `${t.title} ${t.description || ""} ${t.requirements || ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });

  const doneCount = displayTasks.filter((t) => t.status === "DONE").length;

  if (!user) {
    return <div className="text-sm text-gray-500">Loading user session…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-gray-600 mt-1">
            {activeGroup ? `${activeGroup.name} — ` : ""}
            {doneCount}/{displayTasks.length} done
          </p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          {showForm ? "Close form" : "+ Add task"}
        </button>
      </div>

      {error ? <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {showForm && (
        <form onSubmit={addTask} className="rounded border bg-white p-4 space-y-3 max-w-4xl">
          <h2 className="text-lg font-semibold">Create new task</h2>

          <div>
            <label className="text-sm font-medium">Task title</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Task description</label>
            <textarea className="mt-1 w-full rounded border px-3 py-2 min-h-[90px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium">Requirements</label>
            <textarea className="mt-1 w-full rounded border px-3 py-2 min-h-[120px]" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select className="mt-1 w-full rounded border px-3 py-2" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Assign to</label>
              <select className="mt-1 w-full rounded border px-3 py-2" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Me ({user.name})</option>
                {members.filter((m) => m.id !== user.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Sprint</label>
              <select className="mt-1 w-full rounded border px-3 py-2" value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
                <option value="">No sprint</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Estimated hours</label>
              <input type="number" min="0" step="0.25" className="mt-1 w-full rounded border px-3 py-2" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium">Actual hours</label>
              <input type="number" min="0" step="0.25" className="mt-1 w-full rounded border px-3 py-2" value={actualHours} onChange={(e) => setActualHours(e.target.value)} />
            </div>
          </div>

          {/* Tags Section */}
          <div>
            <label className="text-sm font-medium block mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    );
                  }}
                  className={`rounded px-3 py-1 text-xs font-medium cursor-pointer transition ${
                    selectedTags.includes(tag.id)
                      ? `${getTagColor(tag.id)} ring-2 ring-offset-1`
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {showTagInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New tag name"
                  className="flex-1 rounded border px-3 py-2 text-sm"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={createTag}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagInput(false);
                    setNewTagName("");
                  }}
                  className="rounded bg-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTagInput(true)}
                className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50"
              >
                + Create new tag
              </button>
            )}
          </div>

          <button className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">Create task</button>
        </form>
      )}

      <div className="rounded border bg-white p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            className="rounded border px-3 py-2 text-sm"
            placeholder="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded border px-3 py-2 text-sm" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
            <option value="me">My tasks</option>
            <option value="">All members</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500">Click a task title to open the full task page.</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading tasks…</div>
      ) : (
        <div className="space-y-3">
          {displayTasks.map((task) => (
            <div key={task.id} className="rounded border bg-white p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/tasks/${task.id}`} className="text-lg font-semibold hover:underline">
                      {task.title}
                    </Link>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                      {task.status.replaceAll("_", " ")}
                    </span>
                    {task.is_estimation_outlier ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Outlier</span>
                    ) : null}
                  </div>

                  {/* Tags display */}
                  {task.tags && task.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`rounded px-2 py-0.5 text-xs font-medium ${getTagColor(tag.id)}`}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-sm text-gray-600">{task.description || "No description provided."}</p>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-4">
                    <span>Estimated: {task.estimated_hours || 0}h</span>
                    <span>Actual: {task.actual_hours || 0}h</span>
                    <span>AI estimate: {task.ai_estimated_hours || 0}h</span>
                    <span>Discrepancy: {task.discrepancy_rating || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 lg:min-w-[260px] lg:justify-end">
                  <select
                    className="rounded border px-3 py-2 text-sm"
                    value={task.status}
                    onChange={(e) => updateStatus(task.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  {user.roles === "PROJECT_MANAGER" ? (
                    <button onClick={() => deleteTask(task.id)} className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {displayTasks.length === 0 ? (
            <div className="rounded border bg-white p-8 text-center text-sm text-gray-500">No tasks found for this view.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
