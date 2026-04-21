"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SystemStatusType = "nominal" | "emergency";

interface SystemStatusContextValue {
  systemStatus: SystemStatusType;
  triggerEmergency: () => void;
  resetToNominal: () => void;
}

const SystemStatusContext = createContext<SystemStatusContextValue>({
  systemStatus: "nominal",
  triggerEmergency: () => {},
  resetToNominal: () => {},
});

export function useSystemStatus() {
  return useContext(SystemStatusContext);
}

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [systemStatus, setSystemStatus] = useState<SystemStatusType>("nominal");

  return (
    <SystemStatusContext.Provider
      value={{
        systemStatus,
        triggerEmergency: () => setSystemStatus("emergency"),
        resetToNominal: () => setSystemStatus("nominal"),
      }}
    >
      {children}
    </SystemStatusContext.Provider>
  );
}
