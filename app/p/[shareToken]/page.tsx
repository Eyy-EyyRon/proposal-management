"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText, X, Check, AlertCircle, Download, Pen, Upload,
  Image as ImageIcon, Loader2, ShieldCheck, Sparkles,
} from "lucide-react";
import {
  getProposal, markProposalViewed, acceptProposal, rejectProposal,
  type Proposal,
} from "@/lib/firestore";
import { renderProposalHtml } from "@/lib/proposal-renderer";
import { uploadSignature, uploadSignatureImage } from "@/lib/storage";

type SignatureMode = "type" | "upload";
type ViewState = "loading" | "not-found" | "document" | "accepted" | "rejected";

export default function ProposalPortalPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  // ─── State ──────────────────────────────────────────────────
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string>("");
  const [renderError, setRenderError] = useState(false);

  // Signature
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("type");
  const [typedName, setTypedName] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reject
  const [showReject, setShowReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const viewTracked = useRef(false);

  // ─── Fetch proposal + template + render ─────────────────────
  useEffect(() => {
    if (!shareToken) return;
    let cancelled = false;

    (async () => {
      try {
        const p = await getProposal(shareToken);
        if (!p || cancelled) { if (!cancelled) setViewState("not-found"); return; }

        setProposal(p);

        if (p.status === "accepted") { setViewState("accepted"); return; }
        if (p.status === "rejected") { setViewState("rejected"); return; }

        // Render docx → HTML with mail-merge using URL stored on the proposal
        if (p.templateFileUrl) {
          try {
            const html = await renderProposalHtml(p.templateFileUrl, p.fieldValues);
            if (!cancelled) setDocumentHtml(html);
          } catch {
            if (!cancelled) setRenderError(true);
          }
        }

        if (!cancelled) setViewState("document");
      } catch {
        if (!cancelled) setViewState("not-found");
      }
    })();

    return () => { cancelled = true; };
  }, [shareToken]);

  // ─── Track view (once) ──────────────────────────────────────
  useEffect(() => {
    if (viewState !== "document" || viewTracked.current || !shareToken) return;
    viewTracked.current = true;
    markProposalViewed(shareToken).catch(console.error);
  }, [viewState, shareToken]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!proposal) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let sigUrl = "";
      let sigType: "draw" | "upload" = "draw";

      if (signatureMode === "type" && typedName.trim()) {
        // Create a canvas with the typed name and upload as image
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, 600, 160);
          ctx.font = "italic 48px Georgia, serif";
          ctx.fillStyle = "#0f172a";
          ctx.textBaseline = "middle";
          ctx.fillText(typedName.trim(), 30, 80);
        }
        const dataUrl = canvas.toDataURL("image/png");
        const res = await uploadSignature(dataUrl, proposal.id);
        sigUrl = res.url;
        sigType = "draw";
      } else if (signatureMode === "upload" && signatureFile) {
        const res = await uploadSignatureImage(signatureFile, proposal.id);
        sigUrl = res.url;
        sigType = "upload";
      } else {
        setSubmitError("Please provide your signature before accepting.");
        setSubmitting(false);
        return;
      }

      await acceptProposal(proposal.id, sigType, sigUrl);
      setViewState("accepted");
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [proposal, signatureMode, typedName, signatureFile]);

  const handleReject = useCallback(async () => {
    if (!proposal) return;
    setRejecting(true);
    try {
      await rejectProposal(proposal.id);
      setViewState("rejected");
    } catch {
      setSubmitError("Failed to submit. Please try again.");
    } finally {
      setRejecting(false);
    }
  }, [proposal]);

  const handleSigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSignaturePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const formatDate = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const secs = (ts as { seconds: number }).seconds;
    if (!secs) return "";
    return new Date(secs * 1000).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  };

  // ─── Loading ────────────────────────────────────────────────
  if (viewState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading proposal…</p>
        </div>
      </div>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────
  if (viewState === "not-found") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="mx-4 max-w-sm rounded-3xl border border-slate-200/60 bg-white/70 p-10 text-center shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <X className="h-7 w-7 text-rose-500" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Proposal Not Found</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This link may be invalid or the proposal may have been removed.
          </p>
        </div>
      </div>
    );
  }

  // ─── Accepted — Thank You ───────────────────────────────────
  if (viewState === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="mx-4 max-w-sm rounded-3xl border border-emerald-200/60 bg-white/70 p-10 text-center shadow-xl shadow-emerald-100/40 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Thank You!</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The proposal has been accepted and your signature has been securely recorded.
            You'll receive a confirmation shortly.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Signed & Accepted
          </div>
        </div>
      </div>
    );
  }

  // ─── Rejected ───────────────────────────────────────────────
  if (viewState === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="mx-4 max-w-sm rounded-3xl border border-slate-200/60 bg-white/70 p-10 text-center shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Proposal Declined</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Your response has been recorded. The sender will be notified and may reach out to discuss next steps.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main Document View ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200/60">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-slate-900">
                {proposal?.templateName ?? "Proposal"}
              </h1>
              <p className="text-[12px] text-slate-400">
                {proposal ? `Prepared for ${proposal.clientName}` : ""}
                {proposal?.createdAt ? ` · ${formatDate(proposal.createdAt)}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
          >
            <Download className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          {/* ── Document Panel ──────────────────────────────── */}
          <section>
            <div className="rounded-3xl border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/30 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h2 className="text-[13px] font-semibold text-slate-700">Proposal Document</h2>
              </div>

              {documentHtml ? (
                <div
                  className="proposal-content px-8 py-6 sm:px-10 sm:py-8"
                  dangerouslySetInnerHTML={{ __html: documentHtml }}
                />
              ) : renderError ? (
                <div className="px-8 py-16 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="mt-3 text-sm text-slate-500">
                    Could not render the document. Please contact the sender.
                  </p>
                </div>
              ) : proposal?.templateGdocUrl ? (
                <div className="px-8 py-10 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">Google Docs Template</p>
                  <a
                    href={proposal.templateGdocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                  >
                    View original document →
                  </a>
                </div>
              ) : (
                <div className="px-8 py-16 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">No document preview available.</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Side Panel ──────────────────────────────────── */}
          <aside className="space-y-5">
            {/* Proposal Details */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg shadow-slate-200/20 backdrop-blur-xl">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Proposal Details
              </h3>
              <dl className="space-y-2.5">
                {proposal && Object.entries(proposal.fieldValues).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[11px] font-medium text-slate-400">{key}</dt>
                    <dd className="text-[13px] font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Sign & Accept */}
            {!showReject && (
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg shadow-slate-200/20 backdrop-blur-xl">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Sign &amp; Accept
                </h3>

                {/* Mode Toggle */}
                <div className="mb-4 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("type")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
                      signatureMode === "type"
                        ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Pen className="h-3.5 w-3.5" />
                    Type Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("upload")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
                      signatureMode === "upload"
                        ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Upload Image
                  </button>
                </div>

                {signatureMode === "type" ? (
                  <div>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Type your full name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                    {typedName.trim() && (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-white px-5 py-4">
                        <p className="text-[11px] text-slate-400">Signature Preview</p>
                        <p className="mt-1 font-serif text-2xl italic text-slate-800">
                          {typedName}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {signaturePreview ? (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-slate-100 bg-white p-3">
                          <img
                            src={signaturePreview}
                            alt="Signature"
                            className="mx-auto max-h-24 object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSignatureFile(null); setSignaturePreview(null); }}
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
                        >
                          Remove & re-upload
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-6 transition hover:border-violet-300 hover:bg-violet-50/30">
                        <Upload className="h-6 w-6 text-slate-300" />
                        <span className="text-[12px] font-medium text-slate-500">Upload signature image</span>
                        <span className="text-[11px] text-slate-400">PNG, JPG — max 5 MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSigFileChange} />
                      </label>
                    )}
                  </div>
                )}

                {submitError && (
                  <p className="mt-3 text-[12px] text-rose-600">{submitError}</p>
                )}

                <button
                  onClick={handleAccept}
                  disabled={submitting || (signatureMode === "type" ? !typedName.trim() : !signatureFile)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-emerald-200/50 transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Accept & Sign"}
                </button>

                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowReject(true)}
                    className="text-[12px] font-medium text-slate-400 underline underline-offset-2 transition hover:text-slate-600"
                  >
                    Decline this proposal
                  </button>
                </div>
              </div>
            )}

            {/* Reject Panel */}
            {showReject && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 shadow-lg shadow-rose-100/20 backdrop-blur-xl">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-rose-400">
                  Decline Proposal
                </h3>
                <p className="mb-3 text-[12px] text-rose-600/80">
                  Are you sure? The sender will be notified of your decision.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReject(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejecting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                  >
                    {rejecting && <Loader2 className="h-3 w-3 animate-spin" />}
                    {rejecting ? "Declining…" : "Confirm Decline"}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ── Proposal content styles ────────────────────────── */}
      <style jsx global>{`
        .proposal-content {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.8;
          color: #1e293b;
        }
        .proposal-content p {
          margin-bottom: 0.75em;
        }
        .proposal-content h1, .proposal-content h2, .proposal-content h3 {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          color: #0f172a;
        }
        .proposal-content h1 { font-size: 1.5em; }
        .proposal-content h2 { font-size: 1.25em; }
        .proposal-content h3 { font-size: 1.1em; }
        .proposal-content ul, .proposal-content ol {
          padding-left: 1.5em;
          margin-bottom: 0.75em;
        }
        .proposal-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1em;
        }
        .proposal-content th, .proposal-content td {
          border: 1px solid #e2e8f0;
          padding: 0.5em 0.75em;
          text-align: left;
          font-size: 13px;
        }
        .proposal-content th {
          background: #f8fafc;
          font-weight: 600;
        }
        .proposal-filled {
          font-weight: 600;
          color: #4338ca;
        }
        .proposal-placeholder {
          background: #fef3c7;
          padding: 0 4px;
          border-radius: 3px;
          color: #92400e;
          font-size: 0.9em;
        }
        @media print {
          header, aside, .no-print { display: none !important; }
          .proposal-content { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
