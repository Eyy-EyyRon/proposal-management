"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, CheckCircle, AlertTriangle, XCircle, Sparkles, X } from "lucide-react";
import type { PetPeeve } from "@/lib/firestore";

// ─── Built-in word sanitizer ──────────────────────────────────
const BUILT_IN_REPLACEMENTS: Record<string, string> = {
  "cheap":        "affordable",
  "stuff":        "deliverables",
  "things":       "items",
  "bad":          "suboptimal",
  "good":         "effective",
  "nice":         "exceptional",
  "lots":         "a significant number of",
  "tons":         "substantial quantities of",
  "kinda":        "somewhat",
  "basically":    "in essence",
  "literally":    "in practice",
  "maybe":        "potentially",
  "buy":          "invest in",
  "cheap price":  "competitive pricing",
  "get":          "obtain",
  "use":          "leverage",
};

const PLACEHOLDER_RE = /\[([^\]]+)\]/g;

// ─── Types ────────────────────────────────────────────────────
export interface LintIssue {
  id: string;
  type: "error" | "warn" | "info";
  field: string;
  message: string;
  autoFix?: { from: string; to: string };
}

interface MagicLinterProps {
  fieldValues: Record<string, string>;
  templateFields: Array<{ id: string; name: string; required: boolean }>;
  petPeeves: PetPeeve[];
  onFixAll: (updated: Record<string, string>) => void;
  onClose: () => void;
}

function scanField(
  fieldId: string,
  fieldName: string,
  value: string,
  petPeeves: PetPeeve[]
): LintIssue[] {
  const issues: LintIssue[] = [];

  // Unfilled placeholders
  const placeholders = value.match(PLACEHOLDER_RE);
  if (placeholders) {
    placeholders.forEach((ph) => {
      issues.push({
        id: `${fieldId}-ph-${ph}`,
        type: "error",
        field: fieldName,
        message: `Unfilled placeholder: ${ph}`,
      });
    });
  }

  // Built-in informal words
  Object.entries(BUILT_IN_REPLACEMENTS).forEach(([bad, good]) => {
    const re = new RegExp(`\\b${bad}\\b`, "gi");
    if (re.test(value)) {
      issues.push({
        id: `${fieldId}-builtin-${bad}`,
        type: "warn",
        field: fieldName,
        message: `"${bad}" → consider "${good}"`,
        autoFix: { from: bad, to: good },
      });
    }
  });

  // CEO pet peeves
  petPeeves.forEach((peeve) => {
    const re = new RegExp(`\\b${peeve.forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(value)) {
      issues.push({
        id: `${fieldId}-peeve-${peeve.id}`,
        type: peeve.severity === "error" ? "error" : "warn",
        field: fieldName,
        message: `CEO flags: "${peeve.forbidden}" → "${peeve.suggestion}"`,
        autoFix: { from: peeve.forbidden, to: peeve.suggestion },
      });
    }
  });

  return issues;
}

export function MagicLinter({ fieldValues, templateFields, petPeeves, onFixAll, onClose }: MagicLinterProps) {
  const [sweeping, setSweeping] = useState(false);
  const [scanned, setScanned] = useState(false);

  const issues = useMemo<LintIssue[]>(() => {
    if (!scanned) return [];
    const all: LintIssue[] = [];
    templateFields.forEach((f) => {
      const val = fieldValues[f.id] ?? "";
      if (f.required && !val.trim()) {
        all.push({
          id: `${f.id}-empty`,
          type: "error",
          field: f.name,
          message: `Required field is empty`,
        });
      } else {
        all.push(...scanField(f.id, f.name, val, petPeeves));
      }
    });
    return all;
  }, [scanned, fieldValues, templateFields, petPeeves]);

  const errors = issues.filter((i) => i.type === "error");
  const warns  = issues.filter((i) => i.type === "warn");

  const handleScan = async () => {
    setSweeping(true);
    await new Promise((r) => setTimeout(r, 700));
    setScanned(true);
    setSweeping(false);
  };

  const handleFixAll = () => {
    const updated = { ...fieldValues };
    issues.forEach((issue) => {
      if (!issue.autoFix) return;
      const field = templateFields.find((f) => f.name === issue.field);
      if (!field) return;
      const re = new RegExp(`\\b${issue.autoFix.from}\\b`, "gi");
      updated[field.id] = (updated[field.id] ?? "").replace(re, issue.autoFix.from === issue.autoFix.to ? issue.autoFix.to : issue.autoFix.to);
    });
    // Also remove placeholder patterns that have been matched
    onFixAll(updated);
  };

  const fixableCount = issues.filter((i) => i.autoFix).length;
  const clean = scanned && issues.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
            <Wand2 className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-[13px] font-semibold text-slate-900">Magic Linter</span>
          {scanned && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              clean ? "bg-emerald-50 text-emerald-700" :
              errors.length > 0 ? "bg-rose-50 text-rose-700" :
              "bg-amber-50 text-amber-700"
            }`}>
              {clean ? "Clean" : `${errors.length}E · ${warns.length}W`}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-slate-100">
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Sweep button */}
        <button
          onClick={handleScan}
          disabled={sweeping}
          className="relative w-full overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2.5 text-[13px] font-semibold text-amber-700 transition hover:border-amber-300 disabled:opacity-60"
        >
          {sweeping && (
            <motion.div
              className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
              animate={{ x: ["0%", "1200%"] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {sweeping ? "Scanning proposal…" : scanned ? "Re-scan" : "Scan Now"}
          </span>
        </button>

        {/* Issues list */}
        <AnimatePresence initial={false}>
          {scanned && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5 max-h-56 overflow-y-auto"
            >
              {clean ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  No issues found — looking great!
                </div>
              ) : (
                issues.map((issue) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] ${
                      issue.type === "error"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {issue.type === "error"
                      ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    }
                    <div>
                      <span className="font-semibold">{issue.field}: </span>
                      {issue.message}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fix All button */}
        {scanned && fixableCount > 0 && (
          <button
            onClick={handleFixAll}
            className="w-full rounded-xl bg-[#780116] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#C32F27]"
          >
            Fix All ({fixableCount} auto-fixable)
          </button>
        )}
      </div>
    </motion.div>
  );
}
