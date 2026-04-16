"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/chart-card";
import {
  FileText, Eye, CheckCircle, Clock, Loader2, AlertTriangle,
  DollarSign, Filter,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  subscribeToDepartmentsList,
  subscribeToAllProposals,
  type Proposal,
  type FirestoreDepartment,
} from "@/lib/firestore";

function tsMs(ts: unknown): number {
  if (!ts || typeof ts !== "object") return 0;
  return ((ts as { seconds: number }).seconds ?? 0) * 1000;
}

const DEPT_PALETTE = [
  "#6366f1", "#d946ef", "#f59e0b", "#0ea5e9", "#10b981",
  "#f43f5e", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899",
];

export default function CeoAnalyticsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState("all");

  useEffect(() => {
    try {
      const unsub = subscribeToAllProposals((data) => {
        setProposals(data);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToDepartmentsList(setDepartments);
    return unsub;
  }, []);

  // Filter by selected department
  const active = useMemo(() => {
    const base = proposals.filter((p) => p.status !== "archived");
    if (selectedDept === "all") return base;
    return base.filter((p) => p.department === selectedDept);
  }, [proposals, selectedDept]);

  const totalSent = active.length;
  const viewedCount = active.filter((p) => ["viewed", "accepted", "rejected"].includes(p.status)).length;
  const acceptedCount = active.filter((p) => p.status === "accepted").length;
  const pipelineCount = active.filter((p) => p.status === "sent" || p.status === "viewed").length;

  const viewRate = totalSent > 0 ? ((viewedCount / totalSent) * 100) : 0;
  const closeRate = totalSent > 0 ? ((acceptedCount / totalSent) * 100) : 0;

  const avgSign = useMemo(() => {
    const signed = active.filter((p) => p.status === "accepted" && p.signedAt && p.createdAt);
    if (signed.length === 0) return "—";
    const total = signed.reduce((sum, p) => sum + (tsMs(p.signedAt) - tsMs(p.createdAt)), 0);
    const avgDays = total / signed.length / 86_400_000;
    return avgDays < 1 ? `${Math.round(avgDays * 24)}h` : `${avgDays.toFixed(1)}d`;
  }, [active]);

  // Department comparison — always show all depts (unfiltered)
  const deptData = useMemo(() => {
    const allActive = proposals.filter((p) => p.status !== "archived");
    return departments.map((dept) => {
      const dp = allActive.filter((p) => p.department === dept.name);
      return {
        name: dept.name,
        total: dp.length,
        accepted: dp.filter((p) => p.status === "accepted").length,
        rejected: dp.filter((p) => p.status === "rejected").length,
        pending: dp.filter((p) => p.status === "sent" || p.status === "viewed").length,
      };
    }).filter((d) => d.total > 0);
  }, [proposals, departments]);

  // Heatmap data: status × department
  const heatmapData = useMemo(() => {
    const allActive = proposals.filter((p) => p.status !== "archived");
    const statuses = ["sent", "viewed", "accepted", "rejected"] as const;
    return departments.map((dept) => {
      const dp = allActive.filter((p) => p.department === dept.name);
      const row: Record<string, string | number> = { name: dept.name };
      for (const s of statuses) row[s] = dp.filter((p) => p.status === s).length;
      return row;
    }).filter((r) => departments.some((d) => d.name === r.name));
  }, [proposals, departments]);

  // Department close rates
  const deptCloseRate = useMemo(() => {
    const allActive = proposals.filter((p) => p.status !== "archived");
    return departments.map((dept, i) => {
      const dp = allActive.filter((p) => p.department === dept.name);
      const acc = dp.filter((p) => p.status === "accepted").length;
      const rate = dp.length > 0 ? Math.round((acc / dp.length) * 100) : 0;
      return { name: dept.name, rate, fill: DEPT_PALETTE[i % DEPT_PALETTE.length] };
    }).filter((d) => deptData.some((dd) => dd.name === d.name));
  }, [proposals, departments, deptData]);

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

  const deptFilter = (
    <div className="flex items-center gap-2">
      <Filter className="h-3.5 w-3.5 text-slate-400" />
      <select
        value={selectedDept}
        onChange={(e) => setSelectedDept(e.target.value)}
        className="rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[12px] text-slate-600 focus:outline-none focus:border-amber-300"
      >
        <option value="all">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.name}>{d.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Global Analytics" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Global Analytics</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Cross-department proposal performance and business intelligence.</p>
          </div>
          {deptFilter}
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
            <div className="text-center">
              <p className="text-[14px] font-semibold text-slate-800">Unable to load analytics</p>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
                {error.includes("index") ? "Firestore indexes are still building. Try again shortly." : error}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Executive KPIs */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Total Proposals"     value={totalSent}                    icon={FileText}    accent="indigo" />
              <StatCard label="Total Pipeline"      value={pipelineCount}                icon={DollarSign}  accent="blue" />
              <StatCard label="View Rate"           value={`${viewRate.toFixed(1)}%`}    icon={Eye}         accent="blue" />
              <StatCard label="Global Close Rate"   value={`${closeRate.toFixed(1)}%`}   icon={CheckCircle} accent="green" />
              <StatCard label="Avg. Time to Sign"   value={avgSign}                      icon={Clock}       accent="indigo" />
            </section>

            {/* Department Performance Bar Chart */}
            <ChartCard title="Department Performance" subtitle="Proposals by department and outcome">
              {deptData.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-slate-400">No department data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                    <Bar dataKey="accepted" name="Accepted" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pipeline" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Proposal Status Heatmap */}
            <ChartCard title="Proposal Status Heatmap" subtitle="Status distribution across departments">
              {heatmapData.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-slate-400">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={heatmapData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                    <Bar dataKey="sent" name="Sent" fill="#94a3b8" radius={[0, 4, 4, 0]} stackId="stack" />
                    <Bar dataKey="viewed" name="Viewed" fill="#38bdf8" radius={[0, 0, 0, 0]} stackId="stack" />
                    <Bar dataKey="accepted" name="Accepted" fill="#34d399" radius={[0, 0, 0, 0]} stackId="stack" />
                    <Bar dataKey="rejected" name="Rejected" fill="#fb7185" radius={[0, 4, 4, 0]} stackId="stack" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Donut — Status Distribution */}
              <ChartCard title="Status Distribution" className="flex flex-col">
                <div className="flex flex-1 items-center justify-center px-3 pb-3">
                  {statusDist.length === 0 ? (
                    <p className="py-10 text-[13px] text-slate-400">No data</p>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="h-[180px] w-[180px] min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                              {statusDist.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
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
              </ChartCard>

              {/* Department Close Rate */}
              <ChartCard title="Close Rate by Department" subtitle="Percentage of proposals accepted">
                <div className="px-3 pb-1">
                  {deptCloseRate.length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-slate-400">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {deptCloseRate.map((d) => (
                        <div key={d.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-medium text-slate-600">{d.name}</span>
                            <span className="text-[12px] font-semibold text-slate-800">{d.rate}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${d.rate}%`, backgroundColor: d.fill }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Pipeline Timeline */}
            <ChartCard
              title="Pipeline Activity (14 days)"
              action={
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="h-2 w-2 rounded-full bg-indigo-300" /> Sent</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Accepted</span>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ceoGradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ceoGradAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} labelFormatter={(d) => new Date(String(d) + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
                  <Area type="monotone" dataKey="sent" stroke="#818cf8" fill="url(#ceoGradSent)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="accepted" stroke="#34d399" fill="url(#ceoGradAcc)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </div>
    </main>
  );
}
