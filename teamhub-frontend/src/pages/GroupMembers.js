import React, { useEffect, useMemo, useState } from "react";
import { getCurrentUser, refreshCurrentUser } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

const API = process.env.REACT_APP_API_URL

function roleLabel(role) {
  return role === "PROJECT_MANAGER" ? "Project Manager" : "Team Member";
}

function initials(member) {
  const first = member.first_name?.[0] || member.name?.[0] || "U";
  const last = member.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase();
}

export default function GroupMembers() {
  const { groups, activeGroup, refreshGroups, setActiveGroupId } = useGroup();
  const [user, setUser] = useState(() => getCurrentUser());
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaveState, setLeaveState] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    (async () => {
      try {
        const current = await refreshCurrentUser();
        if (current) setUser(current);
      } catch {
      }
    })();
  }, []);

  useEffect(() => {
    async function loadMembers() {
      if (!activeGroup?.id) {
        setMembers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/members/?group_id=${activeGroup.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load group members.");
        setMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Failed to load group members.");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, [activeGroup?.id]);

  const groupedStats = useMemo(() => {
    const pmCount = members.filter((m) => m.roles === "PROJECT_MANAGER").length;
    return {
      total: members.length,
      pmCount,
      memberCount: members.length - pmCount,
    };
  }, [members]);

  async function handleLeaveGroup() {
    if (!user?.id || !activeGroup?.id) return;

    const confirmed = window.confirm(`Are you sure you want to leave ${activeGroup.name}?`);
    if (!confirmed) return;

    setLeaveState({ loading: true, error: "", success: "" });
    try {
      const res = await fetch(`${API}/groups/leave/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: user.id, group_id: activeGroup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave group.");

      const updatedUser = await refreshCurrentUser();
      if (updatedUser) setUser(updatedUser);

      const previousGroupId = activeGroup.id;
      await refreshGroups();

      const remainingGroups = groups.filter((g) => g.id !== previousGroupId);
      if (remainingGroups.length > 0) {
        setActiveGroupId(remainingGroups[0].id);
      } else {
        setActiveGroupId(null);
      }

      setMembers([]);
      setLeaveState({
        loading: false,
        error: "",
        success: data.message || "You left the group successfully.",
      });
    } catch (e) {
      setLeaveState({
        loading: false,
        error: e.message || "Failed to leave group.",
        success: "",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Group Members</h1>
          <p className="text-gray-600">
            View the people in your current team, along with their role, photo, and profile details.
          </p>
        </div>

        {activeGroup ? (
          <button
            type="button"
            onClick={handleLeaveGroup}
            disabled={leaveState.loading}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {leaveState.loading ? "Leaving..." : "Leave Group"}
          </button>
        ) : null}
      </div>

      {leaveState.error ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {leaveState.error}
        </div>
      ) : null}

      {leaveState.success ? (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          {leaveState.success}
        </div>
      ) : null}

      {!activeGroup ? (
        <div className="rounded border bg-white p-5 text-sm text-gray-600">
          You are not currently in a group. Join or create a group from the Groups page.
        </div>
      ) : (
        <>
          <div className="rounded border bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-2xl font-semibold">{activeGroup.name}</div>
                <div className="mt-1 text-sm text-gray-500">
                  Group code: <span className="font-mono">{activeGroup.group_code}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-xl font-bold">{groupedStats.total}</div>
                </div>
                <div className="rounded bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">Managers</div>
                  <div className="text-xl font-bold">{groupedStats.pmCount}</div>
                </div>
                <div className="rounded bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">Members</div>
                  <div className="text-xl font-bold">{groupedStats.memberCount}</div>
                </div>
              </div>
            </div>
          </div>

          {loading ? <div className="text-sm text-gray-600">Loading group members...</div> : null}

          {error ? (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && members.length === 0 ? (
            <div className="rounded border bg-white p-5 text-sm text-gray-500">
              This group has no members yet.
            </div>
          ) : null}

          {!loading && !error && members.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => {
                const addressParts = [
                  member.address?.city,
                  member.address?.state,
                  member.address?.country,
                ].filter(Boolean);

                return (
                  <div key={member.id} className="rounded border bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gray-50">
                        {member.photo ? (
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-gray-600">{initials(member)}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="break-words text-lg font-semibold">{member.name}</div>
                        <div className="mt-1 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {roleLabel(member.roles)}
                        </div>
                        <div className="mt-2 break-all text-sm text-gray-600">{member.email}</div>
                        {member.university ? (
                          <div className="mt-1 text-sm text-gray-500">{member.university}</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      {member.first_name || member.last_name ? (
                        <div>
                          <span className="font-medium text-gray-700">Full name:</span>{" "}
                          <span className="text-gray-600">
                            {[member.first_name, member.last_name].filter(Boolean).join(" ")}
                          </span>
                        </div>
                      ) : null}

                      {member.username ? (
                        <div>
                          <span className="font-medium text-gray-700">Username:</span>{" "}
                          <span className="text-gray-600">{member.username}</span>
                        </div>
                      ) : null}

                      {addressParts.length > 0 ? (
                        <div>
                          <span className="font-medium text-gray-700">Location:</span>{" "}
                          <span className="text-gray-600">{addressParts.join(", ")}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {member.github_linked ? (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            GitHub linked
                          </span>
                        ) : null}
                        {member.google_linked ? (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                            Google linked
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
