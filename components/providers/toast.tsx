"use client";

// Single source of truth — delegates to sonner via toast-provider.
// The <Toaster> is already mounted in app/layout.tsx via <ToastProvider />.
export { toast } from "@/components/providers/toast-provider";
