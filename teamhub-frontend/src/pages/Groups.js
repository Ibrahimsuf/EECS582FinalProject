import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../lib/auth";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default function Groups() {
  const user = getCurrentUser();
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [assignTo, setAssignTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [memberRes, groupRes, taskRes] = await Promise.all([
      fetch(`${API}/members/${user.id}/`),
      fetch(`${API}/groups/`),
      fetch(`${API}/tasks/`),
    ]);

    const memberData = await memberRes.json();
    const allGroups = await groupRes.json();
    const allTasks = await taskRes.json();

    const myGroupIds = memberData.group || [];
    setGroups(allGroups.filter((g) => myGroupIds.includes(g.id)));

    const mRes = await fetch(`${API}/members/`);
    const allMembers = await mRes.json();
    setMembers(allMembers);

    setTasks(allTasks);
  }

  function groupMembers(groupId) {
    return members.filter((m) => m.group.includes(groupId));
  }

  function groupTasks(groupId) {
    const gMembers = groupMembers(groupId).map((m) => m.id);
    return tasks.filter((t) =>
      t.member.some((memberId) => gMembers.includes(memberId))
    );
  }

  async function createTask(groupId) {
    if (!newTaskTitle.trim()) return;

    const res = await fetch(`${API}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle,
        status: "TODO",
        member: assignTo ? [parseInt(assignTo)] : [],
      }),
    });

    if (res.ok) {
      setNewTaskTitle("");
      setAssignTo("");
      fetchData();
    }
  }

  async function updateStatus(taskId, newStatus) {
    const res = await fetch(`${API}/tasks/${taskId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        member_id: user.id,
      }),
    });

    if (!res.ok) {
      alert("You are not assigned to this task.");
      return;
    }

    fetchData();
  }

  const statusOptions = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Groups</h1>

      {groups.map((group) => (
        <div key={group.id} className="border rounded bg-white">
          <button
            className="w-full text-left px-4 py-3 font-semibold"
            onClick={() =>
              setExpandedGroup(expandedGroup === group.id ? null : group.id)
            }
          >
            {group.name} (Code: {group.group_code})
          </button>

          {expandedGroup === group.id && (
            <div className="px-4 py-4 space-y-6 border-t">

              {/* MEMBERS */}
              <div>
                <h2 className="font-semibold mb-2">Members</h2>
                <div className="space-y-1 text-sm">
                  {groupMembers(group.id).map((m) => (
                    <div key={m.id}>
                      {m.name} ({m.email})
                    </div>
                  ))}
                </div>
              </div>

              {/* CREATE TASK */}
              <div>
                <h2 className="font-semibold mb-2">Create Task</h2>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <select
                    className="border rounded px-2 py-1"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Assign</option>
                    {groupMembers(group.id).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => createTask(group.id)}
                    className="bg-black text-white px-3 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* TASK LIST */}
              <div>
                <h2 className="font-semibold mb-2">Tasks</h2>
                <div className="space-y-2">
                  {groupTasks(group.id).map((task) => (
                    <div
                      key={task.id}
                      className="flex justify-between items-center border rounded px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-500">
                          Assigned to:{" "}
                          {task.member
                            .map((id) => members.find((m) => m.id === id)?.name)
                            .join(", ") || "Unassigned"}
                        </div>
                      </div>

                      {task.member.includes(user.id) ? (
                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Only assigned member can update
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      ))}
    </div>
  );
}