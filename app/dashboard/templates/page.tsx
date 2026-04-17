"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCode2, FileDown, Plus, Upload, Link as LinkIcon, Search, Trash2, Loader2, LayoutTemplate, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import { getUserTemplates, moveToTrash, type Template } from "@/lib/firestore";

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getUserTemplates(user.uid);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Move this template to trash?")) return;
    try {
      await moveToTrash("templates", id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to trash template:", err);
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
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </main>
  );
}
