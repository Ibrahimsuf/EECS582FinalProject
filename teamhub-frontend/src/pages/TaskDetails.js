import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL
const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

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


export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { activeGroup } = useGroup();

  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tags, setTags] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Tag creation state
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    status: "TODO",
    sprint: "",
    member: [],
    estimated_hours: "",
    actual_hours: "",
    tag_ids: [],
  });

  const isManager = user?.roles === "PROJECT_MANAGER";

  const isAssigned = useMemo(() => {
    return form.member.some((mId) => String(mId) === String(user?.id));
  }, [form.member, user?.id]);

  useEffect(() => {
    if (!id || !user?.id) return;
    fetchData();
  }, [id, user?.id, activeGroup?.id]); // eslint-disable-line

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [taskRes, memberRes, sprintRes, analysisRes, commentRes, tagRes] = await Promise.all([
        fetch(`${API}/tasks/${id}/`),
        fetch(`${API}/members/`),
        activeGroup?.id
          ? fetch(`${API}/sprints/?group_id=${activeGroup.id}`)
          : Promise.resolve({ json: async () => [] }),
        fetch(`${API}/tasks/${id}/analysis/`),
        fetch(`${API}/task-comments/?task_id=${id}`),
        activeGroup?.id ? fetch(`${API}/tags/?group_id=${activeGroup.id}`) : Promise.resolve({ json: async () => [] }),
      ]);

      const taskData = await taskRes.json();
      if (!taskRes.ok) throw new Error(taskData.error || "Failed to load task.");

      const allMembers = await memberRes.json();
      const groupMembers = activeGroup?.id
        ? allMembers.filter((m) => (m.group || []).includes(activeGroup.id))
        : allMembers;

      const sprintData = await sprintRes.json();
      const analysisData = await analysisRes.json();
      const tagData = await tagRes.json();
      const commentData = await commentRes.json();

      setTask(taskData);
      setMembers(groupMembers);
      setSprints(sprintData);
      setAnalysis(analysisData);
      setTags(tagData);

      const tagIds = (taskData.tags || []).map((tag) => tag.id);
      setComments(Array.isArray(commentData) ? commentData : []);

      setForm({
        title: taskData.title || "",
        description: taskData.description || "",
        requirements: taskData.requirements || "",
        status: taskData.status || "TODO",
        sprint: taskData.sprint || "",
        member: taskData.member || [],
        estimated_hours: taskData.estimated_hours || "0.00",
        actual_hours: taskData.actual_hours || "0.00",
        tag_ids: tagIds,
      });
    } catch (err) {
      setError(err.message || "Failed to load task.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMember(memberId) {
    setForm((prev) => ({
      ...prev,
      member: prev.member.includes(memberId)
        ? prev.member.filter((id) => id !== memberId)
        : [...prev.member, memberId],
    }));
  }

  function toggleTag(tagId) {
    setForm((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
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
      // Automatically select the new tag
      setForm((prev) => ({
        ...prev,
        tag_ids: [...prev.tag_ids, data.id],
      }));
    } catch (err) {
      setError(err.message || "Failed to create tag.");
    }
  }


  async function saveTask() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = isManager
        ? { ...form, actor_id: user.id, sprint: form.sprint || null, tag_ids: form.tag_ids }
        : { status: form.status, actor_id: user.id };

      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save task.");

      setSuccess("Task page updated.");
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  async function addComment(e) {
    e.preventDefault();

    const text = newComment.trim();
    if (!text) return;

    setCommentSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API}/task-comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: parseInt(id, 10),
          author: user.id,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add comment.");

      setComments((prev) => [...prev, data]);
      setNewComment("");
      setSuccess("Comment added.");
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    } finally {
      setCommentSaving(false);
    }
  }

  async function deleteTask() {
    if (!isManager) return;

    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task.");
      }

      navigate("/tasks");
    } catch (err) {
      setError(err.message || "Failed to delete task.");
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading task page…</div>;

  if (error && !task) {
    return (
      <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!task) return <div className="text-sm text-gray-500">Task not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">
            <Link to="/tasks" className="hover:underline">Tasks</Link> / Task Page
          </div>

          <h1 className="text-3xl font-bold">{task.title}</h1>

          <p className="text-sm text-gray-500 mt-1">
            Created by {task.created_by_name || "Unknown"}
            {task.updated_at ? ` • Last updated ${new Date(task.updated_at).toLocaleString()}` : ""}
          </p>
        </div>

        {isManager ? (
          <button
            onClick={deleteTask}
            className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete task
          </button>
        ) : null}
      </div>

      <div className="rounded border bg-blue-50 border-blue-200 p-4 text-sm text-blue-900">
        Project managers can edit all task fields. Team members can view all details,
        update assigned task status, and leave comments.
      </div>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded border bg-white p-4 space-y-3 lg:col-span-2">
          <div>
            <label className="text-sm font-medium">Task title</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.title}
              disabled={!isManager}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">What is this task?</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 min-h-[120px]"
              value={form.description}
              disabled={!isManager}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Included requirements</label>
            <textarea
              className="mt-1 w-full rounded border px-3 py-2 min-h-[160px]"
              value={form.requirements}
              disabled={!isManager}
              onChange={(e) => updateField("requirements", e.target.value)}
            />
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
                  if (isManager) toggleTag(tag.id);
                }}
                disabled={!isManager}
                className={`rounded px-3 py-1 text-xs font-medium transition ${form.tag_ids.includes(tag.id)
                    ? `${getTagColor(tag.id)} ring-2 ring-offset-1`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } ${!isManager ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
              >
                {tag.name}
              </button>
            ))}
          </div>

          {isManager && (
            <>
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
            </>
          )}
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.status}
              disabled={!isManager && !isAssigned}
              onChange={(e) => updateField("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Sprint</label>
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={form.sprint || ""}
              disabled={!isManager}
              onChange={(e) => updateField("sprint", e.target.value ? parseInt(e.target.value, 10) : "")}
            >
              <option value="">No sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Estimated hours</label>
              <input
                type="number"
                min="0"
                step="0.25"
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.estimated_hours}
                disabled={!isManager}
                onChange={(e) => updateField("estimated_hours", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Actual hours</label>
              <input
                type="number"
                min="0"
                step="0.25"
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.actual_hours}
                disabled={!isManager}
                onChange={(e) => updateField("actual_hours", e.target.value)}
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1 pt-2 border-t">
            <div><span className="font-medium">AI estimate:</span> {task.ai_estimated_hours || 0}h</div>
            <div><span className="font-medium">Discrepancy rating:</span> {task.discrepancy_rating || 0}</div>
            <div>
              <span className="font-medium">Outlier:</span>{" "}
              {task.is_estimation_outlier ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Yes</span>
              ) : (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">No</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3 lg:col-span-2">
          <div className="text-sm font-medium">Assigned members</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.member.includes(m.id)}
                  disabled={!isManager}
                  onChange={() => toggleMember(m.id)}
                />
                <span>{m.name}</span>
                <span className="text-xs text-gray-500">
                  ({m.roles === "PROJECT_MANAGER" ? "PM" : "Member"})
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-700">
            Estimation vs. Actual Time Analysis
          </div>

          <div className="text-sm text-gray-600 leading-6">
            {analysis?.estimation_analysis || task.estimation_analysis || "No analysis available yet."}
          </div>

          {analysis ? (
            <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
              <div>Refined estimate: {analysis.ai_estimated_hours}h</div>
              <div>Estimated input: {analysis.estimated_hours}h</div>
              <div>Actual input: {analysis.actual_hours}h</div>
              <div>Discrepancy rating: {analysis.discrepancy_rating}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <button
          onClick={saveTask}
          disabled={saving || (!isManager && !isAssigned)}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="rounded border bg-white p-4 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Task comments</h2>
          <p className="text-sm text-gray-500">
            Users can leave notes, clarifications, blockers, or updates tied directly to this task.
          </p>
        </div>

        <form onSubmit={addComment} className="space-y-2">
          <textarea
            className="w-full rounded border px-3 py-2 min-h-[90px]"
            placeholder="Write a comment about this task..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />

          <button
            type="submit"
            disabled={commentSaving || !newComment.trim()}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {commentSaving ? "Posting..." : "Post comment"}
          </button>
        </form>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-sm text-gray-500">No comments yet.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded border bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {comment.author_name || "Unknown user"}
                  </div>

                  <div className="text-xs text-gray-500">
                    {comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}
                  </div>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  {comment.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
