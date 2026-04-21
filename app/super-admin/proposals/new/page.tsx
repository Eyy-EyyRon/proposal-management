"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutTemplate,
  FileText,
  ChevronDown,
  FilePlus,
} from "lucide-react";

// Mock templates
const templates = [
  {
    id: "1",
    name: "Standard Consulting Agreement",
    description: "General consulting services with standard terms",
    lastUsed: "2 days ago",
    fields: ["client_name", "project_scope", "fee", "timeline"],
  },
  {
    id: "2",
    name: "Website Development Proposal",
    description: "Web design and development services",
    lastUsed: "1 week ago",
    fields: ["client_name", "website_type", "features", "budget", "deadline"],
  },
  {
    id: "3",
    name: "Marketing Strategy Proposal",
    description: "Digital marketing and strategy services",
    lastUsed: "3 days ago",
    fields: ["client_name", "marketing_goals", "budget", "duration"],
  },
];

export default function NewProposalPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "details">("select");

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin"
          className="group flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all duration-300 ease-out hover:border-[#800020] hover:text-[#800020]"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1" />
        </Link>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Create New Proposal
          </h2>
          <p className="text-[13px] text-slate-500">
            Select a template to get started
          </p>
        </div>
      </div>

      {step === "select" ? (
        <div className="space-y-8">
          {/* Template Selection */}
          <div className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const active = selectedTemplate === template.id;
              return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`group relative flex min-h-[160px] flex-col items-start gap-3 overflow-hidden rounded-xl border bg-white p-5 text-left transition-all duration-300 ease-out ${
                  active
                    ? "border-[#800020] bg-[#800020]/5 shadow-[0_0_15px_rgba(128,0,32,0.1)] scale-[1.02]"
                    : "border-slate-200 hover:border-[#800020]/50 hover:shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 ease-out ${
                    active
                      ? "bg-[#800020] text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-rose-50 group-hover:text-[#800020]"
                  }`}
                >
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {template.description}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    Last used {template.lastUsed}
                  </p>
                </div>
                <span className="absolute bottom-4 right-4 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                  {template.fields.length} Fields
                </span>
                {active && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#800020]">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
              );
            })}

            {/* Create Blank Option */}
            <button className="flex min-h-[160px] flex-col items-start gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-left transition-all duration-300 ease-out hover:border-[#800020]/50 hover:bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-300">
                <FilePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-slate-700">
                  Start from Scratch
                </h3>
                <p className="mt-1 text-[12px] text-slate-500">
                  Create a blank proposal
                </p>
              </div>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mx-auto mt-8 flex w-full max-w-6xl items-center justify-end gap-3 border-t border-slate-100 pt-8">
            <Link
              href="/super-admin"
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              onClick={() => selectedTemplate && setStep("details")}
              disabled={!selectedTemplate}
              className="rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition-all duration-300 ease-out hover:bg-[#660018] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        /* Proposal Details Form */
        <div className="rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-[#800000]/5 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#800000]">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-700">
                Using template:
              </p>
              <p className="text-[14px] font-semibold text-[#800000]">
                {selectedTemplateData?.name}
              </p>
            </div>
            <button
              onClick={() => setStep("select")}
              className="ml-auto text-[12px] text-slate-400 hover:text-[#800000]"
            >
              Change
            </button>
          </div>

          <h3 className="mb-4 text-[14px] font-semibold text-slate-900">
            Client Information
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Client Name *
              </label>
              <input
                type="text"
                placeholder="Enter client name"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="client@company.com"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Company
              </label>
              <input
                type="text"
                placeholder="Company name (optional)"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
          </div>

          <h3 className="mb-4 mt-6 text-[14px] font-semibold text-slate-900">
            Proposal Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Project Title *
              </label>
              <input
                type="text"
                placeholder="Enter project title"
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Description
              </label>
              <textarea
                rows={4}
                placeholder="Describe the project scope and deliverables..."
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
          </div>

          <div className="mx-auto mt-6 flex w-full max-w-6xl items-center justify-end gap-3">
            <button
              onClick={() => setStep("select")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-50"
            >
              Back
            </button>
            <button className="rounded-lg bg-[#800020] px-6 py-2 text-[13px] font-medium text-white transition-all duration-300 ease-out hover:bg-[#660018]">
              Create Proposal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
