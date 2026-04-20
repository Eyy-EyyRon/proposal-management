"use client";

import { useState } from "react";
import { X, ShieldAlert, Clock, AlertTriangle, Loader2, Lock, Zap, Crown, CheckCircle } from "lucide-react";
import { JIT_DURATIONS, type ElevationTier } from "@/lib/firestore";
import { useElevation } from "@/contexts/auth-context";
import { toast } from "sonner";

interface JitElevationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_JUSTIFICATION_LENGTH = 10;

const TIER_CONFIG = {
  operational: {
    label: "Operational JIT",
    icon: Zap,
    color: "border-orange-400 bg-orange-50 text-orange-800",
    activeColor: "border-orange-500 bg-orange-100 ring-orange-300",
    badge: "Auto-Approved",
    badgeColor: "bg-orange-100 text-orange-700",
    tasks: [
      "Deactivate / reactivate staff",
      "Delete departments",
      "Global search & reassignment",
    ],
    approvalNote: "Instantly active — a log is sent to the CEO.",
  },
  critical: {
    label: "Critical JIT",
    icon: Crown,
    color: "border-rose-400 bg-rose-50 text-rose-800",
    activeColor: "border-rose-500 bg-rose-100 ring-rose-300",
    badge: "CEO Approval Required",
    badgeColor: "bg-rose-100 text-rose-700",
    tasks: [
      "Change user roles (promote/demote admins)",
      "Modify system / org settings",
      "Edit other Super Admin accounts",
    ],
    approvalNote: "Requires CEO approval before becoming active.",
  },
} as const;

export function JitElevationModal({ isOpen, onClose }: JitElevationModalProps) {
  const { requestElevation, elevation } = useElevation();
  const [tier, setTier] = useState<ElevationTier>("operational");
  const [justification, setJustification] = useState("");
  const [selectedDurationIdx, setSelectedDurationIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  // If there's already a pending critical elevation, show waiting state
  const isPendingCritical = elevation?.status === "pending_approval" && elevation?.tier === "critical";

  const selected = JIT_DURATIONS[selectedDurationIdx];
  const cfg = TIER_CONFIG[tier];

  const handleSubmit = async () => {
    if (justification.trim().length < MIN_JUSTIFICATION_LENGTH) {
      toast.error(`Justification must be at least ${MIN_JUSTIFICATION_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    try {
      await requestElevation({
        justification: justification.trim(),
        durationMs: selected.ms,
        durationLabel: selected.label,
        tier,
      });
      if (tier === "operational") {
        toast.success(`Operational elevation active for ${selected.label}. CEO has been notified.`);
        setJustification("");
        onClose();
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error("[JitElevationModal] requestElevation failed:", err);
      toast.error("Failed to request elevation. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Pending / submitted state for critical tier
  if (submitted || isPendingCritical) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="relative w-full max-w-sm rounded-2xl border border-amber-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-7 w-7 text-amber-600 animate-pulse" />
            </div>
            <h2 className="text-[16px] font-bold text-slate-900">Awaiting CEO Approval</h2>
            <p className="text-[13px] leading-relaxed text-slate-500">
              Your <strong>Critical JIT</strong> request has been submitted. The CEO has been notified and must approve before your session becomes active. You will see an update in your notifications.
            </p>
            <button onClick={onClose} className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-slate-700">
              Close — I&apos;ll wait for approval
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <Lock className="h-4 w-4 text-slate-700" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Request Elevated Access</h2>
            <p className="text-[12px] text-slate-500">Temporary elevated session — you are already Super Admin</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Tier picker */}
          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Elevation Type</p>
            <div className="grid grid-cols-2 gap-3">
              {(["operational", "critical"] as const).map((t) => {
                const c = TIER_CONFIG[t];
                const Icon = c.icon;
                const isSelected = tier === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition ${
                      isSelected ? `${c.activeColor} ring-1` : "border-slate-200 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? "" : "text-slate-400"}`} />
                      <span className={`text-[12px] font-bold ${isSelected ? "" : "text-slate-600"}`}>{c.label}</span>
                      {isSelected && <CheckCircle className="ml-auto h-3.5 w-3.5" />}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.badgeColor}`}>{c.badge}</span>
                    <ul className="mt-1 space-y-0.5">
                      {c.tasks.map((task) => (
                        <li key={task} className={`text-[11px] ${isSelected ? "" : "text-slate-400"}`}>• {task}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <p className={`mt-2 flex items-center gap-1.5 text-[11px] ${tier === "critical" ? "text-rose-600" : "text-amber-700"}`}>
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {cfg.approvalNote}
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
                      ? tier === "critical"
                        ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                        : "border-orange-400 bg-orange-50 text-orange-700 ring-1 ring-orange-300"
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
              placeholder={tier === "critical" ? "e.g., Promoting John Smith to Super Admin per CEO instruction" : "e.g., Deactivating ex-employee account for John Smith"}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-300/40"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className={`text-[11px] ${
                justification.trim().length === 0 ? "text-slate-400" :
                justification.trim().length < MIN_JUSTIFICATION_LENGTH ? "text-rose-500" : "text-emerald-600"
              }`}>
                {justification.trim().length < MIN_JUSTIFICATION_LENGTH
                  ? `${MIN_JUSTIFICATION_LENGTH - justification.trim().length} more character${MIN_JUSTIFICATION_LENGTH - justification.trim().length !== 1 ? "s" : ""} required`
                  : "✓ Justification accepted"}
              </span>
              <span className="text-[11px] text-slate-400">{justification.trim().length} / {MIN_JUSTIFICATION_LENGTH}+</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || justification.trim().length < MIN_JUSTIFICATION_LENGTH}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition disabled:opacity-50 active:scale-95 ${
              tier === "critical" ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
            ) : tier === "critical" ? (
              <><Crown className="h-4 w-4" /> Submit for CEO Approval</>
            ) : (
              <><Zap className="h-4 w-4" /> Elevate for {selected.label}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
