"use client";

import { useElevation } from "@/contexts/auth-context";

export function ElevatedModeBorder() {
  const { isElevated, elevationTier } = useElevation();

  if (!isElevated) return null;

  const isCritical = elevationTier === "critical";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[9999] rounded-none ${
        isCritical
          ? "shadow-[inset_0_0_0_3px_rgba(239,68,68,0.8)]"
          : "shadow-[inset_0_0_0_3px_rgba(249,115,22,0.7)]"
      }`}
      style={{
        animation: "elevationPulse 2s ease-in-out infinite",
      }}
    />
  );
}
