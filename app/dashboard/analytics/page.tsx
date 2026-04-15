"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  Download,
  ArrowDownRight,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { getUserProposals, type Proposal } from "@/lib/firestore";
import { exportProposalsCsv, exportProposalsJson } from "@/lib/export-utils";

const dateOptions = [
  { value: "7d",  label: "7 days",  ms: 7  * 86_400_000 },
  { value: "30d", label: "30 days", ms: 30 * 86_400_000 },
  { value: "90d", label: "90 days", ms: 90 * 86_400_000 },
  { value: "1y",  label: "1 year",  ms: 365 * 86_400_000 },
];

function tsMs(ts: unknown): number {
  if (!ts || typeof ts !== "object") return 0;
  return ((ts as { seconds: number }).seconds ?? 0) * 1000;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserProposals(user.uid);
        if (!cancelled) setProposals(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const rangeMs = dateOptions.find((d) => d.value === dateRange)?.ms ?? 30 * 86_400_000;
  const cutoff = Date.now() - rangeMs;

  const filtered = useMemo(
    () => proposals.filter((p) => p.status !== "archived" && tsMs(p.createdAt) >= cutoff),
    [proposals, cutoff]
  );

  // ── Counts ────────────────────────────────────────────
  const totalSent = filtered.length;
  const viewedCount = filtered.filter((p) => ["viewed", "accepted", "rejected"].includes(p.status)).length;
  const acceptedCount = filtered.filter((p) => p.status === "accepted").length;
  const rejectedCount = filtered.filter((p) => p.status === "rejected").length;

  const viewRate = totalSent > 0 ? ((viewedCount / totalSent) * 100) : 0;
  const acceptRate = totalSent > 0 ? ((acceptedCount / totalSent) * 100) : 0;

  // ── Avg time to sign ──────────────────────────────────
  const avgSign = useMemo(() => {
    const signed = filtered.filter((p) => p.status === "accepted" && p.signedAt && p.createdAt);
    if (signed.length === 0) return "—";
    const total = signed.reduce((sum, p) => sum + (tsMs(p.signedAt) - tsMs(p.createdAt)), 0);
    const avgDays = total / signed.length / 86_400_000;
    return avgDays < 1 ? `${Math.round(avgDays * 24)}h` : `${avgDays.toFixed(1)}d`;
  }, [filtered]);

  // ── Funnel ────────────────────────────────────────────
  const funnel = [
    { stage: "Sent",     count: totalSent,     pct: 100,                                            color: "bg-slate-200" },
    { stage: "Viewed",   count: viewedCount,   pct: totalSent ? +((viewedCount / totalSent) * 100).toFixed(1) : 0,   color: "bg-sky-200" },
    { stage: "Accepted", count: acceptedCount, pct: totalSent ? +((acceptedCount / totalSent) * 100).toFixed(1) : 0, color: "bg-emerald-200" },
    { stage: "Rejected", count: rejectedCount, pct: totalSent ? +((rejectedCount / totalSent) * 100).toFixed(1) : 0, color: "bg-rose-200" },
  ];

  // ── Timeline (daily bars) ─────────────────────────────
  const timeline = useMemo(() => {
    const days = Math.min(Math.ceil(rangeMs / 86_400_000), 14); // max 14 bars
    const buckets: { date: string; sent: number; accepted: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key, sent: 0, accepted: 0 });
    }
    for (const p of filtered) {
      const key = new Date(tsMs(p.createdAt)).toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) {
        b.sent++;
        if (p.status === "accepted") b.accepted++;
      }
    }
    return buckets;
  }, [filtered, rangeMs]);

  // ── Status distribution (donut) ─────────────────────
  const statusDist = useMemo(() => [
    { name: "Sent",     value: filtered.filter((p) => p.status === "sent").length,     color: "#94a3b8" },
    { name: "Viewed",   value: viewedCount - acceptedCount - rejectedCount,             color: "#38bdf8" },
    { name: "Accepted", value: acceptedCount,                                           color: "#34d399" },
    { name: "Rejected", value: rejectedCount,                                           color: "#fb7185" },
  ].filter((d) => d.value > 0), [filtered, viewedCount, acceptedCount, rejectedCount]);

  // ── Template performance ──────────────────────────────
  const templatePerf = useMemo(() => {
    const map = new Map<string, { name: string; sent: number; accepted: number }>();
    for (const p of filtered) {
      const existing = map.get(p.templateName) ?? { name: p.templateName, sent: 0, accepted: 0 };
      existing.sent++;
      if (p.status === "accepted") existing.accepted++;
      map.set(p.templateName, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.sent - a.sent)
      .map((t) => ({ ...t, rate: t.sent > 0 ? +((t.accepted / t.sent) * 100).toFixed(1) : 0 }));
  }, [filtered]);

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Analytics" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Analytics</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Track proposal performance and client engagement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {dateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                    dateRange === opt.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-[7px] text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button onClick={() => { exportProposalsCsv(proposals); setExportOpen(false); }} className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">Export CSV</button>
                  <button onClick={() => { exportProposalsJson(proposals); setExportOpen(false); }} className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">Export JSON</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Metrics */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Sent"        value={totalSent}                 icon={FileText}    accent="indigo" />
              <StatCard label="View Rate"         value={`${viewRate.toFixed(1)}%`} icon={Eye}         accent="blue" />
              <StatCard label="Acceptance Rate"   value={`${acceptRate.toFixed(1)}%`} icon={CheckCircle} accent="green" />
              <StatCard label="Avg. Time to Sign" value={avgSign}                   icon={Clock}       accent="indigo" />
            </section>

            {/* Charts Row: Funnel + Donut */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Sales Funnel */}
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Sales Funnel</h3>
                  <span className="text-[12px] text-slate-400">Last {dateOptions.find((d) => d.value === dateRange)?.label}</span>
                </div>
                <div className="px-5 pb-5">
                  <div className="space-y-1">
                    {funnel.map((step, i) => {
                      const widthPct = Math.max(step.pct, 8);
                      const convRate = i > 0 && funnel[i - 1].count > 0
                        ? ((step.count / funnel[i - 1].count) * 100).toFixed(0)
                        : null;
                      return (
                        <div key={step.stage}>
                          {i > 0 && (
                            <div className="flex items-center justify-center gap-1 py-1">
                              <ArrowDownRight className="h-3 w-3 text-slate-300" />
                              <span className="text-[10px] font-medium text-slate-400">{convRate}%</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div
                                className={`${step.color} flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-500`}
                                style={{ width: `${widthPct}%`, minWidth: "120px" }}
                              >
                                <span className="text-[12px] font-semibold text-slate-700">{step.stage}</span>
                                <span className="text-[12px] font-bold text-slate-800">{step.count}</span>
                              </div>
                            </div>
                            <span className="w-12 text-right text-[11px] font-medium text-slate-400">{step.pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Distribution Donut */}
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Status Distribution</h3>
                </div>
                <div className="flex items-center justify-center px-5 pb-5">
                  {statusDist.length === 0 ? (
                    <p className="py-10 text-[13px] text-slate-400">No data</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="h-[180px] w-[180px] min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusDist}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {statusDist.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {statusDist.map((d) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-[12px] text-slate-600">{d.name}</span>
                            <span className="ml-auto text-[12px] font-semibold text-slate-800">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline Area Chart */}
            <div className="rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Pipeline Activity</h3>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-indigo-300" /> Sent
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Accepted
                  </span>
                </div>
              </div>
              <div className="px-2 pb-4">
                {timeline.length === 0 ? (
                  <p className="flex h-[240px] items-center justify-center text-[13px] text-slate-400">No data for this period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                        labelFormatter={(d) => new Date(String(d) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#818cf8" fill="url(#gradSent)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="accepted" stroke="#34d399" fill="url(#gradAcc)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Template Performance */}
            <div className="rounded-xl border border-slate-200/80 bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Template Performance</h3>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </div>
              {templatePerf.length === 0 ? (
                <p className="px-5 pb-5 text-[13px] text-slate-400">No proposals in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Template</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Accepted</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acceptance Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templatePerf.map((t, i) => (
                        <tr key={t.name} className={`${i !== templatePerf.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] font-medium text-slate-800">{t.name}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{t.sent}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{t.accepted}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-20 rounded-full bg-slate-100">
                                <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${t.rate}%` }} />
                              </div>
                              <span className="text-[13px] font-medium text-slate-700">{t.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-[11px] text-slate-400">
              Data calculated from your proposals in real-time
            </p>
          </>
        )}
      </div>
    </main>
  );
}
