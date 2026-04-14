"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MoreHorizontal, FileText, CheckCircle, Clock, XCircle, FilePlus, Eye } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";

const mockProposals = [
  {
    id: "1",
    clientName: "Acme Corporation",
    email: "john@acme.com",
    templateName: "Standard Service Agreement",
    status: "Sent" as const,
    createdAt: "Apr 15, 2026",
    viewedAt: null,
  },
  {
    id: "2",
    clientName: "TechStart Inc",
    email: "sarah@techstart.io",
    templateName: "Project Proposal",
    status: "Viewed" as const,
    createdAt: "Apr 14, 2026",
    viewedAt: "Apr 14, 2026",
  },
  {
    id: "3",
    clientName: "Global Enterprises",
    email: "mike@global.com",
    templateName: "Retainer Agreement",
    status: "Accepted" as const,
    createdAt: "Apr 12, 2026",
    viewedAt: "Apr 13, 2026",
  },
  {
    id: "4",
    clientName: "StartupXYZ",
    email: "founder@startupxyz.com",
    templateName: "Standard Service Agreement",
    status: "Rejected" as const,
    createdAt: "Apr 10, 2026",
    viewedAt: "Apr 11, 2026",
  },
  {
    id: "5",
    clientName: "Innovation Labs",
    email: "contact@innovationlabs.ai",
    templateName: "Project Proposal",
    status: "Sent" as const,
    createdAt: "Apr 9, 2026",
    viewedAt: null,
  },
];

const counts = {
  total: mockProposals.length,
  sent: mockProposals.filter(p => p.status === "Sent").length,
  viewed: mockProposals.filter(p => p.status === "Viewed").length,
  accepted: mockProposals.filter(p => p.status === "Accepted").length,
  rejected: mockProposals.filter(p => p.status === "Rejected").length,
};

type StatusFilter = "all" | "Sent" | "Viewed" | "Accepted" | "Rejected";

const tabs: { key: StatusFilter; label: string; count: number }[] = [
  { key: "all",      label: "All",      count: counts.total },
  { key: "Sent",     label: "Sent",     count: counts.sent },
  { key: "Viewed",   label: "Viewed",   count: counts.viewed },
  { key: "Accepted", label: "Accepted", count: counts.accepted },
  { key: "Rejected", label: "Rejected", count: counts.rejected },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredProposals = mockProposals.filter(proposal => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      proposal.clientName.toLowerCase().includes(q) ||
      proposal.email.toLowerCase().includes(q) ||
      proposal.templateName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <StatCard label="Total"    value={counts.total}                  icon={FileText}    accent="indigo" trend="+12%" trendUp={true} />
          <StatCard label="Pending"  value={counts.sent + counts.viewed}   icon={Clock}       accent="blue" />
          <StatCard label="Accepted" value={counts.accepted}               icon={CheckCircle} accent="green"  trend="+8%"  trendUp={true} />
          <StatCard label="Rejected" value={counts.rejected}               icon={XCircle}     accent="red" />
        </section>

        {/* Table Container */}
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
                              {proposal.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-600">
                        {proposal.templateName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={proposal.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                        {proposal.createdAt}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                        {proposal.viewedAt ?? (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600">
                          <MoreHorizontal className="h-4 w-4" />
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
      </div>
    </main>
  );
}
