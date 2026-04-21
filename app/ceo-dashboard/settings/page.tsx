"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Shield,
  Palette,
  Save,
  Loader2,
  User,
  Crown,
  Building2,
  Lock,
} from "lucide-react";
import {
  updateUserProfile, subscribeToPetPeeves, createPetPeeve, deletePetPeeve,
  type PetPeeve,
} from "@/lib/firestore";
import { uploadAvatar } from "@/lib/storage";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export default function CeoSettingsPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "company" | "notifications" | "security" | "preferences" | "petpeeves">("profile");
  const [petPeeves, setPetPeeves] = useState<PetPeeve[]>([]);
  const [ppForm, setPpForm] = useState({ forbidden: "", suggestion: "", severity: "warn" as PetPeeve["severity"] });
  const [ppSaving, setPpSaving] = useState(false);

  useEffect(() => subscribeToPetPeeves(setPetPeeves), []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
          CEO Settings
        </h2>
        <p className="max-w-2xl text-[13px] text-slate-500">
          Manage your CEO profile, company settings, and workspace preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Sidebar Tabs */}
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          <button
            onClick={() => setActiveTab("profile")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "profile"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <User className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "profile" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "company"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <Building2 className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "company" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Company
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "notifications"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <Bell className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "notifications" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "security"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <Shield className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "security" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Security
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "preferences"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <Palette className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "preferences" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab("petpeeves")}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ease-out ${
              activeTab === "petpeeves"
                ? "bg-amber-500/10 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-amber-600"
            }`}
          >
            <Lock className={`h-4 w-4 transition-opacity duration-150 ${activeTab === "petpeeves" ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`} />
            Pet Peeve Dict.
          </button>
        </div>

        {/* Content Area */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          {activeTab === "profile" && (
            <ProfileSettings userId={user?.uid} profile={profile} />
          )}

          {activeTab === "company" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                    Company Settings
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Manage your organization details
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Hyacinth Industries"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Business Email
                  </label>
                  <input
                    type="email"
                    defaultValue="ceo@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Proposal Default From
                  </label>
                  <input
                    type="email"
                    defaultValue="proposals@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Company Logo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-logo-url.png"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                    CEO Notifications
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Configure what you want to be notified about
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[{
                  label: "Proposal accepted",
                  desc: "When a client accepts a proposal"
                }, {
                  label: "Proposal rejected",
                  desc: "When a client rejects a proposal"
                }, {
                  label: "New proposal created",
                  desc: "When staff creates a new proposal"
                }, {
                  label: "Client comments",
                  desc: "When a client replies in discussion"
                }, {
                  label: "Staff delegation",
                  desc: "When staff sends on your behalf"
                }].map((setting) => (
                  <label
                    key={setting.label}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-300 ease-out hover:border-amber-500/20 hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-[13px] font-medium text-slate-700">{setting.label}</span>
                      <p className="text-[12px] text-slate-400">{setting.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                    Security Settings
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Manage your account security
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Two-Factor Authentication
                  </label>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-slate-500">Secure your account with 2FA</p>
                    <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-amber-600">
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "petpeeves" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Pet Peeve Dictionary</h3>
                  <p className="text-[13px] text-slate-500">Words flagged by the Magic Linter in all Staff proposals</p>
                </div>
              </div>

              {/* Add form */}
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-amber-700">Add a Forbidden Word</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">Forbidden phrase</label>
                    <input
                      value={ppForm.forbidden}
                      onChange={(e) => setPpForm((p) => ({ ...p, forbidden: e.target.value }))}
                      placeholder="e.g. cheap"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">Preferred replacement</label>
                    <input
                      value={ppForm.suggestion}
                      onChange={(e) => setPpForm((p) => ({ ...p, suggestion: e.target.value }))}
                      placeholder="e.g. affordable"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={ppForm.severity}
                    onChange={(e) => setPpForm((p) => ({ ...p, severity: e.target.value as PetPeeve["severity"] }))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-amber-400"
                  >
                    <option value="warn">⚠️ Warn (Gold)</option>
                    <option value="error">🔴 Error (Red)</option>
                  </select>
                  <button
                    disabled={ppSaving || !ppForm.forbidden.trim() || !ppForm.suggestion.trim()}
                    onClick={async () => {
                      if (!user) return;
                      setPpSaving(true);
                      try {
                        await createPetPeeve({ ...ppForm, createdBy: user.uid });
                        setPpForm({ forbidden: "", suggestion: "", severity: "warn" });
                      } finally { setPpSaving(false); }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {ppSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Add
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {petPeeves.length === 0 ? (
                  <p className="text-center text-[13px] text-slate-400 py-8">No forbidden words yet. Add your first above.</p>
                ) : (
                  petPeeves.map((pp) => (
                    <div key={pp.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      pp.severity === "error" ? "border-rose-200/60 bg-rose-50/40" : "border-amber-200/60 bg-amber-50/30"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          pp.severity === "error" ? "text-rose-600" : "text-amber-600"
                        }`}>{pp.severity === "error" ? "Error" : "Warn"}</span>
                        <span className="font-mono text-[13px] text-slate-700">"{pp.forbidden}"</span>
                        <span className="text-[13px] text-slate-400">→</span>
                        <span className="text-[13px] text-slate-600">"{pp.suggestion}"</span>
                      </div>
                      <button
                        onClick={() => deletePetPeeve(pp.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Palette className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                    CEO Preferences
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Customize your workspace experience
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">
                    Dashboard Theme
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500 shadow-sm" />
                    <input
                      type="text"
                      defaultValue="#f59e0b"
                      className="w-32 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:border-amber-500/20 hover:bg-white">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[13px] text-slate-700">
                    Compact mode
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:border-amber-500/20 hover:bg-white">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[13px] text-slate-700">
                    Show delegation summary on dashboard
                  </span>
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 shadow-sm transition-all duration-300 ease-out hover:border-amber-500/20 hover:bg-white">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[13px] text-slate-700">
                    Auto-approve staff proposals
                  </span>
                </label>
              </div>
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
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "CEO");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setJobTitle(profile.jobTitle || "CEO");
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
      toast.success("CEO profile saved successfully!");
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
      toast.success("Avatar uploaded successfully!");
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
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <Crown className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            CEO Profile
          </h3>
          <p className="text-[13px] text-slate-500">
            Manage your personal information and avatar
          </p>
        </div>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        <div 
          onClick={handleAvatarClick}
          className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-amber-100 text-2xl font-semibold text-amber-600 transition hover:opacity-80"
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
            <Crown className="mr-1 h-3 w-3" />
            Chief Executive Officer
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
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
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
              className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
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
            placeholder="e.g., CEO, Founder"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
          />
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
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || !userId}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
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
