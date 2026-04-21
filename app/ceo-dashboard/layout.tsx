"use client";

import { Sidebar } from "@/components/sidebar";
import { RoleGuard } from "@/components/role-guard";
import { CommandPalette } from "@/components/command-palette";
import { RoleLayout } from "@/components/role-layout";

export default function CeoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard minRole="ceo">
      <RoleLayout>
        <Sidebar />
        <div className="pl-60">
          {children}
        </div>
        <CommandPalette />
      </RoleLayout>
    </RoleGuard>
  );
}
