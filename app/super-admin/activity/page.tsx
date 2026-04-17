"use client";

import { Clock, Filter, Download } from "lucide-react";
import { ActivityTable, type Activity } from "@/components/activity-table";

// Extended mock activity data
const allActivities: Activity[] = [
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
  {
    id: "6",
    type: "proposal_sent",
    userName: "Sarah Johnson",
    userRole: "admin",
    description: "Sent proposal to client",
    target: "Ariana Cole - Design Services",
    timestamp: "2026-04-14T14:20:00Z",
    timeAgo: "1 day ago",
  },
  {
    id: "7",
    type: "proposal_rejected",
    userName: "Mike Chen",
    userRole: "admin",
    description: "Proposal was declined",
    target: "Lena Whitmore - Development Contract",
    timestamp: "2026-04-13T10:15:00Z",
    timeAgo: "2 days ago",
  },
  {
    id: "8",
    type: "settings_changed",
    userName: "Super Admin",
    userRole: "super-admin",
    description: "Updated workspace settings",
    target: "Notification preferences",
    timestamp: "2026-04-12T09:00:00Z",
    timeAgo: "3 days ago",
  },
  {
    id: "9",
    type: "template_created",
    userName: "Super Admin",
    userRole: "super-admin",
    description: "Created new template",
    target: "Software Development Contract",
    timestamp: "2026-04-11T15:30:00Z",
    timeAgo: "4 days ago",
  },
  {
    id: "10",
    type: "proposal_created",
    userName: "Emily Davis",
    userRole: "admin",
    description: "Created new proposal",
    target: "Venture Capital Partners",
    timestamp: "2026-04-10T11:20:00Z",
    timeAgo: "5 days ago",
  },
];

export default function ActivityPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-8 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
          Activity Log
        </h2>
        <p className="max-w-2xl text-[13px] text-slate-500">
          Track the business story as proposals, team changes, and system updates happen.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl lg:flex-1">
            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Activity Type
              </span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-colors duration-300 ease-out focus-within:border-[#800020]/30 focus-within:bg-white">
                <Filter className="h-4 w-4 text-slate-400" />
                <select className="w-full appearance-none border-none bg-transparent text-[13px] text-slate-700 outline-none">
                  <option value="all">All Activity</option>
                  <option value="proposals">Proposals</option>
                  <option value="team">Team</option>
                  <option value="templates">Templates</option>
                </select>
                <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm sm:inline-flex">
                  ⌘K
                </kbd>
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Date Range
              </span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-colors duration-300 ease-out focus-within:border-[#800020]/30 focus-within:bg-white">
                <Clock className="h-4 w-4 text-slate-400" />
                <select className="w-full appearance-none border-none bg-transparent text-[13px] text-slate-700 outline-none">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm sm:inline-flex">
                  ⌘K
                </kbd>
              </div>
            </label>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-300 ease-out hover:border-[#800020]/30 hover:text-[#800020]">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <ActivityTable
        activities={allActivities}
        maxItems={10}
        showViewAll={false}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
        <p className="text-[13px] text-slate-500">
          Showing 1-{allActivities.length} of {allActivities.length} activities
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-400 transition disabled:opacity-50"
          >
            Previous
          </button>
          <button className="rounded-full bg-[#800020] px-3 py-1.5 text-[13px] text-white shadow-sm shadow-[#800020]/20">
            1
          </button>
          <button
            disabled
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-400 transition disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
