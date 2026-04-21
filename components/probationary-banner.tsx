"use client";

import { useEffect, useState } from "react";
import { Clock, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { LazyProbationaryRing } from "@/components/three/lazy-three";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "finalizing…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ProbationaryBanner() {
  const { profile } = useAuth();
  const [, setTick] = useState(0);

  useEffect(() => {
    if (profile?.roleStatus !== "probation") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [profile?.roleStatus]);

  if (profile?.roleStatus !== "probation") return null;

  const expiry = profile.probationExpiry as { seconds?: number; toDate?: () => Date } | null;
  let msRemaining = 0;
  let msTotal = (profile.probationDurationHours ?? 24) * 3_600_000;

  if (expiry) {
    const expiryDate = expiry.toDate
      ? expiry.toDate()
      : new Date((expiry.seconds ?? 0) * 1000);
    msRemaining = Math.max(0, expiryDate.getTime() - Date.now());
  }

  const progress = Math.min(1, Math.max(0, 1 - msRemaining / msTotal));
  const urgency = progress > 0.75;

  return (
    <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${
      urgency
        ? "border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50"
        : "border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50"
    }`}>
      {/* 3D ring visual */}
      <div className="shrink-0">
        <LazyProbationaryRing msRemaining={msRemaining} msTotal={msTotal} size={52} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Shield className={`h-4 w-4 ${urgency ? "text-orange-500" : "text-teal-500"}`} />
          <p className={`text-[13px] font-bold ${urgency ? "text-orange-800" : "text-teal-800"}`}>
            Probationary Training Mode
          </p>
        </div>
        <p className={`mt-0.5 text-[12px] ${urgency ? "text-orange-600" : "text-teal-600"}`}>
          You are being trained for{" "}
          <strong>{profile.assignedDepartment ?? "your new department"}</strong> — Dept Admin role.
          Promoted by <strong>{profile.promotedByName ?? "Super Admin"}</strong>.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Destructive actions are locked during probation. Full permissions unlock in{" "}
          <strong className={urgency ? "text-orange-700" : "text-teal-700"}>
            {formatCountdown(msRemaining)}
          </strong>{" "}
          unless the CEO approves early.
        </p>
      </div>

      {/* Countdown pill */}
      <div className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${
        urgency ? "bg-orange-100" : "bg-teal-100"
      }`}>
        <Clock className={`h-3.5 w-3.5 ${urgency ? "text-orange-500" : "text-teal-500"}`} />
        <span className={`font-mono text-[12px] font-bold ${urgency ? "text-orange-700" : "text-teal-700"}`}>
          {formatCountdown(msRemaining)}
        </span>
      </div>
    </div>
  );
}
