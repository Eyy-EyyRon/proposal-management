import Link from "next/link";
import { FilePlus, FileText, ArrowRight, MoreHorizontal } from "lucide-react";
import { StatusBadge, type ProposalStatus } from "@/components/status-badge";

export interface Proposal {
  id: string;
  client: string;
  email: string;
  status: ProposalStatus;
  date: string;
}

interface ProposalTableProps {
  proposals: Proposal[];
}

function ClientAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    "bg-[#780116]/10 text-[#780116]",
    "bg-[#DB7C26]/10 text-[#DB7C26]",
    "bg-[#F7B538]/20 text-[#9a7200]",
    "bg-[#C32F27]/10 text-[#C32F27]",
    "bg-emerald-100 text-emerald-700",
    "bg-[#780116]/15 text-[#780116]",
  ];
  const color = colors[name.length % colors.length];

  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${color}`}>
      {initials}
    </div>
  );
}

export function ProposalTable({ proposals }: ProposalTableProps) {
  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white">
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">No proposals yet</p>
          <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
            Create your first proposal and start sending it to clients.
          </p>
          <Link
            href="/dashboard/create-proposal"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#780116] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#C32F27]"
          >
            <FilePlus className="h-3.5 w-3.5" />
            Create proposal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Recent proposals</h3>
        <Link
          href="/dashboard/proposals"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/50">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Client
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Date
              </th>
              <th className="w-10 px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {proposals.map((p, i) => (
              <tr
                key={p.id}
                className={`group transition-colors hover:bg-slate-50/80 ${
                  i !== proposals.length - 1 ? "border-b border-slate-100/80" : ""
                }`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <ClientAvatar name={p.client} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-slate-800">
                        {p.client}
                      </p>
                      <p className="truncate text-[12px] text-slate-400">
                        {p.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-500">
                  {p.date}
                </td>
                <td className="px-3 py-3">
                  <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
