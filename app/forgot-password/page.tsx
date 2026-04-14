export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 font-sans text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.85)] backdrop-blur xl:grid-cols-[0.95fr_1.05fr]">
        <section className="relative flex flex-col overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.35),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(15,23,42,0.88))] p-8 sm:p-9 xl:border-b-0 xl:border-r">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_40%),linear-gradient(225deg,rgba(255,255,255,0.05),transparent_35%)]" />
          <div className="relative max-w-lg">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">
              Proposal Management System
            </p>
            <h1 className="mt-3 max-w-md font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Reset your password and get back to work.
            </h1>
            <p className="mt-4 max-w-lg font-sans text-base leading-8 text-slate-300 sm:text-lg">
              We’ll send a password reset link to your email so you can regain access to your proposal
              workspace securely.
            </p>
          </div>

          <div className="relative mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <InfoPill title="Security" text="Reset flow stays within your account email" />
            <InfoPill title="Recovery" text="A single link gets you back in quickly" />
            <InfoPill title="Access" text="Return to proposals without losing data" />
            <InfoPill title="Support" text="Keep your workspace moving forward" />
          </div>
        </section>

        <section className="bg-slate-50 p-6 sm:p-8">
          <div className="mx-auto flex h-full max-w-xl flex-col justify-center">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.3)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">
                    Password recovery
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950">
                    Send a reset link
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Firebase Auth
                </span>
              </div>

              <div className="mt-8 grid gap-6">
                <Field label="Email address" placeholder="you@company.com" />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="font-sans text-sm font-semibold text-slate-900">What happens next</p>
                <ul className="mt-3 space-y-2 font-sans text-sm leading-6 text-slate-600">
                  <li>• We send a reset link to your inbox</li>
                  <li>• Use the link to create a new password</li>
                  <li>• Then return to the sign-in page</li>
                </ul>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300">
                  Send reset link
                </button>
                <a
                  href="/"
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Back to sign in
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
