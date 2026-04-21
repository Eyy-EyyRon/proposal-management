"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight, Clock, FilePlus, FileText, LayoutTemplate,
  Loader2, Lock, Search, Zap, TrendingUp, CheckCircle,
  Timer, ChevronRight, Smartphone,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/contexts/auth-context";
import { useSystemStatus } from "@/contexts/system-status-context";
import { subscribeToProposals, getUserTemplates, subscribeToStaffTasks, subscribeToPetPeeves, type Proposal, type Template, type ProposalTask, type PetPeeve } from "@/lib/firestore";
import { subscribeToNotifications, type AppNotification } from "@/lib/notifications";
import { LazyUrgencyShard } from "@/components/three/lazy-three";
import { ProposalHealthGauge } from "@/components/proposal-health-gauge";
import { GhostPreview } from "@/components/ghost-preview";
import { ProbationaryBanner } from "@/components/probationary-banner";

// ─── Helpers ─────────────────────────────────────────────────

function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return "";
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toBadge(s: string): "Sent" | "Viewed" | "Accepted" | "Rejected" {
  const map: Record<string, "Sent" | "Viewed" | "Accepted" | "Rejected"> = {
    sent: "Sent", viewed: "Viewed", accepted: "Accepted", rejected: "Rejected",
  };
  return map[s] ?? "Sent";
}

function notifToBadge(type: string): "Viewed" | "Accepted" | "Rejected" {
  const map: Record<string, "Viewed" | "Accepted" | "Rejected"> = {
    viewed: "Viewed", signed: "Accepted", rejected: "Rejected",
  };
  return map[type] ?? "Viewed";
}

function toDueMs(dueAt: unknown): number {
  if (!dueAt) return 0;
  if (dueAt instanceof Date) return dueAt.getTime();
  if (typeof dueAt === "string") return new Date(dueAt).getTime();
  if (typeof dueAt === "object" && "seconds" in (dueAt as Record<string, unknown>))
    return ((dueAt as { seconds: number }).seconds) * 1000;
  return 0;
}

// ─── Pipeline stepper badge ───────────────────────────────────
type PipelineStage = "drafting" | "verifying" | "ready_to_send" | "sent" | "accepted" | "rejected";

const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "drafting",      label: "Drafting" },
  { key: "verifying",     label: "Admin Review" },
  { key: "ready_to_send", label: "CEO Review" },
  { key: "sent",          label: "Sent" },
];

function proposalStage(status: string): PipelineStage {
  if (["drafting", "revision_requested", "tasked"].includes(status)) return "drafting";
  if (status === "verifying") return "verifying";
  if (status === "ready_to_send") return "ready_to_send";
  if (["sent", "viewed"].includes(status)) return "sent";
  if (status === "accepted") return "accepted";
  if (status === "rejected") return "rejected";
  return "drafting";
}

function PipelineStepper({ status }: { status: string }) {
  const currentStage = proposalStage(status);
  if (currentStage === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle className="h-3 w-3" /> Finalized
      </span>
    );
  }
  if (currentStage === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
        Rejected
      </span>
    );
  }
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STAGES.map((stage, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        return (
          <div key={stage.key} className="flex items-center gap-0.5">
            <div className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : active ? "bg-[#780116] animate-pulse" : "bg-slate-200"}`} />
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className={`h-px w-3 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
      <span className={`ml-1 text-[10px] font-semibold ${currentIdx === 0 ? "text-slate-500" : currentIdx === 1 ? "text-violet-600" : currentIdx === 2 ? "text-amber-600" : "text-emerald-600"}`}>
        {PIPELINE_STAGES[currentIdx]?.label}
      </span>
    </div>
  );
}

// ─── Velocity stat card ───────────────────────────────────────
function VelocityCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.FC<{ className?: string }>; accent: string }) {
  const accentMap: Record<string, string> = {
    crimson: "bg-[#780116]/8 text-[#780116]",
    emerald: "bg-emerald-50 text-emerald-600",
    violet:  "bg-violet-50 text-violet-600",
    amber:   "bg-amber-50 text-amber-600",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentMap[accent] ?? accentMap.crimson}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Framer variants ─────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0,  transition: { type: "spring", stiffness: 260, damping: 26 } },
};
const stagger: Variants = { show: { transition: { staggerChildren: 0.07 } } };
const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1,    transition: { type: "spring", stiffness: 340, damping: 24 } },
  exit:   { opacity: 0, scale: 0.88, transition: { duration: 0.18 } },
};

