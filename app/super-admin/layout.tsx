"use client";

import { RoleGuard } from "@/components/role-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { RoleLayout } from "@/components/role-layout";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard minRole="super_admin">
      <OnboardingGuard>
        <RoleLayout>
          <Sidebar />
          <div className="pl-60">
            {children}
          </div>
          <CommandPalette />
        </RoleLayout>
      </OnboardingGuard>
    </RoleGuard>
  );
}
