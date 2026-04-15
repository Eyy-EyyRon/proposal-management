"use client";

import Link from "next/link";
import {
  FilePlus,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  LayoutTemplate,
  Sparkles,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin-stat-card";
import { ActivityTable, type Activity } from "@/components/activity-table";
import { cn } from "@/lib/utils";

// Mock data - In production, these should come from dashboard_cache Firestore document
const dashboardStats = {
  activeProposals: 24,
  acceptanceRate: 78,
  teamSize: 5,
  trendActive: "+12%",
  trendAcceptance: "+5%",
  trendTeam: "+1",
};

// Mock team activity data
const recentTeamActivity: Activity[] = [
  {
    id: "1",
    type: "proposal_created",
    userName: "Sarah Johnson",
    userRole: "admin",
    description: "Created new proposal",
    target: "Northstar Inc. - Website Redesign",
    timestamp: "2026-04-15T14:30:00Z",
    timeAgo: "5 mins ago",
  },
  {
    id: "2",
    type: "proposal_accepted",
    userName: "Mike Chen",
    userRole: "admin",
    description: "Proposal accepted by client",
    target: "Dana Liu - Consulting Agreement",
    timestamp: "2026-04-15T13:15:00Z",
    timeAgo: "2 hours ago",
  },
  {
    id: "3",
    type: "team_member_added",
    userName: "Super Admin",
    userRole: "super-admin",
    description: "Added new team member",
    target: "Jessica Williams",
    timestamp: "2026-04-15T11:00:00Z",
    timeAgo: "4 hours ago",
  },
  {
    id: "4",
    type: "proposal_viewed",
    userName: "Emily Davis",
    userRole: "admin",
    description: "Client viewed proposal",
    target: "Robert Hayes - Marketing Strategy",
    timestamp: "2026-04-15T09:30:00Z",
    timeAgo: "6 hours ago",
  },
  {
    id: "5",
    type: "template_updated",
    userName: "Super Admin",
    userRole: "super-admin",
    description: "Updated template",
    target: "Standard Consulting Agreement",
    timestamp: "2026-04-14T16:45:00Z",
    timeAgo: "1 day ago",
  },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Dashboard Overview
        </h2>
        <p className="text-[13px] text-slate-500">
          Welcome back. Here&apos;s what&apos;s happening with your team and proposals.
        </p>
      </div>

      {/* Primary Action Cards */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Create Proposal Card */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 transition-all duration-200 hover:border-[#800000]/30 hover:shadow-[0_1px_3px_rgba(128,0,0,0.05)]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#800000]/5" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#800000]">
              <FilePlus className="h-6 w-6 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Create New Proposal
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Start from a template and customize for your client. Share via link
              for easy signing.
            </p>
            <Link
              href="/super-admin/proposals/new"
              className={cn(
                "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
                "bg-[#800000] text-[13px] font-medium text-white",
                "transition-all duration-200",
                "hover:bg-[#660000] hover:shadow-lg hover:shadow-[#800000]/20",
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
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 transition-all duration-200 hover:border-slate-300 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-100" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Users className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Manage Team
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Add or remove team members, manage permissions, and monitor
              activity across your organization.
            </p>
            <Link
              href="/super-admin/team"
              className={cn(
                "mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5",
                "border border-slate-200 bg-white text-[13px] font-medium text-slate-700",
                "transition-all duration-200",
                "hover:border-[#800000] hover:bg-[#800000]/5 hover:text-[#800000]"
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
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#800000]" />
            <h3 className="text-[14px] font-semibold text-slate-900">
              Key Metrics
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Cached from dashboard_cache
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStatCard
            label="Active Proposals"
            value={dashboardStats.activeProposals}
            icon={FileText}
            trend={dashboardStats.trendActive}
            trendUp={true}
            description="Currently in progress"
            variant="highlight"
          />
          <AdminStatCard
            label="Acceptance Rate"
            value={`${dashboardStats.acceptanceRate}%`}
            icon={TrendingUp}
            trend={dashboardStats.trendAcceptance}
            trendUp={true}
            description="Client acceptance rate"
            variant="success"
          />
          <AdminStatCard
            label="Team Size"
            value={dashboardStats.teamSize}
            icon={Users}
            trend={dashboardStats.trendTeam}
            trendUp={true}
            description="Active team members"
            variant="default"
          />
        </div>
      </section>

      {/* Activity Feed Section */}
      <section>
        <ActivityTable
          activities={recentTeamActivity}
          maxItems={5}
          showViewAll={true}
        />
      </section>

      {/* Quick Links Section */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-slate-900">
          Quick Links
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/super-admin/templates"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#800000]/30 hover:bg-[#800000]/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
              <LayoutTemplate className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              Templates
            </span>
          </Link>
          <Link
            href="/super-admin/proposals"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#800000]/30 hover:bg-[#800000]/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              All Proposals
            </span>
          </Link>
          <Link
            href="/super-admin/settings"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#800000]/30 hover:bg-[#800000]/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
              <Sparkles className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              Settings
            </span>
          </Link>
          <Link
            href="/super-admin/team"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#800000]/30 hover:bg-[#800000]/5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
              <Users className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-[13px] font-medium text-slate-700">
              Team
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
