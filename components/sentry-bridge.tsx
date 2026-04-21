"use client";

import { useEffect, useRef } from "react";
import { useElevation } from "@/contexts/auth-context";
import { useSystemStatus } from "@/contexts/system-status-context";

/**
 * SentryBridge: runs inside the provider tree, listens for the Nuclear Brake
 * being triggered (elevation becomes null after being active), and flips
 * systemStatus to "emergency" so 3D components can animate the shatter.
 *
 * Also resets back to "nominal" once a new session starts clean.
 */
export function SentryBridge() {
  const { isElevated, elevation } = useElevation();
  const { systemStatus, triggerEmergency, resetToNominal } = useSystemStatus();
  const wasElevated = useRef(false);
  const sessionClean = useRef(true);

  useEffect(() => {
    // Detect Nuclear Brake: was elevated, now elevation is gone or force-wiped
    if (wasElevated.current && !isElevated && elevation === null && sessionClean.current) {
      triggerEmergency();
      sessionClean.current = false;
    }
    wasElevated.current = isElevated;
  }, [isElevated, elevation, triggerEmergency]);

  useEffect(() => {
    // After 3 seconds of emergency state, reset so next login starts nominal
    if (systemStatus === "emergency") {
      const timer = setTimeout(() => {
        resetToNominal();
        sessionClean.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [systemStatus, resetToNominal]);

  return null;
}
