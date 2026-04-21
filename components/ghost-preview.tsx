"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { X, Smartphone, AlertTriangle } from "lucide-react";
import { computeHealthScore } from "@/components/proposal-health-gauge";
import type { PetPeeve } from "@/lib/firestore";

// ─── Pet peeve scanner (re-use from linter) ──────────────────
function findPetPeeveHits(
  fieldValues: Record<string, string>,
  petPeeves: PetPeeve[]
): string[] {
  const allText = Object.values(fieldValues).join(" ");
  return petPeeves
    .filter((p) =>
      new RegExp(`\\b${p.forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi").test(allText)
    )
    .map((p) => p.forbidden);
}

// ─── Rendered proposal card (what the CEO sees) ──────────────
function ProposalCard({
  fieldValues,
  templateFields,
  petPeeves,
}: {
  fieldValues: Record<string, string>;
  templateFields: Array<{ id: string; name: string; required: boolean }>;
  petPeeves: PetPeeve[];
}) {
  const hits = useMemo(() => findPetPeeveHits(fieldValues, petPeeves), [fieldValues, petPeeves]);

  function highlight(text: string): React.ReactNode {
    if (!hits.length) return text;
    const parts = text.split(new RegExp(`(${hits.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi"));
    return parts.map((p, i) =>
      hits.some((h) => h.toLowerCase() === p.toLowerCase())
        ? <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-amber-900">{p}</mark>
        : p
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-5 text-slate-800">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
        <div className="h-7 w-7 rounded-full bg-[#780116]/10 flex items-center justify-center">
          <span className="text-[10px] font-bold text-[#780116]">H</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-slate-900">Hyacinth Industries</p>
          <p className="text-[9px] text-slate-400">Proposal · Draft Preview</p>
        </div>
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-100" />
      </div>

      <div className="space-y-3">
        {templateFields.map((f) => {
          const val = fieldValues[f.id];
          if (!val) return null;
          return (
            <div key={f.id}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{f.name}</p>
              <p className="text-[12px] leading-relaxed text-slate-800">{highlight(val)}</p>
            </div>
          );
        })}
      </div>

      {/* CEO gold pulse reflection */}
      <div className="pointer-events-none absolute bottom-6 right-6 h-10 w-10 rounded-full bg-amber-400/20 blur-lg animate-pulse" />
    </div>
  );
}

// ─── Main GhostPreview modal ──────────────────────────────────
export interface GhostPreviewProps {
  fieldValues: Record<string, string>;
  templateFields: Array<{ id: string; name: string; required: boolean }>;
  petPeeves: PetPeeve[];
  onClose: () => void;
}

// Shake animation for pet peeve detection
const shakeVariants: Variants = {
  idle: { x: 0, rotate: 0 },
  shake: {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    rotate: [0, -1, 1, -0.5, 0.5, 0],
    transition: { duration: 0.5, ease: [0.36, 0.07, 0.19, 0.97] },
  },
};

export function GhostPreview({ fieldValues, templateFields, petPeeves, onClose }: GhostPreviewProps) {
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(true);

  const hits = useMemo(() => findPetPeeveHits(fieldValues, petPeeves), [fieldValues, petPeeves]);
  const score = useMemo(() => computeHealthScore(fieldValues, templateFields), [fieldValues, templateFields]);

  // Simulate shard loading → content reveal
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Trigger shake when pet peeves detected
  useEffect(() => {
    if (!loading && hits.length > 0) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
  }, [loading, hits.length]);

  const scoreColor =
    score >= 90 ? "text-teal-500" :
    score >= 70 ? "text-amber-500" :
    "text-rose-500";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Isometric stage */}
        <motion.div
          initial={{ rotateX: 0, rotateY: 0, scale: 0.7, opacity: 0 }}
          animate={{ rotateX: 10, rotateY: -8, scale: 1, opacity: 1 }}
          exit={{ rotateX: 0, rotateY: 0, scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute -right-12 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Phone chassis */}
          <motion.div
            variants={shakeVariants}
            animate={shaking ? "shake" : "idle"}
            className="relative"
            style={{ width: 230, height: 498 }}
          >
            {/* Outer frame */}
            <div
              className="absolute inset-0 rounded-[36px] border-[3px] border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              {/* Side buttons */}
              <div className="absolute -right-[5px] top-[80px] h-[40px] w-[3px] rounded-full bg-slate-600" />
              <div className="absolute -right-[5px] top-[130px] h-[60px] w-[3px] rounded-full bg-slate-600" />
              <div className="absolute -left-[5px] top-[100px] h-[50px] w-[3px] rounded-full bg-slate-600" />

              {/* Screen bezel */}
              <div className="absolute inset-[3px] rounded-[33px] bg-slate-950 overflow-hidden">
                {/* Dynamic island */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 h-[20px] w-[70px] rounded-full bg-slate-950 z-10 border border-slate-800" />

                {/* Screen glow gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-transparent pointer-events-none z-10" />

                {/* Reflection overlay */}
                <div className="absolute inset-0 pointer-events-none z-20"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)",
                  }}
                />

                {/* Gold CEO ambient glow (bottom-right) */}
                <div className="pointer-events-none absolute bottom-8 right-4 h-14 w-14 rounded-full bg-amber-400/15 blur-xl z-20 animate-pulse" />

                {/* Content area */}
                <div className="absolute inset-0 pt-[36px] pb-[10px] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      // Shard loading spinner
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.6 }}
                        transition={{ duration: 0.4 }}
                        className="flex h-full items-center justify-center"
                      >
                        <div className="relative flex items-center justify-center">
                          <div
                            className="h-8 w-5 animate-spin"
                            style={{
                              background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(120,1,22,0.6))",
                              clipPath: "polygon(50% 0%, 100% 40%, 75% 100%, 25% 100%, 0% 40%)",
                              boxShadow: "0 0 16px rgba(239,68,68,0.6)",
                            }}
                          />
                          <div className="absolute h-12 w-12 rounded-full bg-rose-500/10 animate-ping" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="h-full relative"
                      >
                        <ProposalCard
                          fieldValues={fieldValues}
                          templateFields={templateFields}
                          petPeeves={petPeeves}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* HUD below phone */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur"
              style={{ width: 230 }}
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5 text-white/40" />
                <span className="text-[11px] text-white/50">iPhone 15 Pro Max</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hits.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {hits.length} flag{hits.length !== 1 ? "s" : ""}
                  </span>
                )}
                <span className={`text-[12px] font-bold ${scoreColor}`}>{score}%</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Pet peeve label */}
        {!loading && hits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 max-w-[180px] space-y-2"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">CEO Pet Peeves</p>
            {hits.map((h) => (
              <div key={h} className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-500/20">
                <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                <span className="text-[12px] text-amber-300 font-mono">"{h}"</span>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
