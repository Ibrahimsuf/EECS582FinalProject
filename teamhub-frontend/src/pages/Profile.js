import React, { useMemo, useState } from "react";
import { getCurrentUser, getUsers } from "../lib/auth";
import { writeJSON } from "../lib/storage";
import { addAuditEvent } from "../lib/audit";

const MAX_IMAGE_BYTES = 1_500_000; // ~1.5MB (localStorage is limited)

export default function Profile() {
  const user = getCurrentUser();
  const allUsers = useMemo(() => getUsers(), []);

  const [name, setName] = useState(user?.name || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");

  const [university, setUniversity] = useState(user?.university || "");

  const [address, setAddress] = useState({
    line1: user?.address?.line1 || "",
    line2: user?.address?.line2 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zip: user?.address?.zip || "",
    country: user?.address?.country || "USA"
  });

  const [photo, setPhoto] = useState(user?.photo || ""); // base64 data URL
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  function updateAddressField(key, value) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  function onPhotoPick(e) {
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErr("Please upload an image file (PNG/JPG/WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErr("Image too large. Please use an image under ~1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPhoto(dataUrl);
    };
    reader.onerror = () => setErr("Could not read that image. Try a different file.");
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto("");
  }

  function onSave() {
    setSaved(false);
    setErr("");

    if (!user?.id) {
      setErr("No active user session found. Please log in again.");
      return;
    }

    const updatedUsers = allUsers.map((u) =>
      u.id === user.id
        ? {
            ...u,
            name: name.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            university: university.trim(),
            address: {
              line1: address.line1.trim(),
              line2: address.line2.trim(),
              city: address.city.trim(),
              state: address.state.trim(),
              zip: address.zip.trim(),
              country: address.country.trim()
            },
            photo
          }
        : u
    );

    writeJSON("teamhub_users", updatedUsers);
    addAuditEvent(`Profile updated for ${user.email}`);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600">Update your personal info and profile photo.</p>
      </div>

      {err ? <div className="rounded bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="rounded border bg-white p-5 max-w-3xl space-y-6">
        {/* Header row */}
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-full border bg-gray-50 flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-gray-600">
                  {(firstName?.[0] || name?.[0] || "U").toUpperCase()}
                  {(lastName?.[0] || "").toUpperCase()}
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Profile photo</span>
                <input
                  className="mt-1 block w-full text-sm"
                  type="file"
                  accept="image/*"
                  onChange={onPhotoPick}
                />
              </label>

              {photo ? (
                <button
                  type="button"
                  onClick={removePhoto}
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
              <div className="text-sm text-gray-700">{user?.email}</div>
            </div>

            <div>
              <label className="text-sm font-medium">Display Name</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How you want your name shown in the app"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Abhiroop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Goel"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">University</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="University of Kansas"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="pt-2 border-t">
          <h2 className="text-lg font-semibold">Address</h2>
          <p className="text-sm text-gray-600">Stored locally for now (demo).</p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium">Address Line 1</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={address.line1}
                onChange={(e) => updateAddressField("line1", e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Address Line 2 (optional)</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={address.line2}
                onChange={(e) => updateAddressField("line2", e.target.value)}
                placeholder="Apt / Suite"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">City</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={address.city}
                  onChange={(e) => updateAddressField("city", e.target.value)}
                  placeholder="Lawrence"
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={address.state}
                  onChange={(e) => updateAddressField("state", e.target.value)}
                  placeholder="KS"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Zip</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={address.zip}
                  onChange={(e) => updateAddressField("zip", e.target.value)}
                  placeholder="66044"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={address.country}
                  onChange={(e) => updateAddressField("country", e.target.value)}
                  placeholder="USA"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onSave}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Save changes
          </button>

          {saved ? <div className="text-sm text-green-700">Saved.</div> : null}
        </div>

        <div className="text-xs text-gray-500">
          Note: Photos are stored in <code className="rounded bg-gray-100 px-1">localStorage</code>.
          Keep images small to avoid storage limits.
        </div>
      </div>
    </div>
  );
}