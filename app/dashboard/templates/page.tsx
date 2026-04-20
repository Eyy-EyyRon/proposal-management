"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCode2, FileDown, Plus, Link as LinkIcon, Search, Trash2, Loader2, LayoutTemplate, AlertTriangle, Globe, EyeOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Topbar } from "@/components/topbar";
import { useAuth, useRole } from "@/contexts/auth-context";
import { getUserTemplates, getAllTemplates, moveToTrash, publishTemplate, unpublishTemplate, type Template } from "@/lib/firestore";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/providers/toast";

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocumentSchemaIcon() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#780116] ring-1 ring-slate-200/80">
      <FileCode2 className="h-4 w-4" />
    </div>
  );
}

function SourceModuleBadge({ type }: { type: Template["type"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
      {type === "docx" ? (
        <FileDown className="h-3 w-3 opacity-50" />
      ) : (
        <LinkIcon className="h-3 w-3 opacity-50" />
      )}
      {type === "docx" ? "DOCX" : "GDOC"}
    </span>
  );
}

function VariablePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-100/70 px-2 py-0.5 font-mono text-[11px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      {label}
    </span>
  );
}

export default function TemplatesPage() {
  const { user } = useAuth();
  const { isStaff, isAdmin, isCeo } = useRole();
  const canManageTemplates = isAdmin || isCeo;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { confirm, modalProps } = useConfirmModal();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const data = isStaff ? await getAllTemplates() : await getUserTemplates(user.uid);
        if (!cancelled) setTemplates(data);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load templates";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, retryCount]);

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Move to Trash?",
      description: `You are about to move "${name}" to trash. You can restore this later from the trash folder.`,
      actionType: "danger",
      confirmText: "Move to Trash",
      cancelText: "Keep",
    });

    if (!confirmed) return;

    setDeletingId(id);
    try {
      await moveToTrash("templates", id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success(`"${name}" moved to trash successfully!`);
    } catch (err) {
      toast.error("Failed to move template to trash. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (template: Template) => {
    const isPublished = template.isPublished !== false;
    if (isPublished) {
      const ok = await confirm({
        title: "Unpublish Template?",
        description: `"${template.name}" will become a Draft and will be hidden from staff. No new proposals can use it until republished.`,
        actionType: "danger",
        confirmText: "Unpublish",
      });
      if (!ok) return;
    }
    setPublishingId(template.id);
    try {
      if (isPublished) {
        await unpublishTemplate(template.id);
        setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, isPublished: false } : t));
        toast.success(`"${template.name}" is now a Draft.`);
      } else {
        await publishTemplate(template.id, user!.uid);
        setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, isPublished: true } : t));
        toast.success(`"${template.name}" published — staff can now use it.`);
      }
    } catch {
      toast.error("Failed to update template status.");
    } finally {
      setPublishingId(null);
    }
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Templates" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200/50 shadow-sm backdrop-blur-sm">
          <div>
            <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Templates</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Create reusable templates with dynamic fields.
            </p>
          </div>
          <Link
            href="/dashboard/templates/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New template
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <p className="text-[13px] text-slate-400">Loading templates…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-slate-800">Unable to load templates</p>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
                {error.includes("index") || error.includes("requires")
                  ? "Firestore is still building the required indexes. This usually takes a few minutes — please try again shortly."
                  : error}
              </p>
            </div>
            <button
              onClick={() => { setError(null); setLoading(true); setRetryCount((c) => c + 1); }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates yet"
            description="Create your first reusable template with dynamic fields to start sending polished proposals."
            actionLabel="Create template"
            actionHref="/dashboard/templates/new"
          />
        ) : (
          <div className="rounded-xl border border-slate-200/50 bg-white/90 backdrop-blur-sm ring-1 ring-slate-200/50 shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3">
              <p className="text-[13px] font-medium text-slate-900">
                {filtered.length} template{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-14 text-[13px] text-slate-800 outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)] transition placeholder:text-slate-400 focus:border-[#780116] focus:bg-white focus:ring-4 focus:ring-[#780116]/10"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-[inset_0_1px_1px_rgba(15,23,42,0.04)]">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Template
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Source
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Fields
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Created
                    </th>
                    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((template, i) => {
                    const fieldNames = template.dynamicFields.length > 0
                      ? template.dynamicFields
                      : template.fields.map((f) => f.name);
                    return (
                      <tr
                        key={template.id}
                        className={`group bg-transparent transition-all duration-200 hover:bg-slate-50/50 hover:shadow-md hover:shadow-[#780116]/5 hover:ring-1 hover:ring-[#780116]/20 ${
                          i !== filtered.length - 1 ? "border-b border-slate-100/80" : ""
                        }`}
                      >
                        <td className="relative px-5 py-3 pl-6">
                          <span className="absolute left-0 top-0 h-full w-px bg-[#780116]/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                          <div className="flex items-center gap-3">
                            <DocumentSchemaIcon />
                            <p className="text-[13px] font-medium text-slate-800">
                              {template.name}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <SourceModuleBadge type={template.type} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {fieldNames.slice(0, 3).map((f) => (
                              <VariablePill key={f} label={f} />
                            ))}
                            {fieldNames.length > 3 && (
                              <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-100/70 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                                +{fieldNames.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 font-mono tabular-nums text-[13px] text-slate-500">
                          {formatDate(template.createdAt as unknown as { seconds: number })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          {canManageTemplates ? (
                            <button
                              onClick={() => handleTogglePublish(template)}
                              disabled={publishingId === template.id}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 disabled:opacity-50 ${
                                template.isPublished !== false
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                            >
                              {publishingId === template.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : template.isPublished !== false ? (
                                <><Globe className="h-3 w-3" /> Published</>
                              ) : (
                                <><EyeOff className="h-3 w-3" /> Draft</>
                              )}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${template.isPublished !== false ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {template.isPublished !== false ? <><Globe className="h-3 w-3" /> Published</> : <><EyeOff className="h-3 w-3" /> Draft</>}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleDelete(template.id, template.name)}
                            disabled={deletingId === template.id}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50"
                            title="Delete template"
                          >
                            {deletingId === template.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-[12px] text-slate-400">
                {templates.length} template{templates.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal {...modalProps} />
    </main>
  );
}
