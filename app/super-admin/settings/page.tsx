"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Save,
  Building2,
  Plus,
  Trash2,
  Loader2,
  User,
} from "lucide-react";
import {
  subscribeToDepartmentsList,
  createDepartment,
  deleteDepartment,
  updateUserProfile,
  type FirestoreDepartment,
  type UpdateProfileData,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "general" | "departments" | "notifications" | "security" | "appearance">("profile");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
          Settings
        </h2>
        <p className="max-w-2xl text-[13px] text-slate-500">
          Manage your workspace preferences and configurations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Sidebar Tabs */}
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          <button
            onClick={() => setActiveTab("profile")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "profile"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <User className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "profile" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("general")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "general"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <Settings className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "general" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            General
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "departments"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <Building2 className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "departments" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Departments
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "notifications"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <Bell className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "notifications" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "security"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <Shield className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "security" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Security
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "appearance"
                ? "bg-[#800020]/10 text-[#800020] shadow-[inset_0_0_0_1px_rgba(128,0,32,0.08)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#5f0018]"
            }`}
          >
            <Palette className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "appearance" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Appearance
          </button>
        </div>

        {/* Content Area */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          {activeTab === "profile" && (
            <ProfileSettings userId={user?.uid} profile={profile} />
          )}

          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  General Settings
                </h3>
                <p className="mt-2 text-[13px] text-slate-500">
                  Configure your workspace details
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Hyacinth Industries"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Default From Email
                  </label>
                  <input
                    type="email"
                    defaultValue="proposals@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Default Reply-To
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "departments" && (
            <DepartmentManager />
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Notification Preferences
                </h3>
                <p className="mt-2 text-[13px] text-slate-500">
                  Choose when you want to be notified
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Proposal accepted",
                  "Proposal rejected",
                  "Proposal viewed",
                  "New team member added",
                  "Template updated",
                ].map((setting) => (
                  <label
                    key={setting}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-300 ease-out hover:border-[#800020]/20 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate-300 text-[#800020] focus:ring-[#800020]"
                    />
                    <span className="text-[13px] text-slate-700">{setting}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Security Settings
                </h3>
                <p className="mt-2 text-[13px] text-slate-500">
                  Manage your security preferences
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Appearance
                </h3>
                <p className="mt-2 text-[13px] text-slate-500">
                  Customize your workspace look
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#800020] shadow-sm" />
                    <input
                      type="text"
                      defaultValue="#800020"
                      className="w-32 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:border-[#800020]/20 hover:bg-white">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-[#800020] focus:ring-[#800020]"
                  />
                  <span className="text-[13px] text-slate-700">
                    Compact mode
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-50">
              Cancel
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition-all duration-300 ease-out hover:bg-[#660018]">
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE SETTINGS COMPONENT ─────────────────────────────
interface ProfileSettingsProps {
  userId: string | undefined;
  profile: { firstName: string; lastName: string; email: string; jobTitle?: string; role: string } | null;
}

function ProfileSettings({ userId, profile }: ProfileSettingsProps) {
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setJobTitle(profile.jobTitle || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateUserProfile(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jobTitle: jobTitle.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    firstName.trim() !== (profile?.firstName || "") ||
    lastName.trim() !== (profile?.lastName || "") ||
    jobTitle.trim() !== (profile?.jobTitle || "");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Profile Settings
        </h3>
        <p className="mt-2 text-[13px] text-slate-500">
          Manage your personal information and job details
        </p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#800020]/10 text-xl font-semibold text-[#800020]">
          {firstName?.[0]}{lastName?.[0]}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-900">
            {firstName} {lastName}
          </p>
          <p className="text-[13px] text-slate-500">{profile?.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            {profile?.role === "admin" ? "Administrator" : profile?.role}
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Job Title
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., IT Specialist, Marketing Manager"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
          />
          <p className="mt-1.5 text-[12px] text-slate-400">
            Your job title will be visible to other team members
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
          <label className="mb-1.5 block text-[13px] font-medium text-slate-500">
            Email Address
          </label>
          <input
            type="email"
            value={profile?.email || ""}
            disabled
            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2.5 text-[13px] text-slate-500 outline-none cursor-not-allowed"
          />
          <p className="mt-1.5 text-[12px] text-slate-400">
            Email cannot be changed. Contact support for assistance.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        {saved && (
          <span className="text-[13px] font-medium text-emerald-600">
            Profile saved successfully!
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || !userId}
          className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── DEPARTMENT MANAGER ─────────────────────────────────────
function DepartmentManager() {
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToDepartmentsList((data) => {
      setDepartments(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await createDepartment({ name, description: newDesc.trim() });
      setNewName("");
      setNewDesc("");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department? Users currently in it will need to re-select.")) return;
    setDeleting(id);
    try {
      await deleteDepartment(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Department Manager</h3>
        <p className="text-[13px] text-slate-500">Add or remove departments that users can join.</p>
      </div>

      {/* Add form */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-[inset_0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Department name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex w-fit items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-[#800020]/20 transition-all duration-300 ease-out hover:bg-[#660018] disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Department
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center shadow-sm">
          <Building2 className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-[13px] text-slate-400">No departments yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:border-slate-300 hover:bg-slate-50/80"
            >
              <div>
                <p className="text-[13px] font-medium text-slate-800">{dept.name}</p>
                {dept.description && (
                  <p className="text-[12px] text-slate-400">{dept.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(dept.id)}
                disabled={deleting === dept.id}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-all duration-300 ease-out hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                title="Delete department"
              >
                {deleting === dept.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
