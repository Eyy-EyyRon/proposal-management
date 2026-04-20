"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle, MessageSquare } from "lucide-react";
import {
  verifyAndPromoteTask,
  requestTaskChanges,
  type ProposalTask,
} from "@/lib/firestore";
import { toast } from "@/components/providers/toast";
import { useAuth } from "@/contexts/auth-context";
import { UrgencyBadge } from "./urgency-badge";

interface VerifyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProposalTask;
}

export function VerifyTaskModal({ isOpen, onClose, task }: VerifyTaskModalProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"choose" | "changes">("choose");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const actorName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

  const handleApprove = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await verifyAndPromoteTask(task.id, user.uid, actorName);
      toast.success(`"${task.clientName}" promoted to CEO's Talking Inbox.`);
      onClose();
    } catch {
      toast.error("Failed to verify task.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!user || !note.trim()) {
      toast.error("Please provide a note describing the changes needed.");
      return;
    }
    setSaving(true);
    try {
      await requestTaskChanges(task.id, user.uid, actorName, note.trim());
      toast.success("Changes requested — staff has been notified.");
      setNote("");
      setMode("choose");
      onClose();
    } catch {
      toast.error("Failed to request changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">Verify Proposal</h3>
            <p className="text-[12px] text-slate-400">{task.clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={task.urgency} />
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {task.assigneeName && (
            <p className="mb-3 text-[12px] text-slate-500">
              Submitted by <span className="font-semibold text-slate-700">{task.assigneeName}</span>
            </p>
          )}
          <p className="mb-4 text-[13px] text-slate-600">{task.briefDescription}</p>

          {mode === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleApprove}
                disabled={saving}
                className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                )}
                <span className="text-[13px] font-semibold text-emerald-700">Approve & Promote</span>
                <span className="text-[11px] text-emerald-500">Send to CEO&rsquo;s Inbox</span>
              </button>
              <button
                onClick={() => setMode("changes")}
                className="flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-5 text-center transition hover:border-amber-300 hover:bg-amber-50 active:scale-[0.98]"
              >
                <MessageSquare className="h-5 w-5 text-amber-500" />
                <span className="text-[13px] font-semibold text-amber-700">Request Changes</span>
                <span className="text-[11px] text-amber-500">Send back for edits</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-[12px] font-medium text-slate-500">What needs to change?</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-[13px] text-slate-700 focus:border-amber-300 focus:outline-none resize-none"
                placeholder="Describe the changes needed..."
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setMode("choose"); setNote(""); }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={saving || !note.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  Send Feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
