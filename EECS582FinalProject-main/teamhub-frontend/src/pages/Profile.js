import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth as authAPI } from "../lib/api";
import { addAuditEvent } from "../lib/audit";

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function onSave(e) {
    e.preventDefault();
    setSaved(false);
    setError("");
    setLoading(true);

    try {
      await updateUser({ name: name.trim() });
      addAuditEvent(`Profile updated (name changed) for ${user.email}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setError("");
    setPasswordSuccess(false);

    if (newPassword !== newPassword2) {
      setError("New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword(oldPassword, newPassword);
      addAuditEvent("Password changed successfully");
      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setNewPassword2("");
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Profile Information */}
      <div className="rounded border bg-white p-4 max-w-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
        <form onSubmit={onSave} className="space-y-3">
          <div>
            <div className="text-sm font-medium">Email</div>
            <div className="text-sm text-gray-700 mt-1">{user?.email}</div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <div className="text-sm font-medium">Username</div>
            <div className="text-sm text-gray-700 mt-1">{user?.username}</div>
          </div>

          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-400"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            {saved && <div className="text-sm text-green-700">Saved successfully!</div>}
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded border bg-white p-4 max-w-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        
        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={onChangePassword} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                minLength="8"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded border px-3 py-2"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
                disabled={loading}
                minLength="8"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-400"
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setOldPassword("");
                  setNewPassword("");
                  setNewPassword2("");
                  setError("");
                }}
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            {passwordSuccess && (
              <div className="text-sm text-green-700">Password changed successfully!</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
