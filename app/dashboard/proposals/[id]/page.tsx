"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, ArrowLeft, Loader2, Send, MessageCircle, Quote,
  CheckCircle, XCircle, Clock, Download, User, Edit3, RefreshCw,
  PenTool, History, AlertTriangle, Trash2, Link2, UploadCloud, X,
} from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  type Proposal, createProposalRevision, softDeleteComment, updateProposalPrivacy, writeAuditLog,
  submitProposalForVerification, requestProposalRevision, verifyAndPromoteProposal,
  subscribeToInternalComments,
} from "@/lib/firestore";
import { SlaCountdown, type DueAtValue } from "@/components/sla-countdown";
import { UrgencyBadge } from "@/components/urgency-badge";
// renderProposalHtml is lazy-loaded to keep mammoth out of the initial bundle
import { exportProposalPdf } from "@/lib/export-utils";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import { ShareProposalModal } from "@/components/share-proposal-modal";
import { toast } from "@/components/providers/toast";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  const { isCeo, isAdmin } = useRole();

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedFieldValues, setEditedFieldValues] = useState<Record<string, string>>({});
  const [editNewFileUrl, setEditNewFileUrl] = useState<string | null>(null);
  const [editGdocUrl, setEditGdocUrl] = useState<string>("");
  const [editFileUploading, setEditFileUploading] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const [resending, setResending] = useState(false);
  const [voiding, setVoiding] = useState(false);

  // Animated confirm modal
  const { confirm, modalProps } = useConfirmModal();

  // Presence: client typing indicator for staff view
  const [clientTyping, setClientTyping] = useState(false);

  // isPrivate / sharedWith controls (CEO/Admin)
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Task workflow
  const isTasked = proposal?.proposalType === "tasked";
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [promotingProposal, setPromotingProposal] = useState(false);

  // Internal comments (staff/admin only)
  type InternalComment = { id: string; text: string; authorRole: string; authorName: string; authorId?: string; createdAt: unknown };
  const [internalComments, setInternalComments] = useState<InternalComment[]>([]);
  useEffect(() => {
    if (!proposalId || (!isAdmin && profile?.role !== "staff")) return;
    return subscribeToInternalComments(proposalId, setInternalComments);
  }, [proposalId, isAdmin, profile?.role]);

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

        // Department border-jump guard (Scenario — URL scoping)
        // Staff and Admin may only view proposals in their dept or sharedWith depts
        if (profile && profile.role !== "ceo") {
          const userDept = profile.department ?? "";
          const allowed =
            data.ownerId === user?.uid ||
            data.sentById === user?.uid ||
            data.department === userDept ||
            (data.sharedWith ?? []).includes(userDept);
          if (!allowed) {
            toast.error("Access Denied: This proposal belongs to a different department.");
            router.replace("/dashboard/proposals");
            return;
          }
        }

        // isPrivate sensitivity shield — only CEO can see private proposals
        if (data.isPrivate && profile?.role !== "ceo") {
          toast.error("This proposal is confidential. Access restricted to CEO.");
          router.replace("/dashboard/proposals");
          return;
        }

        setProposal(data);
        
        // Render document HTML if template URL exists (lazy import keeps mammoth out of initial bundle)
        if (data.templateFileUrl) {
          try {
            const { renderProposalHtml } = await import("@/lib/proposal-renderer");
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

  // Presence: subscribe to client typing indicator
  useEffect(() => {
    if (!proposalId) return;
    const q = query(collection(db, "proposals", proposalId, "presence"));
    const unsub = onSnapshot(q, (snap) => {
      const isClientTyping = snap.docs.some((d) => {
        const data = d.data() as { isTyping: boolean; updatedAt: number };
        return data.isTyping && Date.now() - (data.updatedAt ?? 0) < 8000;
      });
      setClientTyping(isClientTyping);
    });
    return () => unsub();
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

  const handleFileUpload = async (file: File) => {
    if (!proposal) return;
    setEditFileUploading(true);
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `templates/${proposal.id}_v${(proposal.version || 1) + 1}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditNewFileUrl(url);
      toast.success(`File "${file.name}" uploaded successfully.`);
    } catch {
      toast.error("File upload failed. Please try again.");
    } finally {
      setEditFileUploading(false);
    }
  };

  const handleVoidAndRevise = async () => {
    if (!proposal || !user || !profile) return;
    const confirmed = await confirm({
      title: "Void Signature & Create Revision?",
      description: `This will permanently void ${proposal.clientName}'s accepted signature and create v${(proposal.version || 1) + 1}. The client must review and sign again. This cannot be undone.`,
      actionType: "destructive",
      confirmText: "Void & Revise",
    });
    if (!confirmed) return;
    setVoiding(true);
    try {
      const newProposalId = `${proposal.id.split("_v")[0]}_v${(proposal.version || 1) + 1}`;
      await createProposalRevision(newProposalId, proposal, {
        fieldValues: proposal.fieldValues,
      });
      toast.success(`Signature voided. Revision v${(proposal.version || 1) + 1} created.`);
      router.push(`/dashboard/proposals/${newProposalId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create revision.");
    } finally {
      setVoiding(false);
    }
  };

  const handleSaveRevision = async () => {
    if (!proposal || !user || !profile) return;
    const confirmed = await confirm({
      title: `Create v${(proposal.version || 1) + 1} & Resend?`,
      description: `The current version will be marked as superseded. A new version will be sent to ${proposal.clientName} (${proposal.clientEmail}).`,
      actionType: "primary",
      confirmText: `Send v${(proposal.version || 1) + 1}`,
    });
    if (!confirmed) return;
    setResending(true);
    try {
      const newVersion = (proposal.version || 1) + 1;
      const newProposalId = `${proposal.id.split("_v")[0]}_v${newVersion}`;
      await createProposalRevision(newProposalId, proposal, {
        fieldValues: editedFieldValues,
        templateFileUrl: editNewFileUrl ?? proposal.templateFileUrl,
        templateGdocUrl: editGdocUrl || proposal.templateGdocUrl,
      });

      // Fetch orgSettings for branding
      let companyName = "";
      let companyLogoUrl: string | null = null;
      let emailSignature = "";
      try {
        const ownerUid = proposal.ownerId || proposal.userId;
        const settingsSnap = await getDoc(doc(db, "orgSettings", ownerUid));
        if (settingsSnap.exists()) {
          const s = settingsSnap.data();
          companyName = s.companyName || "";
          companyLogoUrl = s.logoUrl || null;
          emailSignature = s.emailSignature || "";
        }
      } catch { /* non-fatal */ }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      await fetch("/api/send-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: proposal.clientEmail,
          clientName: proposal.clientName,
          proposalUrl: `${appUrl}/p/${newProposalId}`,
          templateName: proposal.templateName,
          senderName: `${profile.firstName} ${profile.lastName}`,
          companyName,
          emailSignature,
          companyLogoUrl,
        }),
      }).catch(() => {});

      // In-app notification for delegation stakeholders
      fetch("/api/notify-delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: newProposalId,
          ceoId: proposal.ownerId,
          staffName: `${profile.firstName} ${profile.lastName}`,
          clientName: proposal.clientName,
          templateName: proposal.templateName,
        }),
      }).catch(() => {});

      // Audit log — immutable record of the revision
      writeAuditLog({
        action: "proposal_revised",
        actorId: user.uid,
        actorName: `${profile.firstName} ${profile.lastName}`,
        actorRole: profile.role,
        targetId: newProposalId,
        targetType: "proposal",
        description: `Created v${newVersion} of proposal for ${proposal.clientName} (superseded ${proposal.id})`,
        metadata: { previousId: proposal.id, newId: newProposalId, version: newVersion },
      }).catch(() => {});

      toast.success(`v${newVersion} sent to ${proposal.clientName}.`);
      setIsEditing(false);
      router.push(`/dashboard/proposals/${newProposalId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create new version.");
    } finally {
      setResending(false);
    }
  };

  // ─── Task workflow handlers ──────────────────────────────────

  const handleSubmitForVerification = async () => {
    if (!proposal || !user || !profile) return;
    const ok = await confirm({
      title: "Submit for Verification?",
      description: "This will notify your admin to review the draft. You won't be able to edit until they respond.",
      confirmText: "Submit",
      actionType: "primary",
    });
    if (!ok) return;
    setSubmittingVerification(true);
    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      await submitProposalForVerification(proposal.id, user.uid, name);
      if (proposal.taskId) {
        const { submitTaskForReview } = await import("@/lib/firestore");
        await submitTaskForReview(proposal.taskId, user.uid, name);
      }
      toast.success("Draft submitted for admin review.");
    } catch {
      toast.error("Failed to submit for verification.");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!proposal || !user || !profile || !revisionNote.trim()) {
      toast.error("Please provide revision notes.");
      return;
    }
    setRequestingRevision(true);
    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      await requestProposalRevision(proposal.id, user.uid, name, revisionNote.trim());
      if (proposal.taskId) {
        const { requestTaskChanges } = await import("@/lib/firestore");
        await requestTaskChanges(proposal.taskId, user.uid, name, revisionNote.trim());
      }
      toast.success("Revision requested — staff has been notified.");
      setRevisionModalOpen(false);
      setRevisionNote("");
    } catch {
      toast.error("Failed to request revision.");
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleVerifyAndPromote = async () => {
    if (!proposal || !user || !profile) return;
    const ok = await confirm({
      title: "Verify & Promote to CEO?",
      description: `This proposal for "${proposal.clientName}" will appear in the CEO's Talking Inbox.`,
      confirmText: "Verify & Promote",
      actionType: "primary",
    });
    if (!ok) return;
    setPromotingProposal(true);
    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      await verifyAndPromoteProposal(proposal.id, user.uid, name);
      if (proposal.taskId) {
        const { verifyAndPromoteTask } = await import("@/lib/firestore");
        await verifyAndPromoteTask(proposal.taskId, user.uid, name);
      }
      toast.success("Proposal verified — CEO has been notified.");
    } catch {
      toast.error("Failed to promote proposal.");
    } finally {
      setPromotingProposal(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!proposal) return;
    setSavingPrivacy(true);
    try {
      await updateProposalPrivacy(proposal.id, !proposal.isPrivate);
      toast.success(proposal.isPrivate ? "Proposal is now visible to your team." : "Proposal marked as Private. Only you can see it.");
    } catch {
      toast.error("Failed to update privacy.");
    } finally {
      setSavingPrivacy(false);
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

  // P1 urgency pulse class
  const p1Pulse = isTasked && proposal.urgency === "p1" && ["drafting", "revision_requested", "verifying"].includes(proposal.status ?? "");
  const proposalDueAt = proposal.dueAt as DueAtValue;

  return (
    <main className={`flex min-h-screen flex-col ${p1Pulse ? "ring-4 ring-rose-300/60 ring-inset" : ""}`}>
      <Topbar title="Proposal Details" />
      {p1Pulse && (
        <div className="animate-pulse bg-rose-600/90 px-4 py-1.5 text-center text-[12px] font-bold tracking-wide text-white">
          🔴 CRITICAL TASK — P1 SLA ACTIVE
          {proposalDueAt && <span className="ml-3 font-normal opacity-90"><SlaCountdown dueAt={proposalDueAt} urgency="p1" compact /></span>}
        </div>
      )}

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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{proposal.templateName}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-600">
                v{proposal.version || 1}
              </span>
              {isTasked && proposal.urgency && <UrgencyBadge urgency={proposal.urgency} />}
              {isTasked && proposalDueAt && !p1Pulse && <SlaCountdown dueAt={proposalDueAt} urgency={proposal.urgency ?? "p3"} compact />}
              {proposal.previousVersionId && (
                <span className="text-[12px] text-slate-400">
                  (Revised)
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {proposal.clientName}
              </span>
              <span>{proposal.clientEmail}</span>
              <span className="flex items-center gap-1.5">
                {getStatusIcon(proposal.status)}
                {getStatusLabel(proposal.status)}
              </span>
              {proposal.isPrivate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
                  <X className="h-2.5 w-2.5" /> Private
                </span>
              )}
              {(proposal.sharedWith?.length ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600 ring-1 ring-violet-200">
                  Shared · {proposal.sharedWith!.join(", ")}
                </span>
              )}
              {profile?.department && (proposal.originDepartmentId ?? proposal.department) !== profile.department && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-200">
                  Shared from {proposal.originDepartmentId ?? proposal.department}
                </span>
              )}
              {proposal.isDelegated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  Delegated Send
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ── Task Workflow Actions ── */}
            {/* Staff: Submit for Verification (replaces Send on tasked proposals) */}
            {isTasked && !isCeo && !isAdmin && profile?.role === "staff" &&
              (proposal.status === "drafting" || proposal.status === "revision_requested") && (
              <button
                onClick={handleSubmitForVerification}
                disabled={submittingVerification}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {submittingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Verification
              </button>
            )}
            {/* Admin: Verify & Promote (only for verifying proposals in their dept) */}
            {isTasked && isAdmin && proposal.status === "verifying" &&
              (profile?.role === "ceo" || proposal.verifyingAdminId === user?.uid || proposal.department === profile?.department) && (
              <>
                <button
                  onClick={handleVerifyAndPromote}
                  disabled={promotingProposal}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {promotingProposal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Verify & Promote
                </button>
                <button
                  onClick={() => setRevisionModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-medium text-amber-700 transition hover:bg-amber-100 active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" /> Request Revision
                </button>
              </>
            )}
            {/* Privacy Toggle — CEO only */}
            {isCeo && (
              <button
                onClick={handleTogglePrivacy}
                disabled={savingPrivacy}
                title={proposal.isPrivate ? "Make visible to team" : "Mark as Private (CEO-only)"}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition active:scale-95 disabled:opacity-50 ${
                  proposal.isPrivate
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {savingPrivacy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                {proposal.isPrivate ? "Private" : "Set Private"}
              </button>
            )}
            {/* Sharing Modal — CEO/Admin */}
            {(isCeo || isAdmin) && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-medium text-violet-700 transition hover:bg-violet-100 active:scale-95"
              >
                Share
              </button>
            )}
            {/* Void & Revise — only for accepted proposals */}
            {proposal.status === "accepted" && (
              <button
                onClick={handleVoidAndRevise}
                disabled={voiding}
                className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-medium text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
              >
                {voiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
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
                      setEditedFieldValues({ ...proposal.fieldValues });
                      setEditNewFileUrl(null);
                      setEditGdocUrl(proposal.templateGdocUrl || "");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRevision}
                      disabled={resending}
                      className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] active:scale-95 disabled:opacity-50"
                    >
                      {resending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4" />Send v{(proposal.version || 1) + 1}</>
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

        {/* Revision note banner — shown to staff when admin requests changes */}
        {isTasked && proposal.status === "revision_requested" && proposal.revisionNote && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-400/30 text-amber-700">
              <RefreshCw className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-amber-800">Revision Requested</p>
              <p className="mt-0.5 text-[13px] text-amber-700">{proposal.revisionNote}</p>
            </div>
          </div>
        )}

        {/* CEO Voice banner — staff working on a tasked proposal */}
        {isTasked && profile?.role === "staff" && ["drafting", "revision_requested"].includes(proposal.status ?? "") && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-200/60 bg-violet-50/50 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <PenTool className="h-4 w-4" />
            </div>
            <p className="text-[13px] font-medium text-violet-800">
              <span className="font-semibold">CEO Voice Active.</span> Write this proposal as if the CEO is speaking directly to the client. Contact your admin for guidance — do not reach out to the client yourself.
            </p>
          </div>
        )}

        {/* Gold identity banner — shows when CEO sent via delegation */}
        {proposal.isDelegated && profile?.role !== "ceo" && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/30 text-amber-700">
              <CheckCircle className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-medium text-amber-800">
              You are acting as CEO. This proposal was sent on their behalf. All branding and signatures reflect the CEO identity.
            </p>
          </div>
        )}

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
          {/* Internal Comments tab — staff & admin only, hidden from clients */}
          {isTasked && (isAdmin || profile?.role === "staff") && (
            <button
              onClick={() => setActiveTab("internal" as typeof activeTab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                activeTab === ("internal" as typeof activeTab)
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <MessageCircle className="h-4 w-4 text-violet-500" />
              Internal
              {internalComments.length > 0 && (
                <span className="ml-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] text-white">
                  {internalComments.length}
                </span>
              )}
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
                  /* ── Dynamic Edit Mode ── */
                  <div className="p-6 space-y-6">
                    {/* Banner */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[13px] font-semibold text-amber-800">Edit Mode — v{(proposal.version || 1) + 1} Preview</p>
                      <p className="mt-0.5 text-[12px] text-amber-600">
                        Saving will supersede the current version and send a fresh copy to the client.
                      </p>
                    </div>

                    {/* Dynamic field inputs — renders ALL keys from fieldValues */}
                    {Object.keys(editedFieldValues).length > 0 && (
                      <div>
                        <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Proposal Fields</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {Object.entries(editedFieldValues).map(([key, value]) => {
                            const isMultiline = value.length > 80 || key.toLowerCase().includes("description") || key.toLowerCase().includes("scope") || key.toLowerCase().includes("note");
                            return (
                              <div key={key} className={isMultiline ? "sm:col-span-2" : ""}>
                                <label className="mb-1 block text-[12px] font-medium capitalize text-slate-600">
                                  {key.replace(/_/g, " ")}
                                </label>
                                {isMultiline ? (
                                  <textarea
                                    rows={3}
                                    value={value}
                                    onChange={(e) => setEditedFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20 resize-none"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => setEditedFieldValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:border-[#800020] focus:bg-white focus:ring-2 focus:ring-[#800020]/20"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Document source — file or Google Docs URL */}
                    <div>
                      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Document Source (Optional)</h4>
                      <p className="mb-3 text-[12px] text-slate-500">Replace the document template for this revision. Leave blank to keep the existing file.</p>

                      {/* File Upload Zone */}
                      <div
                        onClick={() => editFileRef.current?.click()}
                        className="group relative mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 transition hover:border-[#800020]/40 hover:bg-[#800020]/5"
                      >
                        <input
                          ref={editFileRef}
                          type="file"
                          accept=".docx,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f);
                          }}
                        />
                        {editFileUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        ) : editNewFileUrl ? (
                          <>
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                            <p className="text-[12px] font-medium text-emerald-600">New file uploaded</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditNewFileUrl(null); }}
                              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500"
                            >
                              <X className="h-3 w-3" /> Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-6 w-6 text-slate-300 group-hover:text-[#800020]/60 transition" />
                            <p className="text-[13px] font-medium text-slate-500">Upload DOCX or PDF</p>
                            <p className="text-[11px] text-slate-400">Click to browse files</p>
                          </>
                        )}
                      </div>

                      {/* Google Docs URL */}
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                          type="url"
                          value={editGdocUrl}
                          onChange={(e) => setEditGdocUrl(e.target.value)}
                          placeholder="Google Docs URL (optional)"
                          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
                        />
                        {editGdocUrl && (
                          <button onClick={() => setEditGdocUrl("")}>
                            <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-500" />
                          </button>
                        )}
                      </div>
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

            {/* Presence: client typing indicator */}
            {clientTyping && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 border-t border-slate-100 bg-slate-50/60">
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-[11px] text-slate-400">{proposal.clientName} is typing…</span>
              </div>
            )}

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

                {clientTyping && (
                  <p className="mb-2 text-[11px] font-medium text-amber-600">
                    ⚠ Client is typing — hold to avoid conflicting messages.
                  </p>
                )}

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={clientTyping ? "Client is typing... wait a moment" : "Type your message..."}
                    className={`flex-1 rounded-lg border bg-slate-50 px-3 py-2 text-[13px] outline-none transition focus:ring-2 focus:ring-[#800020]/20 ${
                      clientTyping
                        ? "border-amber-200 focus:border-amber-300 focus:bg-amber-50/40"
                        : "border-slate-200 focus:border-[#800020] focus:bg-white"
                    }`}
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="flex items-center gap-1 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] active:scale-95 disabled:opacity-50"
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

      {/* Internal Comments Panel — shown when "internal" tab is active (staff/admin only) */}
      {activeTab === ("internal" as typeof activeTab) && isTasked && (
        <div className="mx-6 mb-6 flex flex-col rounded-2xl border border-violet-200/60 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-violet-100 px-5 py-3">
            <MessageCircle className="h-4 w-4 text-violet-500" />
            <span className="text-[13px] font-semibold text-slate-700">Internal Thread</span>
            <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              Staff & Admin Only — Hidden from Client
            </span>
          </div>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto px-5 py-4">
            {internalComments.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-slate-400">No internal notes yet.</p>
            ) : (
              internalComments.map((c) => (
                <div key={c.id} className={`flex gap-2.5 ${c.authorRole === "admin" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    c.authorRole === "system" ? "bg-slate-300" : c.authorRole === "admin" ? "bg-indigo-500" : "bg-violet-500"
                  }`}>
                    {c.authorRole === "system" ? "S" : c.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[80%] ${c.authorRole === "admin" ? "items-end" : ""} flex flex-col`}>
                    <span className="mb-1 text-[10px] text-slate-400">{c.authorName}</span>
                    <div className={`rounded-xl px-3 py-2 text-[13px] ${
                      c.authorRole === "system"
                        ? "bg-slate-50 text-slate-500 italic"
                        : c.authorRole === "admin"
                        ? "bg-indigo-50 text-indigo-800"
                        : "bg-violet-50 text-violet-800"
                    }`}>
                      {c.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRevisionModalOpen(false)}>
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">Request Revision</h3>
                <p className="text-[12px] text-slate-400">{proposal?.clientName}</p>
              </div>
              <button onClick={() => setRevisionModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">Revision notes for the staff member</label>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                rows={4}
                autoFocus
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 focus:border-amber-300 focus:outline-none"
                placeholder="Explain what needs to change — this will appear as a notification for the staff member..."
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setRevisionModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={requestingRevision || !revisionNote.trim()}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
              >
                {requestingRevision ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Confirm Modal — handles all destructive/primary confirmations */}
      <ConfirmModal {...modalProps} isLoading={resending || voiding} />

      {/* Cross-departmental sharing modal */}
      {proposal && (
        <ShareProposalModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          proposalId={proposal.id}
          proposalClientName={proposal.clientName}
          currentSharedWith={proposal.sharedWith ?? []}
          currentAccessLevel={proposal.accessLevel ?? "view_only"}
          originDepartmentId={proposal.originDepartmentId ?? proposal.department}
        />
      )}
    </main>
  );
}
