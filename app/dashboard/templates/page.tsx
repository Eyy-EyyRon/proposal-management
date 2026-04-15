"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Upload, Link as LinkIcon, Search, Trash2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import { getUserTemplates, deleteTemplate, type Template } from "@/lib/firestore";

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await getUserTemplates(user.uid);
        if (!cancelled) setTemplates(data);
      } catch (err) {
        console.error("Failed to load templates:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete template:", err);
    }
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (ts: { seconds: number } | null) => {
    if (!ts) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Templates" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Templates</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Create reusable templates with dynamic fields.
            </p>
          </div>
          <Link
            href="/dashboard/templates/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New template
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white">
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-800">No templates yet</p>
              <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
                Create your first template to start sending proposals.
              </p>
              <Link
                href="/dashboard/templates/new"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Create template
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-[13px] font-medium text-slate-900">
                {filtered.length} template{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 rounded-md border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                />
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
                        className={`group transition-colors hover:bg-slate-50/80 ${
                          i !== filtered.length - 1 ? "border-b border-slate-100/80" : ""
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              template.type === "docx"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-sky-50 text-sky-600"
                            }`}>
                              <FileText className="h-4 w-4" />
                            </div>
                            <p className="text-[13px] font-medium text-slate-800">
                              {template.name}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium ${
                            template.type === "docx"
                              ? "bg-slate-50 text-slate-600"
                              : "bg-sky-50 text-sky-700"
                          }`}>
                            {template.type === "docx" ? (
                              <Upload className="h-3 w-3" />
                            ) : (
                              <LinkIcon className="h-3 w-3" />
                            )}
                            {template.type === "docx" ? "DOCX" : "Google Docs"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex gap-1">
                            {fieldNames.slice(0, 3).map((f) => (
                              <span key={f} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                {f}
                              </span>
                            ))}
                            {fieldNames.length > 3 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-400">
                                +{fieldNames.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
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
