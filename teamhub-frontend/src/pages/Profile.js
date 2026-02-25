import React, { useEffect, useState } from "react";
import { getCachedUser, refreshCurrentUser, updateCurrentUser } from "../lib/auth";

const MAX_IMAGE_BYTES = 1_500_000;

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const cached = getCachedUser();

  const [form, setForm] = useState({
    name: cached?.name || "",
    first_name: cached?.first_name || "",
    last_name: cached?.last_name || "",
    email: cached?.email || "",
    username: cached?.username || "",
    university: cached?.university || "",
    address: cached?.address || { line1: "", line2: "", city: "", state: "", zip: "", country: "USA" },
    photo: cached?.photo || ""
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await refreshCurrentUser();
        if (!alive) return;
        if (u) {
          setForm((prev) => ({
            ...prev,
            ...u,
            address: u.address || prev.address,
            photo: u.photo || ""
          }));
        }
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function setAddress(key, value) {
    setForm((p) => ({ ...p, address: { ...(p.address || {}), [key]: value } }));
  }

  function onPhotoPick(e) {
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please upload an image file.");
    if (file.size > MAX_IMAGE_BYTES) return setErr("Image too large. Use < 1.5MB.");

    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, photo: String(reader.result || "") }));
    reader.onerror = () => setErr("Could not read image.");
    reader.readAsDataURL(file);
  }

  async function onSave() {
    setErr("");
    setSaved(false);
    try {
      const payload = {
        name: form.name,
        first_name: form.first_name,
        last_name: form.last_name,
        university: form.university,
        address: form.address,
        photo: form.photo
      };
      await updateCurrentUser(payload);
      setSaved(true);
    } catch (e) {
      setErr(e.message || "Save failed.");
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading profile…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">This page is now synced with the backend.</p>
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
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  value={form.first_name}
                  onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  className="w-full px-3 py-2 rounded border border-gray-300"
                  value={form.last_name}
                  onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">University</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={form.university}
                onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))}
                placeholder="University of Kansas"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <h2 className="text-lg font-semibold">Address</h2>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium">Address Line 1</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.address?.line1 || ""} onChange={(e) => setAddress("line1", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Address Line 2</label>
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
    </div>
  );
}
