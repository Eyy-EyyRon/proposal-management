"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutTemplate,
  Plus,
  Search,
  FileText,
  Loader2,
  FileDown,
  Link as LinkIcon,
} from "lucide-react";
import { getAllTemplates, type Template } from "@/lib/firestore";

function formatDate(ts: { seconds: number } | null | undefined) {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllTemplates();
        setTemplates(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-6 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Templates</h2>
        <p className="text-[13px] text-slate-500">
          Manage proposal templates for your team.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-4 text-[13px] outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition focus:border-[#800020]/30 focus:bg-white"
          />
        </div>
        <Link
          href="/dashboard/templates"
          className="flex items-center gap-2 rounded-xl bg-[#800020] px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-[#800020]/20 transition hover:bg-[#660018]"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-[13px] text-slate-500">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="group relative flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:border-[#800020]/30 hover:shadow-[0_1px_3px_rgba(128,0,32,0.08)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#800020]/10">
                  <LayoutTemplate className="h-5 w-5 text-[#800020]" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {template.type === "docx" ? (
                    <FileDown className="h-3 w-3 opacity-50" />
                  ) : (
                    <LinkIcon className="h-3 w-3 opacity-50" />
                  )}
                  {template.type === "docx" ? "DOCX" : "GDOC"}
                </span>
              </div>

              <h3 className="mt-3 text-[14px] font-semibold text-slate-900">
                {template.name}
              </h3>
              {template.description && (
                <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {template.fields?.length ?? 0} fields
                </span>
                <span className="text-[11px] text-slate-400">
                  Created {formatDate(template.createdAt as { seconds: number } | null)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/dashboard/create-proposal?template=${template.id}`}
                  className="flex-1 rounded-lg bg-[#800020] py-2 text-center text-[12px] font-medium text-white transition hover:bg-[#660018]"
                >
                  Use Template
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <LayoutTemplate className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-[13px] font-medium text-slate-600">No templates found</p>
              <p className="mt-1 text-[12px] text-slate-400">
                {search ? "Try a different search term." : "Create your first template from the dashboard."}
              </p>
            </div>
          )}

          {/* Create New Template Card */}
          <Link
            href="/dashboard/templates"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 transition hover:border-[#800020]/50 hover:bg-slate-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-400">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="text-[14px] font-semibold text-slate-700">
                Create New Template
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Add a custom template
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
