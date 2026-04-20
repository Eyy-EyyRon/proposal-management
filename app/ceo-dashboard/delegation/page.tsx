"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  getDelegatableUsers,
  updateDelegationSettings,
  updateExecutiveAdminSettings,
  type TeamMember,
} from "@/lib/firestore";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/providers/toast";
import {
  Shield, Users, Crown, AlertCircle, Loader2,
  Zap, Send, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DelegationCenterPage() {
  const { user, profile } = useAuth();
  const { isCeo } = useRole();
  const router = useRouter();

  const [staff, setStaff] = useState<TeamMember[]>([]);
  // Level 1 — Send on Behalf
  const [delegatedIds, setDelegatedIds] = useState<string[]>([]);
  // Level 2 — Full Authority / Executive Admin
  const [execAdminIds, setExecAdminIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingL1, setSavingL1] = useState(false);
  const [savingL2, setSavingL2] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    if (!loading && !isCeo) router.push("/dashboard");
  }, [isCeo, loading, router]);

  useEffect(() => {
    if (!user || !isCeo) return;
    let cancelled = false;
    (async () => {
      try {
        const [allStaff] = await Promise.all([getDelegatableUsers()]);
        const filtered = allStaff.filter((s) => s.id !== user.uid);
        if (!cancelled) setStaff(filtered);

        // Load CEO's own doc for both arrays
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          setDelegatedIds(d.delegatedUserIds || []);
          setExecAdminIds(d.executiveAdminIds || []);
        }
      } catch {
        toast.error("Failed to load delegation settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isCeo]);

  // ─── Level 1 toggle ──────────────────────────────────────
  const handleToggleL1 = async (member: TeamMember) => {
    if (!user) return;
    const isGranted = delegatedIds.includes(member.id);

    if (isGranted) {
      const ok = await confirm({
        title: "Revoke Send-on-Behalf?",
        description: `${member.firstName} ${member.lastName} will no longer be able to send proposals using your identity.`,
        actionType: "danger",
        confirmText: "Revoke Access",
      });
      if (!ok) return;
    }

    const next = isGranted
      ? delegatedIds.filter((id) => id !== member.id)
      : [...delegatedIds, member.id];

    setSavingL1(true);
    try {
      await updateDelegationSettings(user.uid, next);
      setDelegatedIds(next);
      toast.success(
        isGranted
          ? `Send-on-Behalf revoked for ${member.firstName} ${member.lastName}.`
          : `${member.firstName} ${member.lastName} can now send proposals as you.`
      );
    } catch {
      toast.error("Failed to update Level 1 permissions.");
    } finally {
      setSavingL1(false);
    }
  };

  // ─── Level 2 toggle ──────────────────────────────────────
  const handleToggleL2 = async (member: TeamMember) => {
    if (!user) return;
    const isGranted = execAdminIds.includes(member.id);

    const ok = await confirm(
      isGranted
        ? {
            title: "Revoke Full Authority?",
            description: `${member.firstName} ${member.lastName} will lose Executive Admin privileges — they cannot manage users, edit global settings, or cross departments.`,
            actionType: "destructive",
            confirmText: "Revoke Full Authority",
          }
        : {
            title: "Grant Full Authority?",
            description: `${member.firstName} ${member.lastName} will receive Executive Admin access. They can manage users, edit global settings, and jump departments on your behalf. This is your highest delegation level.`,
            actionType: "primary",
            confirmText: "Grant Full Authority",
          }
    );
    if (!ok) return;

    const next = isGranted
      ? execAdminIds.filter((id) => id !== member.id)
      : [...execAdminIds, member.id];

    setSavingL2(true);
    try {
      await updateExecutiveAdminSettings(user.uid, next);
      setExecAdminIds(next);
      // Level 2 implies Level 1 — auto-grant if not already set
      if (!isGranted && !delegatedIds.includes(member.id)) {
        const nextL1 = [...delegatedIds, member.id];
        await updateDelegationSettings(user.uid, nextL1);
        setDelegatedIds(nextL1);
      }
      toast.success(
        isGranted
          ? `Full Authority revoked for ${member.firstName} ${member.lastName}.`
          : `${member.firstName} ${member.lastName} is now an Executive Admin.`
      );
    } catch {
      toast.error("Failed to update Level 2 permissions.");
    } finally {
      setSavingL2(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Delegation Center" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </main>
    );
  }

  if (!isCeo) return null;

  const ceoName = profile ? `${profile.firstName} ${profile.lastName}` : "CEO";
  const l1Count = delegatedIds.length;
  const l2Count = execAdminIds.length;

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,rgba(120,1,22,0.05),transparent_50%),linear-gradient(180deg,#f8fafc,#fdfdfd)]">
      <Topbar title="Delegation Center" />

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* ── Page Header ────────────────────────────────── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-200/60">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Delegation Center</h1>
                  <p className="text-[12px] text-slate-500">Power of Attorney management for {ceoName}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center shadow-sm">
                <p className="text-[20px] font-bold text-slate-900">{l1Count}</p>
                <p className="text-[10px] text-slate-500">Send on Behalf</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-center shadow-sm">
                <p className="text-[20px] font-bold text-amber-700">{l2Count}</p>
                <p className="text-[10px] text-amber-600">Full Authority</p>
              </div>
            </div>
          </div>

          {/* ── Level Explainer ────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                  <Send className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[13px] font-semibold text-indigo-900">Level 1 — Send on Behalf</span>
              </div>
              <p className="text-[12px] leading-relaxed text-indigo-700">
                Authorized staff can send proposals using <strong>your identity and branding</strong>. Clients see your name and signature. You receive notifications for every action.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-[13px] font-semibold text-amber-900">Level 2 — Full Authority</span>
              </div>
              <p className="text-[12px] leading-relaxed text-amber-700">
                <strong>Executive Admin</strong> — includes Level 1, plus the ability to manage users, edit global settings, and operate across all departments. Use with extreme care.
              </p>
            </div>
          </div>

          {/* ── Staff Table ─────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <h2 className="text-[14px] font-semibold text-slate-900">Team Members</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {staff.length} member{staff.length !== 1 ? "s" : ""}
              </span>
            </div>

            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-slate-200" />
                <p className="mt-3 text-[13px] font-medium text-slate-600">No staff members found</p>
                <p className="mt-1 text-[12px] text-slate-400">Add staff and admin users to your organization first.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {staff.map((member) => {
                  const isL1 = delegatedIds.includes(member.id);
                  const isL2 = execAdminIds.includes(member.id);
                  const isExpanded = expandedId === member.id;
                  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();

                  return (
                    <div key={member.id} className="transition-colors hover:bg-slate-50/60">
                      {/* Row */}
                      <div className="flex items-center gap-4 px-6 py-4">
                        {/* Avatar */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${
                          isL2
                            ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                            : isL1
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-slate-900">
                              {member.firstName} {member.lastName}
                            </p>
                            {isL2 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                <Zap className="h-2.5 w-2.5" /> Executive Admin
                              </span>
                            )}
                            {isL1 && !isL2 && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                Send on Behalf
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              member.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {member.role}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {member.email} · {member.department || member.departments?.join(", ") || "No department"}
                          </p>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : member.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Expanded Controls */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-[12px] text-slate-500">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>
                                {isL2
                                  ? "Has Full Authority + Send on Behalf. Revoke Level 2 first to downgrade."
                                  : isL1
                                  ? "Can send proposals on your behalf. Upgrade to Full Authority for admin access."
                                  : "No permissions granted yet."}
                              </span>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              {/* Level 1 toggle */}
                              <button
                                onClick={() => handleToggleL1(member)}
                                disabled={savingL1 || isL2}
                                title={isL2 ? "Revoke Level 2 first" : undefined}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition active:scale-95 disabled:opacity-40 ${
                                  isL1
                                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {savingL1 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                {isL1 ? "Revoke Level 1" : "Grant Level 1"}
                              </button>

                              {/* Level 2 toggle */}
                              <button
                                onClick={() => handleToggleL2(member)}
                                disabled={savingL2}
                                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition active:scale-95 disabled:opacity-40 ${
                                  isL2
                                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
                                }`}
                              >
                                {savingL2 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                                {isL2 ? "Revoke Full Authority" : "Grant Full Authority"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer note ─────────────────────────────────── */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200/60 bg-white/60 p-4 text-[12px] text-slate-500 shadow-sm">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p>
              All actions taken under delegated authority are recorded in the Audit Log with both the <strong>identity used (you)</strong> and the <strong>actual actor</strong>. Clients always see your branding.
            </p>
          </div>

        </div>
      </div>

      <ConfirmModal {...modalProps} isLoading={savingL1 || savingL2} />
    </main>
  );
}