// ─── Main page ────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { systemStatus } = useSystemStatus();
  const isEmergency = systemStatus === "emergency";
  const [petPeeves, setPetPeeves] = useState<PetPeeve[]>([]);
  const [ghostProposal, setGhostProposal] = useState<Proposal | null>(null);

  useEffect(() => subscribeToPetPeeves(setPetPeeves), []);
  const greeting = getGreeting();
  const firstName = profile?.firstName ?? "there";

  const [proposals,  setProposals]  = useState<Proposal[]>([]);
  const [activity,   setActivity]   = useState<AppNotification[]>([]);
  const [tasks,      setTasks]      = useState<ProposalTask[]>([]);
  const [templates,  setTemplates]  = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProposals(user.uid, (data) => { setProposals(data); setLoading(false); });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.uid, (data) => { setActivity(data); setActivityLoading(false); }, 10);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToStaffTasks(user.uid, setTasks);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getUserTemplates(user.uid).then((t) => setTemplates(t.filter((tmpl) => tmpl.isPublished).slice(0, 4)));
  }, [user]);

  const active = proposals.filter((p) => p.status !== "archived");

  // Drafting velocity stats
  const velocityStats = useMemo(() => {
    const finished = active.filter((p) => ["accepted", "rejected"].includes(p.status));
    const approvalRate = finished.length > 0
      ? Math.round((finished.filter((p) => p.status === "accepted").length / finished.length) * 100)
      : null;

    const withTimes = active
      .filter((p) => p.status === "accepted" && p.createdAt && p.signedAt)
      .map((p) => {
        const created = ((p.createdAt as { seconds: number } | null)?.seconds ?? 0) * 1000;
        const signed  = ((p.signedAt  as { seconds: number } | null)?.seconds ?? 0) * 1000;
        return (signed - created) / (1000 * 60 * 60 * 24); // days
      });
    const avgTurnaround = withTimes.length > 0
      ? (withTimes.reduce((a, b) => a + b, 0) / withTimes.length).toFixed(1)
      : null;

    return { approvalRate, avgTurnaround };
  }, [active]);

  // P1 tasks
  const p1Tasks = useMemo(() =>
    tasks.filter((t) => t.urgency === "p1").sort((a, b) => toDueMs(a.dueAt) - toDueMs(b.dueAt)),
    [tasks]
  );
  const nearestP1 = p1Tasks[0];
  const p1MsRemaining = nearestP1 ? Math.max(0, toDueMs(nearestP1.dueAt) - Date.now()) : 0;
  const p1MsTotal     = 2 * 60 * 60 * 1000; // 2h SLA

  // Filtered proposals
  const visibleProposals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? active.filter((p) =>
          [p.clientName, p.clientEmail, p.templateName, p.status].join(" ").toLowerCase().includes(q)
        )
      : active;
    return filtered.slice(0, 6);
  }, [active, searchQuery]);

  const allEmpty = !loading && active.length === 0;

  return (
    <main className={`flex min-h-screen flex-col transition-all duration-700 ${isEmergency ? "grayscale brightness-75" : ""}`}>
      <Topbar title="Dashboard" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <ProbationaryBanner />

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.header
          variants={fadeUp} initial="hidden" animate="show"
          className="relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm"
        >
          {/* Hover glow on New Proposal button — role-based pulse */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              {/* P1 shard widget */}
              {nearestP1 && (
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-xl bg-rose-500/20 blur-sm animate-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900">
                    <LazyUrgencyShard msRemaining={p1MsRemaining} msTotal={p1MsTotal} />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {p1Tasks.length}
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">
                  {greeting}, {firstName}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {nearestP1
                    ? <span className="font-medium text-rose-600">⚡ P1 active — "{nearestP1.clientName}" due in {Math.ceil(p1MsRemaining / 60000)}m</span>
                    : "Here's a snapshot of your proposals."}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-[46rem] lg:flex-row lg:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a client, template, or status…"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-4 focus:ring-[#780116]/10"
                  disabled={isEmergency}
                />
              </label>

              <div className="flex items-center gap-2 lg:shrink-0">
                <Link
                  href="/dashboard/templates/new"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  New template
                </Link>
                {isEmergency ? (
                  <button
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-400 px-3 py-2 text-[13px] font-medium text-white opacity-70"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </button>
                ) : (
                  <Link
                    href="/dashboard/create-proposal"
                    className="relative inline-flex items-center gap-1.5 rounded-lg bg-[#780116] px-3 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#C32F27] hover:shadow-[0_0_16px_4px_rgba(120,1,22,0.35)]"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    New proposal
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── Velocity stats ──────────────────────────────────── */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            { label: "Active Proposals",  value: active.length,                                    icon: FileText,   accent: "crimson" },
            { label: "Acceptance Rate",   value: velocityStats.approvalRate != null ? `${velocityStats.approvalRate}%` : "—", icon: TrendingUp, accent: "emerald" },
            { label: "Avg Turnaround",    value: velocityStats.avgTurnaround != null ? `${velocityStats.avgTurnaround}d` : "—", icon: Timer,     accent: "violet" },
            { label: "P1 Tasks Active",   value: p1Tasks.length,                                   icon: Zap,        accent: "amber" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <VelocityCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : allEmpty ? (
          /* ── Empty state with resting shard ──────────────── */
          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-200 bg-white/80 py-20 text-center"
          >
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900">
              <LazyUrgencyShard msRemaining={p1MsTotal} msTotal={p1MsTotal} />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Your queue is clear.</p>
              <p className="mt-1 text-[13px] text-slate-500">Start a new draft to get going.</p>
            </div>
            <Link
              href="/dashboard/create-proposal"
              className="inline-flex items-center gap-2 rounded-lg bg-[#780116] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#C32F27]"
            >
              <FilePlus className="h-4 w-4" />
              Start a new draft
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)]"
          >
            {/* ── Left column ─────────────────────────────────── */}
            <div className="flex flex-col gap-5">

              {/* Recent Proposals */}
              <motion.section variants={fadeUp} className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recent Proposals</h3>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      {searchQuery ? `${visibleProposals.length} result${visibleProposals.length === 1 ? "" : "s"} for "${searchQuery}"` : "Your latest at a glance"}
                    </p>
                  </div>
                  <Link href="/dashboard/proposals" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-900">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-y border-slate-100 bg-slate-50/50">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Stage</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Health</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {visibleProposals.map((proposal, index) => (
                          <motion.tr
                            key={proposal.id}
                            variants={popIn}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            className={`transition-colors hover:bg-[#780116]/5 ${index !== visibleProposals.length - 1 ? "border-b border-slate-100/80" : ""}`}
                          >
                            <td className="px-5 py-3">
                              <p className="text-[13px] font-medium text-slate-800">{proposal.clientName}</p>
                              <p className="text-[12px] text-slate-400">{proposal.clientEmail}</p>
                            </td>
                            <td className="px-5 py-3">
                              <PipelineStepper status={proposal.status} />
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={toBadge(proposal.status)} />
                            </td>
                            <td className="px-5 py-3">
                              <ProposalHealthGauge
                                fieldValues={proposal.fieldValues ?? {}}
                                templateFields={(proposal.templateSnapshot?.fields ?? []).map((f) => ({ id: f.id, name: f.name, required: f.required }))}
                                size="sm"
                              />
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                              {formatTs(proposal.createdAt)}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                onClick={() => setGhostProposal(proposal)}
                                title="Ghost Preview"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-900 hover:text-white"
                              >
                                <Smartphone className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.section>

              {/* Ghost Preview modal */}
              {ghostProposal && (
                <GhostPreview
                  fieldValues={ghostProposal.fieldValues ?? {}}
                  templateFields={(ghostProposal.templateSnapshot?.fields ?? []).map((f) => ({ id: f.id, name: f.name, required: f.required }))}
                  petPeeves={petPeeves}
                  onClose={() => setGhostProposal(null)}
                />
              )}

              {/* Pinned Templates Vault */}
              {templates.length > 0 && (
                <motion.section variants={fadeUp} className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-900">Drafting Vault</h3>
                    <Link href="/dashboard/templates" className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-900">
                      All templates <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                    {templates.map((tmpl) => (
                      <Link
                        key={tmpl.id}
                        href={`/dashboard/create-proposal?templateId=${tmpl.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3 transition hover:border-[#780116]/30 hover:bg-[#780116]/5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200 shadow-sm transition group-hover:ring-[#780116]/30">
                          <LayoutTemplate className="h-3.5 w-3.5 text-slate-500 group-hover:text-[#780116]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-slate-700 group-hover:text-[#780116]">{tmpl.name}</p>
                          <p className="text-[11px] text-slate-400">Start draft</p>
                        </div>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-[#780116]" />
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            {/* ── Activity Feed ─────────────────────────────────── */}
            <motion.section variants={fadeUp} className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="px-5 pb-4">
                {activityLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-slate-300" /></div>
                ) : activity.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-slate-400">No recent activity</p>
                ) : (
                  <div className="space-y-0">
                    <AnimatePresence initial={false}>
                      {activity.map((item, index) => (
                        <motion.div
                          key={item.id}
                          variants={popIn}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          className={`flex items-start gap-3 py-3 ${index !== activity.length - 1 ? "border-b border-slate-100/80" : ""}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <StatusBadge status={notifToBadge(item.type)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-snug text-slate-700">{item.message}</p>
                            <p className="mt-0.5 text-[12px] text-slate-400">{timeAgo(item.createdAt as unknown as { seconds: number })}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                <Link
                  href="/dashboard/notifications"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  View all activity <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.section>
          </motion.div>
        )}

        {/* Emergency overlay */}
        {isEmergency && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="rounded-2xl border border-red-900/40 bg-black/60 px-8 py-5 text-center backdrop-blur-sm">
              <Lock className="mx-auto mb-2 h-6 w-6 text-red-400" />
              <p className="text-sm font-bold text-red-300">Emergency Brake Active</p>
              <p className="text-[12px] text-red-400/70">All actions locked by system administrator.</p>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
