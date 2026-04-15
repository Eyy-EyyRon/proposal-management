"use client";

import Link from "next/link";
import {
  LayoutTemplate,
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Clock,
} from "lucide-react";

// Mock templates data
const templates = [
  {
    id: "1",
    name: "Standard Consulting Agreement",
    description: "General consulting services with standard terms",
    lastUsed: "2 days ago",
    usageCount: 24,
    fields: ["client_name", "project_scope", "fee", "timeline"],
  },
  {
    id: "2",
    name: "Website Development Proposal",
    description: "Web design and development services",
    lastUsed: "1 week ago",
    usageCount: 18,
    fields: ["client_name", "website_type", "features", "budget", "deadline"],
  },
  {
    id: "3",
    name: "Marketing Strategy Proposal",
    description: "Digital marketing and strategy services",
    lastUsed: "3 days ago",
    usageCount: 12,
    fields: ["client_name", "marketing_goals", "budget", "duration"],
  },
  {
    id: "4",
    name: "Software Development Contract",
    description: "Custom software development with milestones",
    lastUsed: "2 weeks ago",
    usageCount: 8,
    fields: ["client_name", "project_specs", "milestones", "payment_terms"],
  },
];

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Templates</h2>
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
            placeholder="Search templates..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none focus:border-[#800000] focus:ring-1 focus:ring-[#800000]/20"
          />
        </div>
        <Link
          href="/super-admin/templates/new"
          className="flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]"
        >
          <Plus className="h-4 w-4" />
          New Template
        </Link>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="group relative flex flex-col rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:border-[#800000]/30 hover:shadow-[0_1px_3px_rgba(128,0,0,0.05)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#800000]/10">
                <LayoutTemplate className="h-5 w-5 text-[#800000]" />
              </div>
              <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <h3 className="mt-3 text-[14px] font-semibold text-slate-900">
              {template.name}
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              {template.description}
            </p>

            <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {template.fields.length} fields
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Used {template.usageCount} times
              </span>
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              Last used {template.lastUsed}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/super-admin/proposals/new?template=${template.id}`}
                className="flex-1 rounded-lg bg-[#800000] py-2 text-center text-[12px] font-medium text-white transition hover:bg-[#660000]"
              >
                Use Template
              </Link>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50">
                Edit
              </button>
            </div>
          </div>
        ))}

        {/* Create New Template Card */}
        <Link
          href="/super-admin/templates/new"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 transition hover:border-[#800000]/50 hover:bg-slate-50"
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
    </div>
  );
}
