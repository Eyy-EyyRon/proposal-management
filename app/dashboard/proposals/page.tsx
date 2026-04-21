"use client";

import { useEffect, useMemo, useState, useCallback, memo } from "react";
import Link from "next/link";
import { Search, FileText, CheckCircle, Clock, XCircle, FilePlus, Copy, Check, Loader2, Trash2, Download, FolderOpen, Eye, AlertTriangle, Archive, Share2 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Breadcrumb } from "@/components/breadcrumb";
import { StatCard } from "@/components/stat-card";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToPaginatedProposals,
  subscribeToPaginatedProposalsByDepartment,
  subscribeToSharedWithMeProposals,
  loadMoreSharedWithMeProposals,
  moveToTrash, archiveProposal, type Proposal,
  PROPOSALS_PAGE_SIZE,
} from "@/lib/firestore";
import { ProposalTableSkeleton, StatCardSkeleton } from "@/components/proposal-skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DepartmentBadge } from "@/components/department-badge";
import { exportProposalsCsv, exportProposalsJson } from "@/lib/export-utils";

type ViewTab = "my_work" | "shared_with_me";

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

// "Shared from [Dept]" badge — shown when the proposal's origin dept differs from the viewer's dept
function SharedFromBadge({ originDept, userDept }: { originDept?: string; userDept?: string | null }) {
  if (!originDept || !userDept || originDept === userDept) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-violet-200">
      <Share2 className="h-2.5 w-2.5" />
      Shared from {originDept}
    </span>
  );
}

