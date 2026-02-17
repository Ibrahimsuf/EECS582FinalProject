import React, { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await auth.requestPasswordReset(email);
      setSuccess(true);
      // In demo mode, we receive the reset link in the response
      if (response.reset_link) {
        setResetLink(response.reset_link);
      }
    } catch (ex) {
      setError(ex.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {success ? (
          <div className="mt-4 space-y-3">
            <div className="rounded bg-green-50 p-3 text-sm text-green-700">
              If an account exists with this email, you will receive a password reset link.
            </div>

            {resetLink && (
              <div className="rounded bg-blue-50 p-3 text-sm">
                <p className="font-medium text-blue-900 mb-2">Demo Mode - Reset Link:</p>
                <Link to={resetLink.replace('http://localhost:3000', '')} className="text-blue-600 hover:underline break-all">
                  {resetLink}
                </Link>
              </div>
            )}

            <Link
              to="/login"
              className="block w-full text-center rounded bg-gray-900 px-3 py-2 text-white font-semibold hover:bg-black"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  disabled={loading}
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-gray-900 px-3 py-2 text-white font-semibold hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-4 text-sm text-gray-700 text-center">
              Remember your password?{" "}
              <Link className="text-blue-600 hover:underline font-medium" to="/login">
                Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
