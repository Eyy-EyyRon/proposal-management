"use client";

import { useRole } from "@/contexts/auth-context";
import { ElevatedModeBorder } from "@/components/elevated-mode-border";

interface RoleLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function RoleLayout({ children, className = "" }: RoleLayoutProps) {
  const { role } = useRole();

  return (
    <div className={`min-h-screen text-slate-900 theme-${role} ${className}`}>
      <ElevatedModeBorder />
      {children}
    </div>
  );
}
