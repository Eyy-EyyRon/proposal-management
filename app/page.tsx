"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { signIn, signUp, signInWithGoogle, resetPassword } from "@/lib/auth";
import Image from "next/image";

const FIREBASE_ERROR_MAP: Record<string, string> = {
  "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed": "Email/password accounts are not enabled. Contact support.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Try again or reset it.",
  "auth/invalid-credential": "Invalid email or password. Please check and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/network-request-failed": "Network error. Check your internet connection.",
};

function friendlyError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (FIREBASE_ERROR_MAP[code]) return FIREBASE_ERROR_MAP[code];
    return code.replace("auth/", "").replace(/-/g, " ");
  }
  if (err instanceof Error) return err.message.replace("Firebase: ", "");
  return "An unexpected error occurred.";
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const securityReset = searchParams?.get("reason") === "security_reset";

  // Upgraded state to handle all three views
  const [view, setView] = useState<"login" | "signup" | "forgot">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Signup validation
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const signupDisabled = loading || !password || password.length < 6 || password !== confirmPassword;

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
      setError(friendlyError(err));
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
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, firstName.trim(), lastName.trim());
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(friendlyError(err));
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
      setError(friendlyError(err));
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
            {/* Security reset banner — shown when CEO forced logout */}
            {securityReset && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 shadow-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <div>
                  <p className="text-[13px] font-bold text-rose-800">Session Terminated by CEO</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-rose-700">
                    An Emergency Security Reset was executed. All elevated sessions have been revoked. Please sign in again to continue.
                  </p>
                </div>
              </div>
            )}

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
                <div className="relative h-16 w-16 overflow-hidden rounded-xl shadow-lg">
                  <Image
                    src="/assets/logo.png"
                    alt="Hyacinth Proposal System"
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority
                  />
                </div>
                <h2 className="font-serif text-3xl font-medium text-slate-900 tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-slate-500">Please enter your details to sign in.</p>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-medium text-slate-400">or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignIn}>
                  <div className="grid gap-5">
                    <Field label="Email address" placeholder="you@company.com" value={email} onChange={setEmail} />
                    <PasswordField
                      label="Password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={setPassword}
                      visible={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                    />
                  </div>

                  {error && view === "login" && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="peer h-4 w-4 appearance-none rounded border border-slate-300 bg-slate-50 checked:border-[#780116] checked:bg-[#780116] focus:ring-2 focus:ring-[#DB7C26]/30 focus:ring-offset-1 transition-all"
                        />
                        <svg
                          className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="font-medium text-[#C32F27] transition-colors hover:text-[#D8572A]"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none"
                    >
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

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign up with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs font-medium text-slate-400">or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSignUp}>
                  <div className="grid gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="First name" placeholder="Alex" value={firstName} onChange={setFirstName} />
                      <Field label="Last name" placeholder="Morgan" value={lastName} onChange={setLastName} />
                    </div>
                    <Field label="Email address" placeholder="you@company.com" value={email} onChange={setEmail} />
                    <PasswordField
                      label="Password"
                      placeholder="Create a password (min 6 characters)"
                      value={password}
                      onChange={setPassword}
                      visible={showPassword}
                      onToggle={() => setShowPassword((v) => !v)}
                      hint={passwordTooShort ? "Password must be at least 6 characters." : undefined}
                    />
                    <PasswordField
                      label="Confirm password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((v) => !v)}
                      hint={passwordsMismatch ? "Passwords do not match." : undefined}
                    />
                  </div>

                  {error && view === "signup" && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={signupDisabled}
                      className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {loading && view === "signup" ? "Creating workspace..." : "Create your workspace"}
                    </button>
                  </div>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
                  By signing up, you agree to our{" "}
                  <a href="#" className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors">
                    Privacy Policy
                  </a>
                  .
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
                    <button
                      type="submit"
                      disabled={loading || resetSent}
                      className="w-full rounded-xl bg-[#780116] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#780116]/20 transition-all duration-200 hover:bg-[#C32F27] hover:shadow-xl hover:shadow-[#C32F27]/20 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#F7B538]/30 disabled:opacity-50 disabled:pointer-events-none"
                    >
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

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  visible: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <div className="block group">
      <span className="mb-1.5 block font-sans text-sm font-medium text-slate-700 transition-colors group-focus-within:text-[#780116]">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pr-11 font-sans text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 focus:border-[#DB7C26] focus:bg-white focus:ring-[3px] focus:ring-[#F7B538]/20 focus:shadow-sm"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-red-500">{hint}</p>}
    </div>
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