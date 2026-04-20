import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, refreshCurrentUser, logout } from "../lib/auth";
import { useGroup } from "../lib/GroupContext";

function navClass({ isActive }) {
  return [
    "block rounded px-3 py-2 text-sm",
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
  ].join(" ");
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getCurrentUser());
  const { groups, activeGroup, setActiveGroupId } = useGroup();
  const [showGithubBanner, setShowGithubBanner] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [location.pathname]);

  useEffect(() => {
    (async () => {
      try {
        const u = await refreshCurrentUser();
        if (u) setUser(u);
      } catch {
      }
    })();
  }, []);

  function onLogout() {
    logout();
    navigate("/login");
  }

  function handleLogsClick(e) {
    if (!user?.github_linked) {
      e.preventDefault();
      setShowGithubBanner(true);
      setTimeout(() => setShowGithubBanner(false), 5000);
    }
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-white p-4">
        <div className="mb-4">
          <div className="text-lg font-bold">TeamHub</div>
          <div className="text-xs text-gray-500">EECS 582 Project</div>
        </div>

        <div className="mb-4 rounded border p-3">
          <div className="text-sm font-semibold">{user?.name || "User"}</div>
          <div className="text-xs text-gray-500">{user?.email || ""}</div>
          {user?.university ? <div className="text-xs text-gray-500">{user.university}</div> : null}
        </div>

        <nav className="space-y-1">
          <div className="rounded-lg bg-gray-100 p-2 space-y-0.5">
            {groups.length > 0 && (
              <select
                className="mb-1 w-full rounded border bg-white px-2 py-1.5 text-sm font-medium"
                value={activeGroup?.id || ""}
                onChange={(e) => setActiveGroupId(Number(e.target.value))}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            <NavLink to="/" end className={navClass}>Dashboard</NavLink>
            <NavLink to="/tasks" className={navClass}>Tasks</NavLink>
            <NavLink to="/sprints" className={navClass}>Sprints</NavLink>
            <NavLink to="/group-members" className={navClass}>Group Members</NavLink>
            <NavLink
              to="/logs"
              className={({ isActive }) => navClass({ isActive })}
              onClick={handleLogsClick}
            >
              <span className="flex items-center gap-1">
                Contribution Logs
                {!user?.github_linked && (
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 text-xs bg-yellow-400 text-yellow-900 rounded-full"
                    title="Link GitHub to access"
                  >
                    !
                  </span>
                )}
              </span>
            </NavLink>
            <NavLink to="/disputes" className={navClass}>Disputes</NavLink>
            {user?.roles === "PROJECT_MANAGER" && (
              <NavLink to="/instructor-dashboard" className={navClass}>Instructor Dashboard</NavLink>
            )}
          </div>

          <div className="space-y-0.5 pt-1">
            <NavLink to="/groups" className={navClass}>Groups</NavLink>
            <NavLink to="/audit" className={navClass}>Audit Trail</NavLink>
            <NavLink to="/profile" className={navClass}>Profile</NavLink>
            <NavLink to="/settings" className={navClass}>Settings</NavLink>
          </div>
        </nav>

        <button
          onClick={onLogout}
          className="mt-6 w-full rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6">
        {showGithubBanner && (
          <div className="mb-4 rounded bg-yellow-50 border border-yellow-300 px-4 py-3 text-sm text-yellow-800 flex items-center justify-between">
            <span>
              Please link your GitHub account in{" "}
              <NavLink to="/profile" className="text-blue-600 hover:underline">
                Profile → Linked Accounts
              </NavLink>{" "}
              to use this feature.
            </span>
            <button
              onClick={() => setShowGithubBanner(false)}
              className="text-yellow-800 hover:text-yellow-900 font-bold"
            >
              ×
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
