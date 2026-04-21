"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useRole, type UserRole } from "@/contexts/auth-context";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  minRole: UserRole;
  redirectTo?: string;
}

const ROLE_HOME: Record<UserRole, string> = {
  staff: "/dashboard",
  admin: "/dashboard",
  super_admin: "/super-admin",
  ceo: "/ceo-dashboard",
};

export function RoleGuard({ children, minRole, redirectTo }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const { role, isAtLeast } = useRole();
  const router = useRouter();
  const hasAccess = isAtLeast(minRole);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!hasAccess) {
      router.replace(redirectTo ?? ROLE_HOME[role] ?? "/dashboard");
    }
  }, [user, loading, hasAccess, role, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
            <ShieldAlert className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Access Denied</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
