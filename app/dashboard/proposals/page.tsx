"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, CheckCircle, Clock, XCircle, FilePlus, Copy, Check, Loader2 } from "lucide-react";
import { StatusBadge, type ProposalStatus as BadgeStatus } from "@/components/status-badge";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/contexts/auth-context";
import { getUserProposals, type Proposal } from "@/lib/firestore";

type StatusFilter = "all" | "sent" | "viewed" | "accepted" | "rejected";

function formatTs(ts: { seconds: number } | null): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toBadgeStatus(s: string): BadgeStatus {
  const map: Record<string, BadgeStatus> = {
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
    rejected: "Rejected",
  };
  return map[s] ?? "Sent";
}

function ClientAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palettes = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700",
  ];
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${palettes[name.length % palettes.length]}`}>
      {initials}
    </div>
  );
}

export default function ProposalsPage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserProposals(user.uid);
        if (!cancelled) setProposals(data);
      } catch (err) {
        console.error("Failed to load proposals:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const counts = {
    total: proposals.length,
    sent: proposals.filter(p => p.status === "sent").length,
    viewed: proposals.filter(p => p.status === "viewed").length,
    accepted: proposals.filter(p => p.status === "accepted").length,
    rejected: proposals.filter(p => p.status === "rejected").length,
  };

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: counts.total },
    { key: "sent",     label: "Sent",     count: counts.sent },
    { key: "viewed",   label: "Viewed",   count: counts.viewed },
    { key: "accepted", label: "Accepted", count: counts.accepted },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  const filteredProposals = proposals.filter(proposal => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      proposal.clientName.toLowerCase().includes(q) ||
      proposal.clientEmail.toLowerCase().includes(q) ||
      proposal.templateName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = async (proposalId: string) => {
    const url = `${window.location.origin}/p/${proposalId}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedId(proposalId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Proposals" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Proposals</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Track and manage all client proposals.
            </p>
          </div>
          <Link
            href="/dashboard/create-proposal"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
          >
            <FilePlus className="h-3.5 w-3.5" />
            New proposal
          </Link>
        </div>

        {/* Stats */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total"    value={counts.total}                  icon={FileText}    accent="indigo" />
          <StatCard label="Pending"  value={counts.sent + counts.viewed}   icon={Clock}       accent="blue" />
          <StatCard label="Accepted" value={counts.accepted}               icon={CheckCircle} accent="green" />
          <StatCard label="Rejected" value={counts.rejected}               icon={XCircle}     accent="red" />
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          /* Table Container */
          <div className="rounded-xl border border-slate-200/80 bg-white">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Tabs */}
              <div className="flex gap-0">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`relative px-3 pb-3 text-[13px] font-medium transition ${
                      statusFilter === tab.key
                        ? "text-slate-900"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1 text-[11px] ${statusFilter === tab.key ? "text-slate-500" : "text-slate-300"}`}>
                      {tab.count}
                    </span>
                    {statusFilter === tab.key && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative pb-3">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-[calc(50%+6px)] text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-56 rounded-md border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            {filteredProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-800">
                  {searchQuery || statusFilter !== "all" ? "No results" : "No proposals yet"}
                </p>
                <p className="mt-1 max-w-[260px] text-[13px] text-slate-500">
                  {searchQuery || statusFilter !== "all"
                    ? "Try a different search term or filter."
                    : "Create your first proposal to get started."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Client
                      </th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Template
                      </th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Sent
                      </th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Viewed
                      </th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((proposal, i) => (
                      <tr
                        key={proposal.id}
                        className={`group transition-colors hover:bg-slate-50/80 ${
                          i !== filteredProposals.length - 1 ? "border-b border-slate-100/80" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <ClientAvatar name={proposal.clientName} />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-slate-800">
                                {proposal.clientName}
                              </p>
                              <p className="truncate text-[12px] text-slate-400">
                                {proposal.clientEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-600">
                          {proposal.templateName}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <StatusBadge status={toBadgeStatus(proposal.status)} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                          {formatTs(proposal.createdAt as unknown as { seconds: number })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                          {proposal.viewedAt
                            ? formatTs(proposal.viewedAt as unknown as { seconds: number })
                            : <span className="text-slate-300">&mdash;</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleCopyLink(proposal.id)}
                            title="Copy shareable link"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                          >
                            {copiedId === proposal.id ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {filteredProposals.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-[12px] text-slate-400">
                  Showing {filteredProposals.length} of {counts.total} proposals
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
