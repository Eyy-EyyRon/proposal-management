"use client";

import { useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useElevation } from "@/contexts/auth-context";
import { useSystemStatus } from "@/contexts/system-status-context";
import { Activity, ShieldAlert, Zap, X } from "lucide-react";

export type CoreState = "silent" | "active" | "elevated" | "critical" | "emergency" | "probation";

// ── BPM map (spec: 60 / 120 / 180) ──────────────────────────
const BPM: Record<CoreState, number> = {
  silent:    0,
  active:    60,
  elevated:  120,
  critical:  180,
  emergency: 0,
  probation: 90,
};

// ── Color map: cyan → orange → red → stone ──────────────────
const COLORS: Record<CoreState, { main: string; emissive: string; wire: string; border: string }> = {
  silent:    { main: "#1e293b", emissive: "#0f172a", wire: "#334155", border: "border-slate-700" },
  active:    { main: "#06b6d4", emissive: "#0891b2", wire: "#67e8f9", border: "border-cyan-400" },
  elevated:  { main: "#f97316", emissive: "#c2410c", wire: "#fed7aa", border: "border-orange-400" },
  critical:  { main: "#ef4444", emissive: "#b91c1c", wire: "#fca5a5", border: "border-red-500"  },
  emergency: { main: "#333333", emissive: "#111111", wire: "#444444", border: "border-stone-600" },
  probation: { main: "#f59e0b", emissive: "#d97706", wire: "#fde68a", border: "border-amber-400" },
};

// ── Fragment data for shatter ────────────────────────────────
function makeFragments(count: number) {
  return Array.from({ length: count }, () => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0),
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 3.5,
      (Math.random() - 0.5) * 3.5,
      (Math.random() - 0.5) * 2
    ),
    rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
    rotVel: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0),
    scale: 0.04 + Math.random() * 0.1,
  }));
}

