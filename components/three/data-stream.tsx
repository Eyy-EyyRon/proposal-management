"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Density maps 0–20 queue items → particle count 30–200 ────
function densityCount(queueSize: number): number {
  return Math.min(200, 30 + queueSize * 8);
}

interface StreamParticlesProps {
  queueSize: number;
  targetRef: React.MutableRefObject<THREE.Vector3>;
}

function StreamParticles({ queueSize, targetRef }: StreamParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = densityCount(queueSize);

  const { positions, velocities, phases } = useMemo(() => {
    const positions  = new Float32Array(200 * 3);
    const velocities = new Float32Array(200 * 3);
    const phases     = new Float32Array(200);
    for (let i = 0; i < 200; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      velocities[i * 3]     = (Math.random() - 0.5) * 0.003;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.003;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, velocities: { current: velocities }, phases };
  }, []);

  const timeRef = useRef(0);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const pa = pts.geometry.attributes.position.array as Float32Array;
    const va = velocities.current;

    const tx = targetRef.current.x;
    const ty = targetRef.current.y;

    const activeCount = densityCount(queueSize);

    for (let i = 0; i < 200; i++) {
      const idx = i * 3;

      if (i >= activeCount) {
        // Inactive particles — park offscreen
        pa[idx]     = 999;
        pa[idx + 1] = 999;
        pa[idx + 2] = 999;
        continue;
      }

      // Drift toward the target (Verification Queue icon position)
      const dx = tx - pa[idx];
      const dy = ty - pa[idx + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pull stronger the more items are in queue
      const pullStr = 0.0004 + (queueSize / 20) * 0.0012;
      if (dist > 0.5) {
        va[idx]     += (dx / dist) * pullStr;
        va[idx + 1] += (dy / dist) * pullStr;
      } else {
        // Scatter when at target — create a swirling cloud
        const angle = t * 1.2 + phases[i];
        const radius = 0.4 + Math.sin(t * 0.8 + phases[i]) * 0.2;
        va[idx]     += (Math.cos(angle) * radius - pa[idx] + tx) * 0.02;
        va[idx + 1] += (Math.sin(angle) * radius - pa[idx+1] + ty) * 0.02;
      }

      // Slight ambient oscillation
      va[idx]     += Math.sin(t * 0.7 + phases[i]) * 0.00015;
      va[idx + 1] += Math.cos(t * 0.5 + phases[i] * 1.3) * 0.00015;

      // Damping
      va[idx]     *= 0.965;
      va[idx + 1] *= 0.965;

      pa[idx]     += va[idx];
      pa[idx + 1] += va[idx + 1];

      // Wrap
      if (pa[idx] > 8)     pa[idx] = -8;
      if (pa[idx] < -8)    pa[idx] = 8;
      if (pa[idx+1] > 5.5) pa[idx+1] = -5.5;
      if (pa[idx+1] < -5.5)pa[idx+1] = 5.5;
    }

    pts.geometry.attributes.position.needsUpdate = true;

    // Pulse opacity with queue density
    const mat = pts.material as THREE.PointsMaterial;
    const densityOpacity = 0.3 + (queueSize / 20) * 0.5;
    mat.opacity = Math.min(0.8, densityOpacity + Math.sin(t * 1.5) * 0.05);
    mat.size = 0.04 + (queueSize / 20) * 0.03;
  });

  // Keep drawRange in sync with active count
  useEffect(() => {
    const pts = pointsRef.current;
    if (pts) pts.geometry.setDrawRange(0, count);
  }, [count]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#14b8a6"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ── Exported component ────────────────────────────────────────
export interface DataStreamProps {
  /** Number of proposals currently in the verification queue */
  queueSize: number;
  /** World-space target position (where the queue icon is).
   *  Leave as default (0, -2, 0) to drift toward bottom-center. */
  targetX?: number;
  targetY?: number;
}

export function DataStream({ queueSize, targetX = 0, targetY = -2 }: DataStreamProps) {
  const targetRef = useRef(new THREE.Vector3(targetX, targetY, 0));

  useEffect(() => {
    targetRef.current.set(targetX, targetY, 0);
  }, [targetX, targetY]);

  return (
    <Canvas
      frameloop="always"
      camera={{ position: [0, 0, 10], fov: 55 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      gl={{ antialias: false, alpha: true }}
    >
      <fog attach="fog" args={["#0f172a", 12, 20]} />
      <StreamParticles queueSize={queueSize} targetRef={targetRef} />
    </Canvas>
  );
}
