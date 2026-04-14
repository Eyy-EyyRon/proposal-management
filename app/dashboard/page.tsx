import Link from "next/link";
import { FileText, Eye, CheckCircle, XCircle, FilePlus, LayoutTemplate, ArrowRight, Clock } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { StatCard } from "@/components/stat-card";
import { ProposalTable, type Proposal } from "@/components/proposal-table";
import { StatusBadge } from "@/components/status-badge";

const stats = [
  { label: "Total Proposals", value: "48",  icon: FileText,     trend: "+12%", trendUp: true,  accent: "indigo" },
  { label: "Viewed",          value: "31",  icon: Eye,          trend: "+5",   trendUp: true,  accent: "blue"   },
  { label: "Accepted",        value: "22",  icon: CheckCircle,  trend: "74%",  trendUp: true,  accent: "green"  },
  { label: "Rejected",        value: "6",   icon: XCircle,      trend: "-2",   trendUp: false, accent: "red"    },
] as const;

const mockProposals: Proposal[] = [
  { id: "1", client: "Northstar Inc.",   email: "ops@northstar.com",    status: "Viewed",    date: "Apr 14, 2026" },
  { id: "2", client: "Ariana Cole",      email: "ariana@cole.co",       status: "Sent",      date: "Apr 13, 2026" },
  { id: "3", client: "Dana Liu",         email: "dana@liudesign.io",    status: "Accepted",  date: "Apr 12, 2026" },
  { id: "4", client: "Robert Hayes",     email: "r.hayes@venture.com",  status: "Rejected",  date: "Apr 11, 2026" },
  { id: "5", client: "Lena Whitmore",    email: "lena@whitmore.co",     status: "Sent",      date: "Apr 10, 2026" },
];

const recentActivity = [
  { id: "a1", text: "Dana Liu accepted the proposal",   time: "2h ago",  status: "Accepted" as const },
  { id: "a2", text: "Northstar Inc. viewed your link",  time: "4h ago",  status: "Viewed" as const },
  { id: "a3", text: "Robert Hayes declined",             time: "1d ago",  status: "Rejected" as const },
  { id: "a4", text: "Proposal sent to Ariana Cole",      time: "1d ago",  status: "Sent" as const },
];

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Topbar title="Dashboard" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* Greeting */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-sans text-lg font-semibold text-slate-900">
              Good evening, Admin
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Here&apos;s a snapshot of your proposals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/templates/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              New template
            </Link>
            <Link
              href="/dashboard/create-proposal"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-slate-800"
            >
              <FilePlus className="h-3.5 w-3.5" />
              New proposal
            </Link>
          </div>
        </div>

        {/* Stats */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Proposals Table — spans 2 cols */}
          <div className="lg:col-span-2">
            <ProposalTable proposals={mockProposals} />
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Activity</h3>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>

            <div className="px-5 pb-4">
              <div className="space-y-0">
                {recentActivity.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 py-3 ${
                      i !== recentActivity.length - 1 ? "border-b border-slate-100/80" : ""
                    }`}
                  >
                    <div className="mt-0.5">
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-slate-700">
                        {item.text}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-400">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/dashboard/proposals"
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                View all activity
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