// React.memo wrapper to prevent unnecessary re-renders of proposal cards
const ProposalRow = memo(function ProposalRow({
  proposal,
  isLast,
  copiedId,
  userDept,
  onCopyLink,
  onTrash,
  onArchive,
  onVoidWarning,
}: {
  proposal: Proposal;
  isLast: boolean;
  copiedId: string | null;
  userDept?: string | null;
  onCopyLink: (id: string) => void;
  onTrash: (p: Proposal) => void;
  onArchive: (id: string) => void;
  onVoidWarning: (p: Proposal) => void;
}) {
  const originDept = proposal.originDepartmentId ?? proposal.department;
  return (
    <tr
      className={`group relative bg-transparent transition-colors duration-200 hover:bg-slate-50/50 ${
        !isLast ? "border-b border-slate-100/80" : ""
      }`}
    >
      <td className="relative px-5 py-3 pl-6">
        <span className="absolute left-0 top-0 h-full w-1 bg-[#780116] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="flex items-center gap-3">
          <ClientAvatar name={proposal.clientName} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-medium text-slate-800">
                {proposal.clientName}
              </p>
              <SharedFromBadge originDept={originDept} userDept={userDept} />
            </div>
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
        {proposal.isDelegated && proposal.sentById !== proposal.ownerId ? (
          <span
            title={`Sent by staff (UID: ${proposal.sentById}) acting as CEO`}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Delegated
          </span>
        ) : (
          <span className="text-[12px] text-slate-400">Direct</span>
        )}
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
              onClick={() => onVoidWarning(proposal)}
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
            onClick={() => onCopyLink(proposal.id)}
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
              onClick={() => onArchive(proposal.id)}
              title="Archive signed proposal"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-600"
            >
              <Archive className="h-4 w-4" />
            </button>
          ) : proposal.status !== "archived" ? (
            <button
              onClick={() => onTrash(proposal)}
              title="Move to trash"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
});

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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Cross-departmental sharing: "Shared with Me" tab
  const [viewTab, setViewTab] = useState<ViewTab>("my_work");
  const [sharedProposals, setSharedProposals] = useState<Proposal[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [sharedHasMore, setSharedHasMore] = useState(false);
  const [sharedLoadingMore, setSharedLoadingMore] = useState(false);

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  // My Work subscription
  useEffect(() => {
    if (!user) return;
    const dept = profile?.department;
    if (!isCeo && dept) {
      return subscribeToPaginatedProposalsByDepartment(dept, (data, more) => {
        setProposals(data); setHasMore(more); setLoading(false);
      });
    }
    return subscribeToPaginatedProposals(user.uid, (data, more) => {
      setProposals(data); setHasMore(more); setLoading(false);
    });
  }, [user, profile?.department, isCeo]);

  // Shared with Me subscription — only subscribe when user has a department
  useEffect(() => {
    const dept = profile?.department;
    if (!dept) { setSharedLoading(false); return; }
    return subscribeToSharedWithMeProposals(dept, (data, more) => {
      setSharedProposals(data); setSharedHasMore(more); setSharedLoading(false);
    });
  }, [profile?.department]);

  // Cross-dept access guard: allow if same dept, shared, or CEO
  const handleProposalClick = (proposal: Proposal) => {
    if (!isCeo && profile?.department && proposal.department && proposal.department !== profile.department) {
      // Allow if user's dept is in the sharedWith array
      if (proposal.sharedWith?.includes(profile.department)) return true;
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

  const handleTrash = useCallback(async (proposal: Proposal) => {
    if (proposal.status === "accepted") {
      toast.error("Cannot trash a signed proposal.", {
        description: "This document is legally signed. Use \"Archive\" instead.",
      });
      return;
    }
    if (!confirm("Move this proposal to trash?")) return;
    // Optimistic remove
    setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
    toast.success("Proposal moved to trash.");
    try {
      await moveToTrash("proposals", proposal.id);
    } catch {
      // Rollback on failure
      setProposals((prev) => [proposal, ...prev]);
      toast.error("Failed to trash proposal. It has been restored.");
    }
  }, []);

  const handleArchiveAccepted = useCallback(async (proposalId: string) => {
    // Optimistic update
    setProposals((prev) => prev.map((p) => p.id === proposalId ? { ...p, status: "archived" } : p));
    toast.success("Proposal archived.");
    try {
      await archiveProposal(proposalId);
    } catch {
      // Rollback
      setProposals((prev) => prev.map((p) => p.id === proposalId ? { ...p, status: "accepted" } : p));
      toast.error("Failed to archive. Please try again.");
    }
  }, []);

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
            <Breadcrumb />
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

        {/* View Tabs: My Work / Shared with Me */}
        {profile?.department && (
          <div className="flex gap-1 rounded-xl bg-slate-100/60 p-1 w-fit">
            <button
              onClick={() => setViewTab("my_work")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                viewTab === "my_work"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              My Work
            </button>
            <button
              onClick={() => setViewTab("shared_with_me")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                viewTab === "shared_with_me"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              Shared with Me
              {sharedProposals.length > 0 && (
                <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {sharedProposals.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ═══ MY WORK TAB ═══ */}
        {viewTab === "my_work" && (
          <>
            {/* Stats — show skeletons during initial load, real values after */}
            {loading ? (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </section>
            ) : (
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total"    value={counts.total}                  icon={FileText}    accent="indigo" />
                <StatCard label="Pending"  value={counts.sent + counts.viewed}   icon={Clock}       accent="blue" />
                <StatCard label="Accepted" value={counts.accepted}               icon={CheckCircle} accent="green" />
                <StatCard label="Rejected" value={counts.rejected}               icon={XCircle}     accent="red" />
              </section>
            )}

            {loading ? (
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <ProposalTableSkeleton rows={8} />
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
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Template</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent by</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dept</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent</th>
                          <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Viewed</th>
                          <th className="w-10 px-3 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProposals.map((proposal, i) => (
                          <ProposalRow
                            key={proposal.id}
                            proposal={proposal}
                            isLast={i === filteredProposals.length - 1}
                            copiedId={copiedId}
                            userDept={profile?.department}
                            onCopyLink={handleCopyLink}
                            onTrash={handleTrash}
                            onArchive={handleArchiveAccepted}
                            onVoidWarning={setVoidWarningProposal}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer + Load More */}
                {filteredProposals.length > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                    <p className="text-[12px] text-slate-400">
                      Showing {filteredProposals.length} proposal{filteredProposals.length !== 1 ? "s" : ""}
                      {hasMore ? " — more available" : ""}
                    </p>
                    {hasMore && (
                      <button
                        onClick={async () => {
                          setLoadingMore(true);
                          try {
                            const { getDocs, query, collection, where, orderBy, startAfter, limit } = await import("firebase/firestore");
                            const { db } = await import("@/lib/firebase");
                            const dept = profile?.department;
                            const last = proposals[proposals.length - 1];
                            if (!last || !user) return;
                            const lastSnap = await getDocs(
                              query(collection(db, "proposals"), where(dept && !isCeo ? "department" : "ownerId", "==", dept && !isCeo ? dept : user.uid), where("isDeleted", "==", false), orderBy("createdAt", "desc"), startAfter({ seconds: (last.createdAt as {seconds:number}).seconds, nanoseconds: 0 }), limit(PROPOSALS_PAGE_SIZE))
                            );
                            const more = lastSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Proposal);
                            setProposals(prev => {
                              const ids = new Set(prev.map(p => p.id));
                              return [...prev, ...more.filter(p => !ids.has(p.id))];
                            });
                            setHasMore(lastSnap.docs.length >= PROPOSALS_PAGE_SIZE);
                          } finally {
                            setLoadingMore(false);
                          }
                        }}
                        disabled={loadingMore}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                      >
                        {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Load more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ SHARED WITH ME TAB ═══ */}
        {viewTab === "shared_with_me" && (
          <>
            {sharedLoading ? (
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <ProposalTableSkeleton rows={8} />
              </div>
            ) : sharedProposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
                  <Share2 className="h-8 w-8 text-violet-300" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-800">No shared proposals</p>
                <p className="mt-1 max-w-[300px] text-[13px] leading-relaxed text-slate-500">
                  When other departments share proposals with your team, they will appear here.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white">
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-[13px] font-semibold text-slate-700">
                    Proposals shared with {profile?.department}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    These documents originate from other departments but have been shared with your team.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Template</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent by</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Origin Dept</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sent</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Viewed</th>
                        <th className="w-10 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {sharedProposals.map((proposal, i) => (
                        <ProposalRow
                          key={proposal.id}
                          proposal={proposal}
                          isLast={i === sharedProposals.length - 1}
                          copiedId={copiedId}
                          userDept={profile?.department}
                          onCopyLink={handleCopyLink}
                          onTrash={handleTrash}
                          onArchive={handleArchiveAccepted}
                          onVoidWarning={setVoidWarningProposal}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer + Load More for shared */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  <p className="text-[12px] text-slate-400">
                    Showing {sharedProposals.length} shared proposal{sharedProposals.length !== 1 ? "s" : ""}
                    {sharedHasMore ? " — more available" : ""}
                  </p>
                  {sharedHasMore && (
                    <button
                      onClick={async () => {
                        setSharedLoadingMore(true);
                        try {
                          const dept = profile?.department;
                          const last = sharedProposals[sharedProposals.length - 1];
                          if (!last || !dept) return;
                          const result = await loadMoreSharedWithMeProposals(
                            dept,
                            (last.createdAt as { seconds: number }).seconds
                          );
                          setSharedProposals((prev) => {
                            const ids = new Set(prev.map((p) => p.id));
                            return [...prev, ...result.proposals.filter((p) => !ids.has(p.id))];
                          });
                          setSharedHasMore(result.hasMore);
                        } finally {
                          setSharedLoadingMore(false);
                        }
                      }}
                      disabled={sharedLoadingMore}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                    >
                      {sharedLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Load more
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
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
