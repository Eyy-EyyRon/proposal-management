"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Topbar } from "@/components/topbar";
import { TaskCard } from "@/components/task-card";
import { AssignTaskModal } from "@/components/assign-task-modal";
import { VerifyTaskModal } from "@/components/verify-task-modal";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToAdminTasks,
  subscribeToDeptAdminTasks,
  subscribeToDeptScopedTasks,
  subscribeToSuperAdminTasks,
  subscribeToVerificationQueueSuperAdmin,
  subscribeToStaffTasks,
  subscribeToVerificationQueue,
  submitTaskForReview,
  type ProposalTask,
} from "@/lib/firestore";
import { toast } from "@/components/providers/toast";
import {
  Loader2, Inbox, UserPlus, CheckCircle, Send, AlertTriangle,
  ShieldCheck, Clock, RefreshCw, Pin, Building2,
} from "lucide-react";

function toDueMs(dueAt: unknown): number {
  if (!dueAt) return 0;
  if (dueAt instanceof Date) return dueAt.getTime();
  if (typeof dueAt === "string") return new Date(dueAt).getTime();
  if (typeof dueAt === "object" && "seconds" in (dueAt as Record<string, unknown>)) {
    return ((dueAt as { seconds: number }).seconds ?? 0) * 1000;
  }
  return 0;
}

