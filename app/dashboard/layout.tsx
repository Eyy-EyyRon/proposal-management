"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { CommandPalette } from "@/components/command-palette";
import { RoleLayout } from "@/components/role-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingGuard>
        <RoleLayout>
          <Sidebar />
          <div className="pl-60">
            {children}
          </div>
          <CommandPalette />
        </RoleLayout>
      </OnboardingGuard>
    </AuthGuard>
  );
}
