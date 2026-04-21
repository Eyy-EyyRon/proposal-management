"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileCode2, FileDown, Plus, Link as LinkIcon, Search,
  Trash2, Loader2, Globe, EyeOff, LayoutTemplate,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { Breadcrumb } from "@/components/breadcrumb";
import { useAuth } from "@/contexts/auth-context";
import {
  getAllTemplates, moveToTrash, publishTemplate, unpublishTemplate,
  type Template,
} from "@/lib/firestore";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/providers/toast";
import { EmptyState } from "@/components/empty-state";

function formatDate(ts: { seconds: number } | null) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function CeoTemplatesPage() {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAllTemplates()
      .then((data) => { if (!cancelled) setTemplates(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const handleTogglePublish = async (template: Template) => {
    const isPublished = template.isPublished !== false;
    if (isPublished) {
      const ok = await confirm({
        title: "Unpublish Template?",
        description: `"${template.name}" will be hidden from staff until republished.`,
        actionType: "danger",
        confirmText: "Unpublish",
      });
      if (!ok) return;
    }
    setPublishingId(template.id);
    try {
      const actorName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "CEO";
      if (isPublished) {
        await unpublishTemplate(template.id, user!.uid, actorName);
        setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, isPublished: false } : t));
        toast.success(`"${template.name}" is now a Draft.`);
      } else {
        await publishTemplate(template.id, user!.uid);
        setTemplates((prev) => prev.map((t) => t.id === template.id ? { ...t, isPublished: true } : t));
        toast.success(`"${template.name}" published.`);
      }
    } catch {
      toast.error("Failed to update template.");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Move to Trash?",
      description: `Move "${name}" to trash? You can restore it later.`,
      actionType: "danger",
      confirmText: "Move to Trash",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await moveToTrash("templates", id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success(`"${name}" moved to trash.`);
    } catch {
      toast.error("Failed to move to trash.");
    } finally {
      setDeletingId(null);
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
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200/50 shadow-sm">
          <div>
            <Breadcrumb />
            <h2 className="font-sans text-xl font-bold tracking-tight text-slate-950">Templates</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Manage all organisation proposal templates. Publish or draft as needed.
            </p>
          </div>
          <Link
            href="/dashboard/templates/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#780116] px-4 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#600012]"
          >
            <Plus className="h-3.5 w-3.5" /> New Template
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[13px] text-slate-700 outline-none focus:border-[#780116]/40 focus:ring-2 focus:ring-[#780116]/10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates yet"
            description="Create a template to start delegating structured proposals to your team."
            actionLabel="Create Template"
            actionHref="/dashboard/templates/new"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                    <FileCode2 className="h-4 w-4 text-[#780116]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{tmpl.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500">
                        {tmpl.type === "docx" ? <FileDown className="h-2.5 w-2.5" /> : <LinkIcon className="h-2.5 w-2.5" />}
                        {tmpl.type === "docx" ? "DOCX" : "GDOC"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        tmpl.isPublished !== false
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {tmpl.isPublished !== false ? <><Globe className="h-2.5 w-2.5" /> Published</> : <><EyeOff className="h-2.5 w-2.5" /> Draft</>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fields */}
                {tmpl.fields && tmpl.fields.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tmpl.fields.slice(0, 4).map((f) => (
                      <span key={f.id} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        {f.name}
                      </span>
                    ))}
                    {tmpl.fields.length > 4 && (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                        +{tmpl.fields.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-[11px] text-slate-400">
                    {formatDate(tmpl.createdAt as { seconds: number } | null)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePublish(tmpl)}
                      disabled={publishingId === tmpl.id}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {publishingId === tmpl.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : tmpl.isPublished !== false ? (
                        <><EyeOff className="h-3 w-3" /> Unpublish</>
                      ) : (
                        <><Globe className="h-3 w-3" /> Publish</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id, tmpl.name)}
                      disabled={deletingId === tmpl.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                    >
                      {deletingId === tmpl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal {...modalProps} />
    </main>
  );
}
