"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ── Spinning teal wireframe torus ring ────────────────────────
// Spins faster as probationExpiry approaches (msRemaining → 0).
function RingMesh({ msRemaining, msTotal }: { msRemaining: number; msTotal: number }) {
  const torusRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  // progress 0 = just started, 1 = about to expire
  const progress = Math.min(1, Math.max(0, 1 - msRemaining / msTotal));
  // Base speed 0.4 rad/s → 3.0 rad/s at expiry
  const speed = 0.4 + progress * 2.6;

  useFrame((_, delta) => {
    if (torusRef.current) {
      torusRef.current.rotation.z += speed * delta;
      torusRef.current.rotation.x += speed * 0.3 * delta;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y += speed * 0.5 * delta;
      innerRef.current.rotation.z -= speed * 0.2 * delta;
      // Pulse scale
      const t = Date.now() / 800;
      const pulse = 0.85 + 0.15 * Math.sin(t + progress * Math.PI);
      innerRef.current.scale.setScalar(pulse);
    }
  });

  // Teal colour intensifies as progress approaches 1
  const tealBase = new THREE.Color("#14b8a6");
  const tealHot  = new THREE.Color("#2dd4bf");
  const ringColor = tealBase.clone().lerp(tealHot, progress);

  return (
    <>
      {/* Outer wireframe torus */}
      <mesh ref={torusRef}>
        <torusGeometry args={[0.9, 0.04, 8, 48]} />
        <meshBasicMaterial color={ringColor} wireframe />
      </mesh>

      {/* Secondary inner ring — counter-rotates */}
      <mesh ref={innerRef} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[0.65, 0.025, 6, 36]} />
        <meshBasicMaterial color={tealHot} wireframe opacity={0.6} transparent />
      </mesh>

      {/* Slate core shard — shrinks as progress → 1 (dissolving) */}
      <mesh scale={Math.max(0.01, 1 - progress * 0.8)}>
        <icosahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color={new THREE.Color("#475569").lerp(new THREE.Color("#14b8a6"), progress)}
          emissive={new THREE.Color("#0f172a").lerp(new THREE.Color("#0d9488"), progress)}
          emissiveIntensity={0.4 + progress * 0.8}
          wireframe={progress > 0.7}
        />
      </mesh>
    </>
  );
}

function RingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
    </div>
  );
}

interface ProbationaryRingProps {
  msRemaining: number;
  msTotal: number;
  size?: number; // px, default 64
}

export function ProbationaryRing({ msRemaining, msTotal, size = 64 }: ProbationaryRingProps) {
  const progress = Math.min(1, Math.max(0, 1 - msRemaining / msTotal));
  const borderColor = progress > 0.75 ? "border-orange-400" : progress > 0.4 ? "border-teal-300" : "border-teal-500";

  return (
    <div
      className={`rounded-full border-2 ${borderColor} overflow-hidden`}
      style={{ width: size, height: size }}
    >
      <Suspense fallback={<RingFallback />}>
        <Canvas
          frameloop="always"
          camera={{ position: [0, 0, 2.4], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[2, 2, 2]} intensity={1.2} color="#14b8a6" />
          <RingMesh msRemaining={msRemaining} msTotal={msTotal} />
        </Canvas>
      </Suspense>
    </div>
  );
}
