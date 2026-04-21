"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Shield, Check,
  Loader2, ChevronDown, Lock, Clock, AlertTriangle,
  UserCheck, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  subscribeToAllUsers,
  subscribeToDepartmentsList,
  initiateProbation,
  demoteToStaff,
  subscribeToPromotionLogs,
  subscribeToAllProbations,
  type TeamMember,
  type FirestoreDepartment,
  type PromotionLog,
  type ProbationRecord,
} from "@/lib/firestore";
import { LazyProbationaryRing } from "@/components/three/lazy-three";
import { JITGuard } from "@/components/jit-guard";
import { JitElevationModal } from "@/components/jit-elevation-modal";
import { useAuth, useIsCriticallyElevated } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";
import { Topbar } from "@/components/topbar";
import { Breadcrumb } from "@/components/breadcrumb";

// ── GSAP Promotion Beam ───────────────────────────────────────
function PromotionBeam({ active, onDone }: { active: boolean; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;
    startRef.current = null;

    const DURATION = 1800;

    const draw = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      ctx.clearRect(0, 0, W, H);

      // Ripple rings
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const phase = (progress + i / rings) % 1;
        const r = phase * (W * 0.6);
        const alpha = (1 - phase) * 0.4;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Beam particles
      const particleCount = 12;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + progress * Math.PI * 4;
        const dist = progress * W * 0.45;
        const x = W / 2 + Math.cos(angle) * dist;
        const y = H / 2 + Math.sin(angle) * dist;
        const size = 6 * (1 - progress);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, `rgba(99,102,241,${(1 - progress) * 0.9})`);
        grad.addColorStop(1, "rgba(99,102,241,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core
      const coreGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 50 * (1 - progress));
      coreGrad.addColorStop(0, `rgba(99,102,241,${(1 - progress) * 0.8})`);
      coreGrad.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 50 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();

      if (progress < 1) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
        onDone();
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, onDone]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}

// ── Department color map ──────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  sales: "teal", marketing: "pink", tech: "blue", engineering: "blue",
  legal: "purple", operations: "orange", finance: "emerald",
};
function getDeptColor(name: string): string {
  return DEPT_COLORS[name.toLowerCase()] ?? "indigo";
}

