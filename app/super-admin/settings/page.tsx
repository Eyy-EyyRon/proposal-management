"use client";

import { useState, useEffect, useRef } from "react";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  User,
} from "lucide-react";
import {
  updateUserProfile,
  type UpdateProfileData,
} from "@/lib/firestore";
import { uploadAvatar } from "@/lib/storage";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "general" | "notifications" | "security" | "appearance">("profile");

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

          {activeTab !== "profile" && (
            <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
              <button className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-50">
                Cancel
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition-all duration-300 ease-out hover:bg-[#660018]">
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE SETTINGS COMPONENT ─────────────────────────────
interface ProfileSettingsProps {
  userId: string | undefined;
  profile: { firstName: string; lastName: string; email: string; jobTitle?: string; role: string; avatarUrl?: string } | null;
}

function ProfileSettings({ userId, profile }: ProfileSettingsProps) {
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setJobTitle(profile.jobTitle || "");
      setAvatarUrl(profile.avatarUrl || "");
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
        avatarUrl,
      });
      toast.success("Profile saved successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file, userId);
      setAvatarUrl(result.url);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      toast.error("Failed to upload avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const hasChanges =
    firstName.trim() !== (profile?.firstName || "") ||
    lastName.trim() !== (profile?.lastName || "") ||
    jobTitle.trim() !== (profile?.jobTitle || "") ||
    avatarUrl !== (profile?.avatarUrl || "");

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
        <div 
          onClick={handleAvatarClick}
          className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#800020]/10 text-xl font-semibold text-[#800020] transition hover:opacity-80"
        >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{firstName?.[0]}{lastName?.[0]}</span>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
            <span className="text-[10px] font-medium text-white">Change</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div>
          <p className="text-[15px] font-semibold text-slate-900">
            {firstName} {lastName}
          </p>
          <p className="text-[13px] text-slate-500">{profile?.email}</p>
          <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            {profile?.role === "super_admin" ? "Super Admin" : profile?.role === "admin" ? "Dept Admin" : profile?.role}
          </span>
          <p className="mt-1 text-[11px] text-slate-400">
            Click avatar to upload new photo
          </p>
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

