"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Crown, Search, Check, X, Loader2,
  ShieldCheck, UserMinus, Clock, AlertTriangle,
} from "lucide-react";
import {
  subscribeToAllUsers,
  appointSuperAdmin,
  revokeSuperAdmin,
  subscribeToPromotionLogs,
  type TeamMember,
  type PromotionLog,
} from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

// ── Beam canvas animation ─────────────────────────────────────
function VanguardBeam({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t;
        const r = 80 + Math.sin(t * 3 + i) * 20;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 40);
        grad.addColorStop(0, `rgba(251,191,36,${0.6 + Math.sin(t + i) * 0.3})`);
        grad.addColorStop(1, "rgba(251,191,36,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      // Central core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      core.addColorStop(0, `rgba(251,191,36,${0.8 + Math.sin(t * 2) * 0.2})`);
      core.addColorStop(0.5, "rgba(217,119,6,0.4)");
      core.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fill();

      t += 0.025;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
    />
  );
}

function formatTs(ts: unknown): string {
  if (!ts) return "—";
  const s = (ts as { seconds: number }).seconds;
  return new Date(s * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SecurityCouncil() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [logs, setLogs] = useState<PromotionLog[]>([]);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [beamTarget, setBeamTarget] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    user: TeamMember; action: "appoint" | "revoke";
  } | null>(null);

  useEffect(() => {
    if (profile?.role !== "ceo") return;
    const u1 = subscribeToAllUsers(setUsers);
    const u2 = subscribeToPromotionLogs(setLogs, 20);
    return () => { u1(); u2(); };
  }, [profile?.role]);

  const ceoName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "CEO";

  // Eligible: not CEO, not self
  const eligible = users.filter((u) =>
    u.role !== "ceo" && u.id !== user?.uid &&
    (u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
     u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const superAdmins = eligible.filter((u) => u.role === "super_admin");
  const candidates = eligible.filter((u) => u.role !== "super_admin");

  const handleAppoint = async (target: TeamMember) => {
    if (!user) return;
    setActing(target.id);
    setBeamTarget(target.id);
    try {
      const name = `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim();
      await appointSuperAdmin(target.id, user.uid, ceoName, name);
      toast.success(`${name} appointed to Vanguard (Super Admin).`);
      setTimeout(() => setBeamTarget(null), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to appoint.");
      setBeamTarget(null);
    } finally {
      setActing(null);
      setConfirmModal(null);
    }
  };

  const handleRevoke = async (target: TeamMember) => {
    if (!user) return;
    setActing(target.id);
    try {
      const name = `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim();
      await revokeSuperAdmin(target.id, user.uid, ceoName, name);
      toast.success(`Super Admin revoked from ${name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke.");
    } finally {
      setActing(null);
      setConfirmModal(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Crown className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-amber-900">Security Council — Vanguard Appointment</h3>
          <p className="text-[12px] text-amber-700/80">
            Only you can appoint or revoke Super Admin access. This action is permanent and logged.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users to appoint…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
      </div>

      {/* Active Vanguard */}
      {superAdmins.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-violet-600">
            Active Vanguard ({superAdmins.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {superAdmins.map((u) => {
              const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
              return (
                <motion.div
                  key={u.id}
                  layout
                  className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 p-3"
                >
                  <VanguardBeam active={beamTarget === u.id} />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[12px] font-bold text-violet-700">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{name}</p>
                    <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                    <ShieldCheck className="h-3 w-3" /> Vanguard
                  </span>
                  <button
                    onClick={() => setConfirmModal({ user: u, action: "revoke" })}
                    disabled={acting === u.id}
                    className="ml-1 flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    {acting === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                    Revoke
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidates */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Appoint to Vanguard
        </p>
        {candidates.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate-400">No candidates match your search.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.map((u) => {
              const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
              return (
                <motion.div
                  key={u.id}
                  layout
                  className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 transition hover:border-amber-300 hover:bg-amber-50/30"
                >
                  <VanguardBeam active={beamTarget === u.id} />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">{name}</p>
                    <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                    <span className="text-[10px] capitalize text-slate-400">{u.role}</span>
                  </div>
                  <button
                    onClick={() => setConfirmModal({ user: u, action: "appoint" })}
                    disabled={acting === u.id}
                    className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    {acting === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                    Appoint
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promotion log */}
      {logs.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Appointment Log
          </p>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-slate-700">{log.note}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatTs(log.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  log.action === "appoint_super_admin"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-rose-50 text-rose-600"
                }`}>
                  {log.action === "appoint_super_admin" ? "Appointed" : "Revoked"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                confirmModal.action === "appoint" ? "bg-amber-100" : "bg-rose-100"
              }`}>
                {confirmModal.action === "appoint"
                  ? <Crown className="h-6 w-6 text-amber-600" />
                  : <AlertTriangle className="h-6 w-6 text-rose-500" />}
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">
                {confirmModal.action === "appoint" ? "Appoint to Vanguard?" : "Revoke Vanguard Access?"}
              </h3>
              <p className="mt-1.5 text-[13px] text-slate-500">
                {confirmModal.action === "appoint"
                  ? `${confirmModal.user.firstName} ${confirmModal.user.lastName} will gain Super Admin access and be able to manage personnel when JIT-elevated.`
                  : `${confirmModal.user.firstName} ${confirmModal.user.lastName} will lose Super Admin access immediately. This is logged and irreversible without re-appointment.`}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmModal.action === "appoint"
                    ? handleAppoint(confirmModal.user)
                    : handleRevoke(confirmModal.user)
                  }
                  disabled={!!acting}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium text-white transition disabled:opacity-50 ${
                    confirmModal.action === "appoint"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {confirmModal.action === "appoint" ? "Confirm Appointment" : "Confirm Revocation"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
