"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Topbar } from "@/components/topbar";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToUserTrashedProposals,
  subscribeToDeptTrashedProposals,
  subscribeToUserTrashedTemplates,
  subscribeToTrashedTemplates,
  restoreFromTrash,
  permanentDelete,
  type Proposal,
  type Template,
} from "@/lib/firestore";
import { Trash2, Loader2, RotateCcw, XCircle, FileText, LayoutTemplate } from "lucide-react";

type TrashItem =
  | { kind: "proposal"; data: Proposal }
  | { kind: "template"; data: Template };

function formatDeletedCountdown(deletedAt: unknown): string {
  if (!deletedAt || typeof deletedAt !== "object") return "—";
  const seconds = (deletedAt as { seconds: number }).seconds;
  if (!seconds) return "—";

  const deletedMs = seconds * 1000;
  const retentionDays = 30;
  const elapsedDays = Math.floor((Date.now() - deletedMs) / 86_400_000);
  const remaining = Math.max(0, retentionDays - elapsedDays);
  return `${remaining}d`;
}

function getOriginalLocation(item: TrashItem): string {
  if (item.kind === "proposal") {
    const dept = item.data.department ? ` / ${item.data.department}` : "";
    return `Dashboard / Proposals${dept}`;
  }
  return item.data.type === "docx" ? "Dashboard / Templates / DOCX" : "Dashboard / Templates / Google Docs";
}

function VaultEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_48%,rgba(120,1,22,0.05)_49%,transparent_50%,transparent_74%,rgba(148,163,184,0.04)_75%,transparent_76%,transparent_100%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.06),transparent_28%),radial-gradient(circle_at_50%_78%,rgba(120,1,22,0.04),transparent_34%)]" />

      <div className="relative px-6 py-8">
        <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-20 text-center">
          <motion.div
            animate={{ y: [0, -4, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_0_28px_rgba(99,102,241,0.18)]"
          >
            <Trash2 className="h-7 w-7" />
          </motion.div>
          <h3 className="mt-5 text-[15px] font-semibold text-slate-900">Trash is empty</h3>
          <p className="mt-2 max-w-sm mx-auto text-[13px] leading-relaxed text-slate-400">
            Deleted proposals and templates will appear here. You can restore them or permanently remove them once they age out.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardTrashPage() {
  const { user, profile } = useAuth();
  const { isAtLeast, isAdmin } = useRole();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "proposals" | "templates">("all");

  useEffect(() => {
    if (!user || !profile) return;
    
    let proposalsDone = false;
    let templatesDone = false;
    const checkDone = () => { if (proposalsDone && templatesDone) setLoading(false); };

    let unsubProposals: () => void;
    let unsubTemplates: () => void;

    // 🔥 THE FIX: Route the correct query based on their role
    if (isAdmin && profile.department) {
      // Admins get their Department's trashed proposals, and Global templates
      unsubProposals = subscribeToDeptTrashedProposals(profile.department, (data) => {
        setProposals(data);
        proposalsDone = true;
        checkDone();
      });
      unsubTemplates = subscribeToTrashedTemplates((data) => {
        setTemplates(data);
        templatesDone = true;
        checkDone();
      });
    } else {
      // Staff get strictly their OWN trashed proposals and templates
      unsubProposals = subscribeToUserTrashedProposals(user.uid, (data) => {
        setProposals(data);
        proposalsDone = true;
        checkDone();
      });
      unsubTemplates = subscribeToUserTrashedTemplates(user.uid, (data) => {
        setTemplates(data);
        templatesDone = true;
        checkDone();
      });
    }

    return () => { 
      if (unsubProposals) unsubProposals(); 
      if (unsubTemplates) unsubTemplates(); 
    };
  }, [user, profile, isAdmin]);

  const items: TrashItem[] = [
    ...(tab !== "templates" ? proposals.map((p) => ({ kind: "proposal" as const, data: p })) : []),
    ...(tab !== "proposals" ? templates.map((t) => ({ kind: "template" as const, data: t })) : []),
  ];

  const handleRestore = async (kind: "proposal" | "template", id: string) => {
    const col = kind === "proposal" ? "proposals" : "templates";
    await restoreFromTrash(col, id);
  };

  const handlePermanentDelete = async (kind: "proposal" | "template", id: string) => {
    if (!window.confirm("Permanently delete this item? This cannot be undone.")) return;
    const col = kind === "proposal" ? "proposals" : "templates";
    await permanentDelete(col, id);
  };

  const canPermDelete = isAtLeast("admin");
  const totalCount = proposals.length + templates.length;

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: totalCount },
    { key: "proposals", label: "Proposals", count: proposals.length },
    { key: "templates", label: "Templates", count: templates.length },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Topbar title="Trash" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Trash</h2>
          <p className="mt-1 text-[13px] text-slate-400">
            Deleted items. Restore or remove them.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[13px] text-slate-400">Loading…</p>
          </div>
        ) : totalCount === 0 ? (
          <VaultEmptyState />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 px-4 py-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-medium transition ${
                    tab === t.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                  <span className={`ml-1 text-[11px] ${tab === t.key ? "text-white/70" : "text-slate-300"}`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-8 px-5 py-2.5" />
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Item Name</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Original Location</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Days Remaining</th>
                    <th className="w-[16rem] px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const id = item.data.id;
                    const isProposal = item.kind === "proposal";
                    const p = isProposal ? (item.data as Proposal) : null;
                    const t = !isProposal ? (item.data as Template) : null;
                    const name = p ? p.clientName : t!.name;
                    const subtitle = p ? p.clientEmail : (t!.type === "docx" ? "DOCX Template" : "Google Docs Template");
                    const location = getOriginalLocation(item);
                    const remaining = formatDeletedCountdown(item.data.deletedAt);
                    return (
                      <tr key={`${item.kind}-${id}`} className={`group transition-all duration-200 hover:bg-slate-50/70 ${i !== items.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                        <td className="px-5 py-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isProposal ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-500"}`}>
                            {isProposal ? <FileText className="h-3.5 w-3.5" /> : <LayoutTemplate className="h-3.5 w-3.5" />}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-slate-800">{name}</p>
                          <p className="text-[12px] text-slate-400">{subtitle}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <p className="text-[13px] text-slate-600">{location}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600">
                            {remaining}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                            <button
                              onClick={() => handleRestore(item.kind === "proposal" ? "proposal" : "template", id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-3 text-[12px] font-medium text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-sky-50 hover:text-sky-700"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Restore
                            </button>
                            {canPermDelete && (
                              <button
                                onClick={() => handlePermanentDelete(item.kind === "proposal" ? "proposal" : "template", id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#780116]/10 bg-[#780116]/5 px-3 text-[12px] font-medium text-[#780116] shadow-sm backdrop-blur-md transition hover:bg-[#780116]/10"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Permanently Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[12px] text-slate-400">{totalCount} item{totalCount !== 1 ? "s" : ""} in trash</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}