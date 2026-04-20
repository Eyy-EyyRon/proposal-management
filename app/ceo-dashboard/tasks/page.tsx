"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { TaskCard, TaskStatusBadge } from "@/components/task-card";
import { UrgencyBadge } from "@/components/urgency-badge";
import { CreateTaskModal } from "@/components/create-task-modal";
import { useAuth, useRole } from "@/contexts/auth-context";
import {
  subscribeToReadyToSendTasks,
  subscribeToAllActiveTasks,
  markTaskSent,
  cancelTask,
  type ProposalTask,
} from "@/lib/firestore";
import { toast } from "@/components/providers/toast";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import {
  Send, Plus, Loader2, Inbox, ChevronDown, ChevronRight,
  Filter, Eye, XCircle,
} from "lucide-react";

type ViewFilter = "ready" | "in_progress" | "all";

export default function CeoTasksPage() {
  const { user, profile } = useAuth();
  const { isCeo } = useRole();
  const [readyTasks, setReadyTasks] = useState<ProposalTask[]>([]);
  const [allTasks, setAllTasks] = useState<ProposalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("ready");
  const [showInProgress, setShowInProgress] = useState(false);
  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    const unsub1 = subscribeToReadyToSendTasks((tasks) => {
      setReadyTasks(tasks);
      setLoading(false);
    });
    const unsub2 = subscribeToAllActiveTasks(setAllTasks);
    return () => { unsub1(); unsub2(); };
  }, []);

  const inProgressTasks = useMemo(
    () => allTasks.filter((t) => t.status !== "ready_to_send"),
    [allTasks]
  );

  const displayTasks = useMemo(() => {
    if (viewFilter === "ready") return readyTasks;
    if (viewFilter === "in_progress") return inProgressTasks;
    return allTasks;
  }, [viewFilter, readyTasks, inProgressTasks, allTasks]);

  const handleSend = async (task: ProposalTask) => {
    if (!user) return;
    const ok = await confirm({
      title: "Send This Proposal?",
      description: `Mark the proposal for "${task.clientName}" as Sent. This means you've completed the talking phase.`,
      actionType: "primary",
      confirmText: "Mark as Sent",
    });
    if (!ok) return;
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    setSendingId(task.id);
    try {
      await markTaskSent(task.id, user.uid, name);
      toast.success(`"${task.clientName}" marked as sent.`);
    } catch {
      toast.error("Failed to update task.");
    } finally {
      setSendingId(null);
    }
  };

  const handleCancel = async (task: ProposalTask) => {
    if (!user) return;
    const ok = await confirm({
      title: "Cancel Task?",
      description: `This will cancel the task for "${task.clientName}". The linked proposal (if any) will remain but the task workflow will end.`,
      actionType: "danger",
      confirmText: "Cancel Task",
    });
    if (!ok) return;
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();
    try {
      await cancelTask(task.id, user.uid, name);
      toast.success("Task cancelled.");
    } catch {
      toast.error("Failed to cancel task.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Task Center" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">Task Center</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Manage delegated proposals — only verified items appear in your Talking Inbox.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Filter */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-0.5">
              {([
                { key: "ready" as ViewFilter, label: "Talking Inbox", count: readyTasks.length },
                { key: "in_progress" as ViewFilter, label: "In Progress", count: inProgressTasks.length },
                { key: "all" as ViewFilter, label: "All Tasks", count: allTasks.length },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setViewFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
                    viewFilter === f.key
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      viewFilter === f.key
                        ? f.key === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <Inbox className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-[14px] font-semibold text-slate-600">
              {viewFilter === "ready" ? "No proposals waiting for you" : "No active tasks"}
            </p>
            <p className="max-w-xs text-center text-[13px] text-slate-400">
              {viewFilter === "ready"
                ? "Once department admins verify proposals, they'll appear here."
                : "Create a new task to start the delegation workflow."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                actions={
                  <>
                    {task.status === "ready_to_send" && (
                      <button
                        onClick={() => handleSend(task)}
                        disabled={sendingId === task.id}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                      >
                        {sendingId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Mark as Sent
                      </button>
                    )}
                    {task.proposalId && (
                      <a
                        href={`/ceo-dashboard/proposals/${task.proposalId}`}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </a>
                    )}
                    {task.status !== "sent" && task.status !== "cancelled" && (
                      <button
                        onClick={() => handleCancel(task)}
                        className="ml-auto flex items-center gap-1 rounded-lg px-2 py-2 text-[12px] text-slate-400 transition hover:text-rose-500"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <ConfirmModal {...modalProps} />
    </main>
  );
}
