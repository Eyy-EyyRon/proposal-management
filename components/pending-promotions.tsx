"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, X, Clock, CheckCircle, UserCheck,
  AlertTriangle, Loader2, Building2,
} from "lucide-react";
import {
  subscribeToAllProbations,
  fastTrackPromotion,
  vetoProbation,
  type ProbationRecord,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";
import { LazyProbationaryRing } from "@/components/three/lazy-three";

function formatCountdown(ms: number) {
  if (ms <= 0) return "Finalizing…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

function getProbationMs(record: ProbationRecord): number {
  const expiry = record.probationExpiry as { seconds?: number; toDate?: () => Date } | null;
  if (!expiry) return 0;
  const d = expiry.toDate ? expiry.toDate() : new Date((expiry.seconds ?? 0) * 1000);
  return Math.max(0, d.getTime() - Date.now());
}

function getProbationTotal(record: ProbationRecord): number {
  return (record.probationDurationHours ?? 24) * 3_600_000;
}

function formatStarted(ts: unknown): string {
  if (!ts) return "";
  const s = (ts as { seconds?: number }).seconds;
  if (!s) return "";
  return new Date(s * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function PendingPromotions() {
  const { user, profile } = useAuth();
  const [probations, setProbations] = useState<ProbationRecord[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    record: ProbationRecord; action: "fast_track" | "veto";
  } | null>(null);
  const [, setTick] = useState(0);

  const ceoName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "CEO";

  useEffect(() => {
    if (profile?.role !== "ceo") return;
    return subscribeToAllProbations(setProbations);
  }, [profile?.role]);

  // Refresh countdown every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleFastTrack = async (record: ProbationRecord) => {
    if (!user) return;
    setActing(record.id);
    try {
      await fastTrackPromotion(record.id, user.uid, ceoName);
      const name = `${record.firstName} ${record.lastName}`.trim();
      toast.success(`${name} fast-tracked to Dept Admin — ${record.assignedDepartment}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fast-track failed.");
    } finally {
      setActing(null);
      setConfirmModal(null);
    }
  };

  const handleVeto = async (record: ProbationRecord) => {
    if (!user) return;
    setActing(record.id);
    try {
      await vetoProbation(record.id, user.uid, ceoName);
      const name = `${record.firstName} ${record.lastName}`.trim();
      toast.success(`Promotion of ${name} vetoed — reverted to Staff.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Veto failed.");
    } finally {
      setActing(null);
      setConfirmModal(null);
    }
  };

  if (probations.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-700">
            Pending Promotions ({probations.length})
          </p>
          <span className="flex h-5 items-center rounded-full bg-amber-500 px-2 text-[10px] font-bold text-white">
            Veto window open
          </span>
        </div>

        {/* Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {probations.map((record) => {
            const msRemaining = getProbationMs(record);
            const msTotal = getProbationTotal(record);
            const progress = Math.min(1, Math.max(0, 1 - msRemaining / msTotal));
            const name = `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim();
            const urgencyColor =
              progress > 0.75 ? "border-orange-300 bg-orange-50/60" :
              "border-teal-200 bg-teal-50/50";

            return (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`relative flex flex-col gap-3 rounded-2xl border ${urgencyColor} p-4`}
              >
                {/* Top row */}
                <div className="flex items-center gap-3">
                  <LazyProbationaryRing msRemaining={msRemaining} msTotal={msTotal} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Building2 className="h-3 w-3" />
                      <span>{record.assignedDepartment}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Initiated by {record.promotedByName} · {formatStarted(record.probationStartedAt)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress > 0.75 ? "bg-orange-400" : "bg-teal-400"
                    }`}
                    style={{ width: `${(1 - progress) * 100}%` }}
                  />
                </div>
                <p className={`text-[11px] font-medium ${progress > 0.75 ? "text-orange-600" : "text-teal-600"}`}>
                  {formatCountdown(msRemaining)}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmModal({ record, action: "fast_track" })}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {acting === record.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Fast-Track
                  </button>
                  <button
                    onClick={() => setConfirmModal({ record, action: "veto" })}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Veto
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                confirmModal.action === "fast_track" ? "bg-emerald-100" : "bg-rose-100"
              }`}>
                {confirmModal.action === "fast_track"
                  ? <Zap className="h-6 w-6 text-emerald-600" />
                  : <AlertTriangle className="h-6 w-6 text-rose-500" />}
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">
                {confirmModal.action === "fast_track"
                  ? "Fast-Track Promotion?"
                  : "Veto This Promotion?"}
              </h3>
              <p className="mt-2 text-[13px] text-slate-500">
                {confirmModal.action === "fast_track"
                  ? `${confirmModal.record.firstName} ${confirmModal.record.lastName} will immediately become Dept Admin of ${confirmModal.record.assignedDepartment}. The probation timer is cancelled.`
                  : `${confirmModal.record.firstName} ${confirmModal.record.lastName} will be reverted to Staff. The promotion is cancelled and logged.`}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    confirmModal.action === "fast_track"
                      ? handleFastTrack(confirmModal.record)
                      : handleVeto(confirmModal.record)
                  }
                  disabled={!!acting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium text-white disabled:opacity-50 ${
                    confirmModal.action === "fast_track"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {acting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : confirmModal.action === "fast_track" ? (
                    <><CheckCircle className="h-4 w-4" /> Confirm Fast-Track</>
                  ) : (
                    <><X className="h-4 w-4" /> Confirm Veto</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
