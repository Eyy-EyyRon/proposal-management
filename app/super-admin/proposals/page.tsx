"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import {
  getAllProposals,
  resolveUserNames,
  type Proposal,
} from "@/lib/firestore";

const statusStyles: Record<string, { bg: string; text: string }> = {
  sent: { bg: "bg-slate-100", text: "text-slate-600" },
  viewed: { bg: "bg-sky-50", text: "text-sky-600" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-600" },
  rejected: { bg: "bg-rose-50", text: "text-rose-600" },
  archived: { bg: "bg-amber-50", text: "text-amber-600" },
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllProposals();
        setProposals(data);
        const names = await resolveUserNames(data.map((p) => p.userId));
        setUserNames(names);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.clientName.toLowerCase().includes(q) ||
          p.templateName.toLowerCase().includes(q) ||
          (userNames[p.userId] ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [proposals, search, statusFilter, userNames]);

  const formatDate = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const secs = (ts as { seconds: number }).seconds;
    if (!secs) return "";
    return new Date(secs * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">All Proposals</h2>
        <p className="text-[13px] text-slate-500">
          Manage and track all proposals across your team.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-none bg-transparent text-[13px] text-slate-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="viewed">Viewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Link
            href="/super-admin/proposals/new"
            className="flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]"
          >
            <Plus className="h-4 w-4" />
            New Proposal
          </Link>
        </div>
      </div>

      {/* Proposals Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Template
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Created By
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((proposal, i) => {
                  const style = statusStyles[proposal.status] ?? statusStyles.sent;
                  return (
                    <tr
                      key={proposal.id}
                      className={`group transition-colors hover:bg-slate-50/80 ${
                        i !== filtered.length - 1
                          ? "border-b border-slate-100/80"
                          : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800000]/10 text-[10px] font-semibold text-[#800000]">
                            {proposal.clientName
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="text-[13px] font-medium text-slate-800">
                            {proposal.clientName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[13px] text-slate-700">
                          {proposal.templateName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${style.bg} ${style.text}`}
                        >
                          {proposal.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-slate-500">
                        {formatDate(proposal.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-slate-600">
                        {userNames[proposal.userId] ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-800">
                No proposals found
              </p>
              <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
                Create your first proposal to get started.
              </p>
              <Link
                href="/super-admin/proposals/new"
                className="mt-5 flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Proposal
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
