"use client";

import { goeyToast } from "goey-toast";
import "goey-toast/dist/styles.css";

// Re-export toast methods for use throughout the app
export const toast = {
  success: (message: string) => goeyToast.success(message),
  error: (message: string) => goeyToast.error(message),
  info: (message: string) => goeyToast(message),
  warning: (message: string) => goeyToast.success(message),
};

// Toast Container component
export function Toaster() {
  return <div id="goey-toast-container" />;
}
