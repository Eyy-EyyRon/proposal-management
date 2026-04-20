"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getActiveProposalCountByUser,
  reassignProposals,
  writeAuditLog,
  type TeamMember,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";

interface Props {
  targetUser: TeamMember | null;
  colleagues: TeamMember[];                     // Other active members to reassign to
  onClose: () => void;
  onConfirmed: (targetUserId: string, successorId: string | null) => Promise<void>;
}

export function StaffDeactivateModal({ targetUser, colleagues, onClose, onConfirmed }: Props) {
  const { user, profile } = useAuth();
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [successorId, setSuccessorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [counting, setCounting] = useState(true);

  useEffect(() => {
    if (!targetUser) return;
    setCounting(true);
    getActiveProposalCountByUser(targetUser.id)
      .then(setActiveCount)
      .finally(() => setCounting(false));
    setSuccessorId("");
  }, [targetUser]);

  if (!targetUser) return null;

  const requiresSuccessor = (activeCount ?? 0) > 0;
  const canConfirm = !requiresSuccessor || !!successorId;

  const handleConfirm = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      if (requiresSuccessor && successorId) {
        await reassignProposals(
          targetUser.id,
          successorId,
          user.uid,
          `${profile.firstName} ${profile.lastName}`,
          profile.role
        );
      }
      await writeAuditLog({
        action: "user_deactivated",
        actorId: user.uid,
        actorName: `${profile.firstName} ${profile.lastName}`,
        actorRole: profile.role,
        targetId: targetUser.id,
        targetType: "user",
        description: `Staff member ${targetUser.firstName} ${targetUser.lastName} deactivated${
          requiresSuccessor && successorId ? `, ${activeCount} proposals reassigned to ${successorId}` : ""
        }`,
        metadata: { successorId: successorId || null, proposalsReassigned: activeCount },
        department: targetUser.department ?? undefined,
      });
      await onConfirmed(targetUser.id, successorId || null);
      toast.success(`${targetUser.firstName} ${targetUser.lastName} deactivated.`, {
        description: requiresSuccessor && successorId
          ? `${activeCount} active proposals reassigned.`
          : "No open proposals to reassign.",
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate staff member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="mx-4 w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 shadow-2xl"
        >
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
            <UserMinus className="h-6 w-6 text-rose-600" />
          </div>

          {/* Title */}
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Deactivate {targetUser.firstName} {targetUser.lastName}?
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            This will remove their access to the system. Audit log entry will be created.
          </p>

          {/* Active Proposals Count */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            {counting ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking active proposals…
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {requiresSuccessor ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className={`text-[13px] font-medium ${requiresSuccessor ? "text-amber-700" : "text-slate-600"}`}>
                    {activeCount === 0
                      ? "No active proposals — safe to deactivate."
                      : `${activeCount} active proposal${activeCount === 1 ? "" : "s"} will be orphaned.`}
                  </p>
                  {requiresSuccessor && (
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      Select a successor to inherit these documents before proceeding.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Successor Selector */}
          {requiresSuccessor && !counting && (
            <div className="mt-4">
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                Transfer proposals to
              </label>
              <select
                value={successorId}
                onChange={(e) => setSuccessorId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">— Select a successor —</option>
                {colleagues
                  .filter((c) => c.id !== targetUser.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.jobTitle ? ` · ${c.jobTitle}` : ""}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !canConfirm || counting}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Deactivating…</>
                : <><UserMinus className="h-4 w-4" /> Deactivate</>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
