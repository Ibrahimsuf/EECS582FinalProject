import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../lib/auth";
import { addAuditEvent } from "../lib/audit";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const user = registerUser({ name, email, password });
      addAuditEvent(`User registered (${user.email})`);
      loginUser({ email, password });
      addAuditEvent(`User auto-logged in after register (${user.email})`);
      navigate("/");
    } catch (ex) {
      setErr(ex.message || "Registration failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded border bg-white p-6">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="mt-1 text-sm text-gray-600">Create your TeamHub account.</p>

        {err ? <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          <button className="w-full rounded bg-gray-900 px-3 py-2 text-white font-semibold hover:bg-black">
            Create account
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-700">
          Already have an account?{" "}
          <Link className="text-blue-600 hover:underline" to="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

