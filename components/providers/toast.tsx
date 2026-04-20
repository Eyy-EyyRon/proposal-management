"use client";

import { goeyToast } from "goey-toast";
import "goey-toast/dist/styles.css";

export const toast = {
  success: (message: string) => goeyToast.success(message),
  error: (message: string) => goeyToast.error(message),
  info: (message: string) => goeyToast(message),
  warning: (message: string) => goeyToast.error(`⚠️ ${message}`),
};

export function Toaster() {
  return <div id="goey-toast-container" />;
}
