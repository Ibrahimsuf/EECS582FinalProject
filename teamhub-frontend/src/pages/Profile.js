import React, { useEffect, useState } from "react";
import { getCurrentUser, refreshCurrentUser, updateCurrentUser } from "../lib/auth";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
const MAX_IMAGE_BYTES = 1_500_000;

export default function Profile() {
  const cached = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  // fill form with either cached user or empty vals if no cache
  const [form, setForm] = useState({
    name: cached?.name || "",
    first_name: cached?.first_name || "",
    last_name: cached?.last_name || "",
    email: cached?.email || "",
    username: cached?.username || "",
    university: cached?.university || "",
    address: cached?.address || { line1: "", line2: "", city: "", state: "", zip: "", country: "USA" },
    photo: cached?.photo || "",
    github_username: cached?.github_username || "",
    github_token: "",
    google_account: cached?.google_account || "",
    github_linked: cached?.github_linked || false,
    google_linked: cached?.google_linked || false,
  });

  // GitHub stats
  const [githubStats, setGithubStats] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [linkedSaved, setLinkedSaved] = useState(false);

  // fetch user data form backend and update form accordingly
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await refreshCurrentUser();
        if (!alive || !u) return;
        setForm((p) => ({
          ...p,
          ...u,
          address: u.address || p.address,
          photo: u.photo || "",
          github_username: u.github_username || "",
          github_token: "", // Don't expose token
          google_account: u.google_account || "",
          github_linked: u.github_linked || false,
          google_linked: u.google_linked || false,
        }));
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function setAddress(key, value) {
    setForm((p) => ({ ...p, address: { ...(p.address || {}), [key]: value } }));
  }

  function onPhotoPick(e) {
    setErr("");
    const file = e.target.files?.[0];
    // handle file types
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please upload an image file.");
    if (file.size > MAX_IMAGE_BYTES) return setErr("Image too large. Use < 1.5MB.");

    // parse image data
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, photo: String(reader.result || "") }));
    reader.onerror = () => setErr("Could not read image.");
    reader.readAsDataURL(file);
  }

  async function onSave() {
    setErr("");
    setSaved(false);
    try {
      await updateCurrentUser({
        name: form.name,
        first_name: form.first_name,
        last_name: form.last_name,
        university: form.university,
        address: form.address,
        photo: form.photo
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setErr(e.message || "Save failed.");
    }
  }

  async function saveLinkedAccounts() {
    setErr("");
    setLinkedSaved(false);
    try {
      const patch = {
        github_username: form.github_username,
        google_account: form.google_account,
        github_linked: form.github_username ? true : false,
        google_linked: form.google_account ? true : false,
      };
      // Only include token if user entered a new one
      if (form.github_token) {
        patch.github_token = form.github_token;
      }
      await updateCurrentUser(patch);
      setForm((p) => ({
        ...p,
        github_linked: patch.github_linked,
        google_linked: patch.google_linked,
        github_token: "", // Clear token field after save
      }));
      setLinkedSaved(true);
      setTimeout(() => setLinkedSaved(false), 1500);
    } catch (e) {
      setErr(e.message || "Save failed.");
    }
  }

  async function fetchGitHubStats() {
    const session = getCurrentUser();
    if (!session?.id) return;
    
    setGithubLoading(true);
    setGithubError("");
    setGithubStats(null);

    try {
      const res = await fetch(`${API}/members/${session.id}/github/`);
      const data = await res.json();
      if (!res.ok) {
        setGithubError(data.error || "Failed to fetch GitHub stats.");
        return;
      }
      setGithubStats(data);
    } catch (e) {
      setGithubError(e.message || "Network error.");
    } finally {
      setGithubLoading(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading profile…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">This page is synced with the Django backend.</p>
      </div>

      {err ? <div className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="rounded border bg-white p-5 max-w-3xl space-y-6">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-full border bg-gray-50 flex items-center justify-center">
              {form.photo ? (
                <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-600">
                  {(form.first_name?.[0] || form.name?.[0] || "U").toUpperCase()}
                  {(form.last_name?.[0] || "").toUpperCase()}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Profile photo</span>
                <input className="mt-1 block w-full text-sm" type="file" accept="image/*" onChange={onPhotoPick} />
              </label>

              {form.photo ? (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, photo: "" }))}
                  className="w-full rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <div className="text-sm font-medium">Email</div>
              <div className="text-sm text-gray-700">{form.email}</div>
            </div>

            <div>
              <label className="text-sm font-medium">Display Name</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input className="w-full px-3 py-2 rounded border border-gray-300" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input className="w-full px-3 py-2 rounded border border-gray-300" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">University</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} placeholder="University of Kansas" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <h2 className="text-lg font-semibold">Address</h2>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium">Line 1</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.line1 || ""} onChange={(e) => setAddress("line1", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Line 2</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.line2 || ""} onChange={(e) => setAddress("line2", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">City</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.city || ""} onChange={(e) => setAddress("city", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.state || ""} onChange={(e) => setAddress("state", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Zip</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.zip || ""} onChange={(e) => setAddress("zip", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.country || ""} onChange={(e) => setAddress("country", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={onSave} className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
            Save changes
          </button>
          {saved ? <div className="text-sm text-green-700">Saved.</div> : null}
        </div>
      </div>

      {/* Linked Accounts Section */}
      <div className="rounded border bg-white p-5 max-w-3xl space-y-6">
        <h2 className="text-lg font-semibold">Linked Accounts</h2>

        {/* GitHub */}
        <div className="space-y-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">GitHub</h3>
            {form.github_linked ? (
              <span className="text-green-600 text-lg" title="GitHub linked">✓</span>
            ) : (
              <span className="text-red-500 text-lg" title="GitHub not linked">✗</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GitHub Username</label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="your-github-username"
                value={form.github_username}
                onChange={(e) => setForm((p) => ({ ...p, github_username: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personal Access Token</label>
              <input
                type="password"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="ghp_xxxxxxxxxxxx"
                value={form.github_token}
                onChange={(e) => setForm((p) => ({ ...p, github_token: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">Token is required for higher API rate limits.</p>
            </div>
          </div>
        </div>

        {/* Google */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Google</h3>
            {form.google_linked ? (
              <span className="text-green-600 text-lg" title="Google linked">✓</span>
            ) : (
              <span className="text-red-500 text-lg" title="Google not linked">✗</span>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Google Account Email</label>
            <input
              type="email"
              className="w-full rounded border px-3 py-2 text-sm max-w-md"
              placeholder="your.email@gmail.com"
              value={form.google_account}
              onChange={(e) => setForm((p) => ({ ...p, google_account: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={saveLinkedAccounts} 
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Save Linked Accounts
          </button>
          <button
            onClick={fetchGitHubStats}
            disabled={githubLoading || !form.github_linked}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {githubLoading ? "Loading..." : "Fetch GitHub Stats"}
          </button>
          {linkedSaved ? <div className="text-sm text-green-700">Saved.</div> : null}
        </div>

        {/* GitHub Stats Display */}
        {githubError && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">{githubError}</div>
        )}

        {githubStats && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700">GitHub Stats for @{githubStats.username}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded bg-gray-50 p-3">
                <div className="text-2xl font-bold text-gray-900">{githubStats.issues_count}</div>
                <div className="text-xs text-gray-500">Issues Created</div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-2xl font-bold text-gray-900">{githubStats.commits?.length || 0}</div>
                <div className="text-xs text-gray-500">Recent Commits</div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-2xl font-bold text-gray-900">{githubStats.repos?.length || 0}</div>
                <div className="text-xs text-gray-500">Repos Contributed To</div>
              </div>
            </div>

            {githubStats.commits?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Recent Commits</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {githubStats.commits.slice(0, 10).map((commit, idx) => (
                    <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                      <span className="font-mono text-blue-600">{commit.repo}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-700">{commit.message?.slice(0, 80)}{commit.message?.length > 80 ? "..." : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {githubStats.repos?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Repos Contributed To</h4>
                <div className="flex flex-wrap gap-1">
                  {githubStats.repos.map((repo, idx) => (
                    <span key={idx} className="text-xs bg-blue-50 text-blue-700 rounded px-2 py-0.5">
                      {repo}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
