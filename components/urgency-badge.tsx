"use client";

import { URGENCY_META, type UrgencyLevel } from "@/lib/firestore";

interface UrgencyBadgeProps {
  urgency: UrgencyLevel;
  className?: string;
}

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  const meta = URGENCY_META[urgency];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${meta.bg} ${meta.color} ${meta.ring} ${
        urgency === "p1" ? "animate-pulse" : ""
      } ${className ?? ""}`}
    >
      {urgency === "p1" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
      {urgency === "p2" && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
      {meta.label.toUpperCase()}
    </span>
  );
}
