"use client";

import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, Clock, User, Zap, Crown, Trash2, Loader2, AlertTriangle, X, RefreshCw, Activity } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToAllElevations,
  revokeElevation,
  callRevokeAllElevations,
  type JitElevation,
} from "@/lib/firestore";
import { toast } from "sonner";
import type { Timestamp } from "firebase/firestore";

function formatExpiry(ts: Timestamp | Date | undefined): string {
  if (!ts) return "—";
  const d = ts instanceof Date ? ts : new Date((ts as Timestamp).seconds * 1000);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${s}s`;
}

function formatRequested(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TIER_LABEL: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
  operational: { label: "Operational", icon: Zap,   color: "text-orange-700", bg: "bg-orange-100" },
  critical:    { label: "Critical",    icon: Crown, color: "text-rose-700",   bg: "bg-rose-100" },
};

export default function CeoSecurityPage() {
  const { user, profile } = useAuth();
  const [elevations, setElevations] = useState<JitElevation[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [brakeOpen, setBrakeOpen] = useState(false);
  const [brakeConfirm, setBrakeConfirm] = useState("");
  const [brakeFiring, setBrakeFiring] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeToAllElevations(setElevations);
    return unsub;
  }, []);

  // Refresh countdown display every second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const activeSessions = elevations.filter(
    (e) => e.status === "active" && e.expiresAt && new Date((e.expiresAt as Timestamp).seconds * 1000) > new Date()
  );
  const pendingSessions = elevations.filter((e) => e.status === "pending_approval");

  const handleRevokeOne = async (uid: string, actorName: string) => {
    if (!user || !profile) return;
    setRevoking(uid);
    try {
      await revokeElevation(uid, actorName, "ceo");
      toast.success(`Elevation revoked for ${actorName}.`);
    } catch {
      toast.error("Failed to revoke elevation.");
    } finally {
      setRevoking(null);
    }
  };

  const handleEmergencyBrake = async () => {
    if (brakeConfirm !== "REVOKE") return;
    setBrakeFiring(true);
    try {
      const result = await callRevokeAllElevations();
      toast.success(
        `Emergency Brake executed. ${result.revokedCount} admin(s) revoked, ${result.elevationsWiped} session(s) wiped.`,
        { duration: 8000 }
      );
      setBrakeOpen(false);
      setBrakeConfirm("");
    } catch (err) {
      toast.error("Emergency Brake failed. Check console.");
      console.error(err);
    } finally {
      setBrakeFiring(false);
    }
  };

  const actorName = profile ? `${profile.firstName} ${profile.lastName}` : "CEO";

  return (
    <>
      <Topbar title="Security Monitor" />

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 shadow-md shadow-rose-200">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">JIT Security Monitor</h1>
                <p className="text-[12px] text-slate-400">
                  {activeSessions.length} active · {pendingSessions.length} pending
                </p>
              </div>
            </div>

            {/* Emergency Brake */}
            <button
              onClick={() => setBrakeOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
            >
              <ShieldAlert className="h-4 w-4" />
              Emergency Brake
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active Sessions", value: activeSessions.length, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
              { label: "Pending Approval", value: pendingSessions.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
              { label: "Total Elevations", value: elevations.length, icon: ShieldCheck, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} px-5 py-4`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-[12px] font-semibold text-slate-500">{label}</span>
                </div>
                <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Active sessions */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Active Sessions
            </h2>

            {activeSessions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
                <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                <p className="text-[13px] font-medium text-slate-400">No active elevation sessions</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {activeSessions.map((e) => {
                  const tierCfg = TIER_LABEL[e.tier ?? "operational"] ?? TIER_LABEL.operational;
                  const TierIcon = tierCfg.icon;
                  return (
                    <div key={e.uid} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-slate-900">{e.actorName}</p>
                          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tierCfg.bg} ${tierCfg.color}`}>
                            <TierIcon className="h-2.5 w-2.5" />
                            {tierCfg.label}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                          {e.justification}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Requested: {formatRequested(e.requestedAt as Timestamp)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] font-semibold text-slate-700">
                          {formatExpiry(e.expiresAt as Timestamp)}
                        </p>
                        <p className="text-[10px] text-slate-400">remaining</p>
                      </div>
                      <button
                        onClick={() => handleRevokeOne(e.uid, e.actorName)}
                        disabled={revoking === e.uid}
                        className="ml-2 flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {revoking === e.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Revoke
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending approvals */}
          {pendingSessions.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-slate-400">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Pending CEO Approval
              </h2>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
                {pendingSessions.map((e) => (
                  <div key={e.uid} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                      <Crown className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-900">{e.actorName}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{e.justification}</p>
                      <p className="text-[10px] text-slate-400">Requested: {formatRequested(e.requestedAt as Timestamp)}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeOne(e.uid, e.actorName)}
                      disabled={revoking === e.uid}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {revoking === e.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty all-clear */}
          {elevations.length === 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-[15px] font-semibold text-emerald-800">All Clear</p>
              <p className="mt-1 text-[12px] text-emerald-600">No elevation sessions are currently active.</p>
            </div>
          )}

        </div>
      </div>

      {/* Emergency Brake Modal */}
      {brakeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !brakeFiring && setBrakeOpen(false)}>
          <div className="relative w-full max-w-md rounded-2xl border-2 border-rose-400 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <ShieldAlert className="h-5 w-5 text-rose-700" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-rose-700">Emergency Brake</p>
                <p className="text-[11px] text-slate-500">Nuclear option — irreversible</p>
              </div>
              {!brakeFiring && (
                <button onClick={() => setBrakeOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                  <ul className="space-y-1 text-[12px] font-medium text-rose-800">
                    <li>• Revokes Firebase Auth tokens for <strong>all Super Admins</strong></li>
                    <li>• Forces immediate logout on all their browsers</li>
                    <li>• Deletes every active elevation session</li>
                    <li>• This action is <strong>instant and irreversible</strong></li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700">
                  Type <strong>REVOKE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={brakeConfirm}
                  onChange={(e) => setBrakeConfirm(e.target.value)}
                  placeholder="REVOKE"
                  disabled={brakeFiring}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-[14px] font-bold tracking-widest text-rose-700 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-300/40 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => { setBrakeOpen(false); setBrakeConfirm(""); }}
                disabled={brakeFiring}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                onClick={handleEmergencyBrake}
                disabled={brakeFiring || brakeConfirm !== "REVOKE"}
                className="flex items-center gap-2 rounded-lg bg-rose-700 px-5 py-2 text-[13px] font-bold text-white shadow-md transition hover:bg-rose-800 disabled:opacity-50 active:scale-95"
              >
                {brakeFiring ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Executing…</>
                ) : (
                  <><ShieldAlert className="h-4 w-4" /> Execute Emergency Brake</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
