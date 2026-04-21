"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { DepartmentBadge } from "@/components/department-badge";
import { useRole } from "@/contexts/auth-context";
import {
  subscribeToSharingLogs,
  subscribeToPendingApprovals,
  releaseCeoHold,
  type SharingLogEntry,
  type Proposal,
} from "@/lib/firestore";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/providers/toast";
import {
  Share2, Loader2, ArrowRight, Clock, AlertTriangle,
  CheckCircle, Shield, Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

function timeAgo(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  const diff = Math.floor(Date.now() / 1000 - secs);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SharingMonitorPage() {
  const { user } = useAuth();
  const { isCeo } = useRole();
  const router = useRouter();
  const [logs, setLogs] = useState<SharingLogEntry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    if (!loading && !isCeo) router.push("/dashboard");
  }, [isCeo, loading, router]);

  useEffect(() => {
    return subscribeToSharingLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return subscribeToPendingApprovals((data) => {
      setPendingApprovals(data);
      setPendingLoading(false);
    });
  }, []);

  const handleRelease = async (proposal: Proposal) => {
    if (!user) return;
    const ok = await confirm({
      title: "Release Proposal?",
      description: `This will approve and send "${proposal.clientName}" — currently held for CEO review. Reason: ${proposal.holdReason ?? "Threshold exceeded"}`,
      actionType: "primary",
      confirmText: "Release & Send",
    });
    if (!ok) return;
    setReleasingId(proposal.id);
    try {
      await releaseCeoHold(proposal.id, user.uid);
      toast.success(`Proposal for "${proposal.clientName}" released.`);
    } catch {
      toast.error("Failed to release proposal.");
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Sharing & Approvals Monitor" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="font-sans text-lg font-semibold text-slate-900">CEO Oversight Console</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Monitor cross-departmental sharing activity and pending threshold approvals.
          </p>
        </div>

        {/* ─── PENDING CEO APPROVALS ─────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">Pending Approvals</h3>
            {pendingApprovals.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                {pendingApprovals.length}
              </span>
            )}
          </div>

          {pendingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-5 py-6 text-center">
              <CheckCircle className="mx-auto h-5 w-5 text-emerald-400" />
              <p className="mt-2 text-[13px] text-emerald-700">No proposals awaiting your approval.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApprovals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 transition hover:border-amber-300"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{p.clientName}</p>
                    <p className="text-[12px] text-slate-500">
                      {p.holdReason ?? "Exceeds threshold"} · Sent by {p.sentById !== p.ownerId ? "delegate" : "direct"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <DepartmentBadge department={p.department} />
                      <span className="text-[11px] text-slate-400">{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRelease(p)}
                    disabled={releasingId === p.id}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                  >
                    {releasingId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    Release
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── CROSS-DEPARTMENT SHARING LOGS ─────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-900">Cross-Department Sharing Activity</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/40 px-5 py-10 text-center">
              <Eye className="mx-auto h-5 w-5 text-slate-300" />
              <p className="mt-2 text-[13px] text-slate-400">No sharing activity recorded yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Proposal</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">From</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Shared With</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Access</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">By</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} className={`transition-colors hover:bg-slate-50/80 ${i !== logs.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-800">{log.proposalClientName}</td>
                      <td className="px-4 py-3"><DepartmentBadge department={log.originDepartment} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {log.sharedWith.map((dept) => (
                            <DepartmentBadge key={dept} department={dept} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                          log.accessLevel === "collaborative"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-slate-50 text-slate-600 ring-slate-200"
                        }`}>
                          {log.accessLevel === "collaborative" ? "Collaborative" : "View Only"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-slate-600">{log.sharedByName}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-400">{timeAgo(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmModal {...modalProps} />
    </main>
  );
}
