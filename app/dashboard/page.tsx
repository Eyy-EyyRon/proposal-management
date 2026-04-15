"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Eye, CheckCircle, XCircle, FilePlus, LayoutTemplate,
  ArrowRight, Clock, Loader2,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToProposals, type Proposal } from "@/lib/firestore";
import {
  subscribeToNotifications,
  type AppNotification,
} from "@/lib/notifications";

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts || !ts.seconds) return "";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
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

function notifToBadge(type: string) {
  const map: Record<string, "Viewed" | "Accepted" | "Rejected"> = {
    viewed: "Viewed", signed: "Accepted", rejected: "Rejected",
  };
  return map[type] ?? "Viewed";
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const greeting = getGreeting();
  const firstName = profile?.firstName ?? "there";

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activity, setActivity] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProposals(user.uid, (data) => {
      setProposals(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.uid, setActivity, 10);
  }, [user]);

  const active = proposals.filter((p) => p.status !== "archived");
  const counts = {
    total: active.length,
    viewed: active.filter((p) => p.status === "viewed").length,
    accepted: active.filter((p) => p.status === "accepted").length,
    rejected: active.filter((p) => p.status === "rejected").length,
  };

  const recentProposals = active.slice(0, 5);

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Dashboard" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">
              {greeting}, {firstName}
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Here&apos;s a snapshot of your proposals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/templates/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              New template
            </Link>
            <Link
              href="/dashboard/create-proposal"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#780116] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#C32F27]"
            >
              <FilePlus className="h-3.5 w-3.5" />
              New proposal
            </Link>
          </div>
        </div>

        {/* Stats */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Proposals" value={counts.total}    icon={FileText}    accent="indigo" />
          <StatCard label="Viewed"          value={counts.viewed}   icon={Eye}         accent="blue" />
          <StatCard label="Accepted"        value={counts.accepted} icon={CheckCircle} accent="green" />
          <StatCard label="Rejected"        value={counts.rejected} icon={XCircle}     accent="red" />
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          /* Main Content Grid */
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Recent Proposals Table — spans 2 cols */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Recent proposals</h3>
                  <Link href="/dashboard/proposals" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {recentProposals.length === 0 ? (
                  <div className="px-5 pb-5">
                    <EmptyState
                      icon={FileText}
                      title="No proposals yet"
                      description="Send your first proposal to a client. Their activity will appear here in real-time."
                      actionLabel="Create proposal"
                      actionHref="/dashboard/create-proposal"
                      gradient="from-indigo-500/5 via-violet-500/5 to-sky-500/5"
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-y border-slate-100 bg-slate-50/50">
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
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

            {/* Activity Feed — from real notifications */}
            <div className="rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="px-5 pb-4">
                {activity.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-slate-400">No recent activity</p>
                ) : (
                  <div className="space-y-0">
                    {activity.map((item, i) => (
                      <div key={item.id} className={`flex items-start gap-3 py-3 ${i !== activity.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                        <div className="mt-0.5">
                          <StatusBadge status={notifToBadge(item.type)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-slate-700">{item.message}</p>
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {timeAgo(item.createdAt as unknown as { seconds: number })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href="/dashboard/notifications"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  View all activity
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
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
