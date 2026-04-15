"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, FileText, Trash2, ArrowRight, Loader2,
  CheckCircle, Eye, XCircle, DollarSign,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { DepartmentBadge } from "@/components/department-badge";
import { useAuth } from "@/contexts/auth-context";
import { subscribeToAllProposals, type Proposal } from "@/lib/firestore";

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function toBadge(s: string) {
  const map: Record<string, "Sent" | "Viewed" | "Accepted" | "Rejected"> = {
    sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected",
  };
  return map[s] ?? "Sent";
}

export default function CeoDashboardPage() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllProposals((data) => {
      setProposals(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const active = proposals.filter((p) => p.status !== "archived");
  const counts = {
    total: active.length,
    pipeline: active.filter((p) => p.status === "sent" || p.status === "viewed").length,
    viewed: active.filter((p) => p.status === "viewed").length,
    accepted: active.filter((p) => p.status === "accepted").length,
    rejected: active.filter((p) => p.status === "rejected").length,
  };

  const acceptRate = counts.total > 0
    ? ((counts.accepted / counts.total) * 100).toFixed(1)
    : "0.0";

  const recentProposals = active.slice(0, 8);
  const greeting = getGreeting();
  const firstName = profile?.firstName ?? "there";

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

        {/* Global Metrics */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Proposals"  value={counts.total}      icon={FileText}    accent="indigo" />
          <StatCard label="Global Pipeline"  value={counts.pipeline}   icon={DollarSign}  accent="blue" />
          <StatCard label="Viewed"           value={counts.viewed}     icon={Eye}         accent="blue" />
          <StatCard label="Acceptance Rate"  value={`${acceptRate}%`}  icon={TrendingUp}  accent="green" />
          <StatCard label="Rejected"         value={counts.rejected}   icon={XCircle}     accent="red" />
        </section>

        {/* Quick Links */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Global Analytics", href: "/ceo-dashboard/analytics",  icon: TrendingUp,  desc: "Department comparisons" },
            { label: "All Proposals",    href: "/ceo-dashboard/proposals",   icon: FileText,    desc: "Cross-dept proposal list" },
            { label: "Contracts",        href: "/ceo-dashboard/documents",   icon: CheckCircle, desc: "Signed contract repository" },
            { label: "Trash",            href: "/ceo-dashboard/trash",       icon: Trash2,      desc: "Deleted items recovery" },
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
          /* Recent Proposals */
          <div className="rounded-xl border border-slate-200/80 bg-white">
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
