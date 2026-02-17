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
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4">
        <div className="mb-6">
          <div className="text-lg font-bold">TeamHub</div>
          <div className="text-xs text-gray-500">EECS 582 Project</div>
        </div>

        <div className="mb-4 rounded border p-3">
          <div className="text-sm font-semibold">{user?.name || "User"}</div>
          <div className="text-xs text-gray-500">{user?.email}</div>
        </div>

        <nav className="space-y-1">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/tasks" className={navClass}>
            Tasks
          </NavLink>
          <NavLink to="/logs" className={navClass}>
            Contribution Logs
          </NavLink>
          <NavLink to="/audit" className={navClass}>
            Audit Trail
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          <NavLink to="/groups" className={navClass}>
            Group Management
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            Settings
          </NavLink>
        </nav>

        <button
          onClick={onLogout}
          className="mt-6 w-full rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
