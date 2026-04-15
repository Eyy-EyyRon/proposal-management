"use client";

import { useEffect, useState, useRef } from "react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import { getOrgSettings, saveOrgSettings } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  Building2, Upload, Save, Loader2, Check, ImageIcon, Type, Mail,
} from "lucide-react";
import Image from "next/image";

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
    if (!file.type.startsWith("image/")) return;

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Settings" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="font-sans text-lg font-semibold text-slate-900">
            Organization Settings
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Brand your proposals, portal, and emails.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column — Form */}
            <div className="space-y-5">
              {/* Company Name */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className="mt-2.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Used in email headers and the public proposal portal.
                </p>
              </div>

              {/* Company Logo */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-5">
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
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
              <div className="rounded-xl border border-slate-200/80 bg-white p-5">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Default Email Signature
                </label>
                <textarea
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  placeholder={"Best regards,\nJohn Doe\nCEO, Acme Corp\n(555) 123-4567"}
                  rows={4}
                  className="mt-2.5 w-full resize-none rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Appended to proposal emails sent from your account.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
              </button>
            </div>

            {/* Right Column — Preview */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
                <Type className="h-4 w-4 text-slate-400" />
                Email Preview
              </h3>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                {/* Preview Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-center">
                  {companyLogoUrl ? (
                    <Image src={companyLogoUrl} alt="" width={120} height={32} className="mx-auto h-8 object-contain" />
                  ) : (
                    <p className="text-[15px] font-bold text-white">
                      {companyName || "Your Company"}
                    </p>
                  )}
                </div>
                {/* Preview Body */}
                <div className="space-y-3 p-6">
                  <h4 className="text-[17px] font-bold text-slate-900">
                    You&apos;ve received a proposal
                  </h4>
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    Hi Client, {profile?.firstName ?? "You"} from{" "}
                    <strong className="text-slate-700">{companyName || "Your Company"}</strong>{" "}
                    has sent you a proposal.
                  </p>
                  <div className="flex justify-center py-2">
                    <span className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-2.5 text-[13px] font-semibold text-white">
                      View Proposal →
                    </span>
                  </div>
                  {emailSignature && (
                    <div className="border-t border-slate-100 pt-3 text-[12px] leading-relaxed text-slate-400 whitespace-pre-line">
                      {emailSignature}
                    </div>
                  )}
                </div>
                {/* Preview Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-[11px] text-slate-400">
                  Sent via <strong className="text-slate-500">ProposalMS</strong> on behalf of{" "}
                  {companyName || "Your Company"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
