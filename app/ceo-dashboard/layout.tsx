"use client";

import { Sidebar } from "@/components/sidebar";
import { RoleGuard } from "@/components/role-guard";
import { CommandPalette } from "@/components/command-palette";

export default function CeoDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard minRole="ceo">
      <div className="min-h-screen bg-[#fafaf8] text-slate-900">
        <Sidebar />
        <div className="pl-60">
          {children}
        </div>
        <CommandPalette />
      </div>
    </RoleGuard>
  );
}
