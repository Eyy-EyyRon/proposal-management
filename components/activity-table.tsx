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
  {
    icon: typeof FileText;
    iconBg: string;
    iconColor: string;
    badgeTone: string;
    label: string;
  }
> = {
  proposal_created: {
    icon: FilePlus,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600",
    badgeTone: "bg-sky-500/10 text-sky-700 ring-sky-500/15",
    label: "Created",
  },
  proposal_sent: {
    icon: FileText,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
    badgeTone: "bg-slate-500/10 text-slate-700 ring-slate-500/15",
    label: "Sent",
  },
  proposal_viewed: {
    icon: Eye,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    badgeTone: "bg-blue-500/10 text-blue-700 ring-blue-500/15",
    label: "Viewed",
  },
  proposal_accepted: {
    icon: CheckCircle,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    badgeTone: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15",
    label: "Accepted",
  },
  proposal_rejected: {
    icon: XCircle,
    iconBg: "bg-[#800020]/10",
    iconColor: "text-[#800020]",
    badgeTone: "bg-[#800020]/10 text-[#800020] ring-[#800020]/15",
    label: "Rejected",
  },
  team_member_added: {
    icon: UserPlus,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
    badgeTone: "bg-violet-500/10 text-violet-700 ring-violet-500/15",
    label: "Team Added",
  },
  team_member_removed: {
    icon: Users,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
    badgeTone: "bg-orange-500/10 text-orange-700 ring-orange-500/15",
    label: "Team Removed",
  },
  template_created: {
    icon: FileText,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    badgeTone: "bg-amber-500/10 text-amber-700 ring-amber-500/15",
    label: "Template",
  },
  template_updated: {
    icon: Settings,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-600",
    badgeTone: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/15",
    label: "Updated",
  },
  settings_changed: {
    icon: Settings,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
    badgeTone: "bg-slate-500/10 text-slate-700 ring-slate-500/15",
    label: "Settings",
  },
};

function ActivityIcon({ type }: { type: ActivityType }) {
  const config = activityConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-transform duration-300 ease-out group-hover:scale-110",
        config.iconBg
      )}
    >
      <Icon className={cn("h-4 w-4", config.iconColor)} />
    </div>
  );
}

function ActivityBadge({ type }: { type: ActivityType }) {
  const config = activityConfig[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition-colors duration-300 ease-out",
        "border-current/10 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
        config.badgeTone
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function getActionSentence(activity: Activity): string {
  const verbs: Record<ActivityType, string> = {
    proposal_created: "created a new proposal",
    proposal_sent: "sent a proposal to a client",
    proposal_viewed: "had a proposal viewed",
    proposal_accepted: "recorded an accepted proposal",
    proposal_rejected: "logged a declined proposal",
    team_member_added: "added a new team member",
    team_member_removed: "removed a team member",
    template_created: "created a new template",
    template_updated: "updated a template",
    settings_changed: "updated workspace settings",
  };

  return `${activity.userName} ${verbs[activity.type]}`;
}

function getActivityDetail(activity: Activity): string {
  if (!activity.target) return activity.timeAgo;
  return `${activity.target} • ${activity.timeAgo}`;
}

export function ActivityTable({
  activities,
  maxItems = 5,
  showViewAll = true,
}: ActivityTableProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 shadow-sm">
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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#800020]" />
          <h3 className="text-sm font-semibold text-slate-900">
            Recent Team Activity
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          Last {maxItems} actions
        </span>
      </div>

      <div className="relative px-6 pb-2">
        <div className="pointer-events-none absolute bottom-6 left-[1.75rem] top-0 w-[2px] bg-slate-200/80" />

        <div className="space-y-0">
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] gap-4 border-b border-slate-100 bg-slate-50/50 px-0 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <div />
            <div>Activity</div>
            <div>Status</div>
            <div className="text-right">Time</div>
          </div>

          {displayActivities.map((activity, i) => (
            <article
              key={activity.id}
              className={cn(
                "group grid grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] items-start gap-4 py-5 transition-all duration-300 ease-out hover:bg-slate-50/80",
                i !== displayActivities.length - 1 && "border-b border-slate-100/80"
              )}
            >
              <div className="relative z-10 flex justify-center pt-0.5">
                <ActivityIcon type={activity.type} />
              </div>

              <div className="min-w-0">
                <p className="text-[14px] font-medium text-slate-800">
                  {getActionSentence(activity)}
                </p>
                <p className="mt-1 text-[12px] text-slate-400">
                  {getActivityDetail(activity)}
                </p>
              </div>

              <div className="pt-1.5">
                <ActivityBadge type={activity.type} />
              </div>

              <div className="pt-1.5 text-right">
                <p className="text-[12px] text-slate-500">{activity.timeAgo}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showViewAll && activities.length > maxItems && (
        <div className="border-t border-slate-100 px-6 py-3">
          <Link
            href="/super-admin/activity"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[13px] font-medium text-slate-500 transition-all duration-300 ease-out hover:bg-slate-50 hover:text-[#800020]"
          >
            View all activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
