"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── Layer A: gold foreground particles ─────────────────────
const COUNT_A = 220;
// ─── Layer B: indigo deep-field particles ───────────────────
const COUNT_B = 160;
// ─── Connection line max distance ────────────────────────────
const LINK_DIST = 2.8;
const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
const MAX_LINKS = 300;

// ─── Constellation particles ─────────────────────────────────
interface ConstellationProps {
  warpProgress: React.MutableRefObject<number>;
}

function Constellation({ warpProgress }: ConstellationProps) {
  const pointsARef = useRef<THREE.Points>(null);
  const pointsBRef = useRef<THREE.Points>(null);
  const linesRef   = useRef<THREE.LineSegments>(null);
  const { mouse } = useThree();
  const timeRef = useRef(0);

  const { posA, velA, homeA, posB, velB, linePositions } = useMemo(() => {
    const posA  = new Float32Array(COUNT_A * 3);
    const velA  = new Float32Array(COUNT_A * 3);
    const homeA = new Float32Array(COUNT_A * 3); // each particle's own home
    const posB  = new Float32Array(COUNT_B * 3);
    const velB  = new Float32Array(COUNT_B * 3);
    // Layer A — spread evenly, give each a unique drift direction
    for (let i = 0; i < COUNT_A; i++) {
      const hx = (Math.random() - 0.5) * 16;
      const hy = (Math.random() - 0.5) * 10;
      posA[i * 3]     = hx;
      posA[i * 3 + 1] = hy;
      posA[i * 3 + 2] = (Math.random() - 0.5) * 2;
      homeA[i * 3]     = hx;
      homeA[i * 3 + 1] = hy;
      homeA[i * 3 + 2] = posA[i * 3 + 2];
      // Random ambient drift
      velA[i * 3]     = (Math.random() - 0.5) * 0.006;
      velA[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
    }
    // Layer B — wider, slower
    for (let i = 0; i < COUNT_B; i++) {
      posB[i * 3]     = (Math.random() - 0.5) * 22;
      posB[i * 3 + 1] = (Math.random() - 0.5) * 14;
      posB[i * 3 + 2] = -2 - Math.random() * 3;
      velB[i * 3]     = (Math.random() - 0.5) * 0.0015;
      velB[i * 3 + 1] = (Math.random() - 0.5) * 0.0015;
    }
    const linePositions = new Float32Array(MAX_LINKS * 6);
    return { posA, velA: { current: velA }, homeA, posB, velB: { current: velB }, linePositions };
  }, []);

  useFrame((_, delta) => {
    const wa = pointsARef.current;
    const wb = pointsBRef.current;
    const wl = linesRef.current;
    if (!wa || !wb || !wl) return;

    timeRef.current += delta;
    const warp = warpProgress.current;
    if (warp > 0 && warp < 1) warpProgress.current = Math.min(1, warp + delta * 2.2);

    const pa = wa.geometry.attributes.position.array as Float32Array;
    const pb = wb.geometry.attributes.position.array as Float32Array;
    const vA = velA.current;
    const vB = velB.current;

    // Mouse repulsion radius
    const REPEL_R  = 3.2;
    const REPEL_R2 = REPEL_R * REPEL_R;
    const mouseActive = Math.abs(mouse.x) > 0.015 || Math.abs(mouse.y) > 0.015;
    const mx = mouse.x * 6;
    const my = mouse.y * 3.5;

    // ── Update Layer A ─────────────────────────────────────
    for (let i = 0; i < COUNT_A; i++) {
      const idx = i * 3;

      if (warp > 0) {
        const spd = 0.055 + warp * 0.22;
        pa[idx]     += (0 - pa[idx]) * spd;
        pa[idx + 1] += (0 - pa[idx + 1]) * spd;
        pa[idx + 2] -= delta * (3 + warp * 14);
        continue;
      }

      // 1. Mouse REPULSION — pushes particles away from cursor
      if (mouseActive) {
        const dx = pa[idx]     - mx;
        const dy = pa[idx + 1] - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_R2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = 0.006 * (1 - d / REPEL_R);
          vA[idx]     += (dx / d) * push;
          vA[idx + 1] += (dy / d) * push;
        }
      }

      // 2. Spring back toward THIS particle's own home position (not world origin)
      vA[idx]     += (homeA[idx]     - pa[idx])     * 0.0006;
      vA[idx + 1] += (homeA[idx + 1] - pa[idx + 1]) * 0.0006;

      // 3. Damping + velocity cap
      vA[idx]     *= 0.94;
      vA[idx + 1] *= 0.94;
      const spd2 = vA[idx] * vA[idx] + vA[idx + 1] * vA[idx + 1];
      if (spd2 > 0.0025) {
        const s = Math.sqrt(spd2);
        vA[idx]     = (vA[idx]     / s) * 0.05;
        vA[idx + 1] = (vA[idx + 1] / s) * 0.05;
      }

      pa[idx]     += vA[idx];
      pa[idx + 1] += vA[idx + 1];
    }

    // ── Update Layer B — slow drift only ──────────────────
    for (let i = 0; i < COUNT_B; i++) {
      const idx = i * 3;
      if (warp > 0) {
        pb[idx + 2] -= delta * (5 + warp * 18);
      } else {
        pb[idx]     += vB[idx];
        pb[idx + 1] += vB[idx + 1];
        if (pb[idx] > 12)     pb[idx] = -12;
        if (pb[idx] < -12)    pb[idx] = 12;
        if (pb[idx+1] > 8)    pb[idx+1] = -8;
        if (pb[idx+1] < -8)   pb[idx+1] = 8;
      }
    }

    wa.geometry.attributes.position.needsUpdate = true;
    wb.geometry.attributes.position.needsUpdate = true;

    // ── Fade all layers during warp ────────────────────────
    const opA = wa.material as THREE.PointsMaterial;
    const opB = wb.material as THREE.PointsMaterial;
    const opL = wl.material as THREE.LineBasicMaterial;
    if (warp > 0) {
      const fade = Math.max(0, 1 - warp * 1.4);
      opA.opacity = fade * 0.75;
      opB.opacity = fade * 0.3;
      opL.opacity = fade * 0.25;
    }

    // ── Build connection lines between nearby Layer A particles ──
    if (warp === 0) {
      let linkCount = 0;
      const lp = wl.geometry.attributes.position.array as Float32Array;
      outer: for (let i = 0; i < COUNT_A; i++) {
        for (let j = i + 1; j < COUNT_A; j++) {
          if (linkCount >= MAX_LINKS) break outer;
          const ix = i * 3, jx = j * 3;
          const dx = pa[ix] - pa[jx];
          const dy = pa[ix+1] - pa[jx+1];
          const dz = pa[ix+2] - pa[jx+2];
          const d2 = dx*dx + dy*dy + dz*dz;
          if (d2 < LINK_DIST_SQ) {
            const base = linkCount * 6;
            lp[base]   = pa[ix];   lp[base+1] = pa[ix+1]; lp[base+2] = pa[ix+2];
            lp[base+3] = pa[jx];   lp[base+4] = pa[jx+1]; lp[base+5] = pa[jx+2];
            linkCount++;
          }
        }
      }
      // Zero out unused slots
      for (let k = linkCount; k < MAX_LINKS; k++) {
        lp.fill(0, k * 6, k * 6 + 6);
      }
      wl.geometry.attributes.position.needsUpdate = true;
      wl.geometry.setDrawRange(0, linkCount * 2);
    }
  });

  return (
    <>
      {/* Layer A — gold foreground */}
      <points ref={pointsARef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posA, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          color="#f59e0b"
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Layer B — indigo deep field */}
      <points ref={pointsBRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[posB, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#818cf8"
          transparent
          opacity={0.28}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Connection lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

// ─── Rotating wireframe icosahedron in background ─────────────
function GeoCore({ warpProgress }: { warpProgress: React.MutableRefObject<number> }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const warp = warpProgress.current;
    if (!outerRef.current || !innerRef.current) return;

    if (warp > 0) {
      // Implode during warp
      const s = Math.max(0, 1 - warp * 1.5);
      outerRef.current.scale.setScalar(s);
      innerRef.current.scale.setScalar(s);
      return;
    }

    // Slow counter-rotation
    outerRef.current.rotation.y = t * 0.08;
    outerRef.current.rotation.x = t * 0.05;
    innerRef.current.rotation.y = -t * 0.12;
    innerRef.current.rotation.z = t * 0.04;

    // Breathe
    const breath = 1 + Math.sin(t * 0.6) * 0.03;
    outerRef.current.scale.setScalar(breath);
    innerRef.current.scale.setScalar(breath * 0.72);

    // Pulse opacity
    const matO = outerRef.current.material as THREE.MeshBasicMaterial;
    const matI = innerRef.current.material as THREE.MeshBasicMaterial;
    matO.opacity = 0.06 + Math.sin(t * 0.9) * 0.025;
    matI.opacity = 0.09 + Math.sin(t * 1.3) * 0.03;
  });

  return (
    <group position={[0, 0, -2]}>
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[3.2, 1]} />
        <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1.8, 0]} />
        <meshBasicMaterial color="#a5b4fc" wireframe transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ─── Ambient glow sprite in center ───────────────────────────
function CenterGlow() {
  const ref = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.04 + Math.sin(timeRef.current * 0.7) * 0.02;
  });
  return (
    <mesh ref={ref} position={[0, 0, -1]}>
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial color="#78011620" transparent opacity={0.05} depthWrite={false} />
    </mesh>
  );
}

// ─── Exported component ───────────────────────────────────────
export interface ParticleFieldProps {
  warp?: boolean;
}

export function ParticleField({ warp = false }: ParticleFieldProps) {
  const warpProgress = useRef(0);
  if (warp && warpProgress.current === 0) {
    warpProgress.current = 0.001;
  }

  return (
    <Canvas
      frameloop="always"
      camera={{ position: [0, 0, 9], fov: 58 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      gl={{ antialias: false, alpha: true }}
    >
      <fog attach="fog" args={["#0f172a", 12, 22]} />
      <GeoCore warpProgress={warpProgress} />
      <Constellation warpProgress={warpProgress} />
      <CenterGlow />
    </Canvas>
  );
}
