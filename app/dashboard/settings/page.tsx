"use client";

import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import { getOrgSettings, saveOrgSettings, updateUserProfile } from "@/lib/firestore";
import { uploadAvatar } from "@/lib/storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "@/components/providers/goey-toast-provider";
import {
  Building2, Upload, Save, Loader2, Check, ImageIcon, Type, Mail, User, Briefcase,
} from "lucide-react";
import Image from "next/image";

const COMPANY_TEXT_CLASS = "font-medium tracking-[0.01em]";

function BlueprintUploadFrame() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="18"
        ry="18"
        fill="none"
        stroke="rgba(37,99,235,0.28)"
        strokeWidth="1.5"
        strokeDasharray="7 5"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M12 20 Q12 12 20 12" fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 12 Q88 12 88 20" fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 80 Q12 88 20 88" fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 88 Q88 88 88 80" fill="none" stroke="rgba(37,99,235,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [emailSignature, setEmailSignature] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const settings = await getOrgSettings(user.uid);
        if (settings) {
          setCompanyName(settings.companyName);
          setCompanyLogoUrl(settings.companyLogoUrl);
          setEmailSignature(settings.emailSignature);
        } else if (profile?.companyName) {
          setCompanyName(profile.companyName);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCompanyLogoUrl(url);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveOrgSettings(user.uid, {
        companyName,
        companyLogoUrl,
        emailSignature,
      });
      toast.success("Organization settings saved!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Topbar title="Settings" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">
            Organization Settings
          </h2>
          <p className="mt-1 text-[13px] text-slate-400">
            Brand your proposals, portal, and emails.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column — Profile & Settings */}
            <div className="space-y-5">
              {/* Profile Section */}
              <ProfileSection />

              {/* Company Name */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className={`mt-2.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-[14px] text-slate-800 outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-2 focus:ring-[#780116]/20 ${COMPANY_TEXT_CLASS}`}
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Used in email headers and the public proposal portal.
                </p>
              </div>

              {/* Company Logo */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  Company Logo
                </label>
                <div className="mt-2.5 flex items-center gap-4">
                  {companyLogoUrl ? (
                    <div className="relative">
                      <Image
                        src={companyLogoUrl}
                        alt="Company logo"
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-xl border border-slate-200 object-contain bg-white p-1"
                      />
                    </div>
                  ) : (
                    <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                      <BlueprintUploadFrame />
                      <ImageIcon className="relative h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {uploading ? "Uploading…" : "Upload logo"}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <p className="mt-1 text-[11px] text-slate-400">PNG, JPG, or SVG up to 2 MB.</p>
                  </div>
                </div>
                {companyLogoUrl && (
                  <button
                    onClick={() => setCompanyLogoUrl(null)}
                    className="mt-2 text-[11px] font-medium text-rose-500 hover:text-rose-600"
                  >
                    Remove logo
                  </button>
                )}
              </div>

              {/* Email Signature */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Default Email Signature
                </label>
                <textarea
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  placeholder={"Best regards,\nJohn Doe\nCEO, Acme Corp\n(555) 123-4567"}
                  rows={4}
                  className="mt-2.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-[14px] text-slate-800 outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-2 focus:ring-[#780116]/20"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Appended to proposal emails sent from your account.
                </p>
              </div>

              {/* Save Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-[13px] font-medium text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 disabled:opacity-50"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {saving ? (
                    <motion.span
                      key="saving-icon"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </motion.span>
                  ) : saved ? (
                    <motion.span
                      key="saved-icon"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Saved!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save-icon"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save settings
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Right Column — Preview */}
            <div className="rounded-xl border border-slate-200/80 bg-[#f1f5f9] p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                <Type className="h-4 w-4 text-slate-400" />
                Email Preview
              </h3>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-[#f1f5f9]">
                {/* Preview Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-center">
                  {companyLogoUrl ? (
                    <Image src={companyLogoUrl} alt="" width={120} height={32} className="mx-auto h-8 object-contain" />
                  ) : (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={companyName || "Your Company"}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className={`text-[15px] text-white ${COMPANY_TEXT_CLASS}`}
                      >
                        {companyName || "Your Company"}
                      </motion.p>
                    </AnimatePresence>
                  )}
                </div>
                {/* Preview Body */}
                <div className="px-6 py-6">
                  <div className="rounded-[22px] bg-white p-6 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/70">
                    <div className="space-y-3">
                      <h4 className="text-[17px] font-bold text-slate-900">
                        You&apos;ve received a proposal
                      </h4>
                      <p className="text-[13px] leading-relaxed text-slate-500">
                        Hi Client, {profile?.firstName ?? "You"} from{" "}
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.strong
                            key={companyName || "Your Company-body"}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className={`text-slate-700 ${COMPANY_TEXT_CLASS}`}
                          >
                            {companyName || "Your Company"}
                          </motion.strong>
                        </AnimatePresence>{" "}
                        has sent you a proposal.
                      </p>
                      <div className="flex justify-center py-2">
                        <span className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm">
                          View Proposal →
                        </span>
                      </div>
                      {emailSignature && (
                        <div className="border-t border-slate-100 pt-3 text-[12px] leading-relaxed text-slate-400 whitespace-pre-line">
                          {emailSignature}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Preview Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-[11px] text-slate-400">
                  Sent via <strong className="text-slate-500">Hyacinth Proposal System</strong> on behalf of{" "}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={companyName || "Your Company-footer"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={COMPANY_TEXT_CLASS}
                    >
                      {companyName || "Your Company"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── PROFILE SETTINGS COMPONENT ─────────────────────────────
function ProfileSection() {
  const { user, profile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
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
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(user?.uid, {
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
    if (!file || !user?.uid) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file, user.uid);
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
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-4 w-4 text-slate-400" />
        <h3 className="text-[13px] font-semibold text-slate-800">My Profile</h3>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <div
          onClick={handleAvatarClick}
          className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-600 transition hover:opacity-80"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span>{firstName?.[0]}{lastName?.[0]}</span>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
            <Upload className="h-4 w-4 text-white" />
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
          <p className="text-[12px] text-slate-500">Click to change avatar</p>
          <p className="text-[11px] text-slate-400">Max 5MB, JPG/PNG</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-700">
            <Briefcase className="inline h-3 w-3 mr-1" />
            Job Title
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Sales Manager"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={profile?.email || ""}
            disabled
            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 outline-none cursor-not-allowed"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
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
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
