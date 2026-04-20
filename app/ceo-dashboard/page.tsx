"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, FileText, Trash2, ArrowRight, Loader2,
  CheckCircle, Eye, XCircle, DollarSign, Activity,
  Send, FileCheck, FileX, Wifi, WifiOff, AlertTriangle,
  Share2, Shield, ClipboardCheck,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { StatCardSkeleton } from "@/components/proposal-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { DepartmentBadge } from "@/components/department-badge";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToAllProposals,
  subscribeToRecentActivity,
  subscribeToGlobalStats,
  batchGetUserNames,
  type Proposal,
  type GlobalStats,
} from "@/lib/firestore";

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

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

function toBadge(s: string) {
  const map: Record<string, "Sent" | "Viewed" | "Accepted" | "Rejected"> = {
    sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected",
  };
  return map[s] ?? "Sent";
}

const STATUS_ICONS: Record<string, { icon: typeof Eye; color: string; bg: string }> = {
  sent:     { icon: Send,      color: "text-slate-500",   bg: "bg-slate-100" },
  viewed:   { icon: Eye,       color: "text-sky-500",     bg: "bg-sky-50" },
  accepted: { icon: FileCheck,  color: "text-emerald-500", bg: "bg-emerald-50" },
  rejected: { icon: FileX,     color: "text-rose-500",    bg: "bg-rose-50" },
};

interface HealthStatus {
  status: "ok" | "degraded" | "loading";
  timestamp?: string;
  services?: Record<string, { ok: boolean; latencyMs: number; name: string }>;
}

