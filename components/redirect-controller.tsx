"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, useRole, type UserRole } from "@/contexts/auth-context";

const ROLE_HOME: Record<UserRole, string> = {
  staff: "/dashboard",
  admin: "/dashboard",
  super_admin: "/super-admin",
  ceo: "/ceo-dashboard",
};

const ROLE_PREFIXES: Record<UserRole, string[]> = {
  staff: ["/dashboard"],
  admin: ["/dashboard"],
  super_admin: ["/super-admin", "/dashboard"],
  ceo: ["/ceo-dashboard", "/super-admin", "/dashboard"],
};

// Pages that don't require redirect logic
const PUBLIC_PATHS = ["/", "/login", "/p/", "/onboarding"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    p === pathname || (p.endsWith("/") && pathname.startsWith(p))
  );
}

function isOnAllowedPath(role: UserRole, pathname: string): boolean {
  return ROLE_PREFIXES[role].some((prefix) => pathname.startsWith(prefix));
}

/**
 * RedirectController — monitors profile.role and profile.department in real-time.
 *
 * - No department + not CEO → /onboarding
 * - Role changed → redirect to that role's home if currently on a disallowed path
 * - e.g. staff on /dashboard gets promoted to admin → pushed to /super-admin
 */
export function RedirectController({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { role, isCeo } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const prevRoleRef = useRef<UserRole | null>(null);

  useEffect(() => {
    if (loading || !user || !profile) return;

    // --- Onboarding gate ---
    if (!profile.department && !isCeo && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    // --- Role-based redirect ---
    // Skip public paths
    if (isPublicPath(pathname)) return;

    // If on the onboarding page but already has a department, redirect to role home
    if (pathname === "/onboarding" && (profile.department || isCeo)) {
      router.replace(ROLE_HOME[role]);
      return;
    }

    // If on a path not allowed for this role, redirect to role home
    if (!isOnAllowedPath(role, pathname)) {
      router.replace(ROLE_HOME[role]);
      return;
    }

    // If role changed from a previous value, push to new role's home
    if (prevRoleRef.current !== null && prevRoleRef.current !== role) {
      router.replace(ROLE_HOME[role]);
    }

    prevRoleRef.current = role;
  }, [loading, user, profile, role, isCeo, pathname, router]);

  return <>{children}</>;
}
