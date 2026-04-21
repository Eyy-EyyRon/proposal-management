"use client";

import dynamic from "next/dynamic";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import type { SystemGridProps } from "./system-grid";

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

const SystemGrid3D = dynamic(
  () => import("./system-grid").then((m) => m.SystemGrid),
  { ssr: false, loading: () => null }
);

const DataStream3D = dynamic(
  () => import("./data-stream").then((m) => m.DataStream),
  { ssr: false, loading: () => null }
);

const ProbationaryRing3D = dynamic(
  () => import("./probationary-ring").then((m) => m.ProbationaryRing),
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
  pendingPromotionCount?: number;
}
export function LazySecurityCore(props: SecurityCoreProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) {
    if (!props.hasActivity && !props.pendingPromotionCount) return null;
    const borderCls = props.p1Overdue ? "border-red-400" : props.elevatedCount ? "border-orange-400" : props.pendingPromotionCount ? "border-amber-400" : "border-cyan-400";
    const bgColor   = props.p1Overdue ? "#ef4444" : props.elevatedCount ? "#f97316" : props.pendingPromotionCount ? "#f59e0b" : "#06b6d4";
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

export function LazySystemGrid(props: SystemGridProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) return null;
  return <SystemGrid3D {...props} />;
}

interface DataStreamWrapperProps { queueSize: number; targetX?: number; targetY?: number; }
export function LazyDataStream(props: DataStreamWrapperProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) {
    if (props.queueSize === 0) return null;
    return (
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-8 opacity-40">
        <div className="flex gap-1">
          {Array.from({ length: Math.min(props.queueSize, 8) }).map((_, i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }
  return <DataStream3D {...props} />;
}

interface ProbationaryRingWrapperProps {
  msRemaining: number;
  msTotal: number;
  size?: number;
}
export function LazyProbationaryRing(props: ProbationaryRingWrapperProps) {
  const { perfMode } = usePerformanceMode();
  if (perfMode) {
    const progress = Math.min(1, Math.max(0, 1 - props.msRemaining / props.msTotal));
    const color = progress > 0.75 ? "#fb923c" : "#14b8a6";
    return (
      <div
        className="rounded-full animate-spin"
        style={{
          width: props.size ?? 64,
          height: props.size ?? 64,
          border: `2px solid ${color}`,
          borderTopColor: "transparent",
          animationDuration: `${Math.max(0.4, 2 - progress * 1.6)}s`,
        }}
      />
    );
  }
  return <ProbationaryRing3D {...props} />;
}
