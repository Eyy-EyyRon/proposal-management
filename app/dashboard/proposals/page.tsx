"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, FileText, CheckCircle, Clock, XCircle, FilePlus, Copy, Check, Loader2, Trash2, Download, FolderOpen, Eye, AlertTriangle, Archive } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { useAuth, useRole } from "@/contexts/auth-context";
import { subscribeToProposals, subscribeToProposalsByDepartment, moveToTrash, archiveProposal, type Proposal } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DepartmentBadge } from "@/components/department-badge";
import { exportProposalsCsv, exportProposalsJson } from "@/lib/export-utils";

type StatusFilter = "all" | "sent" | "viewed" | "accepted" | "rejected" | "archived";
type GridStatus = "pending" | "viewed" | "accepted" | "rejected" | "archived";

function formatTs(ts: { seconds: number } | null): string {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toGridStatus(s: string): GridStatus {
  const map: Record<string, GridStatus> = {
    sent: "pending",
    viewed: "viewed",
    accepted: "accepted",
    rejected: "rejected",
    archived: "archived",
  };
  return map[s] ?? "pending";
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

function StatusCell({ status }: { status: GridStatus }) {
  const meta = {
    pending: {
      label: "Pending",
      shell: "bg-amber-50/80 text-amber-700 ring-amber-100/90",
      dot: "bg-amber-500 animate-pulse [animation-duration:2200ms]",
      inner: <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />,
    },
    viewed: {
      label: "Viewed",
      shell: "bg-sky-50/80 text-sky-700 ring-sky-100/90",
      dot: "",
      inner: (
        <span className="relative inline-flex h-3 w-3 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-sky-400/30 animate-ping [animation-duration:1800ms]" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(59,130,246,0.14)]" />
        </span>
      ),
    },
    accepted: {
      label: "Accepted",
      shell: "bg-emerald-50/80 text-emerald-700 ring-emerald-100/90",
      dot: "bg-emerald-500",
      inner: <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />,
    },
    rejected: {
      label: "Rejected",
      shell: "bg-rose-50/80 text-rose-700 ring-rose-100/90",
      dot: "bg-rose-500",
      inner: <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />,
    },
    archived: {
      label: "Archived",
      shell: "bg-slate-50/80 text-slate-600 ring-slate-200/80",
      dot: "bg-slate-400",
      inner: <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />,
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-sm ring-1 ${meta.shell}`}>
      {meta.inner}
      <span>{meta.label}</span>
    </span>
  );
}

function EmptyScanState({ onCreate }: { onCreate: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-50/70 ring-1 ring-slate-200/80 shadow-sm">
        <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-400/70 to-transparent opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_44%,rgba(120,1,22,0.08)_45%,transparent_46%,transparent_52%,rgba(15,23,42,0.06)_53%,transparent_54%,transparent_100%)] opacity-60" />
        <FolderOpen className="relative h-9 w-9 text-slate-400/60" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-800">No matching results</p>
      <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-slate-500">
        Scan a different client, status, or template, or create a new proposal to fill the void.
      </p>
      <Link
        href={onCreate}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#780116] px-4 text-[13px] font-medium text-white transition hover:bg-[#C32F27] shadow-sm shadow-[#780116]/15"
      >
        <FilePlus className="h-3.5 w-3.5" />
        Create New
      </Link>
    </div>
  );
}

export default function ProposalsPage() {
  const { user, profile } = useAuth();
  const { isCeo } = useRole();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voidWarningProposal, setVoidWarningProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  useEffect(() => {
    if (!user) return;
    const dept = profile?.department;
    const cb = (data: Proposal[]) => { setProposals(data); setLoading(false); };
    // Staff/Admin: see only their department (Scenario 3 & 15); CEO sees own proposals
    const unsub = (!isCeo && dept)
      ? subscribeToProposalsByDepartment(dept, cb)
      : subscribeToProposals(user.uid, cb);
    return unsub;
  }, [user, profile?.department, isCeo]);

  // Cross-dept access guard: redirect if user navigates to a proposal not in their dept
  const handleProposalClick = (proposal: Proposal) => {
    if (!isCeo && profile?.department && proposal.department && proposal.department !== profile.department) {
      toast.error("Access Denied: This proposal belongs to a different department.");
      router.push("/dashboard/proposals");
      return false;
    }
    return true;
  };

  const active = proposals.filter(p => p.status !== "archived" && p.status !== "superseded" && p.status !== "void");
  const counts = {
    total: active.length,
    sent: active.filter(p => p.status === "sent").length,
    viewed: active.filter(p => p.status === "viewed").length,
    accepted: active.filter(p => p.status === "accepted").length,
    rejected: active.filter(p => p.status === "rejected").length,
    archived: proposals.filter(p => p.status === "archived").length,
  };

  const tabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",      label: "All",      count: counts.total },
    { key: "sent",     label: "Sent",     count: counts.sent },
    { key: "viewed",   label: "Viewed",   count: counts.viewed },
    { key: "accepted", label: "Accepted", count: counts.accepted },
    { key: "rejected", label: "Rejected", count: counts.rejected },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  const filteredProposals = proposals.filter(proposal => {
    const q = normalizedSearch;
    const matchesSearch = !q ||
      proposal.clientName.toLowerCase().includes(q) ||
      proposal.clientEmail.toLowerCase().includes(q) ||
      proposal.templateName.toLowerCase().includes(q);
    if (statusFilter === "all") return matchesSearch && proposal.status !== "archived";
    if (statusFilter === "archived") return matchesSearch && proposal.status === "archived";
    return matchesSearch && proposal.status === statusFilter;
  });

  const handleTrash = async (proposal: Proposal) => {
    if (proposal.status === "accepted") {
      toast.error("Cannot trash a signed proposal.", {
        description: "This document is legally signed. Use \"Archive\" instead.",
      });
      return;
    }
    if (!confirm("Move this proposal to trash?")) return;
    await moveToTrash("proposals", proposal.id);
    setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
    toast.success("Proposal moved to trash.");
  };

  const handleArchiveAccepted = async (proposalId: string) => {
    await archiveProposal(proposalId);
    setProposals((prev) => prev.map((p) => p.id === proposalId ? { ...p, status: "archived" } : p));
    toast.success("Proposal archived.");
  };

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
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Proposals</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Track and manage all client proposals.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
            <div className="relative w-full xl:w-[24rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Command-K search proposals"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-14 text-[13px] text-slate-800 outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-4 focus:ring-[#780116]/10"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-[inset_0_1px_1px_rgba(15,23,42,0.04)]">
                ⌘K
              </kbd>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setExportOpen(!exportOpen)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button onClick={() => { exportProposalsCsv(proposals); setExportOpen(false); }} className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">Export CSV</button>
                    <button onClick={() => { exportProposalsJson(proposals); setExportOpen(false); }} className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50">Export JSON</button>
                  </div>
                )}
              </div>
              <Link
                href="/dashboard/create-proposal"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#780116] px-3 text-[13px] font-medium text-white transition hover:bg-[#C32F27] shadow-sm shadow-[#780116]/15"
              >
                <FilePlus className="h-3.5 w-3.5" />
                New proposal
              </Link>
            </div>
          </div>
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
                    {tab.label === "Sent" ? "Pending" : tab.label}
                    <span className={`ml-1 text-[11px] ${statusFilter === tab.key ? "text-slate-500" : "text-slate-300"}`}>
                      {tab.count}
                    </span>
                    {statusFilter === tab.key && (
                      <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredProposals.length === 0 ? (
              <EmptyScanState onCreate="/dashboard/create-proposal" />
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
                        Dept
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
                        className={`group relative bg-transparent transition-colors duration-200 hover:bg-slate-50/50 ${
                          i !== filteredProposals.length - 1 ? "border-b border-slate-100/80" : ""
                        }`}
                      >
                        <td className="relative px-5 py-3 pl-6">
                          <span className="absolute left-0 top-0 h-full w-1 bg-[#780116] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
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
                          <DepartmentBadge department={proposal.department} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <StatusCell status={toGridStatus(proposal.status)} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono tabular-nums text-[13px] text-slate-500">
                          {formatTs(proposal.createdAt as unknown as { seconds: number })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono tabular-nums text-[13px] text-slate-500">
                          {proposal.viewedAt
                            ? formatTs(proposal.viewedAt as unknown as { seconds: number })
                            : <span className="text-slate-300">&mdash;</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                            {proposal.status === "accepted" ? (
                              <button
                                onClick={() => setVoidWarningProposal(proposal)}
                                title="View / Edit signed proposal"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-[#800020]"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : (
                              <Link
                                href={`/dashboard/proposals/${proposal.id}`}
                                title="View proposal details"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-[#800020]"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            )}
                            <button
                              onClick={() => handleCopyLink(proposal.id)}
                              title="Copy shareable link"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                            >
                              {copiedId === proposal.id ? (
                                <Check className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            {proposal.status === "accepted" ? (
                              <button
                                onClick={() => handleArchiveAccepted(proposal.id)}
                                title="Archive signed proposal"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            ) : proposal.status !== "archived" ? (
                              <button
                                onClick={() => handleTrash(proposal)}
                                title="Move to trash"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
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

      {/* Void Warning Modal — shown when navigating to an accepted proposal for editing */}
      {voidWarningProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Legally Signed Document</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              This proposal was <strong>accepted and legally signed</strong> by {voidWarningProposal.clientName}.
              Creating a new version will <strong className="text-rose-600">VOID the signature</strong>.
            </p>
            <p className="mt-2 text-[12px] font-medium text-rose-600">Proceed only if you have client consent.</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setVoidWarningProposal(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <Link
                href={`/dashboard/proposals/${voidWarningProposal.id}`}
                onClick={() => setVoidWarningProposal(null)}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Proceed Anyway
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
