"use client";

import { Users, Plus, Search, MoreHorizontal } from "lucide-react";
import Link from "next/link";

// Mock team data
const teamMembers = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@hyacinth.com",
    role: "admin",
    status: "active",
    proposalsCreated: 12,
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@hyacinth.com",
    role: "admin",
    status: "active",
    proposalsCreated: 8,
    lastActive: "5 hours ago",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily@hyacinth.com",
    role: "admin",
    status: "active",
    proposalsCreated: 15,
    lastActive: "1 day ago",
  },
  {
    id: "4",
    name: "Jessica Williams",
    email: "jessica@hyacinth.com",
    role: "admin",
    status: "pending",
    proposalsCreated: 0,
    lastActive: "Never",
  },
];

export default function TeamManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Team Management
        </h2>
        <p className="text-[13px] text-slate-500">
          Manage your team members and their permissions.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search team members..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]">
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Member
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Proposals
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Last Active
                </th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member, i) => (
                <tr
                  key={member.id}
                  className={`group transition-colors hover:bg-slate-50/80 ${
                    i !== teamMembers.length - 1
                      ? "border-b border-slate-100/80"
                      : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#800000]/10 text-[11px] font-semibold text-[#800000]">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">
                          {member.name}
                        </p>
                        <p className="text-[12px] text-slate-400">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        member.role === "super-admin"
                          ? "bg-[#800000]/10 text-[#800000]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.role === "super-admin"
                        ? "Super Admin"
                        : "Admin"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        member.status === "active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.status === "active"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {member.status === "active" ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-slate-600">
                    {member.proposalsCreated}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-slate-500">
                    {member.lastActive}
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
      </div>

      {/* Empty State for when you add the first member */}
      {teamMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">
            No team members yet
          </p>
          <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
            Add your first team member to start collaborating on proposals.
          </p>
          <button className="mt-5 flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]">
            <Plus className="h-3.5 w-3.5" />
            Add First Member
          </button>
        </div>
      )}
    </div>
  );
}
