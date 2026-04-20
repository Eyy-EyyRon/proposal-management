"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

export type DueAtValue = Date | string | { seconds: number } | null | undefined;

interface SlaCountdownProps {
  dueAt: DueAtValue;
  urgency: "p1" | "p2" | "p3";
  compact?: boolean;
}

function toDueMs(dueAt: DueAtValue): number {
  if (!dueAt) return 0;
  if (dueAt instanceof Date) return dueAt.getTime();
  if (typeof dueAt === "string") return new Date(dueAt).getTime();
  if (typeof dueAt === "object" && "seconds" in (dueAt as Record<string, unknown>)) {
    return ((dueAt as { seconds: number }).seconds ?? 0) * 1000;
  }
  return 0;
}

export function SlaCountdown({ dueAt, urgency, compact }: SlaCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dueMs = toDueMs(dueAt);
  const remaining = dueMs - now;
  const isOverdue = remaining <= 0;
  const isWarning = !isOverdue && remaining < 30 * 60 * 1000; // <30min

  const abs = Math.abs(remaining);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const seconds = Math.floor((abs % 60_000) / 1000);

  const label = isOverdue
    ? `OVERDUE by ${hours > 0 ? `${hours}h ` : ""}${minutes}m`
    : `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${compact ? "" : `${seconds}s`} remaining`;

  const colorMap = {
    overdue: "text-rose-600 bg-rose-50 ring-rose-300",
    warning: "text-amber-600 bg-amber-50 ring-amber-300",
    p1: "text-rose-600 bg-rose-50/60 ring-rose-200",
    p2: "text-orange-600 bg-orange-50/60 ring-orange-200",
    p3: "text-slate-500 bg-slate-50 ring-slate-200",
  };

  const colorKey = isOverdue ? "overdue" : isWarning ? "warning" : urgency;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${colorMap[colorKey]} ${
        isOverdue && urgency === "p1" ? "animate-pulse" : ""
      }`}
    >
      {isOverdue ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}
