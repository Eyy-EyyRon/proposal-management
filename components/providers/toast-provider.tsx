"use client";

import { Toaster, toast as sonnerToast } from "sonner";

// Re-export toast methods for use throughout the app
export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast(message),
  warning: (message: string) => sonnerToast.warning(message),
  loading: (message: string) => sonnerToast.loading(message),
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
};

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      expand={false}
    />
  );
}
