const DEPT_COLORS: Record<string, { bg: string; text: string }> = {
  Sales:       { bg: "bg-indigo-50",  text: "text-indigo-700" },
  Marketing:   { bg: "bg-fuchsia-50", text: "text-fuchsia-700" },
  Legal:       { bg: "bg-amber-50",   text: "text-amber-700" },
  Engineering: { bg: "bg-sky-50",     text: "text-sky-700" },
  Operations:  { bg: "bg-emerald-50", text: "text-emerald-700" },
  Finance:     { bg: "bg-rose-50",    text: "text-rose-700" },
};

export function DepartmentBadge({ department }: { department?: string }) {
  const dept = department || "Sales";
  const colors = DEPT_COLORS[dept] ?? { bg: "bg-slate-50", text: "text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${colors.bg} ${colors.text}`}>
      {dept}
    </span>
  );
}
