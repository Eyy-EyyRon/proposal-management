export type ProposalStatus = "Sent" | "Viewed" | "Accepted" | "Rejected" | "Archived";

const config: Record<ProposalStatus, { bg: string; text: string; dot: string }> = {
  Sent:     { bg: "bg-slate-50",    text: "text-slate-600",   dot: "bg-slate-400" },
  Viewed:   { bg: "bg-sky-50",      text: "text-sky-700",     dot: "bg-sky-500" },
  Accepted: { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  Rejected: { bg: "bg-rose-50",     text: "text-rose-700",    dot: "bg-rose-500" },
  Archived: { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400" },
};

function ProgressRing() {
  return (
    <span className="relative inline-flex h-3 w-3 items-center justify-center">
      <svg viewBox="0 0 12 12" className="h-3 w-3 -rotate-90" aria-hidden="true">
        <circle
          cx="6"
          cy="6"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-sky-300"
          opacity="0.35"
        />
        <circle
          cx="6"
          cy="6"
          r="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="text-sky-500"
          strokeDasharray="25.1"
          strokeDashoffset="8.2"
        />
      </svg>
    </span>
  );
}

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium ${c.bg} ${c.text}`}>
      {status === "Viewed" ? <ProgressRing /> : <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
      {status}
    </span>
  );
}
