"use client";

import { useState } from "react";
import Link from "next/link";
import { ProposalForm } from "@/components/proposal-form";
import { Topbar } from "@/components/topbar";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";

const mockTemplates = [
  {
    id: "1",
    name: "Standard Service Agreement",
    sourceType: "docx" as const,
    fields: [
      { id: "1", name: "Client Name", type: "text" as const, required: true },
      { id: "2", name: "Email", type: "email" as const, required: true },
      { id: "3", name: "Phone", type: "phone" as const, required: false },
      { id: "4", name: "Company", type: "text" as const, required: true },
    ],
  },
  {
    id: "2",
    name: "Project Proposal",
    sourceType: "gdocs" as const,
    fields: [
      { id: "1", name: "Client Name", type: "text" as const, required: true },
      { id: "2", name: "Email", type: "email" as const, required: true },
      { id: "3", name: "Project Scope", type: "text" as const, required: true },
      { id: "4", name: "Budget", type: "text" as const, required: false },
    ],
  },
];

export default function CreateProposalPage() {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (data: { templateId: string; fieldValues: Record<string, string> }) => {
    console.log("Creating proposal:", data);

    // Generate a share token (in production, use nanoid or similar)
    const token = Math.random().toString(36).substring(2, 15);
    const url = `${window.location.origin}/p/${token}`;

    setShareUrl(url);

    // TODO: Save to Firestore with status "Sent"
    // TODO: Generate PDF from template + field values
    // TODO: Store PDF in Firebase Storage

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (shareUrl) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Create Proposal" />

        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="mt-4 font-sans text-lg font-semibold text-slate-900">
              Proposal created
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Share this link with your client to view and sign.
            </p>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto text-[13px] text-slate-600">
                  {shareUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                    copied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => {
                  setShareUrl(null);
                  setCopied(false);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Create another
              </button>
              <Link
                href="/dashboard/proposals"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
              >
                View proposals
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Create Proposal" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/proposals"
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to proposals
          </Link>
          <h2 className="font-sans text-lg font-semibold text-slate-900">
            New proposal
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Select a template and fill in client details.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-2xl rounded-xl border border-slate-200/80 bg-white p-6">
          <ProposalForm templates={mockTemplates} onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  );
}
