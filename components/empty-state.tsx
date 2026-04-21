import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  gradient?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  gradient = "from-violet-500/10 via-indigo-500/5 to-sky-500/10",
}: EmptyStateProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br ${gradient} p-px`}>
      <div className="relative rounded-[15px] bg-white/80 backdrop-blur-xl">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-violet-200/40 to-indigo-200/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-sky-200/30 to-emerald-200/10 blur-2xl" />

        <div className="relative flex flex-col items-center px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm ring-1 ring-indigo-100/50">
            <Icon className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="mt-5 text-[15px] font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500">
            {description}
          </p>
          {actionLabel && actionHref && (
            <Link
              href={actionHref}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-slate-900/20 transition hover:shadow-xl hover:shadow-slate-900/30"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
