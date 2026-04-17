"use client";

import { goeyToast } from "goey-toast";
import { useEffect } from "react";

// Re-export toast methods for use throughout the app
export const toast = {
  success: (message: string) => goeyToast.success(message),
  error: (message: string) => goeyToast.error(message),
  info: (message: string) => goeyToast(message),
  warning: (message: string) => goeyToast.success(message),
};

export function GoeyToastProvider() {
  useEffect(() => {
    // Default options are set via CSS and library defaults
    // goeyToast auto-initializes on first use
  }, []);

  // The toast container is managed by the library automatically
  return null;
}
