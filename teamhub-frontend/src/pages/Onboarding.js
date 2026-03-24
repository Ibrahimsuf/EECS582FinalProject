import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, updateCurrentUser } from "../lib/auth";

export default function Onboarding() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // GitHub fields
  const [githubUsername, setGithubUsername] = useState("");
  const [githubToken, setGithubToken] = useState("");

  // Google fields
  const [googleAccount, setGoogleAccount] = useState("");

  async function linkGitHub() {
    if (!githubUsername.trim()) {
      setErr("Please enter your GitHub username.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await updateCurrentUser({
        github_username: githubUsername.trim(),
        github_token: githubToken.trim(),
        github_linked: true,
      });
      setStep(2);
    } catch (e) {
      setErr(e.message || "Failed to link GitHub.");
    } finally {
      setLoading(false);
    }
  }

  async function linkGoogle() {
    if (!googleAccount.trim()) {
      setErr("Please enter your Google email.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await updateCurrentUser({
        google_account: googleAccount.trim(),
        google_linked: true,
      });
      navigate("/");
    } catch (e) {
      setErr(e.message || "Failed to link Google.");
    } finally {
      setLoading(false);
    }
  }

  function skipGitHub() {
    setStep(2);
  }

  function skipGoogle() {
    navigate("/");
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6 text-center">
          <div className="text-sm text-gray-500 mb-2">Step {step} of 2</div>
          <div className="flex gap-2 justify-center">
            <div className={`h-2 w-16 rounded ${step >= 1 ? "bg-gray-900" : "bg-gray-300"}`}></div>
            <div className={`h-2 w-16 rounded ${step >= 2 ? "bg-gray-900" : "bg-gray-300"}`}></div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          {step === 1 && (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-2">🐙</div>
                <h1 className="text-2xl font-bold">Link your GitHub account</h1>
                <p className="text-gray-600 mt-2">
                  Connect your GitHub to track contributions, view commits, and sync your development activity.
                </p>
              </div>

              {err && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-700 mb-4">{err}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub Username
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    placeholder="your-github-username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Access Token (optional)
                  </label>
                  <input
                    type="password"
                    className="w-full rounded border px-3 py-2"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A personal access token increases API rate limits from 60 to 5,000 requests/hour.
                    <a 
                      href="https://github.com/settings/tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      Create one here
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={skipGitHub}
                  className="flex-1 rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Skip for now
                </button>
                <button
                  onClick={linkGitHub}
                  className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? "Linking..." : "Link GitHub"}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="text-3xl mb-2">📧</div>
                <h1 className="text-2xl font-bold">Link your Google account</h1>
                <p className="text-gray-600 mt-2">
                  Connect your Google account for authentication and easy sign-in options.
                </p>
              </div>

              {err && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-700 mb-4">{err}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Account Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded border px-3 py-2"
                    placeholder="your.email@gmail.com"
                    value={googleAccount}
                    onChange={(e) => setGoogleAccount(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={skipGoogle}
                  className="flex-1 rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Skip for now
                </button>
                <button
                  onClick={linkGoogle}
                  className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? "Linking..." : "Link Google"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          You can always update your linked accounts later in Settings or Profile.
        </div>
      </div>
    </div>
  );
}
