"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  FilePlus,
  FileText,
  LayoutTemplate,
  Loader2,
  Search,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatusBadge } from "@/components/status-badge";
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

const QUICK_SEARCH_STOP_WORDS = new Set([
  "find",
  "show",
  "search",
  "proposal",
  "proposals",
  "client",
  "clients",
  "the",
  "a",
  "an",
  "my",
  "for",
  "to",
  "of",
  "on",
  "in",
  "please",
]);

function normalizeQuickSearch(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (QUICK_SEARCH_STOP_WORDS.has(token)) return [];
      if (token.endsWith("s") && token.length > 4) {
        return [token, token.slice(0, -1)];
      }
      return [token];
    });
}

function matchesProposalSearch(proposal: Proposal, terms: string[]): boolean {
  if (terms.length === 0) return true;

  const haystack = [
    proposal.clientName,
    proposal.clientEmail,
    proposal.templateName,
    proposal.department,
    proposal.status,
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

function Sparkline({ values }: { values: number[] }) {
  const width = 104;
  const height = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="rgba(120, 1, 22, 0.18)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polyline
        fill="none"
        stroke="#780116"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MetricRibbon({
  metrics,
}: {
  metrics: Array<{
    label: string;
    value: string | number;
    sparkline: number[];
  }>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
      <div className="grid gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
                  {metric.value}
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <ArrowUpRight className="h-3 w-3" />
                +12%
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50/80 p-2">
              <Sparkline values={metric.sparkline} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const greeting = getGreeting();
  const firstName = profile?.firstName ?? "there";

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activity, setActivity] = useState<AppNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

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
    return subscribeToNotifications(user.uid, (data) => {
      setActivity(data);
      setActivityLoading(false);
    }, 10);
  }, [user]);

  const active = proposals.filter((p) => p.status !== "archived");
  const counts = {
    total: active.length,
    viewed: active.filter((p) => p.status === "viewed").length,
    accepted: active.filter((p) => p.status === "accepted").length,
    rejected: active.filter((p) => p.status === "rejected").length,
  };

  const searchTerms = useMemo(
    () => normalizeQuickSearch(searchQuery),
    [searchQuery]
  );

  const visibleProposals = useMemo(() => {
    const matched = active.filter((proposal) =>
      matchesProposalSearch(proposal, searchTerms)
    );
    return (searchTerms.length > 0 ? matched : active).slice(0, 5);
  }, [active, searchTerms]);

  const hasNoActivity = !activityLoading && activity.length === 0;

  const metrics = [
    {
      label: "Active Proposals",
      value: counts.total,
      sparkline: [4, 5, 5, 6, 7, 8, 8],
    },
    {
      label: "Viewed",
      value: counts.viewed,
      sparkline: [2, 3, 4, 4, 5, 6, 6],
    },
    {
      label: "Accepted",
      value: counts.accepted,
      sparkline: [1, 2, 2, 3, 4, 4, 5],
    },
    {
      label: "Rejected",
      value: counts.rejected,
      sparkline: [3, 3, 2, 3, 2, 2, 1],
    },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Dashboard" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <header className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">
                {greeting}, {firstName}
              </h2>
              <p className="mt-1 text-[13px] text-slate-400">
                Here&apos;s a snapshot of your proposals.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-[46rem] lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Find John's proposal, accepted deals, or marketing templates"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-16 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-4 focus:ring-[#780116]/10"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  ⌘K
                </kbd>
              </label>

              <div className="flex items-center gap-2 lg:shrink-0">
                <Link
                  href="/dashboard/templates/new"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  New template
                </Link>
                <Link
                  href="/dashboard/create-proposal"
                  className={`inline-flex items-center gap-1.5 rounded-lg bg-[#780116] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#C32F27] ${
                    hasNoActivity
                      ? "shadow-[0_0_0_1px_rgba(120,1,22,0.18),0_10px_24px_rgba(120,1,22,0.16)] ring-1 ring-[#780116]/15"
                      : "shadow-sm shadow-[#780116]/15"
                  }`}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New proposal
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Metrics ribbon */}
        <MetricRibbon metrics={metrics} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)]">
            {/* Recent Proposals Table */}
            <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recent Proposals</h3>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {searchQuery.trim().length > 0
                      ? `${visibleProposals.length} match${visibleProposals.length === 1 ? "" : "es"} for “${searchQuery.trim()}”`
                      : "Your latest proposals at a glance"}
                  </p>
                </div>
                <Link
                  href="/dashboard/proposals"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {visibleProposals.length === 0 ? (
                <div className="px-5 pb-5">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      {searchQuery.trim().length > 0
                        ? "No matching proposals"
                        : "No proposals yet"}
                    </p>
                    <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
                      {searchQuery.trim().length > 0
                        ? "Try a different client, template, or status phrase."
                        : "Send your first proposal to a client. Their activity will appear here in real time."}
                    </p>
                    <Link
                      href="/dashboard/create-proposal"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#780116] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#C32F27]"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                      Create proposal
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Client
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Status
                        </th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProposals.map((proposal, index) => (
                        <tr
                          key={proposal.id}
                          className={`transition-colors hover:bg-[#780116]/5 ${
                            index !== visibleProposals.length - 1
                              ? "border-b border-slate-100/80"
                              : ""
                          }`}
                        >
                          <td className="px-5 py-3">
                            <p className="text-[13px] font-medium text-slate-800">
                              {proposal.clientName}
                            </p>
                            <p className="text-[12px] text-slate-400">
                              {proposal.clientEmail}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={toBadge(proposal.status)} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                            {formatTs(proposal.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Activity Feed */}
            <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="px-5 pb-4">
                {activity.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-slate-400">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-0">
                    {activity.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 py-3 ${
                          index !== activity.length - 1
                            ? "border-b border-slate-100/80"
                            : ""
                        }`}
                      >
                        <div className="mt-0.5">
                          <StatusBadge status={notifToBadge(item.type)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-slate-700">
                            {item.message}
                          </p>
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
            </section>
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
