"use client";

import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { CommandPalette } from "@/components/command-palette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="pl-60">
          {children}
        </div>
        <CommandPalette />
      </div>
    </AuthGuard>
  );
}