export default function CeoDashboardPage() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [recentActivity, setRecentActivity] = useState<Proposal[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [health, setHealth] = useState<HealthStatus>({ status: "loading" });
  const [globalStats, setGlobalStats] = useState<Partial<GlobalStats>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // Subscribe to the 1-doc stats summary (replaces full proposals aggregate)
  useEffect(() => {
    return subscribeToGlobalStats((stats) => {
      setGlobalStats(stats);
      setStatsLoading(false);
    });
  }, []);

  // Keep subscribeToAllProposals only for the Recent Proposals table (limited to 8)
  useEffect(() => {
    const unsub = subscribeToAllProposals((data) => {
      setProposals(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToRecentActivity(10, async (data) => {
      setRecentActivity(data);
      const uids = data.map((p) => p.userId);
      if (uids.length > 0) {
        const names = await batchGetUserNames(uids);
        setUserNames(names);
      }
      setPulseLoading(false);
    });
    return unsub;
  }, []);

  // Headline numbers come from the stats/global doc (1 read)
  const counts = {
    total:    globalStats.totalProposals ?? 0,
    pipeline: (globalStats.totalSent ?? 0),
    viewed:   globalStats.totalViewed ?? 0,
    accepted: globalStats.totalAccepted ?? 0,
    rejected: globalStats.totalRejected ?? 0,
  };

  const closeRate = counts.total > 0
    ? ((counts.accepted / counts.total) * 100).toFixed(1)
    : "0.0";

  const active = proposals.filter((p) => p.status !== "archived");
  const recentProposals = active.slice(0, 8);
  // Integration health polling — every 60s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHealth(data as HealthStatus);
      } catch {
        setHealth({ status: "degraded" });
      }
    };
    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, []);

  const greeting = getGreeting();
  const firstName = profile?.firstName ?? "there";

  function describeActivity(p: Proposal): string {
    const who = userNames[p.userId] || "Someone";
    const dept = p.department ? ` (${p.department})` : "";
    switch (p.status) {
      case "sent":     return `${who}${dept} sent a proposal to ${p.clientName}`;
      case "viewed":   return `${p.clientName} viewed a proposal from ${who}${dept}`;
      case "accepted": return `${p.clientName} signed a proposal from ${who}${dept}`;
      case "rejected": return `${p.clientName} rejected a proposal from ${who}${dept}`;
      default:         return `${who}${dept} updated proposal for ${p.clientName}`;
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="CEO Overview" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Greeting */}
        <div>
          <h2 className="font-sans text-lg font-semibold text-slate-900">
            {greeting}, {firstName}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Executive overview of all proposal activity across the organization.
          </p>
        </div>

        {/* Global Metrics — reads from stats/global (1 doc, not 1000 proposals) */}
        {statsLoading ? (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </section>
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total Proposals"     value={counts.total}       icon={FileText}    accent="indigo" />
            <StatCard label="Total Pipeline"      value={counts.pipeline}    icon={DollarSign}  accent="blue" />
            <StatCard label="Viewed"              value={counts.viewed}      icon={Eye}         accent="blue" />
            <StatCard label="Global Close Rate"   value={`${closeRate}%`}    icon={TrendingUp}  accent="green" />
            <StatCard label="Rejected"            value={counts.rejected}    icon={XCircle}     accent="red" />
          </section>
        )}

        {/* Integration Health Monitor */}
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
          health.status === "ok"
            ? "border-emerald-200/80 bg-emerald-50/60"
            : health.status === "degraded"
            ? "border-rose-200/80 bg-rose-50/60"
            : "border-slate-200/60 bg-slate-50/40"
        }`}>
          <span className="flex items-center gap-1.5">
            {health.status === "ok" ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : health.status === "degraded" ? (
              <WifiOff className="h-4 w-4 text-rose-500" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            )}
            <span className={`text-[12px] font-semibold ${
              health.status === "ok" ? "text-emerald-700" :
              health.status === "degraded" ? "text-rose-700" : "text-slate-500"
            }`}>
              {health.status === "ok" ? "All Systems Operational" :
               health.status === "degraded" ? "Service Degraded" : "Checking systems…"}
            </span>
          </span>
          {health.services && Object.values(health.services).map((svc) => (
            <span key={svc.name} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
              svc.ok
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200"
            }`}>
              {svc.ok ? <CheckCircle className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
              {svc.name} {svc.ok ? `${svc.latencyMs}ms` : "DOWN"}
            </span>
          ))}
          {health.timestamp && (
            <span className="ml-auto text-[11px] text-slate-400">
              Last checked {new Date(health.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Global Analytics",  href: "/ceo-dashboard/analytics",        icon: TrendingUp,  desc: "Department comparisons" },
            { label: "All Proposals",     href: "/ceo-dashboard/proposals",         icon: FileText,    desc: "Cross-dept proposal list" },
            { label: "Task Center",       href: "/ceo-dashboard/tasks",             icon: ClipboardCheck, desc: "Talking Inbox & delegation" },
            { label: "Sharing & Approvals", href: "/ceo-dashboard/sharing-monitor", icon: Share2,      desc: "Cross-dept sharing monitor" },
            { label: "Delegation Center", href: "/ceo-dashboard/delegation",        icon: Shield,      desc: "Manage authority levels" },
            { label: "Contracts",         href: "/ceo-dashboard/documents",         icon: CheckCircle, desc: "Signed contract repository" },
            { label: "Trash",             href: "/ceo-dashboard/trash",             icon: Trash2,      desc: "Deleted items recovery" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-amber-100/80 bg-white p-4 transition hover:border-amber-200 hover:shadow-sm hover:shadow-amber-100/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50/80 text-amber-600 transition group-hover:bg-amber-100 group-hover:text-amber-700">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-amber-500" />
              </div>
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-5">
            {/* Global Pulse — Activity Feed */}
            <div className="rounded-xl border border-slate-200/80 bg-white lg:col-span-2">
              <div className="flex items-center gap-2 px-5 py-4">
                <Activity className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">Global Pulse</h3>
              </div>
              {pulseLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="px-5 pb-5">
                  <p className="py-6 text-center text-[13px] text-slate-400">No recent activity</p>
                </div>
              ) : (
                <div className="px-5 pb-4">
                  <div className="space-y-1">
                    {recentActivity.map((p) => {
                      const cfg = STATUS_ICONS[p.status] ?? STATUS_ICONS.sent;
                      const Icon = cfg.icon;
                      return (
                        <div key={p.id} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-slate-50/80">
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] leading-relaxed text-slate-600">{describeActivity(p)}</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">{timeAgo(p.updatedAt)}</span>
                              <DepartmentBadge department={p.department} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Proposals Table */}
            <div className="rounded-xl border border-slate-200/80 bg-white lg:col-span-3">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Proposals</h3>
                <Link href="/ceo-dashboard/proposals" className="inline-flex items-center gap-1 text-[13px] font-medium text-amber-600 transition hover:text-amber-700">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {recentProposals.length === 0 ? (
                <div className="px-5 pb-5">
                  <p className="py-8 text-center text-[13px] text-slate-400">No proposals yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Template</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dept</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProposals.map((p, i) => (
                        <tr key={p.id} className={`transition-colors hover:bg-slate-50/80 ${i !== recentProposals.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                          <td className="px-5 py-3">
                            <p className="text-[13px] font-medium text-slate-800">{p.clientName}</p>
                            <p className="text-[12px] text-slate-400">{p.clientEmail}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{p.templateName}</td>
                          <td className="whitespace-nowrap px-5 py-3"><DepartmentBadge department={p.department} /></td>
                          <td className="px-5 py-3"><StatusBadge status={toBadge(p.status)} /></td>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{formatTs(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
