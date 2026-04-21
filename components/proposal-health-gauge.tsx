"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface HealthGaugeProps {
  fieldValues: Record<string, string>;
  templateFields: Array<{ id: string; name: string; required: boolean }>;
  size?: "sm" | "md";
}

const PLACEHOLDER_RE = /\[([^\]]+)\]/g;
const INFORMAL_WORDS = ["stuff", "things", "cheap", "bad", "good", "nice", "lot", "loads", "tons", "maybe", "kinda", "basically", "literally"];

export function computeHealthScore(
  fieldValues: Record<string, string>,
  templateFields: Array<{ id: string; required: boolean }>
): number {
  const allText = Object.values(fieldValues).join(" ").trim();
  const words = allText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Unfilled placeholders
  const placeholderCount = (allText.match(PLACEHOLDER_RE) || []).length;

  // Empty required fields
  const emptyRequired = templateFields.filter(
    (f) => f.required && !fieldValues[f.id]?.trim()
  ).length;

  // Informal language hits
  const informalHits = words.filter((w) =>
    INFORMAL_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, ""))
  ).length;

  // Word count score: 0 = 0 words, 100 = 80+ words
  const wordScore = Math.min(100, (wordCount / 80) * 100);

  // Penalty per issue
  const penalty = placeholderCount * 15 + emptyRequired * 20 + informalHits * 8;

  return Math.max(0, Math.round(wordScore - penalty));
}

export function ProposalHealthGauge({ fieldValues, templateFields, size = "sm" }: HealthGaugeProps) {
  const score = useMemo(
    () => computeHealthScore(fieldValues, templateFields),
    [fieldValues, templateFields]
  );

  const dim = size === "sm" ? 36 : 52;
  const strokeW = size === "sm" ? 3.5 : 5;
  const r = (dim - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 90 ? "#14B8A6" :
    score >= 70 ? "#EAB308" :
    score >= 40 ? "#F97316" :
    "#EF4444";

  const isPulse = score < 70 && score > 0;
  const isGlow  = score >= 90;

  const label = size === "sm" ? null : `${score}`;

  return (
    <div
      className="relative shrink-0 inline-flex items-center justify-center"
      style={{ width: dim, height: dim }}
      title={`Health: ${score}%`}
    >
      {isGlow && (
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: `0 0 10px 3px ${color}55` }}
        />
      )}
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
        <circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeW}
        />
        <motion.circle
          cx={dim / 2} cy={dim / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={isPulse ? "animate-pulse" : ""}
        />
      </svg>
      {label && (
        <span
          className="absolute text-[11px] font-bold"
          style={{ color, transform: "rotate(90deg)" }}
        >
          {label}
        </span>
      )}
      {size === "sm" && (
        <span
          className="absolute text-[9px] font-bold"
          style={{ color, transform: "rotate(90deg)" }}
        >
          {score}
        </span>
      )}
    </div>
  );
}
