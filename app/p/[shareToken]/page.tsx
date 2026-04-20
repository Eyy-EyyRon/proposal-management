"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText, X, Check, AlertCircle, Download, Pen, Upload,
  Image as ImageIcon, Loader2, ShieldCheck, Sparkles, PenLine, Eraser, LockKeyhole,
  MessageCircle, Send, Quote, UserCheck, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProposal, markProposalViewed, acceptProposal, rejectProposal,
  type Proposal,
} from "@/lib/firestore";
// renderProposalHtml is lazy-loaded below to keep mammoth out of the initial bundle
import { uploadSignature, uploadSignatureImage } from "@/lib/storage";
import { exportProposalPdf } from "@/lib/export-utils";

import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type SignatureMode = "draw" | "type" | "upload";
type ViewState = "loading" | "not-found" | "locked" | "document" | "rejected";
type TabMode = "action" | "discuss";

export default function ProposalPortalPage() {
  const params = useParams();
  const shareToken = params.shareToken as string;

  const [viewState, setViewState] = useState<ViewState>("loading");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [newerVersionId, setNewerVersionId] = useState<string | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string>("");
  const [renderError, setRenderError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState(false);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabMode>("action");
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  
  // NEW: Dedicated quote state instead of pasting text
  const [activeQuote, setActiveQuote] = useState(""); 
  
  const [submittingComment, setSubmittingComment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [quoteTooltip, setQuoteTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false, x: 0, y: 0, text: ""
  });

  // Change Signer (Client Scenario 4)
  const [showChangeSigner, setShowChangeSigner] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [changingSignerLoading, setChangingSignerLoading] = useState(false);
  const [changeSignerDone, setChangeSignerDone] = useState(false);

  // Presence / Typing Indicator (Inter-Role Scenario 11)
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionId = useRef("client-" + Math.random().toString(36).slice(2));

  // Auto-responder (Client Scenario 7)
  const [autoResponderShown, setAutoResponderShown] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  useEffect(() => {
    if (signatureMode === "draw" && activeTab === "action" && proposal?.status !== "accepted") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [signatureMode, activeTab, proposal?.status]);

  const [consentChecked, setConsentChecked] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!shareToken) return;
    let cancelled = false;

    (async () => {
      try {
        const p = await getProposal(shareToken);
        if (!p || cancelled) { if (!cancelled) setViewState("not-found"); return; }
        setProposal(p);

        if (p.status === "archived") { if (!cancelled) setViewState("not-found"); return; }
        if (p.status === "rejected") { setViewState("rejected"); return; }

        // Version detection: if this proposal has been superseded, walk the chain to find isLatest head
        if ((p.status === "superseded" || p.status === "void")) {
          let headId = p.nextVersionId ?? null;
          // Walk forward through version chain to reach the isLatest head
          while (headId) {
            try {
              const headSnap = await getDoc(doc(db, "proposals", headId));
              if (!headSnap.exists()) break;
              const headData = headSnap.data() as { isLatest?: boolean; nextVersionId?: string | null };
              if (headData.isLatest) break;
              headId = headData.nextVersionId ?? null;
            } catch { break; }
          }
          if (headId && headId !== shareToken && !cancelled) {
            setNewerVersionId(headId);
            // Auto-redirect after 3s so client sees the superseded notice briefly
            setTimeout(() => {
              if (!cancelled) window.location.replace(`/p/${headId}`);
            }, 3000);
          }
        }

        if (p.accessCode) {
          if (!cancelled) setViewState("locked");
          return;
        }

        if (p.templateFileUrl) {
          try {
            const { renderProposalHtml } = await import("@/lib/proposal-renderer");
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

  useEffect(() => {
    if (viewState !== "document" || viewTracked.current || !shareToken || !proposal) return;
    viewTracked.current = true;
    if (proposal.status !== "accepted") {
      markProposalViewed(shareToken).catch(() => {});
      // Fire viewed notifications for owner + sender
      const targets = new Set<string>(
        [proposal.ownerId, proposal.sentById, proposal.userId].filter(Boolean) as string[]
      );
      const title = proposal.templateName || "Proposal";
      targets.forEach((uid) => {
        fetch("/api/notify-viewed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            proposalId: shareToken,
            clientName: proposal.clientName,
            proposalTitle: title,
          }),
        }).catch(() => {});
      });
    }
  }, [viewState, shareToken, proposal]);

  useEffect(() => {
    if (!proposal?.id) return;
    const q = query(collection(db, "proposals", proposal.id, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(fetchedComments);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [proposal?.id]);

  // Presence: subscribe to other users typing in this proposal's discussion
  useEffect(() => {
    if (!proposal?.id) return;
    const q = query(collection(db, "proposals", proposal.id, "presence"));
    const unsub = onSnapshot(q, (snap) => {
      const names = snap.docs
        .map((d) => d.data() as { name: string; isTyping: boolean; updatedAt: number })
        .filter((d) => d.isTyping && Date.now() - (d.updatedAt ?? 0) < 8000)
        .map((d) => d.name)
        .filter((n) => n !== (proposal?.clientName ?? ""));
      setTypingUsers(names);
    });
    return () => unsub();
  }, [proposal?.id, proposal?.clientName]);

  // Presence: broadcast client typing
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!proposal?.id) return;
    const ref = doc(db, "proposals", proposal.id, "presence", sessionId.current);
    setDoc(ref, { name: proposal.clientName || "Client", isTyping, updatedAt: Date.now() }).catch(() => {});
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 6000);
    }
  }, [proposal?.id, proposal?.clientName]);

  // Presence: clean up on unmount
  useEffect(() => {
    return () => {
      if (!proposal?.id) return;
      const ref = doc(db, "proposals", proposal.id, "presence", sessionId.current);
      deleteDoc(ref).catch(() => {});
    };
  }, [proposal?.id]);

  const handleChangeSigner = useCallback(async () => {
    if (!proposal || !newSignerName.trim() || !newSignerEmail.trim()) return;
    setChangingSignerLoading(true);
    try {
      await fetch("/api/change-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          newSignerName: newSignerName.trim(),
          newSignerEmail: newSignerEmail.trim(),
          originalClientName: proposal.clientName,
          proposalTitle: proposal.templateName || "Proposal",
          senderName: "",
          companyName: "",
        }),
      });
      setChangeSignerDone(true);
    } catch {
      // silent — user sees the done state only on success
    } finally {
      setChangingSignerLoading(false);
    }
  }, [proposal, newSignerName, newSignerEmail]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent adding comments when document is already signed
    if (!newComment.trim() || !proposal || proposal.status === "accepted") return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, "proposals", proposal.id, "comments"), {
        text: newComment.trim(),
        quote: activeQuote || null, // 
        authorRole: "client",
        authorName: proposal.clientName || "Client",
        createdAt: serverTimestamp(),
      });
      
      setNewComment("");
      setActiveQuote(""); // Clear the quote after sending
      broadcastTyping(false);
      setAutoResponderShown(true);
      
      fetch("/api/send-comment-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          clientName: proposal.clientName,
          comment: newComment.trim(),
          quote: activeQuote || null,
          staffId: proposal.sentById || proposal.userId, // Actual sender
          ownerId: proposal.ownerId // CEO/identity owner (may be different)
        })
      }).catch(() => {});

    } catch {
      // comment failed silently — Firestore write already attempted above
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTextSelection = () => {
    // Prevent text selection/quoting when document is already signed
    if (proposal?.status === "accepted") {
      setQuoteTooltip({ visible: false, x: 0, y: 0, text: "" });
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setQuoteTooltip({
          visible: true,
          x: rect.left + (rect.width / 2),
          y: rect.top - 10,
          text: text
        });
      }
    } else {
      setQuoteTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    setActiveTab('discuss');
    setActiveQuote(quoteTooltip.text); // 
    setQuoteTooltip({ visible: false, x: 0, y: 0, text: "" });
    window.getSelection()?.removeAllRanges();

    setTimeout(() => {
      document.getElementById("chat-textarea")?.focus();
    }, 50);
  };

  useEffect(() => {
    const hideTooltip = () => {
      if (window.getSelection()?.toString().trim() === "") {
        setQuoteTooltip((prev) => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener("mousedown", hideTooltip);
    return () => document.removeEventListener("mousedown", hideTooltip);
  }, []);

  const handleAccept = useCallback(async () => {
    if (!proposal) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let sigUrl = "";
      let sigType: "draw" | "upload" = "draw";

      if (signatureMode === "draw" && hasDrawn && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const res = await uploadSignature(dataUrl, proposal.id);
        sigUrl = res.url;
        sigType = "draw";
      } else if (signatureMode === "type" && typedName.trim()) {
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

      // Send signed document copies to all parties
      fetch("/api/send-signed-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: shareToken,
          proposalTitle: proposal.templateName || "Proposal",
          clientName: proposal.clientName,
          clientEmail: proposal.fieldValues?.email || proposal.clientEmail || "client@example.com",
          signatureUrl: sigUrl,
          ownerUserId: proposal.ownerId || proposal.userId,
          senderUserId: proposal.sentById || proposal.userId,
          version: proposal.version || 1,
        }),
      }).catch(() => {});

      setProposal({ ...proposal, status: "accepted" });

    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [proposal, signatureMode, typedName, signatureFile, hasDrawn, shareToken]);

  const handleReject = useCallback(async () => {
    if (!proposal) return;
    setRejecting(true);
    try {
      await rejectProposal(proposal.id);
      // Fire rejected notifications for owner + sender
      const targets = new Set<string>(
        [proposal.ownerId, proposal.sentById, proposal.userId].filter(Boolean) as string[]
      );
      const title = proposal.templateName || "Proposal";
      targets.forEach((uid) => {
        fetch("/api/notify-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            proposalId: proposal.id,
            type: "rejected",
            clientName: proposal.clientName,
            proposalTitle: title,
          }),
        }).catch(() => {});
      });
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

  const handleUnlock = useCallback(async () => {
    if (!proposal) return;
    if (accessCodeInput.trim() !== proposal.accessCode) {
      setAccessCodeError(true);
      return;
    }
    setAccessCodeError(false);

    if (proposal.templateFileUrl) {
      try {
        const { renderProposalHtml } = await import("@/lib/proposal-renderer");
        const html = await renderProposalHtml(proposal.templateFileUrl, proposal.fieldValues);
        setDocumentHtml(html);
      } catch {
        setRenderError(true);
      }
    }
    setViewState("document");
  }, [proposal, accessCodeInput]);

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

  if (viewState === "locked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="mx-4 w-full max-w-sm rounded-3xl border border-slate-200/60 bg-white/70 p-10 text-center shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
            <LockKeyhole className="h-7 w-7 text-violet-600" />
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-900">Protected Proposal</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This proposal is password-protected. Enter the access code to continue.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }} className="mt-6 space-y-3">
            <input
              type="password"
              value={accessCodeInput}
              onChange={(e) => { setAccessCodeInput(e.target.value); setAccessCodeError(false); }}
              placeholder="Enter access code"
              autoFocus
              className={`w-full rounded-xl border px-4 py-3 text-center text-[14px] font-medium tracking-wider outline-none transition ${
                accessCodeError
                  ? "border-rose-300 bg-rose-50/50 text-rose-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  : "border-slate-200 bg-slate-50/80 text-slate-900 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              }`}
            />
            {accessCodeError && (
              <p className="text-[12px] font-medium text-rose-500">Incorrect access code. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={!accessCodeInput.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-violet-200/50 transition hover:from-violet-600 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Unlock Proposal
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Version detection overlay -- shown for superseded/voided proposals
  if (newerVersionId && (proposal?.status === "superseded" || proposal?.status === "void")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-4 w-full max-w-md rounded-3xl border border-amber-200/60 bg-white/90 p-10 text-center shadow-2xl shadow-amber-100/60 backdrop-blur-xl"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 ring-4 ring-amber-100">
            <RefreshCw className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">This version has been updated</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            A newer version of this proposal is available. Please use the latest version to review and sign.
          </p>
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[12px] text-amber-700">
            Signing or acting on this outdated version is not permitted.
          </div>
          <a
            href={"/p/" + newerVersionId}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-3.5 text-[13px] font-semibold text-white shadow-lg shadow-indigo-200/50 transition hover:from-violet-600 hover:to-indigo-700 active:scale-95"
          >
            Open Latest Version &#x2192;
          </a>
        </motion.div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      
      {quoteTooltip.visible && (
        <div 
          className="fixed z-50 animate-in fade-in zoom-in duration-200"
          style={{ top: quoteTooltip.y - 45, left: quoteTooltip.x, transform: 'translateX(-50%)' }}
        >
          <button
            onMouseDown={handleQuoteClick}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl hover:bg-slate-800 transition"
          >
            <Quote className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium whitespace-nowrap">Quote in Discussion</span>
          </button>
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900 mx-auto -mt-px"></div>
        </div>
      )}

      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-indigo-200/60">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[15px] font-semibold text-slate-900">
                  {proposal?.templateName ?? "Proposal"}
                </h1>
                {proposal?.version && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    v{proposal.version}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-slate-400">
                {proposal ? `Prepared for ${proposal.clientName}` : ""}
                {proposal?.createdAt ? ` · ${formatDate(proposal.createdAt)}` : ""}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Print
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          <section>
            <div ref={documentRef} className="rounded-3xl border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h2 className="text-[13px] font-semibold text-slate-700">Proposal Document</h2>
                </div>
                {proposal?.status === "accepted" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> Legally Signed
                    </span>
                )}
              </div>

              {documentHtml ? (
                <div
                  className="proposal-content px-8 py-6 sm:px-10 sm:py-8"
                  dangerouslySetInnerHTML={{ __html: documentHtml }}
                  onMouseUp={handleTextSelection}
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

          <aside className="flex flex-col gap-5 h-full">
            
            <div className="flex p-1 bg-slate-200/50 rounded-xl">
              <button 
                onClick={() => setActiveTab('action')} 
                className={`flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all ${activeTab === 'action' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {proposal?.status === "accepted" ? "Document" : "Sign & Details"}
              </button>
              <button 
                onClick={() => proposal?.status !== "accepted" && setActiveTab('discuss')} 
                disabled={proposal?.status === "accepted"}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-semibold rounded-lg transition-all ${activeTab === 'discuss' ? 'bg-white shadow-sm text-violet-700' : 'text-slate-500 hover:text-slate-700'} ${proposal?.status === "accepted" ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={proposal?.status === "accepted" ? "Discussion is closed after signing" : ""}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Discuss {comments.length > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-[9px]">{comments.length}</span>}
              </button>
            </div>

            {activeTab === 'discuss' ? (
              <div className="flex flex-col flex-1 border border-slate-200/60 bg-white/80 rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden min-h-[500px] max-h-[700px] sticky top-24">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-[13px] font-bold text-slate-800">Discussion Thread</h3>
                  <p className="text-[11px] text-slate-500">
                    {proposal?.status === "accepted" 
                      ? "This document has been signed. Discussion is now closed." 
                      : "Highlight text in the document to quote it."}
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-[12px] text-slate-400 mt-10">No messages yet. Send a message to start negotiating.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className={`flex flex-col ${c.authorRole === 'client' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-400 mb-1 px-1">{c.authorName || 'Client'}</span>
                        <div className={`px-3 py-2.5 rounded-xl max-w-[85%] text-[13px] leading-relaxed shadow-sm ${c.authorRole === 'client' ? 'bg-violet-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                          
                          {/* 🔥 Graceful Structured Quote Render */}
                          {c.quote && (
                            <div className={`mb-2 pl-2 border-l-2 text-[11px] italic opacity-90 ${c.authorRole === 'client' ? 'border-white/50' : 'border-slate-300 text-slate-500'}`}>
                              "{c.quote}"
                            </div>
                          )}

                          {c.text.split('\n').map((line: string, i: number) => (
                            <span key={i}>{line}<br/></span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]"/>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]"/>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]"/>
                      </span>
                      <span className="text-[11px] text-slate-400">{typingUsers.join(", ")} is typing…</span>
                    </div>
                  )}
                  {autoResponderShown && (
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400 mb-1 px-1">ProposalMS</span>
                      <div className="px-3 py-2.5 rounded-xl max-w-[85%] text-[12px] leading-relaxed bg-slate-100 text-slate-600 rounded-bl-none border border-slate-200">
                        Thanks for your message! Our team typically responds within a few hours during business hours.
                      </div>
                    </div>
                  )}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-1.5 px-1 py-1">
                      <span className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]"/>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]"/>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]"/>
                      </span>
                      <span className="text-[11px] text-slate-400">{typingUsers.join(", ")} is typing…</span>
                    </div>
                  )}
                  {autoResponderShown && (
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-slate-400 mb-1 px-1">Support</span>
                      <div className="px-3 py-2.5 rounded-xl max-w-[85%] text-[12px] leading-relaxed bg-slate-100 text-slate-600 rounded-bl-none border border-slate-200">
                        Thanks for your message! Our team typically responds within a few hours during business hours.
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Comment form - disabled when document is signed */}
                {proposal?.status === "accepted" ? (
                  <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                    <LockKeyhole className="w-4 h-4 text-slate-400 mx-auto mb-2" />
                    <p className="text-[12px] text-slate-500">
                      Discussion is closed. This document has been signed.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleAddComment} className="p-3 border-t border-slate-100 bg-white flex flex-col relative">
                    
                    {/* 🔥 Active Quote Preview Above the Text Box */}
                    {activeQuote && (
                      <div className="mb-2 relative bg-violet-50 border-l-2 border-violet-500 p-2.5 rounded-r-lg">
                        <button
                          type="button"
                          onClick={() => setActiveQuote("")} // Lets them clear the quote if they change their mind
                          className="absolute top-1 right-1 p-1 text-violet-400 hover:text-violet-600 rounded-md hover:bg-violet-100 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <p className="text-[11px] font-medium text-violet-800 mb-1 flex items-center gap-1">
                          <Quote className="w-3 h-3" /> Replying to quote
                        </p>
                        <p className="text-[11px] text-violet-600 italic pr-6 line-clamp-2">
                          "{activeQuote}"
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <textarea 
                        id="chat-textarea"
                        value={newComment} 
                        onChange={e => { setNewComment(e.target.value); broadcastTyping(true); }} 
                        placeholder="Type a message..." 
                        rows={2}
                        className="w-full text-[13px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-200 resize-none transition-all"
                      />
                      <div className="flex justify-end">
                        <button 
                          disabled={!newComment.trim() || submittingComment} 
                          className="bg-violet-600 text-white rounded-lg px-4 py-1.5 disabled:opacity-50 hover:bg-violet-700 transition flex items-center gap-1.5"
                        >
                          <span className="text-[12px] font-medium">Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* TAB CONTENT: Action (Sign & Details) */
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg shadow-slate-200/20 backdrop-blur-xl">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Proposal Details
                  </h3>
                  <dl className="space-y-2.5">
                    {proposal && Object.entries(proposal.fieldValues || {}).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[11px] font-medium text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                        <dd className="text-[13px] font-medium text-slate-800">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* Change Signer (Client Scenario 4) */}
                {proposal?.status !== "accepted" && !changeSignerDone && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setShowChangeSigner((v) => !v)}
                      className="flex w-full items-center justify-between text-[12px] font-medium text-slate-500 hover:text-slate-800 transition"
                    >
                      <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Not the right signer?</span>
                      <span className="text-[11px] text-violet-600">{showChangeSigner ? "Cancel" : "Change Signer"}</span>
                    </button>
                    {showChangeSigner && (
                      <div className="mt-3 space-y-2">
                        <input type="text" value={newSignerName} onChange={e => setNewSignerName(e.target.value)} placeholder="Authorized signer full name" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-200" />
                        <input type="email" value={newSignerEmail} onChange={e => setNewSignerEmail(e.target.value)} placeholder="Authorized signer email" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-violet-200" />
                        <button
                          type="button"
                          onClick={handleChangeSigner}
                          disabled={changingSignerLoading || !newSignerName.trim() || !newSignerEmail.trim()}
                          className="w-full rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {changingSignerLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          {changingSignerLoading ? "Forwarding…" : "Forward to New Signer"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {changeSignerDone && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> Proposal forwarded. The new signer will receive an email shortly.
                  </div>
                )}

                {proposal?.status === "accepted" ? (
                  <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-6 shadow-lg text-center backdrop-blur-xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 mb-4">
                      <ShieldCheck className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Document Locked</h3>
                    <p className="mt-2 text-[13px] text-slate-600 mb-6">
                      This document has been legally signed and is now locked for editing.
                    </p>
                    <button
                      onClick={async () => {
                        if (!documentRef.current || !proposal) return;
                        setPdfLoading(true);
                        try {
                          await exportProposalPdf(documentRef.current, `Signed-${proposal.clientName.replace(/\s+/g, "-")}.pdf`);
                        } finally {
                          setPdfLoading(false);
                        }
                      }}
                      disabled={pdfLoading || !documentHtml}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download Signed PDF
                    </button>
                  </div>
                ) : !showReject ? (
                  <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 shadow-lg shadow-slate-200/20 backdrop-blur-xl">
                    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Sign &amp; Accept
                    </h3>

                    <div className="mb-4 grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setSignatureMode("draw")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition ${
                          signatureMode === "draw"
                            ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <PenLine className="h-3.5 w-3.5" /> Draw
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode("type")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition ${
                          signatureMode === "type"
                            ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <Pen className="h-3.5 w-3.5" /> Type
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode("upload")}
                        className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[12px] font-medium transition ${
                          signatureMode === "upload"
                            ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" /> Upload
                      </button>
                    </div>

                    {signatureMode === "draw" ? (
                      <div>
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={560}
                            height={160}
                            className="w-full cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[11px] text-slate-400">
                            {hasDrawn ? "Signature captured" : "Draw your signature above"}
                          </p>
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Eraser className="h-3 w-3" /> Clear
                          </button>
                        </div>
                      </div>
                    ) : signatureMode === "type" ? (
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
                              <img src={signaturePreview} alt="Signature" className="mx-auto max-h-24 object-contain" />
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

                    <label className="mt-4 flex items-start gap-2.5 cursor-pointer group">
                      <div className="relative mt-0.5 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="peer h-4 w-4 appearance-none rounded border border-slate-300 bg-slate-50 checked:border-violet-600 checked:bg-violet-600 focus:ring-2 focus:ring-violet-200 focus:ring-offset-1 transition-all"
                        />
                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-[11px] leading-relaxed text-slate-500 group-hover:text-slate-700 transition-colors">
                        I agree to the terms and conditions and understand this is a legally binding signature.
                      </span>
                    </label>

                    <button
                      onClick={handleAccept}
                      disabled={
                        submitting ||
                        !consentChecked ||
                        (signatureMode === "draw" ? !hasDrawn : signatureMode === "type" ? !typedName.trim() : !signatureFile)
                      }
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
                ) : (
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
              </div>
            )}
          </aside>
        </div>
      </main>

      <style jsx global>{`
        .proposal-content {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.8;
          color: #1e293b;
        }
        .proposal-content p { margin-bottom: 0.75em; }
        .proposal-content h1, .proposal-content h2, .proposal-content h3 {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: #0f172a;
        }
        .proposal-content h1 { font-size: 1.5em; }
        .proposal-content h2 { font-size: 1.25em; }
        .proposal-content h3 { font-size: 1.1em; }
        .proposal-content ul, .proposal-content ol { padding-left: 1.5em; margin-bottom: 0.75em; }
        .proposal-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
        .proposal-content th, .proposal-content td { border: 1px solid #e2e8f0; padding: 0.5em 0.75em; text-align: left; font-size: 13px; }
        .proposal-content th { background: #f8fafc; font-weight: 600; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: translateX(-50%) scale(0.95); } to { transform: translateX(-50%) scale(1); } }
        .animate-in { animation: fade-in 0.2s ease-out forwards, zoom-in 0.2s ease-out forwards; }

        @media print {
          header, aside, .no-print { display: none !important; }
          .proposal-content { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}