export default function TasksPage() {
  const { user, profile } = useAuth();
  const { isAdmin, isStaff, isSuperAdmin } = useRole();
  const [tasks, setTasks] = useState<ProposalTask[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<ProposalTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [assignModal, setAssignModal] = useState<{ task: ProposalTask; level: "deptAdmin" | "staff" } | null>(null);
  const [verifyModal, setVerifyModal] = useState<ProposalTask | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // SLA breach toast refs (prevent duplicate toasts)
  const warnedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    if (isSuperAdmin) {
      const unsub1 = subscribeToSuperAdminTasks((data) => {
        setTasks(data);
        setLoading(false);
      });
      const unsub2 = subscribeToVerificationQueueSuperAdmin((q) => {
        setVerificationQueue(q);
      });
      return () => { unsub1(); unsub2(); };
    }

    if (isAdmin) {
      const dept = profile?.department ?? "";

      // Tasks where this admin is the top-level handler (CEO assigned to them)
      const unsub1 = subscribeToAdminTasks(uid, (adminTasks) => {
        setTasks((prev) => {
          const ids = new Set(adminTasks.map((t) => t.id));
          return [...adminTasks, ...prev.filter((t) => !ids.has(t.id))];
        });
        setLoading(false);
      });

      // Tasks where this admin is the dept admin handler
      const unsub2 = dept
        ? subscribeToDeptScopedTasks(uid, dept, (deptTasks) => {
            setTasks((prev) => {
              const deptIds = new Set(deptTasks.map((t) => t.id));
              return [...prev.filter((t) => !deptIds.has(t.id)), ...deptTasks].sort(
                (a, b) => toDueMs(a.dueAt) - toDueMs(b.dueAt)
              );
            });
            setLoading(false);
          })
        : subscribeToDeptAdminTasks(uid, (deptTasks) => {
            setTasks((prev) => {
              const deptIds = new Set(deptTasks.map((t) => t.id));
              return [...prev.filter((t) => !deptIds.has(t.id)), ...deptTasks].sort(
                (a, b) => toDueMs(a.dueAt) - toDueMs(b.dueAt)
              );
            });
            setLoading(false);
          });

      // Dept-scoped verification queue
      const unsub3 = subscribeToVerificationQueue(uid, dept, (q) => {
        setVerificationQueue(q);
      });
      return () => { unsub1(); unsub2(); unsub3(); };
    }

    if (isStaff) {
      const unsub = subscribeToStaffTasks(uid, (staffTasks) => {
        setTasks(staffTasks);
        setLoading(false);
      });
      return unsub;
    }

    setLoading(false);
  }, [user, isSuperAdmin, isAdmin, isStaff, profile?.department]);

  // SLA breach watcher — toast when P1 within 30 min
  useEffect(() => {
    const allTasks = [...tasks, ...verificationQueue];
    const now = Date.now();
    allTasks.forEach((t) => {
      if (t.urgency !== "p1" || warnedIds.current.has(t.id)) return;
      const due = toDueMs(t.dueAt);
      if (due > 0 && due - now <= 30 * 60 * 1000 && due - now > 0) {
        warnedIds.current.add(t.id);
        toast.error(`⚡ P1 SLA breach in <30 min — "${t.clientName}"`);
      }
    });
  }, [tasks, verificationQueue]);

  const handleSubmitForReview = async (task: ProposalTask) => {
    if (!user || !profile) return;
    const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    setSubmittingId(task.id);
    try {
      await submitTaskForReview(task.id, user.uid, name);
      toast.success("Submitted for admin review.");
    } catch {
      toast.error("Failed to submit for review.");
    } finally {
      setSubmittingId(null);
    }
  };

  // ─── Derived sections ────────────────────────────────────────

  // P1 critical tasks (admin view): pinned to top
  const p1Critical = useMemo(
    () => tasks.filter((t) => t.urgency === "p1" && t.status !== "ready_to_send" && t.status !== "sent"),
    [tasks]
  );

  // Needs assignment (admin/super_admin): drafting with incomplete chain
  const needsAssignment = useMemo(
    () => tasks.filter((t) => {
      if (t.status !== "drafting") return false;
      if (isSuperAdmin) {
        // Super Admin sees any task missing a deptAdmin or staff assignment
        return !t.deptAdminId || !t.assigneeId;
      }
      if (isAdmin) {
        return (
          (t.adminId === user?.uid && !t.deptAdminId) ||
          (t.deptAdminId === user?.uid && !t.assigneeId)
        );
      }
      return false;
    }),
    [tasks, isSuperAdmin, isAdmin, user?.uid]
  );

  // In-progress tasks (not p1-pinned, not needing assignment, not in verif queue)
  const inProgressTasks = useMemo(
    () => tasks.filter((t) =>
      !p1Critical.some((p) => p.id === t.id) &&
      !needsAssignment.some((n) => n.id === t.id) &&
      !verificationQueue.some((v) => v.id === t.id) &&
      t.status !== "ready_to_send" && t.status !== "sent"
    ),
    [tasks, p1Critical, needsAssignment, verificationQueue]
  );

  // Revision-requested tasks (staff view)
  const revisionRequested = useMemo(
    () => tasks.filter((t) => t.status === "revision_requested" && t.assigneeId === user?.uid),
    [tasks, user?.uid]
  );

  // ─── Action renderers ────────────────────────────────────────

  const renderAdminActions = (task: ProposalTask) => {
    if (task.status !== "drafting") return null;
    // Super Admin: can assign deptAdmin or staff on any task regardless of ownership
    if (isSuperAdmin) {
      if (!task.deptAdminId) {
        return (
          <button
            onClick={() => setAssignModal({ task, level: "deptAdmin" })}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign Dept Admin
          </button>
        );
      }
      if (!task.assigneeId) {
        return (
          <button
            onClick={() => setAssignModal({ task, level: "staff" })}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign Staff
          </button>
        );
      }
      return null;
    }
    // Dept Admin: scoped to their segment of the chain
    if (task.adminId === user?.uid && !task.deptAdminId) {
      return (
        <button
          onClick={() => setAssignModal({ task, level: "deptAdmin" })}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" /> Assign Dept Admin
        </button>
      );
    }
    if (task.deptAdminId === user?.uid && !task.assigneeId) {
      return (
        <button
          onClick={() => setAssignModal({ task, level: "staff" })}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" /> Assign Staff
        </button>
      );
    }
    return null;
  };

  const renderVerifyActions = (task: ProposalTask) => (
    <button
      onClick={() => setVerifyModal(task)}
      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-emerald-700 active:scale-95"
    >
      <CheckCircle className="h-3.5 w-3.5" /> Verify & Promote
    </button>
  );

  const renderStaffActions = (task: ProposalTask) => {
    const canSubmit =
      (task.status === "drafting" || task.status === "revision_requested") &&
      task.assigneeId === user?.uid;
    if (!canSubmit) return null;
    return (
      <button
        onClick={() => handleSubmitForReview(task)}
        disabled={submittingId === task.id}
        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
      >
        {submittingId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Submit for Review
      </button>
    );
  };

  const allEmpty = tasks.length === 0 && verificationQueue.length === 0;

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title={isSuperAdmin ? "System Task Board" : isAdmin ? "Task Board" : "My Tasks"} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">
                {isSuperAdmin ? "System Task Board" : isAdmin ? "Task Board" : "My Tasks"}
              </h2>
              {isSuperAdmin && (
                <span className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Building2 className="h-3 w-3" />
                  All Departments
                </span>
              )}
              {isAdmin && !isSuperAdmin && profile?.department && (
                <span className="flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
                  <Building2 className="h-3 w-3" />
                  {profile.department} Dept
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {isSuperAdmin
                ? "System-wide oversight. Assign dept admins and staff, monitor all active tasks across departments."
                : isAdmin
                ? profile?.department
                  ? `You see tasks scoped to your department (${profile.department}). Route, verify, and escalate.`
                  : "Route, verify, and escalate delegated proposals. CEO never sees unverified work."
                : "Build drafts and submit for admin review. You cannot send directly to clients on tasked proposals."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(isAdmin || isSuperAdmin) && verificationQueue.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {verificationQueue.length} pending verification
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : allEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="text-[14px] font-semibold text-slate-600">No tasks assigned</p>
            <p className="text-[13px] text-slate-400">Tasks delegated to you will appear here.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── P1 CRITICAL PINNED SECTION ── */}
            {(isAdmin || isSuperAdmin) && p1Critical.length > 0 && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Pin className="h-4 w-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-rose-700">P1 Critical — Pinned</h3>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                    {p1Critical.length}
                  </span>
                  <span className="ml-auto text-[11px] text-rose-500">SLA breach imminent — act now</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {p1Critical.map((task) => (
                    <div key={task.id} className="relative">
                      <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-rose-400 ring-offset-1 animate-pulse" />
                      <TaskCard task={task} actions={(isAdmin || isSuperAdmin) ? renderAdminActions(task) : renderStaffActions(task)} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── VERIFICATION QUEUE (Dept Admin / Super Admin) ── */}
            {(isAdmin || isSuperAdmin) && verificationQueue.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Verification Queue</h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    {verificationQueue.length}
                  </span>
                  <span className="ml-auto text-[11px] text-slate-400">
                    {isSuperAdmin ? "All departments" : `Dept-locked · Only ${profile?.department ?? "your dept"} proposals`}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {verificationQueue.map((task) => (
                    <TaskCard key={task.id} task={task} actions={renderVerifyActions(task)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── NEEDS ASSIGNMENT (Admin / Super Admin routing) ── */}
            {(isAdmin || isSuperAdmin) && needsAssignment.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Needs Routing</h3>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                    {needsAssignment.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {needsAssignment.map((task) => (
                    <TaskCard key={task.id} task={task} actions={renderAdminActions(task)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── REVISION REQUESTED (Staff view) ── */}
            {isStaff && revisionRequested.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Revision Requested</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    {revisionRequested.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {revisionRequested.map((task) => (
                    <TaskCard key={task.id} task={task} actions={renderStaffActions(task)} />
                  ))}
                </div>
              </section>
            )}

            {/* ── IN PROGRESS ── */}
            {inProgressTasks.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">In Progress</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    {inProgressTasks.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      actions={(isAdmin || isSuperAdmin) ? renderAdminActions(task) : renderStaffActions(task)}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {assignModal && (
        <AssignTaskModal
          isOpen
          onClose={() => setAssignModal(null)}
          task={assignModal.task}
          level={assignModal.level}
        />
      )}
      {verifyModal && (
        <VerifyTaskModal
          isOpen
          onClose={() => setVerifyModal(null)}
          task={verifyModal}
        />
      )}
    </main>
  );
}
