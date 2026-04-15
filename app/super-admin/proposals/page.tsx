"use client";

import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";

// Mock proposals data
const proposals = [
  {
    id: "1",
    client: "Northstar Inc.",
    title: "Website Redesign Project",
    status: "Viewed",
    date: "Apr 14, 2026",
    assignedTo: "Sarah Johnson",
  },
  {
    id: "2",
    client: "Ariana Cole",
    title: "Consulting Agreement",
    status: "Sent",
    date: "Apr 13, 2026",
    assignedTo: "Mike Chen",
  },
  {
    id: "3",
    client: "Dana Liu",
    title: "Marketing Strategy",
    status: "Accepted",
    date: "Apr 12, 2026",
    assignedTo: "Emily Davis",
  },
  {
    id: "4",
    client: "Robert Hayes",
    title: "Brand Development",
    status: "Rejected",
    date: "Apr 11, 2026",
    assignedTo: "Sarah Johnson",
  },
  {
    id: "5",
    client: "Lena Whitmore",
    title: "Digital Transformation",
    status: "Sent",
    date: "Apr 10, 2026",
    assignedTo: "Mike Chen",
  },
];

const statusStyles: Record<string, { bg: string; text: string }> = {
  Sent: { bg: "bg-slate-100", text: "text-slate-600" },
  Viewed: { bg: "bg-sky-50", text: "text-sky-600" },
  Accepted: { bg: "bg-emerald-50", text: "text-emerald-600" },
  Rejected: { bg: "bg-rose-50", text: "text-rose-600" },
};

export default function ProposalsPage() {
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
            placeholder="Search proposals..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
            <Filter className="h-4 w-4" />
            Filter
          </button>
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
      <div className="rounded-xl border border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Proposal
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Assigned To
                </th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal, i) => {
                const statusStyle = statusStyles[proposal.status];
                return (
                  <tr
                    key={proposal.id}
                    className={`group transition-colors hover:bg-slate-50/80 ${
                      i !== proposals.length - 1
                        ? "border-b border-slate-100/80"
                        : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800000]/10 text-[10px] font-semibold text-[#800000]">
                          {proposal.client
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium text-slate-800">
                          {proposal.client}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[13px] text-slate-700">
                        {proposal.title}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                      >
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-500">
                      {proposal.date}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-slate-600">
                      {proposal.assignedTo}
                    </td>
                    <td className="px-3 py-3">
                      <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {proposals.length === 0 && (
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
    </div>
  );
}
