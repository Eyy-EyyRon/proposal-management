"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, useRole } from "@/contexts/auth-context";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, profile, loading } = useAuth();
  const { isCeo } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  const needsOnboarding =
    !loading &&
    user &&
    profile &&
    !profile.department &&
    !isCeo;

  const isOnOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (needsOnboarding && !isOnOnboarding) {
      router.replace("/onboarding");
    }
  }, [needsOnboarding, isOnOnboarding, router]);

  // Already on onboarding page — let it render
  if (isOnOnboarding) return <>{children}</>;

  // Needs onboarding but hasn't redirected yet — show nothing
  if (needsOnboarding) return null;

  return <>{children}</>;
}
