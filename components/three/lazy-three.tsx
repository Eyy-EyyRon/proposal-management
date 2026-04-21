"use client";

import dynamic from "next/dynamic";
import { usePerformanceMode } from "@/hooks/use-performance-mode";

const ParticleField3D = dynamic(
  () => import("./particle-field").then((m) => m.ParticleField),
  { ssr: false, loading: () => null }
);

const SecurityCore3D = dynamic(
  () => import("./security-core").then((m) => m.SecurityCore),
  { ssr: false, loading: () => null }
);

const UrgencyShard3D = dynamic(
  () => import("./urgency-shard").then((m) => m.UrgencyShard),
  { ssr: false, loading: () => null }
);

// ─── Performance-aware wrappers ──────────────────────────────

interface ParticleFieldProps { warp?: boolean }
export function LazyParticleField({ warp = false }: ParticleFieldProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) return null;
  return <ParticleField3D warp={warp} />;
}

interface SecurityCoreProps {
  hasActivity: boolean;
  p1Overdue?: boolean;
  elevatedCount?: number;
  activeTaskCount?: number;
}
export function LazySecurityCore(props: SecurityCoreProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) {
    if (!props.hasActivity) return null;
    const borderCls = props.p1Overdue ? "border-red-400" : props.elevatedCount ? "border-orange-400" : "border-cyan-400";
    const bgColor   = props.p1Overdue ? "#ef4444" : props.elevatedCount ? "#f97316" : "#06b6d4";
    return (
      <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${borderCls} bg-slate-900/60`}>
        <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: bgColor }} />
      </div>
    );
  }
  return <SecurityCore3D {...props} />;
}

interface UrgencyShardProps {
  msRemaining: number;
  msTotal: number;
  launching?: boolean;
  onLaunchComplete?: () => void;
}
export function LazyUrgencyShard(props: UrgencyShardProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) {
    const ratio = Math.min(1, Math.max(0, 1 - props.msRemaining / props.msTotal));
    const r = Math.round(220 + ratio * 35);
    const g = Math.round(80 - ratio * 65);
    return <div className="h-5 w-5 rounded-full animate-pulse" style={{ backgroundColor: `rgb(${r},${g},60)` }} />;
  }
  return <UrgencyShard3D {...props} />;
}
