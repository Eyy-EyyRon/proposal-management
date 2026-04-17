"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/topbar";
import { DepartmentBadge } from "@/components/department-badge";
import { DeletedBadge } from "@/components/deleted-badge";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/contexts/auth-context"; // 🔥 Added Auth Context
import {
  subscribeToTrashedProposals,
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

export default function CeoTrashPage() {
  const { user } = useAuth(); // 🔥 Get the current user
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "proposals" | "templates">("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    // 🔥 Wait until Firebase Auth confirms they are logged in before querying!
    if (!user) return;

    let proposalsDone = false;
    let templatesDone = false;
    const checkDone = () => { if (proposalsDone && templatesDone) setLoading(false); };

    const unsub1 = subscribeToTrashedProposals((data) => {
      setProposals(data);
      proposalsDone = true;
      checkDone();
    });
    
    const unsub2 = subscribeToTrashedTemplates((data) => {
      setTemplates(data);
      templatesDone = true;
      checkDone();
    });
    
    return () => { unsub1(); unsub2(); };
  }, [user]); // 🔥 Depend on user state

  const items: TrashItem[] = [
    ...(tab !== "templates" ? proposals.map((p) => ({ kind: "proposal" as const, data: p })) : []),
    ...(tab !== "proposals" ? templates.map((t) => ({ kind: "template" as const, data: t })) : []),
  ];

  const handleRestore = async (kind: "proposal" | "template", id: string) => {
    const col = kind === "proposal" ? "proposals" : "templates";
    await restoreFromTrash(col, id);
  };

  const handlePermanentDelete = async (kind: "proposal" | "template", id: string) => {
    const col = kind === "proposal" ? "proposals" : "templates";
    await permanentDelete(col, id);
    setConfirmId(null);
  };

  const totalCount = proposals.length + templates.length;

  const tabs: { key: typeof tab; label: string; count: number }[] = [
    { key: "all",       label: "All",       count: totalCount },
    { key: "proposals", label: "Proposals", count: proposals.length },
    { key: "templates", label: "Templates", count: templates.length },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Trash" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h2 className="font-sans text-lg font-semibold text-slate-900">Trash</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Soft-deleted proposals and templates across all departments.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[13px] text-slate-400">Loading…</p>
          </div>
        ) : totalCount === 0 ? (
          <EmptyState
            icon={Trash2}
            title="Trash is empty"
            description="Deleted proposals and templates will appear here. You can restore or permanently remove them."
          />
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-slate-100 px-4 pt-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative px-3 pb-2.5 text-[13px] font-medium transition ${
                    tab === t.key ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {t.label}
                  <span className={`ml-1 text-[11px] ${tab === t.key ? "text-slate-500" : "text-slate-300"}`}>{t.count}</span>
                  {tab === t.key && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-slate-900" />}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="w-8 px-5 py-2.5" />
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Deleted</th>
                    <th className="w-24 px-3 py-2.5" />
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
                    return (
                      <tr key={`${item.kind}-${id}`} className={`group transition-colors hover:bg-slate-50/80 ${i !== items.length - 1 ? "border-b border-slate-100/80" : ""}`}>
                        <td className="px-5 py-3">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isProposal ? "bg-indigo-50 text-indigo-500" : "bg-amber-50 text-amber-500"}`}>
                            {isProposal ? <FileText className="h-3.5 w-3.5" /> : <LayoutTemplate className="h-3.5 w-3.5" />}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[13px] font-medium text-slate-800">{name}</p>
                          <p className="text-[12px] text-slate-400">{subtitle}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          {isProposal ? (
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">Proposal</span>
                              <DepartmentBadge department={p!.department} />
                            </div>
                          ) : (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">Template</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <DeletedBadge deletedAt={item.data.deletedAt} />
                        </td>
                        <td className="px-3 py-3">
                          {confirmId === id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePermanentDelete(item.kind === "proposal" ? "proposal" : "template", id)}
                                className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-red-600"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100">
                              <button
                                onClick={() => handleRestore(item.kind === "proposal" ? "proposal" : "template", id)}
                                title="Restore"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-emerald-50 hover:text-emerald-500"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmId(id)}
                                title="Permanently delete"
                                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
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