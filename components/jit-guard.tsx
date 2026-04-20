"use client";

import { useState, type ReactNode } from "react";
import { ShieldAlert, X, AlertTriangle, Loader2 } from "lucide-react";
import { useIsElevated, useElevation } from "@/contexts/auth-context";

interface JITGuardProps {
  children: (props: { trigger: (action: () => Promise<void> | void) => void }) => ReactNode;
  actionLabel?: string;
  requiresElevation?: boolean;
  onElevationNeeded?: () => void;
}

export function JITGuard({
  children,
  actionLabel = "this action",
  requiresElevation = true,
  onElevationNeeded,
}: JITGuardProps) {
  const isElevated = useIsElevated();
  const { elevation } = useElevation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<(() => Promise<void> | void) | null>(null);
  const [executing, setExecuting] = useState(false);

  const trigger = (action: () => Promise<void> | void) => {
    if (requiresElevation && !isElevated) {
      onElevationNeeded?.();
      return;
    }
    setPending(() => action);
    setReason("");
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!reason.trim() || !pending) return;
    setExecuting(true);
    try {
      await pending();
    } finally {
      setExecuting(false);
      setOpen(false);
      setPending(null);
      setReason("");
    }
  };

  const handleClose = () => {
    if (executing) return;
    setOpen(false);
    setPending(null);
    setReason("");
  };

  return (
    <>
      {children({ trigger })}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-rose-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">Confirm Destructive Action</p>
                <p className="text-[11px] text-slate-500">Performing: {actionLabel}</p>
              </div>
              <button onClick={handleClose} disabled={executing} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* Elevation context badge */}
              {elevation && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                  </span>
                  <span className="text-[11px] font-semibold text-orange-800">
                    Elevated session active — this action will be audited
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[12px] leading-relaxed text-amber-800">
                  This action is <strong>irreversible</strong>. A reason is required and will be attached to the audit log.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                  Reason for action <span className="text-rose-500">*</span>
                </label>
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={`e.g., Ticket #1234 — removing ex-employee account per HR request`}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-300/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
              <button
                onClick={handleClose}
                disabled={executing}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={executing || !reason.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50 active:scale-95"
              >
                {executing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Executing…</>
                ) : (
                  <><ShieldAlert className="h-3.5 w-3.5" /> Confirm &amp; Execute</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
