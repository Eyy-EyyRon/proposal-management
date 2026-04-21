"use client";

import { useEffect, useState, useMemo } from "react";
import { Topbar } from "@/components/topbar";
import { Breadcrumb } from "@/components/breadcrumb";
import { TaskCard } from "@/components/task-card";
import { CreateTaskModal } from "@/components/create-task-modal";
import { CeoPushBackModal } from "@/components/ceo-pushback-modal";
import { useAuth } from "@/contexts/auth-context";
import {
  subscribeToReadyToSendTasks,
  subscribeToAllActiveTasks,
  subscribeToSentTasksForCeo,
  markTaskSent,
  cancelTask,
  type ProposalTask,
} from "@/lib/firestore";
import { toast } from "@/components/providers/toast";
import { ConfirmModal, useConfirmModal } from "@/components/ui/confirm-modal";
import {
  Send, Plus, Loader2, Inbox, Eye, XCircle, RefreshCw,
  MessageSquare, Clock, CheckCircle,
} from "lucide-react";

type ViewFilter = "ready" | "sent" | "in_progress" | "all";

export default function CeoTasksPage() {
  const { user, profile } = useAuth();
  const [readyTasks, setReadyTasks] = useState<ProposalTask[]>([]);
  const [sentTasks, setSentTasks] = useState<ProposalTask[]>([]);
  const [allTasks, setAllTasks] = useState<ProposalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pushBackTask, setPushBackTask] = useState<ProposalTask | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("ready");
  const { confirm, modalProps } = useConfirmModal();

  useEffect(() => {
    const unsub1 = subscribeToReadyToSendTasks((tasks) => {
      setReadyTasks(tasks);
      setLoading(false);
    });
    const unsub2 = subscribeToAllActiveTasks(setAllTasks);
    const unsub3 = subscribeToSentTasksForCeo(setSentTasks);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const inProgressTasks = useMemo(
    () => allTasks.filter((t) => t.status !== "ready_to_send"),
    [allTasks]
  );

  const displayTasks = useMemo(() => {
    if (viewFilter === "ready")       return readyTasks;
    if (viewFilter === "sent")        return sentTasks;
    if (viewFilter === "in_progress") return inProgressTasks;
    return allTasks;
  }, [viewFilter, readyTasks, sentTasks, inProgressTasks, allTasks]);

  const handleSend = async (task: ProposalTask) => {
    if (!user) return;
    const ok = await confirm({
      title: "Mark as Sent?",
      description: `This marks the proposal for "${task.clientName}" as sent to the client. The task moves to your Sent log.`,
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
      description: `This will cancel the task for "${task.clientName}". The linked proposal remains but the task workflow ends.`,
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

  // ── Pipeline overview counts ──────────────────────────────
  const pipelineCounts = useMemo(() => ({
    drafting:      allTasks.filter((t) => t.status === "drafting").length,
    verifying:     allTasks.filter((t) => t.status === "verifying").length,
    revision:      allTasks.filter((t) => t.status === "revision_requested" || t.status === "changes_requested").length,
    ready:         readyTasks.length,
    sent:          sentTasks.length,
  }), [allTasks, readyTasks, sentTasks]);

  const FILTERS: { key: ViewFilter; label: string; count: number; activeColor: string }[] = [
    { key: "ready",       label: "Talking Inbox",  count: readyTasks.length,    activeColor: "bg-emerald-100 text-emerald-700" },
    { key: "sent",        label: "Sent",            count: sentTasks.length,     activeColor: "bg-indigo-100 text-indigo-700" },
    { key: "in_progress", label: "In Progress",     count: inProgressTasks.length, activeColor: "bg-slate-100 text-slate-600" },
    { key: "all",         label: "All",             count: allTasks.length,      activeColor: "bg-slate-100 text-slate-600" },
  ];

  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Task Center" />

      <div className="flex flex-1 flex-col gap-5 p-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Breadcrumb />
            <h2 className="font-sans text-lg font-semibold text-slate-900">Task Center</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Delegate, track, and manage all proposal tasks. Urgent items are pinned at the top.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/50 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setViewFilter(f.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                    viewFilter === f.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      viewFilter === f.key ? f.activeColor : "bg-slate-100 text-slate-400"
                    }`}>{f.count}</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-violet-700 active:scale-95"
            >
              <Plus className="h-4 w-4" /> New Task
            </button>
          </div>
        </div>

        {/* ── Pipeline Overview Bar ── */}
        {!loading && (allTasks.length > 0 || sentTasks.length > 0) && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: "Drafting",    count: pipelineCounts.drafting,  color: "text-slate-600",   bg: "bg-slate-50",    Icon: Clock },
              { label: "In Review",  count: pipelineCounts.verifying,  color: "text-blue-700",    bg: "bg-blue-50",     Icon: CheckCircle },
              { label: "Revision",   count: pipelineCounts.revision,   color: "text-amber-700",   bg: "bg-amber-50",    Icon: RefreshCw },
              { label: "Ready",      count: pipelineCounts.ready,      color: "text-emerald-700", bg: "bg-emerald-50",  Icon: MessageSquare },
              { label: "Sent",       count: pipelineCounts.sent,       color: "text-indigo-700",  bg: "bg-indigo-50",   Icon: Send },
            ].map(({ label, count, color, bg, Icon }) => (
              <div key={label} className={`flex items-center gap-2 rounded-xl px-4 py-3 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
                <div>
                  <p className={`text-[20px] font-bold leading-none ${color}`}>{count}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Task Grid ── */}
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
              {viewFilter === "ready" ? "No proposals in your Talking Inbox" :
               viewFilter === "sent"  ? "No sent proposals yet" :
               "No active tasks"}
            </p>
            <p className="max-w-xs text-center text-[13px] text-slate-400">
              {viewFilter === "ready"
                ? "Once a dept admin verifies a proposal, it lands here for your talking phase."
                : viewFilter === "sent"
                ? "Sent proposals appear here. If a client requests changes, push them back to staff."
                : "Create a task to start the delegation chain."}
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
                        Initiate Client Discussion
                      </button>
                    )}
                    {task.status === "sent" && (
                      <button
                        onClick={() => setPushBackTask(task)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700 transition hover:bg-amber-100 active:scale-95"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Request Revision
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
      {pushBackTask && (
        <CeoPushBackModal
          task={pushBackTask}
          isOpen
          onClose={() => setPushBackTask(null)}
        />
      )}
    </main>
  );
}
