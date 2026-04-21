"use client";

import { useAuth } from "@/contexts/auth-context";

/**
 * Returns whether the current user is in probation.
 * During probation the user can VIEW content but CANNOT execute
 * any destructive/promotion actions (verify task, send proposal, etc.).
 */
export function useProbationGuard() {
  const { profile } = useAuth();

  const isOnProbation = profile?.roleStatus === "probation";

  const probationMs = (() => {
    if (!isOnProbation || !profile?.probationExpiry) return 0;
    const expiry = profile.probationExpiry as
      | { seconds?: number; toDate?: () => Date }
      | null;
    if (!expiry) return 0;
    const d = expiry.toDate ? expiry.toDate() : new Date((expiry.seconds ?? 0) * 1000);
    return Math.max(0, d.getTime() - Date.now());
  })();

  const probationTotal = (profile?.probationDurationHours ?? 24) * 3_600_000;

  const probationDept = profile?.assignedDepartment ?? null;

  return {
    isOnProbation,
    probationMs,
    probationTotal,
    probationDept,
    /** Call before any destructive action — returns true if the action should be blocked */
    blockIfOnProbation: (onBlocked?: (reason: string) => void): boolean => {
      if (!isOnProbation) return false;
      const h = Math.floor(probationMs / 3_600_000);
      const m = Math.floor((probationMs % 3_600_000) / 60_000);
      const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
      const reason = `This action is locked during your probationary period. Permissions unlock in ${timeStr} or when the CEO approves early.`;
      onBlocked?.(reason);
      return true;
    },
  };
}
