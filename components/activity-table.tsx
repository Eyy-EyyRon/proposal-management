"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  ArrowRight,
  FilePlus,
  UserPlus,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityType =
  | "proposal_created"
  | "proposal_sent"
  | "proposal_viewed"
  | "proposal_accepted"
  | "proposal_rejected"
  | "team_member_added"
  | "team_member_removed"
  | "template_created"
  | "template_updated"
  | "settings_changed";

export interface Activity {
  id: string;
  type: ActivityType;
  userName: string;
  userRole: "super-admin" | "admin";
  description: string;
  target?: string;
  timestamp: string;
  timeAgo: string;
}

interface ActivityTableProps {
  activities: Activity[];
  maxItems?: number;
  showViewAll?: boolean;
}

const activityConfig: Record<
  ActivityType,
  { icon: typeof FileText; color: string; bgColor: string; label: string }
> = {
  proposal_created: {
    icon: FilePlus,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Created",
  },
  proposal_sent: {
    icon: FileText,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    label: "Sent",
  },
  proposal_viewed: {
    icon: Eye,
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    label: "Viewed",
  },
  proposal_accepted: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "Accepted",
  },
  proposal_rejected: {
    icon: XCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    label: "Rejected",
  },
  team_member_added: {
    icon: UserPlus,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    label: "Team Added",
  },
  team_member_removed: {
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    label: "Team Removed",
  },
  template_created: {
    icon: FileText,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Template",
  },
  template_updated: {
    icon: Settings,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    label: "Updated",
  },
  settings_changed: {
    icon: Settings,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    label: "Settings",
  },
};

function ActivityIcon({ type }: { type: ActivityType }) {
  const config = activityConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        config.bgColor
      )}
    >
      <Icon className={cn("h-4 w-4", config.color)} />
    </div>
  );
}

function ActivityBadge({ type }: { type: ActivityType }) {
  const config = activityConfig[type];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
        config.bgColor,
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

export function ActivityTable({
  activities,
  maxItems = 5,
  showViewAll = true,
}: ActivityTableProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white">
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">No recent activity</p>
          <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
            Team actions and proposal updates will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#800000]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Team Activity
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Last {maxItems} actions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/50">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Action
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Team Member
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {displayActivities.map((activity, i) => (
              <tr
                key={activity.id}
                className={cn(
                  "group transition-colors hover:bg-slate-50/80",
                  i !== displayActivities.length - 1 && "border-b border-slate-100/80"
                )}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <ActivityIcon type={activity.type} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800">
                        {activity.description}
                      </p>
                      {activity.target && (
                        <p className="truncate text-[12px] text-slate-400">
                          {activity.target}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        activity.userRole === "super-admin"
                          ? "bg-[#800000]/10 text-[#800000]"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {activity.userName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] text-slate-700">
                        {activity.userName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {activity.userRole === "super-admin"
                          ? "Super Admin"
                          : "Admin"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <ActivityBadge type={activity.type} />
                </td>
                <td className="px-5 py-3 text-right">
                  <p className="text-[12px] text-slate-500">{activity.timeAgo}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showViewAll && activities.length > maxItems && (
        <div className="border-t border-slate-100 px-5 py-3">
          <Link
            href="/super-admin/activity"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-[#800000]"
          >
            View all activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
