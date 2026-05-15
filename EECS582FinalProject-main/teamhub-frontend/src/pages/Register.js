import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addAuditEvent } from "../lib/audit";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (password !== password2) {
      setErr("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setErr("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, password2);
      addAuditEvent(`User registered (${email})`);
      navigate("/");
    } catch (ex) {
      setErr(ex.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="mt-1 text-sm text-gray-600">Create your TeamHub account.</p>

        {err ? <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              disabled={loading}
              minLength="8"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              type="password"
              required
              disabled={loading}
              minLength="8"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 px-3 py-2 text-white font-semibold hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-700 text-center">
          Already have an account?{" "}
          <Link className="text-blue-600 hover:underline font-medium" to="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

