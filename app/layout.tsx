import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/contexts/auth-context";
import { SystemStatusProvider } from "@/contexts/system-status-context";
import { SentryBridge } from "@/components/sentry-bridge";
import { RedirectController } from "@/components/redirect-controller";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyacinth Proposal System",
  description: "Manage, send, track, and sign proposals with Firebase.",
};

// ─── Suppress Firebase permission-denied snapshot noise ───────
if (typeof window !== "undefined") {
  const _originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.join(" ");
    if (
      msg.includes("permission-denied") &&
      msg.includes("snapshot listener")
    ) {
      console.log("[Firebase] Suppressed permission-denied snapshot noise.");
      return;
    }
    _originalConsoleError(...args);
  };
}
// ─────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SystemStatusProvider>
          <AuthProvider>
            <SentryBridge />
            <RedirectController>{children}</RedirectController>
            <ToastProvider />
          </AuthProvider>
        </SystemStatusProvider>
      </body>
    </html>
  );
}