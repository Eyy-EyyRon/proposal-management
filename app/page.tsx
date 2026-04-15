"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { signIn, signUp, resetPassword } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Upgraded state to handle all three views
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // Clear error when switching views
  useEffect(() => {
    setError(null);
    setResetSent(false);
  }, [view]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      // onAuthStateChanged will trigger redirect
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, firstName.trim(), lastName.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed.";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed.";
      setError(msg.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking auth (prevents flash)
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-white" />
      </main>
    );
  }

  // Already signed in — redirect is in progress
  if (user) return null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 font-sans text-slate-100 sm:px-8 lg:px-12 flex items-center justify-center">
      <div className="w-full max-w-6xl grid min-h-[calc(100vh-6rem)] overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl xl:grid-cols-[1fr_1.1fr]">
        
        {/* LEFT SECTION (Premium Info Panel) */}
        <section className="relative flex flex-col justify-center overflow-hidden p-10 sm:p-14 xl:border-r border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#780116]/20 to-slate-950" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="relative z-10 grid w-full">
            
            {/* Login Text */}
            <div
              className={`col-start-1 row-start-1 transition-all duration-700 ease-in-out ${
                view === "login" ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0 pointer-events-none"
              }`}
            >
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-md">
                <span className="mr-2 h-2 w-2 rounded-full bg-[#DB7C26] animate-pulse" />
                Secure Workspace
              </div>
              <h1 className="mt-6 max-w-md font-serif text-4xl font-medium tracking-tight text-white sm:text-5xl leading-[1.1]">
                Proposal Management System
              </h1>
              <p className="mt-6 max-w-lg font-sans text-base leading-relaxed text-slate-400 sm:text-lg">
                Manage your proposals, track client engagement, and close deals faster with a clean, secure workspace.
              </p>
            </div>

            {/* Signup Text */}
            <div
              className={`col-start-1 row-start-1 transition-all duration-700 ease-in-out ${
                view === "signup" ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none"
              }`}
            >
              <div className="inline-flex items-center rounded-full border border-[#F7B538]/20 bg-[#F7B538]/10 px-4 py-1.5 text-xs font-semibold text-[#F7B538] backdrop-blur-md">
                Get Started Today
              </div>
              <h1 className="mt-6 max-w-md font-serif text-4xl font-medium tracking-tight text-white sm:text-5xl leading-[1.1]">
                Create your workspace and send proposals.
              </h1>
              <p className="mt-6 max-w-lg font-sans text-base leading-relaxed text-slate-400 sm:text-lg">
                Set up your account once, then manage templates, clients, and signatures all from one central dashboard.
              </p>
            </div>

            {/* Forgot Password Text */}
            <div
              className={`col-start-1 row-start-1 transition-all duration-700 ease-in-out ${
                view === "forgot" ? "translate-x-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
              }`}
            >
              <div className="inline-flex items-center rounded-full border border-[#DB7C26]/20 bg-[#DB7C26]/10 px-4 py-1.5 text-xs font-semibold text-[#DB7C26] backdrop-blur-md">
                Account Recovery
              </div>
              <h1 className="mt-6 max-w-md font-serif text-4xl font-medium tracking-tight text-white sm:text-5xl leading-[1.1]">
                Reset your password and get back to work.
              </h1>
              <p className="mt-6 max-w-lg font-sans text-base leading-relaxed text-slate-400 sm:text-lg">
                We’ll send a password reset link to your email so you can regain access securely.
              </p>
            </div>

          </div>
        </section>

        {/* RIGHT SECTION (Forms Panel) */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-slate-50 p-6 sm:p-12">
          
          <div className="z-10 w-full max-w-md">
            
            {/* Sliding Tab Switcher (Fades out seamlessly during forgot password) */}
            <div className={`mb-8 relative flex w-full rounded-2xl bg-slate-200/50 p-1 backdrop-blur-sm transition-all duration-500 ease-in-out ${
              view === "forgot" ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
            }`}>
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-[#780116] shadow-md transition-all duration-500 ease-out ${
                  view === "signup" ? "left-[calc(50%+2px)]" : "left-1"
                }`}
              />
              <button
                onClick={() => setView("login")}
                className={`relative z-10 flex-1 rounded-xl py-3 text-sm font-semibold transition-colors duration-300 focus:outline-none ${
                  view === "login" ? "text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setView("signup")}
                className={`relative z-10 flex-1 rounded-xl py-3 text-sm font-semibold transition-colors duration-300 focus:outline-none ${
                  view === "signup" ? "text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* FORM CONTAINER */}
            <div className="grid w-full">
              
              {/* Login Form */}
              <div
                className={`col-start-1 row-start-1 w-full rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(120,1,22,0.05)] transition-all duration-700 ease-in-out ${
                  view === "login" ? "translate-x-0 opacity-100 z-10" : "-translate-x-12 opacity-0 pointer-events-none z-0"
                }`}
              >
                <h2 className="font-serif text-3xl font-medium text-slate-900 tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-slate-500">Please enter your details to sign in.</p>

                <form onSubmit={handleSignIn}>
                  <div className="mt-8 grid gap-5">
                    <Field label="Email address" placeholder="you@company.com" value={email} onChange={setEmail} />
                    <Field label="Password" placeholder="Enter your password" type="password" value={password} onChange={setPassword} />
                  </div>

                  {error && view === "login" && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" className="peer h-4 w-4 appearance-none rounded border border-slate-300 bg-slate-50 checked:border-[#780116] checked:bg-[#780116] focus:ring-2 focus:ring-[#DB7C26]/30 focus:ring-offset-1 transition-all" />
                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setView("forgot")} className="font-medium text-[#C32F27] transition-colors hover:text-[#D8572A]">
                      Forgot password?
                    </button>
                  </div>

                  <div className="mt-8">
                    <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none">
                      {loading && view === "login" ? "Signing in..." : "Sign in to account"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Signup Form */}
              <div
                className={`col-start-1 row-start-1 w-full rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(120,1,22,0.05)] transition-all duration-700 ease-in-out ${
                  view === "signup" ? "translate-x-0 opacity-100 z-10" : "translate-x-12 opacity-0 pointer-events-none z-0"
                }`}
              >
                <h1 className="font-serif text-3xl font-medium text-slate-900 tracking-tight">
                  Create account
                </h1>
                <p className="mt-2 text-sm text-slate-500">Start your 14-day free trial. No credit card required.</p>

                <form onSubmit={handleSignUp}>
                  <div className="mt-8 grid gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="First name" placeholder="Alex" value={firstName} onChange={setFirstName} />
                      <Field label="Last name" placeholder="Morgan" value={lastName} onChange={setLastName} />
                    </div>
                    <Field label="Email address" placeholder="you@company.com" value={email} onChange={setEmail} />
                    <Field label="Password" placeholder="Create a password" type="password" value={password} onChange={setPassword} />
                  </div>

                  {error && view === "signup" && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <div className="mt-8">
                    <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none">
                      {loading && view === "signup" ? "Creating workspace..." : "Create your workspace"}
                    </button>
                  </div>
                </form>
                
                <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
                  By signing up, you agree to our <a href="#" className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">Terms of Service</a> and <a href="#" className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">Privacy Policy</a>.
                </p>
              </div>

              {/* Forgot Password Form */}
              <div
                className={`col-start-1 row-start-1 w-full rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(120,1,22,0.05)] transition-all duration-700 ease-in-out ${
                  view === "forgot" ? "translate-y-0 opacity-100 z-10" : "translate-y-12 opacity-0 pointer-events-none z-0"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-[#DB7C26]">
                      Password recovery
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-medium text-slate-900 tracking-tight">
                      Send reset link
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleResetPassword}>
                  <div className="mt-8 grid gap-5">
                    <Field label="Email address" placeholder="you@company.com" value={email} onChange={setEmail} />
                  </div>

                  {error && view === "forgot" && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  {resetSent && (
                    <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      Reset link sent! Check your inbox.
                    </p>
                  )}

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button type="submit" disabled={loading || resetSent} className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none">
                      {loading && view === "forgot" ? "Sending..." : "Send reset link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("login")}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
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
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <label className="block group">
      <span className="mb-1.5 block font-sans text-sm font-medium text-slate-700 transition-colors group-focus-within:text-[#780116]">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 font-sans text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#DB7C26] focus:bg-white focus:ring-[3px] focus:ring-[#F7B538]/20 focus:shadow-sm"
      />
    </label>
  );
}

function InfoPill({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/10">
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.24em] text-[#F7B538]">{title}</p>
      <p className="mt-2 font-sans text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}