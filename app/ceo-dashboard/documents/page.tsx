"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { DepartmentBadge } from "@/components/department-badge";
import { EmptyState } from "@/components/empty-state";
import {
  subscribeToAllProposals,
  subscribeToDepartmentsList,
  type Proposal,
  type FirestoreDepartment,
} from "@/lib/firestore";
import { FileCheck2, Search, Loader2, ExternalLink, Shield } from "lucide-react";

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function CeoDocumentsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  useEffect(() => {
    const unsub = subscribeToAllProposals((data) => {
      setProposals(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeToDepartmentsList(setDepartments);
    return unsub;
  }, []);

  // Only show accepted (signed) proposals — the contract repository
  const contracts = proposals.filter((p) => p.status === "accepted");

  const filtered = contracts
    .filter((p) => deptFilter === "all" || p.department === deptFilter)
    .filter((p) =>
      !searchQuery ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.templateName.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Contract Repository" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Contract Repository</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              All accepted and signed proposals across every department.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-700">
            <Shield className="h-3.5 w-3.5" />
            {contracts.length} signed contract{contracts.length !== 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[13px] text-slate-400">Loading contracts…</p>
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No signed contracts"
            description="Accepted proposals will appear here as your central contract repository."
          />
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-slate-900">{filtered.length} contract{filtered.length !== 1 ? "s" : ""}</p>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50/80 px-2 py-1 text-[12px] text-slate-600 focus:outline-none"
                >
                  <option value="all">All departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-52 rounded-md border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Template</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Department</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signed</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signature</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className={`group transition-colors hover:bg-slate-50/80 ${i !== filtered.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-medium text-slate-800">{p.clientName}</p>
                        <p className="text-[12px] text-slate-400">{p.clientEmail}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">{p.templateName}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <DepartmentBadge department={p.department} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                        {p.signedAt ? formatTs(p.signedAt) : formatTs(p.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {p.signatureType ? (
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            p.signatureType === "draw" ? "bg-violet-50 text-violet-600" : "bg-sky-50 text-sky-600"
                          }`}>
                            {p.signatureType === "draw" ? "E-Signature" : "Uploaded"}
                          </span>
                        ) : (
                          <span className="text-[12px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/p/${p.id}`}
                          target="_blank"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
                          title="View contract"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[12px] text-slate-400">{contracts.length} signed contract{contracts.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
