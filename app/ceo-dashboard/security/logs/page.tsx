"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, Clock, User, Monitor, Globe, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { subscribeToSystemPurgeLogs, type SystemPurgeLog } from "@/lib/firestore";
import type { Timestamp } from "firebase/firestore";

function formatTs(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZoneName: "short",
  });
}

function LogCard({ log }: { log: SystemPurgeLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
          <ShieldAlert className="h-5 w-5 text-red-700" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-red-800">
              {log.action}
            </span>
            <span className="text-[11px] text-slate-400">
              {formatTs(log.timestamp)}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-800">{log.details}</p>

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <User className="h-3 w-3" />
              {log.actorName}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Shield className="h-3 w-3" />
              {log.affectedUids.length} admin(s) revoked
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" />
              {log.elevationsWiped} session(s) wiped
            </span>
          </div>

          {/* Log ID */}
          <div className="mt-2 flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-slate-400" />
            <span className="font-mono text-[10px] text-slate-400 select-all">{log.id}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-2 flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {/* Expanded security metadata */}
      {expanded && (
        <div className="border-t border-red-100 bg-red-50/40 px-5 py-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">Security Metadata</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-white px-3 py-2.5">
              <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">IP Address</p>
                <p className="font-mono text-[12px] text-slate-800">{log.security.ipAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-white px-3 py-2.5">
              <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">User Agent</p>
                <p className="text-[11px] text-slate-700 line-clamp-2 break-all">{log.security.userAgent}</p>
              </div>
            </div>
          </div>

          {log.affectedUids.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-white px-3 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Affected UIDs ({log.affectedUids.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {log.affectedUids.map((uid) => (
                  <span key={uid} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 select-all">
                    {uid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SystemPurgeLogsPage() {
  const [logs, setLogs] = useState<SystemPurgeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToSystemPurgeLogs((data) => {
      setLogs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <>
      <Topbar title="System Purge Logs" />

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-700 to-red-800 shadow-md shadow-red-200">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">System Purge Logs</h1>
              <p className="text-[12px] text-slate-400">
                Immutable black-box records — {logs.length} event{logs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Immutability notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12px] leading-relaxed text-amber-800">
              These records are <strong>append-only</strong> at the database level. No user — including the CEO — can modify or delete them once written.
            </p>
          </div>

          {/* Log list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-[15px] font-semibold text-emerald-800">No Emergency Brakes Executed</p>
              <p className="mt-1 text-[12px] text-emerald-600">The system has never been purged.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
