"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, Flag, Minus, Loader2, ChevronDown, type LucideIcon } from "lucide-react";
import { updateTaskUrgency, URGENCY_META, type UrgencyLevel, type ProposalTask } from "@/lib/firestore";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/components/providers/toast";

interface UrgencyEditorProps {
  task: ProposalTask;
  disabled?: boolean;
}

const ICONS: Record<UrgencyLevel, LucideIcon> = { p1: Zap, p2: Flag, p3: Minus };

export function UrgencyEditor({ task, disabled }: UrgencyEditorProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (level: UrgencyLevel) => {
    if (!user || !profile || level === task.urgency) { setOpen(false); return; }
    const actorName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    setSaving(true);
    setOpen(false);
    try {
      await updateTaskUrgency(task.id, user.uid, actorName, level);
      toast.success(
        level === "p1"
          ? "⚡ Escalated to Critical — CEO notified."
          : `Urgency updated to ${URGENCY_META[level].label}.`
      );
    } catch {
      toast.error("Failed to update urgency.");
    } finally {
      setSaving(false);
    }
  };

  const cur = URGENCY_META[task.urgency];
  const CurIcon = ICONS[task.urgency];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${cur.bg} ${cur.color} ${!disabled && !saving ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
        title="Click to change urgency"
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CurIcon className="h-3 w-3" />
        )}
        {cur.label}
        {!disabled && !saving && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {(["p1", "p2", "p3"] as UrgencyLevel[]).map((level) => {
            const m = URGENCY_META[level];
            const Icon = ICONS[level];
            const active = task.urgency === level;
            return (
              <button
                key={level}
                onClick={() => handleSelect(level)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-[12px] font-medium transition hover:bg-slate-50 ${active ? `${m.bg} ${m.color}` : "text-slate-700"}`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? m.color : "text-slate-400"}`} />
                <div className="flex flex-col items-start leading-none">
                  <span>{m.label}</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {level === "p1" ? "2h SLA" : level === "p2" ? "24h SLA" : "72h SLA"}
                  </span>
                </div>
                {active && <span className="ml-auto text-[10px] text-slate-400">current</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
