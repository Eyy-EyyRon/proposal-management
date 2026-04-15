"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProposalForm } from "@/components/proposal-form";
import { Topbar } from "@/components/topbar";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getUserTemplates, createProposal, type Template } from "@/lib/firestore";

export default function CreateProposalPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch user's templates
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
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmit = async (data: { templateId: string; fieldValues: Record<string, string> }) => {
    if (!user) return;
    setSubmitting(true);
    setError(null);

    try {
      // Generate UUID v4 as the proposal ID / share token
      const proposalId = crypto.randomUUID();

      // Find the selected template for metadata
      const template = templates.find((t) => t.id === data.templateId);

      // Derive client name and email from fieldValues
      const clientName =
        data.fieldValues[Object.keys(data.fieldValues).find((k) => {
          const field = template?.fields.find((f) => f.id === k);
          return field?.name.toLowerCase().includes("name");
        }) ?? ""] || "Client";

      const clientEmail =
        data.fieldValues[Object.keys(data.fieldValues).find((k) => {
          const field = template?.fields.find((f) => f.id === k);
          return field?.type === "email" || field?.name.toLowerCase().includes("email");
        }) ?? ""] || "";

      await createProposal(proposalId, {
        userId: user.uid,
        templateId: data.templateId,
        templateName: template?.name ?? "Unknown",
        clientName,
        clientEmail,
        fieldValues: data.fieldValues,
      });

      const url = `${window.location.origin}/p/${proposalId}`;
      setShareUrl(url);

      // Auto-copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create proposal";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Success State ─────────────────────────────────────────
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

  // ─── Form State ────────────────────────────────────────────

  // Map Template → ProposalForm template shape
  const formTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    sourceType: t.type === "docx" ? ("docx" as const) : ("gdocs" as const),
    fields: t.fields,
  }));

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

        {error && (
          <div className="max-w-2xl rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="max-w-2xl rounded-xl border border-slate-200/80 bg-white p-6">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : formTemplates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[13px] font-medium text-slate-700">No templates yet</p>
              <p className="mt-1 text-[13px] text-slate-500">
                <Link href="/dashboard/templates/new" className="text-slate-900 underline underline-offset-2">
                  Create a template
                </Link>{" "}
                first, then come back to create a proposal.
              </p>
            </div>
          ) : (
            <ProposalForm templates={formTemplates} onSubmit={handleSubmit} submitting={submitting} />
          )}
        </div>
      </div>
    </main>
  );
}
