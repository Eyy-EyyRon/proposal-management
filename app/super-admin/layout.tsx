"use client";

import { RoleGuard } from "@/components/role-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard minRole="super_admin">
      <OnboardingGuard>
        <div className="min-h-screen bg-[#faf8ff] text-slate-900">
          <Sidebar />
          <div className="pl-60">
            {children}
          </div>
          <CommandPalette />
        </div>
      </OnboardingGuard>
    </RoleGuard>
  );
}
