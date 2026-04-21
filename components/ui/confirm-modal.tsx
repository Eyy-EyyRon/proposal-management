"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Trash2, Send, CheckCircle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for cleaner tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ActionType = "danger" | "destructive" | "primary" | "success";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionType?: ActionType;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const actionConfig = {
  danger: {
    icon: Trash2,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
    borderColor: "border-amber-200",
  },
  destructive: {
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    buttonBg: "bg-red-600 hover:bg-red-700",
    borderColor: "border-red-200",
  },
  primary: {
    icon: Send,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    buttonBg: "bg-slate-900 hover:bg-slate-800",
    borderColor: "border-indigo-200",
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700",
    borderColor: "border-emerald-200",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType = "primary",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}: ConfirmModalProps) {
  const config = actionConfig[actionType];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="relative border-b border-slate-100 p-6">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      config.iconBg
                    )}
                  >
                    <Icon className={cn("h-6 w-6", config.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 pt-2">
                <p className="text-sm leading-relaxed text-slate-600">{description}</p>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50",
                    config.buttonBg
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                        </svg>
                      </motion.div>
                      Processing...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for using the modal
import { useState, useCallback } from "react";

export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Partial<ConfirmModalProps>>({});
  const [resolveRef, setResolveRef] = useState<(value: boolean) => void>();

  const confirm = useCallback(
    (modalConfig: Omit<ConfirmModalProps, "isOpen" | "onClose" | "onConfirm">) => {
      return new Promise<boolean>((resolve) => {
        setConfig(modalConfig);
        setResolveRef(() => resolve);
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(true);
  }, [resolveRef]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(false);
  }, [resolveRef]);

  return {
    confirm,
    modalProps: {
      isOpen,
      onClose: handleClose,
      onConfirm: handleConfirm,
      ...config,
    } as ConfirmModalProps,
  };
}
