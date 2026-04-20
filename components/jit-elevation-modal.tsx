"use client";

import { useState } from "react";
import { X, ShieldAlert, Clock, AlertTriangle, Loader2, Lock } from "lucide-react";
import { JIT_DURATIONS } from "@/lib/firestore";
import { useElevation } from "@/contexts/auth-context";
import { toast } from "sonner";

interface JitElevationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JitElevationModal({ isOpen, onClose }: JitElevationModalProps) {
  const { requestElevation } = useElevation();
  const [justification, setJustification] = useState("");
  const [selectedDurationIdx, setSelectedDurationIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const selected = JIT_DURATIONS[selectedDurationIdx];

  const handleSubmit = async () => {
    if (!justification.trim()) {
      toast.error("A justification is required.");
      return;
    }
    setSaving(true);
    try {
      await requestElevation({
        justification: justification.trim(),
        durationMs: selected.ms,
        durationLabel: selected.label,
      });
      toast.success(`Elevated to Super Admin for ${selected.label}. The CEO has been notified.`);
      setJustification("");
      onClose();
    } catch {
      toast.error("Failed to request elevation. Try again.");
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
        className="relative w-full max-w-md rounded-2xl border border-rose-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
            <Lock className="h-4.5 w-4.5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Request Elevated Access</h2>
            <p className="text-[12px] text-slate-500">Vault Protocol — JIT Super Admin</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12px] leading-relaxed text-amber-800">
              This action grants temporary access to destructive operations. All actions during this window are
              fully audited and the CEO is notified immediately.
            </p>
          </div>

          {/* Duration picker */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-slate-700">
              <Clock className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {JIT_DURATIONS.map((d, i) => (
                <button
                  key={d.label}
                  onClick={() => setSelectedDurationIdx(i)}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-medium transition ${
                    selectedDurationIdx === i
                      ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-slate-700">
              <ShieldAlert className="mb-0.5 mr-1 inline h-3.5 w-3.5" />
              Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="e.g., Deactivating ex-employee account for John Smith"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-300/40"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              This will be recorded in the audit log and sent to the CEO.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !justification.trim()}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50 active:scale-95"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Requesting…</>
            ) : (
              <><Lock className="h-4 w-4" /> Elevate for {selected.label}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
