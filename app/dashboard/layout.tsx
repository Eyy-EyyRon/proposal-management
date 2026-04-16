"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingGuard>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Sidebar />
          <div className="pl-60">
            {children}
          </div>
          <CommandPalette />
        </div>
      </OnboardingGuard>
    </AuthGuard>
  );
}
