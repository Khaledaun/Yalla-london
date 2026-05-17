"use client";

import { useEffect, useState } from "react";

/**
 * /admin/profile — Admin Profile Page
 *
 * Shows current admin user info and allows password change.
 */
export default function ProfilePage() {
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => ({ error: "Invalid response" }));
      if (res.ok && json.success) {
        setMessage({ type: "success", text: "Password updated successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: json.error || "Failed to update password." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      <div>
        <h1 style={{ fontFamily: "'Anybody',sans-serif", fontWeight: 800, fontSize: 24, color: "#1C1917", letterSpacing: -0.5 }}>
          Profile
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manage your admin account</p>
      </div>

      {/* User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Info</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">Name</span>
          <span className="font-medium">{user?.name || "—"}</span>
          <span className="text-gray-500">Email</span>
          <span className="font-medium">{user?.email || "—"}</span>
          <span className="text-gray-500">Role</span>
          <span className="font-medium capitalize">{user?.role || "—"}</span>
        </div>
      </div>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} className="bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Change Password</h2>

        {message && (
          <div className={`text-sm p-2 rounded ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update Password"}
        </button>
      </form>
    </div>
  );
}
