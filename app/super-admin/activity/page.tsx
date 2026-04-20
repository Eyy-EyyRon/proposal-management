"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Filter, Download, Loader2 } from "lucide-react";
import { ActivityTable, type Activity } from "@/components/activity-table";
import {
  subscribeToAllProposals,
  batchGetUserNames,
  type Proposal,
} from "@/lib/firestore";

function proposalToActivity(p: Proposal, userNames: Record<string, string>): Activity {
  const actorId = p.sentById || p.userId;
  const userName = userNames[actorId] || "Unknown";
  const ts = p.updatedAt ?? p.createdAt;
  const timestamp = ts ? new Date(ts.seconds * 1000).toISOString() : new Date().toISOString();

  const typeMap: Record<string, Activity["type"]> = {
    sent: "proposal_sent",
    viewed: "proposal_viewed",
    accepted: "proposal_accepted",
    rejected: "proposal_rejected",
    archived: "proposal_rejected",
  };

  const descMap: Record<string, string> = {
    sent: "Sent proposal to client",
    viewed: "Client viewed proposal",
    accepted: "Proposal accepted by client",
    rejected: "Proposal declined by client",
    archived: "Proposal archived",
  };

  const type = typeMap[p.status] ?? "proposal_created";
  const description = descMap[p.status] ?? "Created new proposal";

  return {
    id: p.id,
    type,
    userName,
    userRole: "admin",
    description,
    target: `${p.clientName} — ${p.templateName}`,
    timestamp,
    timeAgo: timeAgo(ts),
  };
}

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type TypeFilter = "all" | "proposals" | "team" | "templates";
type DateRange = "7d" | "30d" | "90d" | "all";

export default function ActivityPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useEffect(() => {
    const unsub = subscribeToAllProposals((data, err) => {
      if (err) { setLoading(false); return; }
      setProposals(data);
      setLoading(false);

      const ids = [...new Set(data.map((p) => p.sentById || p.userId).filter(Boolean))];
      if (ids.length > 0) {
        batchGetUserNames(ids).then(setUserNames).catch(() => {});
      }
    });
    return unsub;
  }, []);

  const allActivities = useMemo<Activity[]>(() => {
    return proposals.map((p) => proposalToActivity(p, userNames));
  }, [proposals, userNames]);

  const filtered = useMemo(() => {
    const now = Date.now() / 1000;
    const cutoff: Record<DateRange, number> = {
      "7d": now - 7 * 86400,
      "30d": now - 30 * 86400,
      "90d": now - 90 * 86400,
      "all": 0,
    };

    return allActivities.filter((a) => {
      const secs = new Date(a.timestamp).getTime() / 1000;
      if (secs < cutoff[dateRange]) return false;
      if (typeFilter === "proposals") return a.type.startsWith("proposal_");
      if (typeFilter === "team") return a.type.startsWith("team_");
      if (typeFilter === "templates") return a.type.startsWith("template_");
      return true;
    });
  }, [allActivities, typeFilter, dateRange]);

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
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="w-full appearance-none border-none bg-transparent text-[13px] text-slate-700 outline-none"
                >
                  <option value="all">All Activity</option>
                  <option value="proposals">Proposals</option>
                  <option value="team">Team</option>
                  <option value="templates">Templates</option>
                </select>
              </div>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Date Range
              </span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-colors duration-300 ease-out focus-within:border-[#800020]/30 focus-within:bg-white">
                <Clock className="h-4 w-4 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="w-full appearance-none border-none bg-transparent text-[13px] text-slate-700 outline-none"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
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
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <ActivityTable
          activities={filtered}
          maxItems={filtered.length}
          showViewAll={false}
        />
      )}

      {/* Footer count */}
      {!loading && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          <p className="text-[13px] text-slate-500">
            Showing {filtered.length} of {allActivities.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
