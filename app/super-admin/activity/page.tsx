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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Activity Log</h2>
        <p className="text-[13px] text-slate-500">
          Track all actions across your organization.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select className="border-none bg-transparent text-[13px] text-slate-700 outline-none">
              <option value="all">All Activity</option>
              <option value="proposals">Proposals</option>
              <option value="team">Team</option>
              <option value="templates">Templates</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <select className="border-none bg-transparent text-[13px] text-slate-700 outline-none">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Activity Table */}
      <ActivityTable
        activities={allActivities}
        maxItems={10}
        showViewAll={false}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate-500">
          Showing 1-{allActivities.length} of {allActivities.length} activities
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-400 disabled:opacity-50"
          >
            Previous
          </button>
          <button className="rounded-lg bg-[#800000] px-3 py-1.5 text-[13px] text-white">
            1
          </button>
          <button
            disabled
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-400 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
