"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-guard";

type UserRole = "super-admin" | "admin";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole: UserRole;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Role hierarchy: super-admin > admin
    const hasAccess =
      requiredRole === "admin"
        ? user.role === "admin" || user.role === "super-admin"
        : user.role === "super-admin";

    if (!hasAccess) {
      if (user.role === "admin") {
        // Redirect regular admins to their dashboard
        router.push("/staff-dashboard");
      } else {
        // Unknown role - redirect to forbidden or login
        router.push("/?error=unauthorized");
      }
    }
  }, [user, requiredRole, router]);

  if (!user) {
    return null;
  }

  // Check role permissions
  const hasAccess =
    requiredRole === "admin"
      ? user.role === "admin" || user.role === "super-admin"
      : user.role === "super-admin";

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-500">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
