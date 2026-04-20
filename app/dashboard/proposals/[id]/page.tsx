"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  ArrowLeft,
  Loader2,
  Send,
  MessageCircle,
  Quote,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  User,
  Edit3,
  RefreshCw,
  PenTool,
  History,
  AlertTriangle, Trash2,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import { type Proposal, createProposalRevision, softDeleteComment } from "@/lib/firestore";
import { renderProposalHtml } from "@/lib/proposal-renderer";
import { exportProposalPdf } from "@/lib/export-utils";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Comment {
  id: string;
  text: string;
  quote?: string;
  authorRole: "client" | "ceo" | "staff" | "admin" | "system";
  authorName: string;
  authorId?: string;
  isDeleted?: boolean;
  deletedText?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;
  const { user, profile } = useAuth();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentHtml, setDocumentHtml] = useState<string>("");
  const [renderError, setRenderError] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeQuote, setActiveQuote] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"document" | "discuss" | "signature" | "history">("document");
  const [isEditing, setIsEditing] = useState(false);
  const [editedFieldValues, setEditedFieldValues] = useState<Record<string, string>>({});
  const [resending, setResending] = useState(false);
  // Void & Revise confirm modal
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voiding, setVoiding] = useState(false);

  // Fetch proposal using real-time subscription
  useEffect(() => {
    if (!proposalId) return;
    
    const unsub = onSnapshot(
      doc(db, "proposals", proposalId),
      async (snap) => {
        if (!snap.exists()) {
          setProposal(null);
          setLoading(false);
          return;
        }
        
        const data = { id: snap.id, ...snap.data() } as Proposal;
        setProposal(data);
        
        // Render document HTML if template URL exists
        if (data.templateFileUrl) {
          try {
            const html = await renderProposalHtml(data.templateFileUrl, data.fieldValues);
            setDocumentHtml(html);
          } catch {
            setRenderError(true);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load proposal:", err);
        setRenderError(true);
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, [proposalId]);

  // Subscribe to comments
  useEffect(() => {
    if (!proposalId) return;
    const q = query(
      collection(db, "proposals", proposalId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(fetchedComments);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [proposalId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !proposal || !user || !profile) return;

    setSubmittingComment(true);
    try {
      const commentData = {
        text: newComment.trim(),
        quote: activeQuote || null,
        authorRole: profile.role === "ceo" ? "ceo" : "staff",
        authorName: `${profile.firstName} ${profile.lastName}`,
        authorId: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "proposals", proposal.id, "comments"), commentData);

      // Notify client about the reply
      fetch("/api/send-ceo-reply-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          proposalTitle: proposal.templateName || "Proposal",
          clientName: proposal.clientName,
          clientEmail: proposal.clientEmail,
          comment: newComment.trim(),
          quote: activeQuote || null,
          ceoName: `${profile.firstName} ${profile.lastName}`,
        }),
      }).catch(() => {});

      // Also notify the staff member if the current user is the CEO (Scenario 9)
      if (proposal.sentById && proposal.sentById !== user.uid) {
        fetch("/api/send-proposal/send-comment-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId: proposal.id,
            clientName: `${profile.firstName} ${profile.lastName}` + " (via dashboard reply)",
            comment: newComment.trim(),
            quote: activeQuote || null,
            staffId: proposal.sentById,
            ownerId: proposal.ownerId,
          }),
        }).catch(() => {});
      }

      setNewComment("");
      setActiveQuote("");
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTextSelection = () => {
    if (proposal?.status === "accepted") {
      return;
    }
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0) {
      setActiveQuote(text);
    }
  };

  const clearQuote = () => setActiveQuote("");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case "viewed":
        return <Clock className="h-5 w-5 text-sky-500" />;
      default:
        return <Clock className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      sent: "Pending",
      viewed: "Viewed",
      accepted: "Accepted",
      rejected: "Rejected",
      superseded: "Superseded",
      void: "Void",
    };
    return labels[status] || status;
  };

  const handleVoidAndRevise = async () => {
    if (!proposal || !user || !profile) return;
    setVoiding(true);
    try {
      const newProposalId = `${proposal.id.split("_v")[0]}_v${(proposal.version || 1) + 1}`;
      await createProposalRevision(newProposalId, proposal, {
        fieldValues: proposal.fieldValues,
      });
      toast.success("Signature voided. New revision created.");
      setShowVoidConfirm(false);
      router.push(`/dashboard/proposals/${newProposalId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create revision.");
    } finally {
      setVoiding(false);
    }
  };

  const handleSoftDeleteComment = async (commentId: string) => {
    if (!proposal) return;
    try {
      await softDeleteComment(proposal.id, commentId);
      toast.success("Comment deleted.");
    } catch {
      toast.error("Failed to delete comment.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Proposal Details" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="flex min-h-screen flex-col">
        <Topbar title="Proposal Details" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <FileText className="h-12 w-12 text-slate-300" />
          <p className="text-slate-500">Proposal not found</p>
          <Link
            href="/dashboard/proposals"
            className="flex items-center gap-2 text-[#800020] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Proposal Details" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/proposals"
              className="mb-2 flex items-center gap-1 text-[13px] text-slate-500 hover:text-[#800020]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Proposals
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{proposal.templateName}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-600">
                v{proposal.version || 1}
              </span>
              {proposal.previousVersionId && (
                <span className="text-[12px] text-slate-400">
                  (Revised)
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {proposal.clientName}
              </span>
              <span>{proposal.clientEmail}</span>
              <span className="flex items-center gap-1.5">
                {getStatusIcon(proposal.status)}
                {getStatusLabel(proposal.status)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Void & Revise — only for accepted proposals */}
            {proposal.status === "accepted" && (
              <button
                onClick={() => setShowVoidConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-medium text-rose-700 transition hover:bg-rose-100"
              >
                <AlertTriangle className="h-4 w-4" />
                Void Signature & Revise
              </button>
            )}
            {/* Edit/Resend Button - only show for non-accepted proposals */}
            {proposal.status !== "accepted" && proposal.status !== "rejected" && proposal.status !== "superseded" && proposal.status !== "void" && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditedFieldValues(proposal.fieldValues);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!user || !profile) return;
                        setResending(true);
                        try {
                          const newProposalId = `${proposal.id}_v${(proposal.version || 1) + 1}`;
                          await createProposalRevision(newProposalId, proposal, {
                            fieldValues: editedFieldValues,
                          });
                          // Notify client about new version
                          await fetch("/api/send-proposal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              proposalId: newProposalId,
                              clientEmail: proposal.clientEmail,
                              clientName: proposal.clientName,
                              proposalTitle: proposal.templateName,
                              senderName: `${profile.firstName} ${profile.lastName}`,
                              isNewVersion: true,
                              version: (proposal.version || 1) + 1,
                            }),
                          }).catch(() => {});
                          router.push(`/dashboard/proposals/${newProposalId}`);
                        } catch (err) {
                          console.error("Failed to create revision:", err);
                          toast.error("Failed to create new version. Please try again.");
                        } finally {
                          setResending(false);
                        }
                      }}
                      disabled={resending}
                      className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] disabled:opacity-50"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Resend as v{(proposal.version || 1) + 1}
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
            {documentHtml && (
              <button
                onClick={async () => {
                  if (!documentRef.current) return;
                  await exportProposalPdf(
                    documentRef.current,
                    `${proposal.templateName}-v${proposal.version || 1}-${proposal.clientName}.pdf`
                  );
                }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100/50 p-1">
          <button
            onClick={() => setActiveTab("document")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
              activeTab === "document"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText className="h-4 w-4" />
            Document
          </button>
          <button
            onClick={() => setActiveTab("discuss")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
              activeTab === "discuss"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Discussion
            {comments.length > 0 && (
              <span className="ml-1 rounded-full bg-[#800020] px-2 py-0.5 text-[10px] text-white">
                {comments.length}
              </span>
            )}
          </button>
          {proposal.status === "accepted" && proposal.signatureUrl && (
            <button
              onClick={() => setActiveTab("signature")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                activeTab === "signature"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <PenTool className="h-4 w-4" />
              Signature
            </button>
          )}
          {proposal.previousVersionId && (
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <History className="h-4 w-4" />
              History
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`grid flex-1 gap-6 ${activeTab === "discuss" ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_400px]"}`}>
          {/* Document / Signature / History Content - Hidden when discuss tab is active */}
          {activeTab !== "discuss" && (
          <div
            ref={documentRef}
            className="rounded-2xl border border-slate-200/60 bg-white shadow-sm"
          >
            {activeTab === "document" && (
              <>
                {isEditing ? (
                  /* Edit Mode */
                  <div className="p-6">
                    <div className="mb-4 rounded-lg bg-amber-50 p-3">
                      <p className="text-[13px] font-medium text-amber-800">
                        Edit Mode
                      </p>
                      <p className="text-[12px] text-amber-600">
                        Make corrections to the field values below. When you resend, a new version (v{(proposal.version || 1) + 1}) will be created.
                      </p>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(editedFieldValues).map(([key, value]) => (
                        <div key={key}>
                          <label className="mb-1 block text-[13px] font-medium text-slate-700">
                            {key}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setEditedFieldValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : documentHtml ? (
                  <div
                    className="proposal-content px-8 py-10"
                    dangerouslySetInnerHTML={{ __html: documentHtml }}
                    onMouseUp={handleTextSelection}
                  />
                ) : renderError ? (
                  <div className="flex flex-col items-center justify-center px-8 py-20">
                    <FileText className="h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-slate-500">Could not render document</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center px-8 py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                  </div>
                )}
              </>
            )}

            {activeTab === "signature" && proposal.signatureUrl && (
              /* Signature View */
              <div className="flex flex-col items-center justify-center p-10">
                <div className="mb-6 text-center">
                  <PenTool className="mx-auto h-12 w-12 text-emerald-500" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    Client Signature
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {proposal.clientName} signed this document on{" "}
                    {proposal.signedAt
                      ? new Date(
                          proposal.signedAt.seconds * 1000
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <img
                    src={proposal.signatureUrl}
                    alt="Client Signature"
                    className="max-h-48 max-w-full object-contain"
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <a
                    href={proposal.signatureUrl}
                    download
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download Signature
                  </a>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              /* Version History */
              <div className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Version History
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                      v{proposal.version || 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-slate-900">
                        Current Version
                      </p>
                      <p className="text-[12px] text-slate-500">
                        Status: {getStatusLabel(proposal.status)}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400">Now</span>
                  </div>
                  {proposal.previousVersionId && (
                    <Link
                      href={`/dashboard/proposals/${proposal.previousVersionId}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-400 text-[11px] font-bold text-white">
                        v{(proposal.version || 1) - 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-slate-900">
                          Previous Version
                        </p>
                        <p className="text-[12px] text-slate-500">
                          Click to view earlier version
                        </p>
                      </div>
                      <ArrowLeft className="h-4 w-4 rotate-180 text-slate-400" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Discussion Panel - full width when discuss tab, sidebar when document tab */}
          {(activeTab === "document" || activeTab === "discuss") && (
          <div className={`flex flex-col rounded-2xl border border-slate-200/60 bg-white shadow-sm ${activeTab === "discuss" ? "h-full" : ""}`}>
            <div className="border-b border-slate-100 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <MessageCircle className="h-4 w-4" />
                Discussion Thread
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                Communicate with {proposal.clientName}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageCircle className="h-8 w-8 text-slate-200" />
                  <p className="mt-2 text-[13px] text-slate-400">
                    No messages yet.
                  </p>
                  <p className="text-[12px] text-slate-400">
                    Start the conversation by sending a message.
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex flex-col ${
                      c.authorRole === "client" ? "items-start" : "items-end"
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-1 ${
                      c.authorRole === "client" ? "" : "flex-row-reverse"
                    }`}>
                      <span className="text-[10px] text-slate-400">
                        {c.authorName} • {c.authorRole === "client" ? "Client" : c.authorRole === "ceo" ? "CEO" : c.authorRole === "system" ? "System" : "Staff"}
                      </span>
                      {!c.isDeleted && c.authorRole !== "client" && c.authorRole !== "system" && (
                        <button
                          onClick={() => handleSoftDeleteComment(c.id)}
                          className="text-slate-300 hover:text-rose-400 transition"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                        c.isDeleted
                          ? "bg-slate-50 text-slate-400 italic border border-slate-200"
                          : c.authorRole === "client"
                          ? "rounded-tl-none bg-slate-100 text-slate-800"
                          : c.authorRole === "system"
                          ? "bg-amber-50 text-amber-700 text-[11px] border border-amber-100"
                          : "rounded-tr-none bg-[#800020] text-white"
                      }`}
                    >
                      {c.isDeleted ? (
                        <span>[Message deleted]</span>
                      ) : (
                        <>
                          {c.quote && (
                            <div
                              className={`mb-2 border-l-2 pl-2 text-[11px] italic ${
                                c.authorRole === "client"
                                  ? "border-slate-300 text-slate-500"
                                  : "border-white/50 text-white/80"
                              }`}
                            >
                              &ldquo;{c.quote}&rdquo;
                            </div>
                          )}
                          {c.text}
                        </>
                      )}
                    </div>
                    <span className="mt-1 text-[9px] text-slate-400">
                      {c.createdAt?.seconds
                        ? new Date(c.createdAt.seconds * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {proposal.status !== "accepted" && proposal.status !== "rejected" && (
              <div className="border-t border-slate-100 p-4">
                {/* Active Quote */}
                {activeQuote && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <div className="flex-1">
                      <p className="text-[11px] text-amber-700 line-clamp-2">
                        {activeQuote}
                      </p>
                    </div>
                    <button
                      onClick={clearQuote}
                      className="text-amber-500 hover:text-amber-700"
                    >
                      ×
                    </button>
                  </div>
                )}

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="flex items-center gap-1 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                <p className="mt-2 text-[11px] text-slate-400">
                  Highlight text in the document to quote it.
                </p>
              </div>
            )}

            {proposal.status === "accepted" && (
              <div className="border-t border-slate-100 p-4 text-center">
                <p className="text-[13px] text-slate-500">
                  <CheckCircle className="mr-1 inline h-4 w-4 text-emerald-500" />
                  This proposal has been signed. Discussion is closed.
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Void Signature & Revise — Confirmation Modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Void Signature & Create Revision?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              This will <strong>permanently void</strong> the client&apos;s accepted signature and create a new version (v{(proposal.version || 1) + 1}) of this proposal. The client will need to review and sign again.
            </p>
            <p className="mt-2 text-[12px] font-medium text-rose-600">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowVoidConfirm(false)}
                disabled={voiding}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidAndRevise}
                disabled={voiding}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {voiding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {voiding ? "Voiding..." : "Void & Create Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
