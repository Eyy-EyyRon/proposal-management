"use client";

import { useRef } from "react";
import { RoleGuard } from "@/components/role-guard";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { RoleLayout } from "@/components/role-layout";
import { LazySystemGrid } from "@/components/three/lazy-three";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gridTriggerRef = useRef<(() => void) | null>(null);

  return (
    <RoleGuard minRole="super_admin">
      <OnboardingGuard>
        <RoleLayout>
          {/* System Grid — fixed background behind the entire super-admin workspace */}
          <div className="pointer-events-none fixed inset-0 z-0 opacity-60">
            <LazySystemGrid triggerRef={gridTriggerRef} />
          </div>
          <Sidebar />
          <div className="relative z-10 pl-60">
            {children}
          </div>
          <CommandPalette />
        </RoleLayout>
      </OnboardingGuard>
    </RoleGuard>
  );
}
