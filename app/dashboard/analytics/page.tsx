"use client";

import { useState } from "react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
} from "lucide-react";

const data = {
  overview: {
    totalSent: 156,
    viewRate: 85.9,
    acceptanceRate: 66.4,
    avgTimeToAccept: "2.5d",
  },
  funnel: [
    { stage: "Sent",     count: 156, pct: 100,  color: "bg-slate-200" },
    { stage: "Viewed",   count: 134, pct: 85.9, color: "bg-sky-200" },
    { stage: "Accepted", count: 89,  pct: 66.4, color: "bg-emerald-200" },
    { stage: "Rejected", count: 23,  pct: 17.5, color: "bg-rose-200" },
  ],
  templates: [
    { name: "Standard Service Agreement", sent: 45, accepted: 32, rate: 71.1 },
    { name: "Project Proposal",           sent: 38, accepted: 28, rate: 73.7 },
    { name: "Retainer Agreement",         sent: 28, accepted: 18, rate: 64.3 },
    { name: "Consulting Agreement",       sent: 25, accepted: 15, rate: 60.0 },
    { name: "NDA",                        sent: 20, accepted: 16, rate: 80.0 },
  ],
  timeline: [
    { date: "2026-04-09", sent: 12, accepted: 8 },
    { date: "2026-04-10", sent: 15, accepted: 10 },
    { date: "2026-04-11", sent: 18, accepted: 12 },
    { date: "2026-04-12", sent: 22, accepted: 15 },
    { date: "2026-04-13", sent: 20, accepted: 13 },
    { date: "2026-04-14", sent: 25, accepted: 17 },
    { date: "2026-04-15", sent: 44, accepted: 14 },
  ],
};

const dateOptions = [
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y",  label: "1 year" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("7d");

  const maxSent = Math.max(...data.timeline.map(d => d.sent));

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
              {dateOptions.map(opt => (
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
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-[7px] text-[13px] font-medium text-slate-600 transition hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Metrics */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Sent"        value={data.overview.totalSent}              icon={FileText}    accent="indigo" trend="+12.5%" trendUp={true} />
          <StatCard label="View Rate"         value={`${data.overview.viewRate}%`}         icon={Eye}         accent="blue"   trend="+3.2%"  trendUp={true} />
          <StatCard label="Acceptance Rate"   value={`${data.overview.acceptanceRate}%`}   icon={CheckCircle} accent="green"  trend="-1.8%"  trendUp={false} />
          <StatCard label="Avg. Time to Sign" value={data.overview.avgTimeToAccept}        icon={Clock}       accent="indigo" trend="-0.5d"  trendUp={true} />
        </section>

        {/* Funnel + Activity Chart */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Funnel */}
          <div className="rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Conversion Funnel</h3>
              <span className="text-[12px] text-slate-400">Last {dateOptions.find(d => d.value === dateRange)?.label}</span>
            </div>
            <div className="px-5 pb-5">
              <div className="space-y-2">
                {data.funnel.map((step, i) => (
                  <div key={step.stage}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-700">{step.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900">{step.count}</span>
                        <span className="text-[11px] text-slate-400">{step.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${step.color} transition-all duration-500`}
                        style={{ width: `${step.pct}%` }}
                      />
                    </div>
                    {i < data.funnel.length - 1 && (
                      <div className="my-1 flex justify-center">
                        <ArrowDownRight className="h-3 w-3 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Daily Activity</h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-300" /> Sent
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Accepted
                </span>
              </div>
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-end gap-1.5" style={{ height: 140 }}>
                {data.timeline.map((day) => {
                  const sentH = (day.sent / maxSent) * 100;
                  const accH = (day.accepted / maxSent) * 100;
                  const weekday = new Date(day.date).toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
                      <div className="relative flex w-full items-end justify-center gap-0.5" style={{ height: 110 }}>
                        <div
                          className="w-2.5 rounded-t bg-slate-200 transition-all group-hover:bg-slate-300"
                          style={{ height: `${sentH}%` }}
                          title={`${day.sent} sent`}
                        />
                        <div
                          className="w-2.5 rounded-t bg-emerald-300 transition-all group-hover:bg-emerald-400"
                          style={{ height: `${accH}%` }}
                          title={`${day.accepted} accepted`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{weekday}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Template Performance */}
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Template Performance</h3>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
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
                {data.templates.map((t, i) => (
                  <tr
                    key={t.name}
                    className={`${i !== data.templates.length - 1 ? "border-b border-slate-100/80" : ""}`}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-[13px] font-medium text-slate-800">
                      {t.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{t.sent}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{t.accepted}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-20 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-emerald-400"
                            style={{ width: `${t.rate}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">{t.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400">
          Data refreshes every hour
        </p>
      </div>
    </main>
  );
}