function formatTs(ts: unknown): string {
  if (!ts) return "—";
  const s = (ts as { seconds: number }).seconds;
  return new Date(s * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Main page ─────────────────────────────────────────────────
export default function PersonnelHubPage() {
  const { user, profile } = useAuth();
  const isCriticallyElevated = useIsCriticallyElevated();
  const [showElevationModal, setShowElevationModal] = useState(false);

  const [users, setUsers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [logs, setLogs] = useState<PromotionLog[]>([]);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [beamUser, setBeamUser] = useState<string | null>(null);

  const [probations, setProbations] = useState<ProbationRecord[]>([]);
  const [promotionModal, setPromotionModal] = useState<{
    user: TeamMember; action: "promote" | "demote";
  } | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [durationHours, setDurationHours] = useState<12 | 24 | 48>(24);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  const actorName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "Super Admin";

  useEffect(() => {
    if (profile?.role !== "super_admin") return;
    const u1 = subscribeToAllUsers(setUsers);
    const u2 = subscribeToDepartmentsList(setDepartments);
    const u3 = subscribeToPromotionLogs(setLogs, 20);
    const u4 = subscribeToAllProbations(setProbations);
    return () => { u1(); u2(); u3(); u4(); };
  }, [profile?.role]);

  // Tick every 10s to refresh countdown displays
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  // Peer immunity filter: exclude CEO and other super_admins
  const eligible = useMemo(() => users.filter((u) =>
    u.role !== "ceo" && u.role !== "super_admin" && u.id !== user?.uid &&
    (
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )
  ), [users, search, user?.uid]);

  const staffMembers = eligible.filter((u) => u.role === "staff");
  const deptAdmins = eligible.filter((u) => u.role === "admin");

  const openPromote = (u: TeamMember) => {
    setPromotionModal({ user: u, action: "promote" });
    setSelectedDept(departments[0]?.name ?? "");
  };
  const openDemote = (u: TeamMember) => {
    setPromotionModal({ user: u, action: "demote" });
    setSelectedDept("");
  };

  const handleConfirm = async () => {
    if (!promotionModal || !user) return;
    const target = promotionModal.user;
    const name = `${target.firstName ?? ""} ${target.lastName ?? ""}`.trim();

    if (promotionModal.action === "promote" && !selectedDept) {
      toast.error("Select a department first.");
      return;
    }

    setSaving(true);
    try {
      if (promotionModal.action === "promote") {
        const dept = departments.find((d) => d.name === selectedDept);
        await initiateProbation(target.id, user.uid, actorName, name, selectedDept, dept?.id ?? null, durationHours);
        setBeamUser(target.id);
        toast.success(`${name} entered ${durationHours}h probationary period → Dept Admin (${selectedDept}).`);
      } else {
        await demoteToStaff(target.id, user.uid, actorName, name);
        toast.success(`${name} demoted to Staff.`);
      }
      setPromotionModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSaving(false);
      setActing(null);
    }
  };

  // Probation countdown helper
  const getProbationMs = (record: ProbationRecord) => {
    const expiry = record.probationExpiry as { seconds?: number; toDate?: () => Date } | null;
    if (!expiry) return 0;
    const expiryDate = expiry.toDate ? expiry.toDate() : new Date((expiry.seconds ?? 0) * 1000);
    return Math.max(0, expiryDate.getTime() - Date.now());
  };

  const getProbationTotal = (record: ProbationRecord) =>
    (record.probationDurationHours ?? 24) * 3600 * 1000;

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "Finalizing…";
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Personnel Hub" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Breadcrumb />
            <h2 className="font-sans text-lg font-bold text-slate-900">Personnel Hub</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Initiate probationary promotions (12h/24h/48h CEO-veto window). Requires Critical JIT elevation.
            </p>
          </div>
          {!isCriticallyElevated && (
            <button
              onClick={() => setShowElevationModal(true)}
              className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-[13px] font-medium text-violet-700 transition hover:bg-violet-100"
            >
              <Lock className="h-4 w-4" /> Request HR Elevation
            </button>
          )}
        </div>

        {/* JIT elevation banner */}
        {!isCriticallyElevated && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>HR Elevation required</strong> — role changes are locked until you elevate to Critical tier.
              Click "Request HR Elevation" above.
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff members…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* Probationary Users */}
        {probations.length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-teal-600">
              In Probation — Pending CEO Approval ({probations.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {probations.map((p) => {
                const msRemaining = getProbationMs(p);
                const msTotal = getProbationTotal(p);
                const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                    <LazyProbationaryRing msRemaining={msRemaining} msTotal={msTotal} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-[11px] text-teal-700">{p.assignedDepartment}</p>
                      <p className="text-[10px] text-slate-400">{formatCountdown(msRemaining)} remaining</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Clock className="h-2.5 w-2.5" /> Probation
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dept Admins */}
        {deptAdmins.length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Dept Admins ({deptAdmins.length})
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {deptAdmins.map((u) => {
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                const deptColor = getDeptColor(u.department ?? "");
                return (
                  <motion.div
                    key={u.id}
                    layout
                    className={`relative flex items-center gap-3 overflow-hidden rounded-xl border border-${deptColor}-200 bg-${deptColor}-50/50 p-3`}
                  >
                    <PromotionBeam active={beamUser === u.id} onDone={() => setBeamUser(null)} />
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-${deptColor}-200 text-[12px] font-bold text-${deptColor}-700`}>
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-[11px] text-slate-500">{u.department ?? "—"}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      <Shield className="h-2.5 w-2.5" /> Dept Admin
                    </span>
                    <JITGuard
                      actionLabel={`Demote ${name} to Staff`}
                      requiresCritical
                      onElevationNeeded={() => setShowElevationModal(true)}
                    >
                      {({ trigger }) => (
                        <button
                          onClick={() => trigger(() => { openDemote(u); })}
                          disabled={acting === u.id}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <ArrowDown className="h-3 w-3" /> Demote
                        </button>
                      )}
                    </JITGuard>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Staff Members */}
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Staff Members ({staffMembers.length})
          </p>
          {staffMembers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-400">No staff members found.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {staffMembers.map((u) => {
                const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
                return (
                  <motion.div
                    key={u.id}
                    layout
                    className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-300 hover:bg-indigo-50/30"
                  >
                    <PromotionBeam active={beamUser === u.id} onDone={() => setBeamUser(null)} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{name}</p>
                      <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      Staff
                    </span>
                    <JITGuard
                      actionLabel={`Promote ${name} to Dept Admin`}
                      requiresCritical
                      onElevationNeeded={() => setShowElevationModal(true)}
                    >
                      {({ trigger }) => (
                        <button
                          onClick={() => trigger(() => { openPromote(u); })}
                          disabled={acting === u.id}
                          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                        >
                          <ArrowUp className="h-3 w-3" /> Promote
                        </button>
                      )}
                    </JITGuard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Audit log */}
        {logs.filter(l => l.actorRole === "super_admin").length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              My Promotion Log
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {logs.filter(l => l.actorRole === "super_admin").slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-slate-700">{log.note}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{formatTs(log.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    log.action === "promote_to_dept_admin"
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-rose-50 text-rose-600"
                  }`}>
                    {log.action === "promote_to_dept_admin" ? "Promoted" : "Demoted"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Promotion/Demotion Modal */}
      <AnimatePresence>
        {promotionModal && (
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
                promotionModal.action === "promote" ? "bg-indigo-100" : "bg-rose-100"
              }`}>
                {promotionModal.action === "promote"
                  ? <UserCheck className="h-6 w-6 text-indigo-600" />
                  : <AlertTriangle className="h-6 w-6 text-rose-500" />}
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">
                {promotionModal.action === "promote"
                  ? `Initiate Probation for ${promotionModal.user.firstName}`
                  : `Demote ${promotionModal.user.firstName} to Staff`}
              </h3>

              {promotionModal.action === "promote" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">
                      Target Department *
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-[13px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">Select department…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-500">
                      Probation Duration
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([12, 24, 48] as const).map((h) => (
                        <button
                          key={h}
                          onClick={() => setDurationHours(h)}
                          className={`rounded-lg border py-2 text-[12px] font-semibold transition ${
                            durationHours === h
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >{h}h</button>
                      ))}
                    </div>
                  </div>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    The CEO will be notified and can Fast-Track or Veto within the window. After {durationHours}h, the role activates automatically.
                  </p>
                </div>
              )}

              {promotionModal.action === "demote" && (
                <p className="mt-2 text-[13px] text-slate-500">
                  {promotionModal.user.firstName} will lose Dept Admin access and revert to Staff. They will keep their department assignment.
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setPromotionModal(null)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving || (promotionModal.action === "promote" && !selectedDept)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[13px] font-medium text-white transition disabled:opacity-50 ${
                    promotionModal.action === "promote"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <JitElevationModal isOpen={showElevationModal} onClose={() => setShowElevationModal(false)} />
    </main>
  );
}
