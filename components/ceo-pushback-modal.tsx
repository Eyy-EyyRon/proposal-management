"use client";

import { useState } from "react";
import { X, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { ceoRequestRevision, type ProposalTask } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

interface CeoPushBackModalProps {
  task: ProposalTask;
  isOpen: boolean;
  onClose: () => void;
}

export function CeoPushBackModal({ task, isOpen, onClose }: CeoPushBackModalProps) {
  const { user, profile } = useAuth();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user || !profile || !note.trim()) return;
    const ceoName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    setSaving(true);
    try {
      await ceoRequestRevision(task.id, user.uid, ceoName, note.trim());
      toast.success("Revision requested — staff and dept admin notified.");
      setNote("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request revision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-slate-800">Request Revision</h3>
              <p className="text-[11px] text-slate-400">{task.clientName} · {task.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-[12px] font-medium text-amber-700">
              The client has requested changes or you need the proposal revised before re-sending.
              This will route the task back to staff for rework, then back through dept admin verification before returning to your Talking Inbox.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-600">
              Revision Instructions for the Team *
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Describe what needs to change — be specific so staff knows exactly what the client wants..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            Staff and dept admin will be notified immediately.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !note.trim()}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-[13px] font-medium text-white transition hover:bg-amber-600 disabled:opacity-50 active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {saving ? "Sending…" : "Push Back to Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}
