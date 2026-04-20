"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, ClipboardList, ShieldAlert, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useRole } from "@/contexts/auth-context";
import { subscribeToAuditLogs, type AuditLogEntry } from "@/lib/firestore";

const ACTION_COLORS: Record<string, string> = {
  proposal_created:   "bg-emerald-50 text-emerald-700",
  proposal_trashed:   "bg-rose-50 text-rose-700",
  proposal_restored:  "bg-sky-50 text-sky-700",
  proposal_deleted:   "bg-rose-100 text-rose-800",
  proposal_reassigned:"bg-indigo-50 text-indigo-700",
  proposal_voided:    "bg-amber-50 text-amber-700",
  proposal_archived:  "bg-slate-100 text-slate-600",
  template_created:   "bg-emerald-50 text-emerald-700",
  template_updated:   "bg-blue-50 text-blue-700",
  template_versioned: "bg-violet-50 text-violet-700",
  template_trashed:   "bg-rose-50 text-rose-700",
  user_deactivated:          "bg-rose-50 text-rose-700",
  user_reactivated:          "bg-emerald-50 text-emerald-700",
  identity_switched:         "bg-amber-50 text-amber-800",
  delegation_granted:        "bg-violet-50 text-violet-700",
  delegation_revoked:        "bg-rose-50 text-rose-700",
  staff_reassigned:          "bg-indigo-50 text-indigo-700",
  status_changed:            "bg-slate-50 text-slate-600",
  jit_elevation_requested:   "bg-orange-100 text-orange-800",
  jit_elevation_revoked:     "bg-slate-100 text-slate-600",
  jit_elevation_approved:    "bg-emerald-100 text-emerald-800",
  jit_elevation_denied:      "bg-rose-100 text-rose-800",
};

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "—";
  const seconds = (ts as { seconds: number }).seconds;
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const { isAdmin, isCeo } = useRole();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin && !isCeo) return;
    const unsub = subscribeToAuditLogs((data) => {
      setLogs(data);
      setLoading(false);
    }, 200);
    return unsub;
  }, [isAdmin, isCeo]);

  if (!isAdmin && !isCeo) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Audit Log" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Shield className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-[13px] text-slate-400">Access restricted to Admin and CEO.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Topbar title="Audit Log" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Audit Log</h2>
          <p className="mt-1 text-[13px] text-slate-400">
            Append-only record of all Admin and system actions. Entries cannot be modified or deleted.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
            <ClipboardList className="h-7 w-7 text-slate-300" />
            <p className="text-[13px] text-slate-400">No audit entries yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Time</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actor</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Action</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Description</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dept</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.015 }}
                    className={`border-b border-slate-100/60 last:border-0 ${
                      log.action === "jit_elevation_requested" ? "bg-orange-50/40" :
                      log.action === "jit_elevation_approved" ? "bg-emerald-50/40" :
                      log.action === "jit_elevation_denied"   ? "bg-rose-50/30" :
                      log.actingAsCeo ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-[12px] text-slate-400">
                      {formatTs(log.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-slate-800">{log.actorName}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{log.actorRole}</p>
                      {log.actingAsCeo && (
                        <span className="mt-0.5 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                          CEO Identity
                        </span>
                      )}
                      {log.action === "jit_elevation_requested" && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-700">
                          <ShieldAlert className="h-2.5 w-2.5" /> Elevated
                        </span>
                      )}
                      {log.action === "jit_elevation_revoked" && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          <ShieldCheck className="h-2.5 w-2.5" /> Revoked
                        </span>
                      )}
                      {log.action === "jit_elevation_approved" && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                          <ShieldCheck className="h-2.5 w-2.5" /> CEO Approved
                        </span>
                      )}
                      {log.action === "jit_elevation_denied" && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">
                          <ShieldAlert className="h-2.5 w-2.5" /> CEO Denied
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-500"
                      }`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-600 max-w-xs">
                      <p className="line-clamp-2">{log.description}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[12px] text-slate-400">
                      {log.department || "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
