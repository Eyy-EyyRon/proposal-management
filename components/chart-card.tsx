import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, children, className = "" }: ChartCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[12px] text-slate-400">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="px-2 pb-4">{children}</div>
    </div>
  );
}
