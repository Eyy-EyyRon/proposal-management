"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import {
  FileText, Eye, CheckCircle, Clock, Loader2, AlertTriangle, CalendarDays, ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToProposals, type Proposal } from "@/lib/firestore";

function tsMs(ts: unknown): number {
  if (!ts || typeof ts !== "object") return 0;
  return ((ts as { seconds: number }).seconds ?? 0) * 1000;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("Last 30 Days");

  useEffect(() => {
    if (!user) return;
    try {
      const unsub = subscribeToProposals(user.uid, (data) => {
        setProposals(data);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, [user]);

  const active = useMemo(() => proposals.filter((p) => p.status !== "archived"), [proposals]);
  const totalSent = active.length;
  const viewedCount = active.filter((p) => ["viewed", "accepted", "rejected"].includes(p.status)).length;
  const acceptedCount = active.filter((p) => p.status === "accepted").length;

  const viewRate = totalSent > 0 ? (viewedCount / totalSent) * 100 : 0;
  const acceptRate = totalSent > 0 ? (acceptedCount / totalSent) * 100 : 0;

  const avgSign = useMemo(() => {
    const signed = active.filter((p) => p.status === "accepted" && p.signedAt && p.createdAt);
    if (signed.length === 0) return "—";
    const total = signed.reduce((sum, p) => sum + (tsMs(p.signedAt) - tsMs(p.createdAt)), 0);
    const avgDays = total / signed.length / 86_400_000;
    return avgDays < 1 ? `${Math.round(avgDays * 24)}h` : `${avgDays.toFixed(1)}d`;
  }, [active]);

  const statusDist = useMemo(() => [
    { name: "Sent",     value: active.filter((p) => p.status === "sent").length,     color: "#94a3b8" },
    { name: "Viewed",   value: active.filter((p) => p.status === "viewed").length,   color: "#38bdf8" },
    { name: "Accepted", value: acceptedCount,                                         color: "#34d399" },
    { name: "Rejected", value: active.filter((p) => p.status === "rejected").length, color: "#fb7185" },
  ].filter((d) => d.value > 0), [active, acceptedCount]);

  const timeline = useMemo(() => {
    const buckets: { date: string; sent: number; accepted: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      buckets.push({ date: d.toISOString().slice(0, 10), sent: 0, accepted: 0 });
    }
    for (const p of active) {
      const key = new Date(tsMs(p.createdAt)).toISOString().slice(0, 10);
      const b = buckets.find((x) => x.date === key);
      if (b) { b.sent++; if (p.status === "accepted") b.accepted++; }
    }
    return buckets;
  }, [active]);

  const statusTotal = useMemo(
    () => statusDist.reduce((sum, item) => sum + item.value, 0),
    [statusDist]
  );

  const pipelineMax = useMemo(
    () => Math.max(0, ...timeline.map((item) => Math.max(item.sent, item.accepted))),
    [timeline]
  );

  const pipelineDomainMax = Math.max(pipelineMax, 2);

  const baselineTicks = useMemo(() => {
    return [0, Math.ceil(pipelineDomainMax / 2), pipelineDomainMax];
  }, [pipelineDomainMax]);

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Topbar title="Analytics" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-end justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div>
            <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Analytics</h2>
            <p className="mt-1 text-[13px] text-slate-400">Your proposal performance metrics.</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[13px] text-slate-600 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)]">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="bg-transparent text-[13px] font-medium text-slate-700 outline-none"
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
              <option>All Time</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </label>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[13px] text-slate-400">Loading analytics…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-[14px] font-semibold text-slate-800">Unable to load analytics</p>
            <p className="mt-1 max-w-sm text-[13px] text-slate-500">{error}</p>
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Sent"        value={totalSent}                   icon={FileText}    accent="indigo" />
              <StatCard label="View Rate"         value={`${viewRate.toFixed(1)}%`}   icon={Eye}         accent="blue" />
              <StatCard label="Acceptance Rate"   value={`${acceptRate.toFixed(1)}%`} icon={CheckCircle} accent="green" />
              <StatCard label="Avg. Time to Sign" value={avgSign}                     icon={Clock}       accent="indigo" />
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Donut */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="px-5 py-4"><h3 className="text-sm font-semibold text-slate-900">Status Distribution</h3></div>
                <div className="flex items-center justify-center px-5 pb-5">
                  {statusDist.length === 0 ? (
                    <p className="py-10 text-[13px] text-slate-400">No data yet</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="relative h-[200px] w-[200px] min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              <filter id="segmentShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#780116" floodOpacity="0.12" />
                              </filter>
                            </defs>
                            <Pie
                              data={statusDist}
                              cx="50%"
                              cy="50%"
                              innerRadius={68}
                              outerRadius={92}
                              paddingAngle={2}
                              dataKey="value"
                              strokeWidth={12}
                              strokeLinecap="round"
                            >
                              {statusDist.map((entry, idx) => (
                                <Cell
                                  key={idx}
                                  fill={entry.color}
                                  stroke={entry.color}
                                  filter="url(#segmentShadow)"
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Grand Total</p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{statusTotal}</p>
                          </div>
                        </div>
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

              {/* Area Chart */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Pipeline Activity (14 days)</h3>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="h-2 w-2 rounded-full bg-indigo-300" /> Sent</span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Accepted</span>
                  </div>
                </div>
                <div className="px-2 pb-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pipelineStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#780116" />
                          <stop offset="100%" stopColor="#64748b" />
                        </linearGradient>
                        <linearGradient id="pipelineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#780116" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#64748b" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis ticks={baselineTicks} domain={[0, pipelineDomainMax]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} labelFormatter={(d) => new Date(String(d) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
                      <Area type="monotone" dataKey="sent" stroke="url(#pipelineStroke)" fill="url(#pipelineFill)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: "#780116", strokeWidth: 2, fill: "#fff" }} />
                      <Area type="monotone" dataKey="accepted" stroke="#34d399" fill="rgba(52, 211, 153, 0.06)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#34d399", strokeWidth: 2, fill: "#fff" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
