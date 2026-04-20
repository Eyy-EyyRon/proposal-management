"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FilePlus,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  LayoutTemplate,
  Sparkles,
  Loader2,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin-stat-card";
import { cn } from "@/lib/utils";
import {
  subscribeToAllProposals,
  getAllUsers,
  type Proposal,
} from "@/lib/firestore";

export default function SuperAdminDashboardPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [teamSize, setTeamSize] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllProposals((data) => {
      setProposals(data);
      setLoading(false);
    });
    getAllUsers().then((u) => setTeamSize(u.length)).catch(() => {});
    return unsub;
  }, []);

  const stats = {
    totalProposals: proposals.length,
    totalSent: proposals.filter((p) => p.status === "sent").length,
    totalViewed: proposals.filter((p) => p.status === "viewed").length,
    totalAccepted: proposals.filter((p) => p.status === "accepted").length,
    totalRejected: proposals.filter((p) => p.status === "rejected").length,
  };

  const acceptanceRate =
    stats.totalAccepted + stats.totalRejected > 0
      ? Math.round(
          (stats.totalAccepted / (stats.totalAccepted + stats.totalRejected)) * 100
        )
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-12 px-8 pb-10 pt-12 lg:px-10">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
          Dashboard Overview
        </h2>
        <p className="max-w-2xl text-[13px] text-slate-500">
          Welcome back. Here&apos;s what&apos;s happening with your team and proposals.
        </p>
      </div>

      {/* Primary Action Cards */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Create Proposal Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:border-[#800020]/30 hover:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_12px_24px_rgba(0,0,0,0.04)]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#800020]/5" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#800020] shadow-lg shadow-[#800020]/10">
              <FilePlus className="h-6 w-6 text-white" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
              Create New Proposal
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Start from a template and customize for your client. Share via link
              for easy signing.
            </p>
            <Link
              href="/super-admin/proposals/new"
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
                "bg-[#800020] text-[13px] font-medium text-white shadow-lg shadow-[#800020]/20",
                "transition-all duration-300 ease-out",
                "hover:bg-[#660018] hover:shadow-lg hover:shadow-[#800020]/25",
                "active:scale-[0.98]"
              )}
            >
              <LayoutTemplate className="h-4 w-4" />
              Create from Template
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Manage Team Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.12),0_12px_24px_rgba(0,0,0,0.04)]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-100" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 shadow-sm">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
              Manage Team
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Add or remove team members, manage permissions, and monitor
              activity across your organization.
            </p>
            <Link
              href="/super-admin/team"
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
                "border border-slate-200 bg-white text-[13px] font-medium text-slate-700 shadow-sm",
                "transition-all duration-300 ease-out",
                "hover:border-[#800020] hover:bg-[#800020]/5 hover:text-[#800020]"
              )}
            >
              <Users className="h-4 w-4" />
              Manage Team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#800020]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Key Metrics
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Live from stats/global
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminStatCard
              label="Active Proposals"
              value={stats.totalSent + stats.totalViewed}
              icon={FileText}
              trend={`${stats.totalProposals} total`}
              trendUp={true}
              description="Sent + Viewed"
              variant="highlight"
            />
            <AdminStatCard
              label="Acceptance Rate"
              value={`${acceptanceRate}%`}
              icon={TrendingUp}
              trend={`${stats.totalAccepted} signed`}
              trendUp={acceptanceRate >= 50}
              description="Client acceptance rate"
              variant="success"
            />
            <AdminStatCard
              label="Team Size"
              value={teamSize}
              icon={Users}
              trend=""
              trendUp={true}
              description="Active team members"
              variant="default"
            />
          </div>
        )}
      </section>

      {/* Quick Links Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Quick Links
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/super-admin/templates"
            className="flex h-24 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 transition-all duration-300 ease-out hover:border-[#800020]/30 hover:bg-[#800020]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
              <LayoutTemplate className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">Templates</span>
          </Link>
          <Link
            href="/super-admin/proposals"
            className="flex h-24 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 transition-all duration-300 ease-out hover:border-[#800020]/30 hover:bg-[#800020]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">All Proposals</span>
          </Link>
          <Link
            href="/super-admin/settings"
            className="flex h-24 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 transition-all duration-300 ease-out hover:border-[#800020]/30 hover:bg-[#800020]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
              <Sparkles className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">Settings</span>
          </Link>
          <Link
            href="/super-admin/team"
            className="flex h-24 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 transition-all duration-300 ease-out hover:border-[#800020]/30 hover:bg-[#800020]/5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
              <Users className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">Team</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
