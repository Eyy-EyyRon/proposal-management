"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Grid config ───────────────────────────────────────────────
const COLS = 22;
const ROWS = 14;
const SPACING = 1.1;
const MAX_RIPPLES = 6;

interface RippleState {
  x: number;
  y: number;
  age: number;     // 0 → 1
  strength: number; // 0.3 → 1.0
}

// ── Grid mesh (points on a plane + connection lines) ─────────
function GridMesh({ rippleRef }: { rippleRef: React.MutableRefObject<RippleState[]> }) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef  = useRef<THREE.LineSegments>(null);
  const timeRef   = useRef(0);

  const { basePos, linePositions } = useMemo(() => {
    const count = COLS * ROWS;
    const basePos = new Float32Array(count * 3);
    const cx = ((COLS - 1) * SPACING) / 2;
    const cy = ((ROWS - 1) * SPACING) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = (row * COLS + col) * 3;
        basePos[i]     = col * SPACING - cx;
        basePos[i + 1] = row * SPACING - cy;
        basePos[i + 2] = 0;
      }
    }
    // Horizontal + vertical line segments
    const lineCount = ROWS * (COLS - 1) + COLS * (ROWS - 1);
    const linePositions = new Float32Array(lineCount * 6);
    let li = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const a = (row * COLS + col) * 3;
        const b = (row * COLS + col + 1) * 3;
        linePositions[li++] = basePos[a]; linePositions[li++] = basePos[a+1]; linePositions[li++] = basePos[a+2];
        linePositions[li++] = basePos[b]; linePositions[li++] = basePos[b+1]; linePositions[li++] = basePos[b+2];
      }
    }
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 1; row++) {
        const a = (row * COLS + col) * 3;
        const b = ((row + 1) * COLS + col) * 3;
        linePositions[li++] = basePos[a]; linePositions[li++] = basePos[a+1]; linePositions[li++] = basePos[a+2];
        linePositions[li++] = basePos[b]; linePositions[li++] = basePos[b+1]; linePositions[li++] = basePos[b+2];
      }
    }
    return { basePos, linePositions };
  }, []);

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    const lns = linesRef.current;
    if (!pts || !lns) return;
    timeRef.current += delta;
    const t = timeRef.current;

    const pa = pts.geometry.attributes.position.array as Float32Array;
    const la = lns.geometry.attributes.position.array as Float32Array;
    const ripples = rippleRef.current;

    // Age ripples
    for (let r = ripples.length - 1; r >= 0; r--) {
      ripples[r].age += delta * 0.55;
      if (ripples[r].age >= 1) ripples.splice(r, 1);
    }

    const count = COLS * ROWS;
    const cx = ((COLS - 1) * SPACING) / 2;
    const cy = ((ROWS - 1) * SPACING) / 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = (row * COLS + col) * 3;
        const bx = col * SPACING - cx;
        const by = row * SPACING - cy;

        // Ambient slow wave
        let zOffset = Math.sin(t * 0.4 + col * 0.35 + row * 0.25) * 0.08;

        // Ripple contributions
        for (const rip of ripples) {
          const dx = bx - rip.x;
          const dy = by - rip.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const waveFront = rip.age * 12; // wave travels 12 units in 1s
          const proximity = 1.5;
          const diff = Math.abs(dist - waveFront);
          if (diff < proximity) {
            const envelope = (1 - diff / proximity) * rip.strength * (1 - rip.age);
            zOffset += Math.sin((dist - waveFront) * 3) * envelope * 0.55;
          }
        }

        pa[i + 2] = zOffset;
      }
    }

    // Copy point positions back to line buffer
    let li = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 1; col++) {
        const a = (row * COLS + col) * 3;
        const b = (row * COLS + col + 1) * 3;
        la[li++] = pa[a]; la[li++] = pa[a+1]; la[li++] = pa[a+2];
        la[li++] = pa[b]; la[li++] = pa[b+1]; la[li++] = pa[b+2];
      }
    }
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 1; row++) {
        const a = (row * COLS + col) * 3;
        const b = ((row + 1) * COLS + col) * 3;
        la[li++] = pa[a]; la[li++] = pa[a+1]; la[li++] = pa[a+2];
        la[li++] = pa[b]; la[li++] = pa[b+1]; la[li++] = pa[b+2];
      }
    }

    pts.geometry.attributes.position.needsUpdate = true;
    lns.geometry.attributes.position.needsUpdate = true;

    void count;
  });

  const count = COLS * ROWS;
  const pointPositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pointPositions[i * 3]     = basePos[i * 3];
    pointPositions[i * 3 + 1] = basePos[i * 3 + 1];
    pointPositions[i * 3 + 2] = basePos[i * 3 + 2];
  }

  return (
    <>
      {/* Grid nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.045} color="#6366f1" transparent opacity={0.45} sizeAttenuation depthWrite={false} />
      </points>
      {/* Grid lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#6366f1" transparent opacity={0.1} depthWrite={false} />
      </lineSegments>
    </>
  );
}

// ── Exported component ────────────────────────────────────────
export interface SystemGridProps {
  /** Call this to trigger a ripple at a random grid position */
  triggerRef?: React.MutableRefObject<(() => void) | null>;
}

export function SystemGrid({ triggerRef }: SystemGridProps) {
  const rippleRef = useRef<RippleState[]>([]);

  const trigger = useCallback(() => {
    if (rippleRef.current.length >= MAX_RIPPLES) rippleRef.current.shift();
    const cx = ((COLS - 1) * SPACING) / 2;
    const cy = ((ROWS - 1) * SPACING) / 2;
    rippleRef.current.push({
      x: (Math.random() * (COLS - 1)) * SPACING - cx,
      y: (Math.random() * (ROWS - 1)) * SPACING - cy,
      age: 0,
      strength: 0.4 + Math.random() * 0.6,
    });
  }, []);

  if (triggerRef) triggerRef.current = trigger;

  return (
    <Canvas
      frameloop="always"
      camera={{ position: [0, 0, 10], fov: 55 }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      gl={{ antialias: false, alpha: true }}
    >
      <fog attach="fog" args={["#0f172a", 14, 24]} />
      <GridMesh rippleRef={rippleRef} />
    </Canvas>
  );
}
