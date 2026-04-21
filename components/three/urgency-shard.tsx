"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useSystemStatus } from "@/contexts/system-status-context";

// ── Shard mesh driven by urgencyRatio ───────────────────────
interface ShardMeshProps {
  urgencyRatio: number;
  launchProxy: { y: number; scale: number; visible: boolean };
  shatterProxy: { progress: number };
}

function ShardMesh({ urgencyRatio, launchProxy, shatterProxy }: ShardMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // BPM formula: f = BPM / 60, BPM ranges 40 → 160 as deadline approaches
  const bpm = 40 + urgencyRatio * 120;
  const freq = (bpm / 60) * Math.PI * 2;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    // Emergency shatter: freeze + petrify + scale out
    if (shatterProxy.progress > 0) {
      const p = shatterProxy.progress;
      meshRef.current.rotation.y += delta * 10 * (1 - p); // freeze
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x333333);
      mat.emissive.setHex(0x111111);
      mat.emissiveIntensity = 0;
      meshRef.current.scale.setScalar(Math.max(0, 1 - p * 1.2));
      if (wireRef.current) wireRef.current.scale.setScalar(Math.max(0, 1 - p * 1.2));
      return;
    }

    // GSAP-driven launch
    meshRef.current.position.y = launchProxy.y;
    const s = Math.max(0, launchProxy.scale);
    meshRef.current.scale.setScalar(s);
    if (wireRef.current) wireRef.current.scale.setScalar(s * 1.08);
    if (!launchProxy.visible) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    // Heartbeat pulse — no numbers, only visual rhythm
    const pulse = 1 + Math.sin(t * freq) * (0.1 + urgencyRatio * 0.2);
    meshRef.current.scale.setScalar(pulse * s);

    meshRef.current.rotation.y += delta * (0.5 + urgencyRatio * 2.0);
    meshRef.current.rotation.z += delta * 0.25;
    meshRef.current.position.y = launchProxy.y + Math.sin(t * 1.4) * 0.04;

    // Color: interpolate rose-400 → deep red at urgencyRatio=1
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.setRGB(1.0, 0.44 - urgencyRatio * 0.35, 0.44 - urgencyRatio * 0.35);
    mat.emissiveIntensity = 0.25 + urgencyRatio * 0.65 + Math.sin(t * freq) * 0.15;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial
          color="#f87171"
          emissive="#7f1d1d"
          emissiveIntensity={0.4}
          roughness={0.08}
          metalness={0.65}
        />
      </mesh>
      <mesh ref={wireRef}>
        <octahedronGeometry args={[0.62, 0]} />
        <meshBasicMaterial color="#fca5a5" wireframe transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

// ── Static fallback ──────────────────────────────────────────
function ShardFallback({ urgencyRatio }: { urgencyRatio: number }) {
  const r = Math.round(220 + urgencyRatio * 35);
  const g = Math.round(80 - urgencyRatio * 65);
  return (
    <div
      className="h-5 w-5 rounded-full animate-pulse"
      style={{ backgroundColor: `rgb(${r},${g},60)` }}
    />
  );
}

export interface UrgencyShardProps {
  msRemaining: number;
  msTotal: number;
  /** When true, GSAP fires the vertical shoot-up and calls onLaunchComplete */
  launching?: boolean;
  onLaunchComplete?: () => void;
}

export function UrgencyShard({
  msRemaining,
  msTotal,
  launching = false,
  onLaunchComplete,
}: UrgencyShardProps) {
  const { systemStatus } = useSystemStatus();
  const urgencyRatio = Math.min(1, Math.max(0, 1 - msRemaining / msTotal));

  // Proxy objects driven by GSAP, read in useFrame
  const launchProxy = useRef({ y: 0, scale: 1, visible: true });
  const shatterProxy = useRef({ progress: 0 });
  const launchTimeline = useRef<gsap.core.Timeline | null>(null);
  const shatterTimeline = useRef<gsap.core.Timeline | null>(null);

  // GSAP shoot-up when launching prop flips true
  useEffect(() => {
    if (!launching) return;
    if (launchTimeline.current) launchTimeline.current.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        launchProxy.current.visible = false;
        onLaunchComplete?.();
      },
    });
    tl.to(launchProxy.current, { y: 4.5, scale: 0, duration: 0.65, ease: "power3.in" });
    launchTimeline.current = tl;
    return () => { tl.kill(); };
  }, [launching, onLaunchComplete]);

  // GSAP shatter when Nuclear Brake fires
  useEffect(() => {
    if (systemStatus !== "emergency") return;
    if (shatterTimeline.current) shatterTimeline.current.kill();
    const tl = gsap.timeline();
    // 1. Freeze (instant stop of rotation via shatterProgress)
    tl.to(shatterProxy.current, { progress: 0.1, duration: 0.05, ease: "none" });
    // 2. Petrify (color → gray handled in useFrame via progress value)
    tl.to(shatterProxy.current, { progress: 0.5, duration: 0.4, ease: "power1.in" });
    // 3. Shatter / scale out
    tl.to(shatterProxy.current, { progress: 1.0, duration: 0.55, ease: "expo.out" });
    shatterTimeline.current = tl;
    return () => { tl.kill(); };
  }, [systemStatus]);

  return (
    <div className="relative h-20 w-20" title="P1 Urgency Shard — visual urgency only">
      <Suspense fallback={<ShardFallback urgencyRatio={urgencyRatio} />}>
        <Canvas
          frameloop="always"
          camera={{ position: [0, 0, 2.2], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.45} />
          <pointLight position={[2, 2, 2]} intensity={1.6} color="#fca5a5" />
          <pointLight position={[-1, -1, 1]} intensity={0.3} color="#f97316" />
          <ShardMesh
            urgencyRatio={urgencyRatio}
            launchProxy={launchProxy.current}
            shatterProxy={shatterProxy.current}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
