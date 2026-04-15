import { type LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: string;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, accent = "indigo" }: StatCardProps) {
  const accentMap: Record<string, { icon: string; bar: string }> = {
    indigo: { icon: "bg-[#780116]/10 text-[#780116]", bar: "bg-[#780116]" },
    blue:   { icon: "bg-[#DB7C26]/10 text-[#DB7C26]",  bar: "bg-[#DB7C26]" },
    green:  { icon: "bg-emerald-50 text-emerald-600",   bar: "bg-emerald-500" },
    red:    { icon: "bg-[#C32F27]/10 text-[#C32F27]",   bar: "bg-[#C32F27]" },
  };

  const colors = accentMap[accent] ?? accentMap.indigo;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-all duration-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${colors.bar} opacity-0 transition-opacity duration-200 group-hover:opacity-100`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.icon}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
              trendUp
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trend}
            </span>
          )}
        </div>
        <p className="mt-4 font-sans text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1 text-[13px] text-slate-500">{label}</p>
      </div>
    </article>
  );
}
