"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  getDelegatableUsers,
  getDelegationSettings,
  updateDelegationSettings,
  type TeamMember,
} from "@/lib/firestore";
import { Shield, Users, Check, X, Crown, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DelegationSettingsPage() {
  const { user, profile, role } = useAuth();
  const router = useRouter();
  const { isCeo } = useRole();
  
  const [staff, setStaff] = useState<TeamMember[]>([]);
  const [delegatedIds, setDelegatedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Redirect non-CEOs
  useEffect(() => {
    if (!loading && !isCeo) {
      router.push("/dashboard");
    }
  }, [isCeo, loading, router]);

  // Load delegation settings
  useEffect(() => {
    if (!user || role !== "ceo") return;
    
    let cancelled = false;
    (async () => {
      try {
        const [allStaff, currentSettings] = await Promise.all([
          getDelegatableUsers(),
          getDelegationSettings(user.uid),
        ]);
        
        if (!cancelled) {
          setStaff(allStaff.filter(s => s.id !== user.uid)); // Exclude self
          setDelegatedIds(currentSettings);
        }
      } catch (err) {
        console.error("Failed to load delegation settings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [user, role]);

  const toggleDelegation = (staffId: string) => {
    setDelegatedIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      }
      return [...prev, staffId];
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      await updateDelegationSettings(user.uid, delegatedIds);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Team Permissions" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </main>
    );
  }

  if (!isCeo) {
    return null; // Will redirect
  }

  const ceoName = profile ? `${profile.firstName} ${profile.lastName}` : "CEO";

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(120,1,22,0.04),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#fdfdfd_100%)]">
      <Topbar title="Team Permissions" />

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-600" />
              <h1 className="text-xl font-semibold text-slate-900">Delegated Authority</h1>
            </div>
            <p className="text-[13px] text-slate-500">
              Grant "Power of Attorney" to trusted staff members, allowing them to send proposals on your behalf using your identity and branding.
            </p>
          </div>

          {/* Info Card */}
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
            <div className="flex items-start gap-3">
              <Crown className="mt-0.5 h-4 w-4 text-violet-600" />
              <div>
                <p className="text-[13px] font-medium text-violet-900">
                  Your Identity: {ceoName}
                </p>
                <p className="mt-1 text-[12px] text-violet-700">
                  When staff send proposals on your behalf, clients will see your name, company branding, and email signature. You maintain full oversight of all activity.
                </p>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h2 className="text-[14px] font-semibold text-slate-900">
                  Authorized Staff
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {delegatedIds.length} granted
              </span>
            </div>

            {staff.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-[13px] font-medium text-slate-700">No staff members found</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Add staff and admin users to your organization first.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staff.map((member) => {
                  const isGranted = delegatedIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-600">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-slate-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-[12px] text-slate-500">
                            {member.email} · {member.department || "No department"}
                          </p>
                        </div>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          member.role === "admin" 
                            ? "bg-violet-100 text-violet-700" 
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {member.role}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleDelegation(member.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                          isGranted
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {isGranted ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Authorized
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5" />
                            Not Authorized
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {saveError && (
                <p className="text-[13px] text-rose-600">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="flex items-center gap-1.5 text-[13px] text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  Settings saved successfully
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
