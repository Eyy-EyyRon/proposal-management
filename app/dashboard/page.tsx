const navigation = [
  { label: "Dashboard", active: true },
  { label: "Proposals" },
  { label: "Templates" },
  { label: "Create Proposal" },
  { label: "Analytics" },
];

const quickStats = [
  { label: "Active proposals", value: "128" },
  { label: "Pending signatures", value: "19" },
  { label: "Templates", value: "12" },
  { label: "Acceptance rate", value: "74%" },
];

const recentActivity = [
  "Northstar proposal viewed 12 minutes ago",
  "Template updated for quarterly retainer",
  "New proposal sent to Ariana Cole",
  "Client accepted and signature recorded",
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.8)] backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">
              Proposal Management System
            </p>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-white">
              Admin Dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Manage proposals, templates, and analytics from one workspace.
            </p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  item.active
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">
              Workspace
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Firebase Auth, Firestore, and Storage ready.
            </p>
          </div>
        </aside>

        <section className="space-y-6">
          <header className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.8)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">
                  Overview
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-white">
                  Welcome back, Admin
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Track proposal progress, manage templates, and monitor client activity.
                </p>
              </div>

              <div className="flex gap-3">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Create proposal
                </button>
                <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => (
              <article
                key={stat.label}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.75)]"
              >
                <p className="text-sm text-slate-400">{stat.label}</p>
                <p className="mt-3 font-serif text-3xl font-semibold text-white">{stat.value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.75)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">
                    Proposals
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-semibold text-white">
                    Recent proposal activity
                  </h3>
                </div>
                <a className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200" href="#">
                  View all
                </a>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr] bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span>Client</span>
                  <span>Value</span>
                  <span>Status</span>
                  <span>Updated</span>
                </div>
                <div className="divide-y divide-white/10 bg-slate-950/40">
                  {[
                    ["Northstar", "$12,500", "Viewed", "12m ago"],
                    ["Ariana Cole", "$8,200", "Sent", "1h ago"],
                    ["Dana Liu", "$4,800", "Accepted", "Yesterday"],
                    ["Robert Hayes", "$16,000", "Rejected", "Yesterday"],
                  ].map(([client, value, status, updated]) => (
                    <div
                      key={`${client}-${status}`}
                      className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr] items-center gap-4 px-4 py-4 text-sm"
                    >
                      <span className="font-medium text-white">{client}</span>
                      <span className="text-slate-300">{value}</span>
                      <span className="inline-flex w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {status}
                      </span>
                      <span className="text-slate-400">{updated}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.75)] sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-300">
                Activity
              </p>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-white">
                Recent events
              </h3>

              <div className="mt-5 space-y-4">
                {recentActivity.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
