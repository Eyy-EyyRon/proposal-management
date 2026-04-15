"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  variant?: "default" | "highlight" | "success" | "warning";
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  description,
  variant = "default",
}: AdminStatCardProps) {
  const variantStyles = {
    default: {
      iconBg: "bg-[#800000]/10",
      iconColor: "text-[#800000]",
      bar: "bg-[#800000]",
    },
    highlight: {
      iconBg: "bg-[#800000]/15",
      iconColor: "text-[#800000]",
      bar: "bg-[#800000]",
    },
    success: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    warning: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      bar: "bg-amber-500",
    },
  };

  const styles = variantStyles[variant];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-all duration-200",
        "hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-slate-300"
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          styles.bar
        )}
      />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              styles.iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                trendUp
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              {trend}
            </span>
          )}
        </div>
        <p className="mt-4 font-sans text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-[14px] font-medium text-slate-700">{label}</p>
        {description && (
          <p className="mt-1 text-[12px] text-slate-400">{description}</p>
        )}
      </div>
    </article>
  );
}
