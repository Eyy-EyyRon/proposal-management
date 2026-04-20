"use client";

import Link from "next/link";
import { ArrowRight, User, Building2, FileText } from "lucide-react";
import { UrgencyBadge } from "./urgency-badge";
import { SlaCountdown, type DueAtValue } from "./sla-countdown";
import { DepartmentBadge } from "./department-badge";
import type { ProposalTask, TaskStatus } from "@/lib/firestore";

const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  drafting:           { label: "Drafting",           color: "text-slate-600",  bg: "bg-slate-100" },
  verifying:          { label: "Under Review",       color: "text-blue-700",   bg: "bg-blue-50" },
  changes_requested:  { label: "Changes Requested",  color: "text-amber-700",  bg: "bg-amber-50" },
  revision_requested: { label: "Revision Requested", color: "text-amber-800",  bg: "bg-amber-100" },
  ready_to_send:      { label: "Ready to Send",      color: "text-emerald-700",bg: "bg-emerald-50" },
  sent:               { label: "Sent",               color: "text-indigo-700", bg: "bg-indigo-50" },
  cancelled:          { label: "Cancelled",          color: "text-slate-400",  bg: "bg-slate-50" },
};

interface TaskCardProps {
  task: ProposalTask;
  showActions?: boolean;
  actions?: React.ReactNode;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function TaskCard({ task, actions }: TaskCardProps) {
  const isP1 = task.urgency === "p1";

  return (
    <div
      className={`group rounded-xl border p-4 transition-all ${
        isP1
          ? "border-rose-200/80 bg-gradient-to-r from-rose-50/60 to-white shadow-[0_0_12px_rgba(244,63,94,0.08)] hover:shadow-[0_0_20px_rgba(244,63,94,0.14)]"
          : task.urgency === "p2"
          ? "border-orange-200/60 bg-white hover:border-orange-300"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      {/* Top Row: urgency + status + SLA */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <UrgencyBadge urgency={task.urgency} />
        <TaskStatusBadge status={task.status} />
        {task.status !== "sent" && task.status !== "cancelled" && (
          <SlaCountdown dueAt={task.dueAt as DueAtValue} urgency={task.urgency} compact />
        )}
        <DepartmentBadge department={task.department} />
      </div>

      {/* Client & brief */}
      <div className="mb-2">
        <p className="text-[14px] font-semibold text-slate-800">{task.clientName}</p>
        {task.clientEmail && <p className="text-[12px] text-slate-400">{task.clientEmail}</p>}
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600 line-clamp-2">{task.briefDescription}</p>
      </div>

      {/* Chain visualization */}
      <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-wrap mb-3">
        <span className="font-medium text-slate-500">{task.requesterName}</span>
        {task.adminName && (
          <>
            <ArrowRight className="h-3 w-3" />
            <span>{task.adminName}</span>
          </>
        )}
        {task.deptAdminName && (
          <>
            <ArrowRight className="h-3 w-3" />
            <span>{task.deptAdminName}</span>
          </>
        )}
        {task.assigneeName && (
          <>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">{task.assigneeName}</span>
          </>
        )}
      </div>

      {/* Verification note */}
      {task.verificationNote && task.status === "revision_requested" && (
        <div className="mb-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-[12px] text-amber-700">
          <span className="font-semibold">Revision needed:</span> {task.verificationNote}
        </div>
      )}

      {/* Template + linked proposal */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        {task.templateName && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {task.templateName}
          </span>
        )}
        {task.proposalId && (
          <Link
            href={`/dashboard/proposals/${task.proposalId}`}
            className="flex items-center gap-1 text-violet-500 hover:underline"
          >
            <FileText className="h-3 w-3" /> View Proposal
          </Link>
        )}
      </div>

      {/* Action bar */}
      {actions && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          {actions}
        </div>
      )}
    </div>
  );
}
