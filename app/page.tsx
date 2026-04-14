export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 font-sans text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.85)] backdrop-blur xl:grid-cols-[0.95fr_1.05fr]">
        <section className="relative flex flex-col justify-between overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.35),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(15,23,42,0.88))] p-8 sm:p-10 xl:border-b-0 xl:border-r">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(9, 9, 32, 0.08),transparent_40%),linear-gradient(225deg,rgb(48, 48, 100),transparent_35%)]" />
          <div className="relative">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">
              Proposal Management System
            </p>
            <h1 className="mt-4 max-w-md font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Manage proposals with a clean, secure workspace.
            </h1>
            <p className="mt-5 max-w-lg font-sans text-base leading-8 text-slate-300 sm:text-lg">
              Sign in, create an account, and access your proposal dashboard without distractions.
              Built for a professional workflow from the start.
            </p>
          </div>

        </section>

        <section className="bg-slate-50 p-6 sm:p-8">
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.3)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">
                    Welcome back
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950">
                    Sign in to your workspace
                  </h2>
                </div>
              </div>

              <div className="mt-8 grid gap-6">
                <Field label="Email address" placeholder="you@company.com" />
                <Field label="Password" placeholder="Enter your password" type="password" />
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Remember me
                </label>
                <a className="font-medium text-indigo-600 transition hover:text-indigo-700" href="/forgot-password">
                  Forgot password?
                </a>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300">
                  Sign in
                </button>
                <a
                  href="/signup"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Create account
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}

function InfoPill({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-white/90">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">{title}</p>
      <p className="mt-2 font-sans text-sm leading-6 text-slate-200">{text}</p>
    </div>
  );
}