function FragmentsMesh({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const fragments = useMemo(() => makeFragments(52), []);

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;
    timeRef.current += delta;
    groupRef.current.children.forEach((child, i) => {
      const f = fragments[i];
      f.pos.addScaledVector(f.vel, delta);
      f.vel.y -= delta * 4; // gravity
      child.position.copy(f.pos);
      child.rotation.x += f.rotVel.x * delta;
      child.rotation.y += f.rotVel.y * delta;
      child.scale.setScalar(Math.max(0, f.scale * (1 - timeRef.current * 0.4)));
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {fragments.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot} scale={f.scale}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#333333" roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function CoreMesh({ state }: { state: CoreState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const shatterRef = useRef(0);

  const c = COLORS[state];

  useFrame((_, delta) => {
    if (!meshRef.current || !wireRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    if (state === "emergency") {
      // FREEZE → PETRIFY → implicit shatter via FragmentsMesh
      shatterRef.current = Math.min(1, shatterRef.current + delta * 0.8);
      const p = shatterRef.current;
      meshRef.current.rotation.y += delta * 6 * (1 - p); // decelerate
      meshRef.current.scale.setScalar(Math.max(0, 1 - p));
      wireRef.current.scale.setScalar(Math.max(0, 1 - p));
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(c.main);
      mat.emissiveIntensity = 0;
      return;
    }

    shatterRef.current = 0;

    if (state === "silent") {
      meshRef.current.rotation.y += delta * 0.15;
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.25 + Math.sin(t * 0.5) * 0.05;
      wireRef.current.scale.setScalar(1);
      meshRef.current.scale.setScalar(0.7);
      return;
    }

    const bpm = BPM[state];
    const freq = (bpm / 60) * Math.PI * 2;
    const pulse = 1 + Math.sin(t * freq) * 0.13;

    // Strobe for critical (P1): hard on/off flash at 180 BPM
    let opacity = 1;
    if (state === "critical") {
      opacity = Math.sin(t * freq) > 0 ? 1 : 0.55;
    }

    meshRef.current.rotation.y += delta * (state === "critical" ? 2.8 : state === "elevated" ? 1.6 : 0.7);
    meshRef.current.rotation.x += delta * 0.35;
    meshRef.current.scale.setScalar(pulse);
    wireRef.current.scale.setScalar(pulse * 1.08);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = (state === "active" ? 0.4 : 0.7) + Math.sin(t * freq) * 0.3;
    mat.opacity = opacity;
    mat.color.set(c.main);
    mat.emissive.set(c.emissive);
  });

  return (
    <group>
      {/* Main distorted body */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.72, 0]} />
        <MeshDistortMaterial
          color={c.main}
          emissive={c.emissive}
          emissiveIntensity={state === "silent" ? 0 : 0.5}
          roughness={0.1}
          metalness={0.8}
          distort={state === "silent" ? 0 : state === "critical" ? 0.5 : 0.25}
          speed={state === "critical" ? 6 : state === "elevated" ? 3 : 1.2}
          transparent
          opacity={state === "silent" ? 0.3 : 1}
        />
      </mesh>
      {/* Wireframe shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial
          color={c.wire}
          wireframe
          transparent
          opacity={state === "silent" ? 0.08 : 0.22}
        />
      </mesh>
      {/* Shatter fragments */}
      <FragmentsMesh active={state === "emergency"} />
    </group>
  );
}

// ── Quick Actions overlay ────────────────────────────────────
interface QuickActionsProps {
  state: CoreState;
  reasons: string[];
  onClose: () => void;
}

function QuickActionsOverlay({ state, reasons, onClose }: QuickActionsProps) {
  const c = COLORS[state];
  return (
    <div className={`absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 rounded-2xl border ${c.border} bg-slate-900/80 p-3 shadow-2xl backdrop-blur-md`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-current opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Security Core</span>
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-white/40 hover:text-white/80">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-1.5">
        {reasons.length === 0 ? (
          <p className="text-[11px] text-white/50">System nominal.</p>
        ) : (
          reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-lg bg-white/5 px-2 py-1.5">
              {state === "critical" ? <Zap className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                : state === "elevated" ? <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-orange-400" />
                : <Activity className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />}
              <span className="text-[11px] leading-snug text-white/80">{r}</span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 text-center">
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${
          state === "critical" ? "text-red-400" : state === "elevated" ? "text-orange-400" : "text-cyan-400"
        }`}>
          {state === "critical" ? "P1 OVERDUE — ACT NOW"
            : state === "elevated" ? `JIT ELEVATED — ${BPM[state]} BPM`
            : state === "active" ? `ACTIVE — ${BPM[state]} BPM`
            : "NOMINAL"}
        </span>
      </div>
    </div>
  );
}

// ── Static 2D fallback for Suspense / perfMode ───────────────
function CoreFallback({ state }: { state: CoreState }) {
  const c = COLORS[state];
  return (
    <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${c.border} bg-slate-900/60`}>
      <div className={`h-6 w-6 rounded-full animate-pulse`} style={{ background: c.main }} />
    </div>
  );
}

interface SecurityCoreProps {
  hasActivity: boolean;
  p1Overdue?: boolean;
  elevatedCount?: number;
  activeTaskCount?: number;
  pendingPromotionCount?: number;
}

export function SecurityCore({
  hasActivity,
  p1Overdue = false,
  elevatedCount = 0,
  activeTaskCount = 0,
  pendingPromotionCount = 0,
}: SecurityCoreProps) {
  const { isElevated, isCriticallyElevated } = useElevation();
  const { systemStatus } = useSystemStatus();
  const [showOverlay, setShowOverlay] = useState(false);

  const state: CoreState =
    systemStatus === "emergency" ? "emergency"
    : p1Overdue ? "critical"
    : isCriticallyElevated ? "critical"
    : isElevated ? "elevated"
    : pendingPromotionCount > 0 ? "probation"
    : hasActivity ? "active"
    : "silent";

  if (state === "silent") return null;

  const reasons: string[] = [
    ...(elevatedCount > 0 ? [`${elevatedCount} admin${elevatedCount > 1 ? "s" : ""} currently elevated`] : []),
    ...(p1Overdue ? ["1 P1 critical proposal overdue"] : []),
    ...(activeTaskCount > 0 ? [`${activeTaskCount} active task${activeTaskCount > 1 ? "s" : ""} in pipeline`] : []),
  ];

  const borderColor = COLORS[state].border;

  return (
    <div className="relative">
      {showOverlay && (
        <QuickActionsOverlay state={state} reasons={reasons} onClose={() => setShowOverlay(false)} />
      )}
      <button
        onClick={() => setShowOverlay((v) => !v)}
        className={`block h-16 w-16 rounded-full border-2 ${borderColor} overflow-hidden cursor-pointer shadow-lg transition hover:scale-105`}
        title={`Security Core — ${state}. Click for details.`}
      >
        <Suspense fallback={<CoreFallback state={state} />}>
          <Canvas
            frameloop="always"
            camera={{ position: [0, 0, 2.5], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[2, 3, 2]} intensity={1.5} color={COLORS[state].main} />
            <pointLight position={[-2, -1, 1]} intensity={0.4} />
            <CoreMesh state={state} />
          </Canvas>
        </Suspense>
      </button>
    </div>
  );
}
