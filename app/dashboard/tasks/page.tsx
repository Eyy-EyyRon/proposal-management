"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { TaskCard } from "@/components/task-card";
import { AssignTaskModal } from "@/components/assign-task-modal";
import { VerifyTaskModal } from "@/components/verify-task-modal";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToAdminTasks,
  subscribeToDeptAdminTasks,
  subscribeToStaffTasks,
  submitTaskForReview,
  type ProposalTask,
} from "@/lib/firestore";
import { toast } from "@/components/providers/toast";
import {
  Loader2, Inbox, UserPlus, CheckCircle, Send, AlertTriangle,
} from "lucide-react";

export default function TasksPage() {
  const { user, profile } = useAuth();
  const { isAdmin, isCeo, isStaff } = useRole();
  const [tasks, setTasks] = useState<ProposalTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [assignModal, setAssignModal] = useState<{ task: ProposalTask; level: "deptAdmin" | "staff" } | null>(null);
  const [verifyModal, setVerifyModal] = useState<ProposalTask | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    // Admin: sees tasks assigned to them as adminId or deptAdminId
    if (isAdmin) {
      const unsub1 = subscribeToAdminTasks(uid, (adminTasks) => {
        setTasks((prev) => {
          // Merge with dept admin tasks
          const ids = new Set(adminTasks.map((t) => t.id));
          const kept = prev.filter((t) => !ids.has(t.id));
          return [...adminTasks, ...kept];
        });
        setLoading(false);
      });
      const unsub2 = subscribeToDeptAdminTasks(uid, (deptTasks) => {
        setTasks((prev) => {
          const deptIds = new Set(deptTasks.map((t) => t.id));
          const kept = prev.filter((t) => !deptIds.has(t.id));
          return [...kept, ...deptTasks].sort((a, b) => {
            const aMs = toDueMs(a.dueAt);
            const bMs = toDueMs(b.dueAt);
            return aMs - bMs;
          });
        });
        setLoading(false);
      });
      return () => { unsub1(); unsub2(); };
    }

    // Staff: sees tasks assigned to them
    if (isStaff) {
      const unsub = subscribeToStaffTasks(uid, (staffTasks) => {
        setTasks(staffTasks);
        setLoading(false);
      });
      return unsub;
    }

    setLoading(false);
  }, [user, isAdmin, isStaff]);

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

  const needsAssignment = useMemo(
    () => tasks.filter((t) =>
      isAdmin && t.status === "drafting" && (
        (t.adminId === user?.uid && !t.deptAdminId) ||
        (t.deptAdminId === user?.uid && !t.assigneeId)
      )
    ),
    [tasks, isAdmin, user?.uid]
  );

  const needsVerification = useMemo(
    () => tasks.filter((t) => t.status === "verifying" && (t.deptAdminId === user?.uid || t.adminId === user?.uid)),
    [tasks, user?.uid]
  );

  const otherTasks = useMemo(
    () => tasks.filter((t) =>
      !needsAssignment.some((n) => n.id === t.id) && !needsVerification.some((n) => n.id === t.id)
    ),
    [tasks, needsAssignment, needsVerification]
  );

  const renderTaskActions = (task: ProposalTask) => {
    // Admin: needs to assign
    if (isAdmin && task.status === "drafting" && task.adminId === user?.uid && !task.deptAdminId) {
      return (
        <button
          onClick={() => setAssignModal({ task, level: "deptAdmin" })}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" /> Assign Dept Admin
        </button>
      );
    }
    // Dept Admin: needs to assign staff
    if (isAdmin && task.status === "drafting" && task.deptAdminId === user?.uid && !task.assigneeId) {
      return (
        <button
          onClick={() => setAssignModal({ task, level: "staff" })}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
        >
          <UserPlus className="h-3.5 w-3.5" /> Assign Staff
        </button>
      );
    }
    // Dept Admin: needs to verify
    if (isAdmin && task.status === "verifying" && (task.deptAdminId === user?.uid || task.adminId === user?.uid)) {
      return (
        <button
          onClick={() => setVerifyModal(task)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-emerald-700 active:scale-95"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Verify & Promote
        </button>
      );
    }
    // Staff: submit for review
    if (isStaff && (task.status === "drafting" || task.status === "changes_requested") && task.assigneeId === user?.uid) {
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
    }
    return null;
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="My Tasks" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div>
          <h2 className="font-sans text-lg font-semibold text-slate-900">
            {isAdmin ? "Task Board" : "My Tasks"}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {isAdmin
              ? "Manage delegated tasks — assign to your team or verify proposals."
              : "Build drafts and submit for admin review."}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="text-[14px] font-semibold text-slate-600">No tasks assigned</p>
            <p className="text-[13px] text-slate-400">Tasks assigned to you will appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Needs Action */}
            {(needsAssignment.length > 0 || needsVerification.length > 0) && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Action Required</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    {needsAssignment.length + needsVerification.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[...needsAssignment, ...needsVerification].map((task) => (
                    <TaskCard key={task.id} task={task} actions={renderTaskActions(task)} />
                  ))}
                </div>
              </section>
            )}

            {/* Other tasks */}
            {otherTasks.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  {isStaff ? "Your Tasks" : "Other Tasks"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {otherTasks.map((task) => (
                    <TaskCard key={task.id} task={task} actions={renderTaskActions(task)} />
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

function toDueMs(dueAt: unknown): number {
  if (!dueAt) return 0;
  if (dueAt instanceof Date) return dueAt.getTime();
  if (typeof dueAt === "string") return new Date(dueAt).getTime();
  if (typeof dueAt === "object" && "seconds" in (dueAt as Record<string, unknown>)) {
    return ((dueAt as { seconds: number }).seconds ?? 0) * 1000;
  }
  return 0;
}
