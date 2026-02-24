import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../lib/auth";
import { addAuditEvent } from "../lib/audit";

function navClass({ isActive }) {
  return [
    "block rounded px-3 py-2 text-sm",
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
  ].join(" ");
}

function initials(user) {
  const fn = user?.first_name?.[0] || user?.name?.[0] || "U";
  const ln = user?.last_name?.[0] || "";
  return (fn + ln).toUpperCase();
}

export default function Layout() {
  const user = getCurrentUser();
  const navigate = useNavigate();

  function onLogout() {
    addAuditEvent(`User logged out (${user?.email || "unknown"})`);
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-white p-4">
        <div className="mb-6">
          <div className="text-lg font-bold">TeamHub</div>
          <div className="text-xs text-gray-500">EECS 582 Project</div>
        </div>

        <div className="mb-4 rounded border p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center">
            {user?.photo ? (
              <img src={user.photo} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gray-600">{initials(user)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name || "User"}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink to="/" end className={navClass}>Dashboard</NavLink>
          <NavLink to="/tasks" className={navClass}>Tasks</NavLink>
          <NavLink to="/logs" className={navClass}>Contribution Logs</NavLink>
          <NavLink to="/audit" className={navClass}>Audit Trail</NavLink>
          <NavLink to="/profile" className={navClass}>Profile</NavLink>
          <NavLink to="/groups" className={navClass}>Group Management</NavLink>
          <NavLink to="/settings" className={navClass}>Settings</NavLink>
        </nav>

        <button
          onClick={onLogout}
          className="mt-6 w-full rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}