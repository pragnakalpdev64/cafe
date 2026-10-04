"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Deterministic random so the bowl looks the same on every visit.
export function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const FILL_Y = 0.34;
export const FILL_RADIUS = 1.16;

const outerProfile = [
  [0.0, -0.86],
  [0.5, -0.86],
  [0.58, -0.83],
  [0.62, -0.76],
  [0.86, -0.5],
  [1.08, -0.15],
  [1.24, 0.2],
  [1.33, 0.46],
  [1.35, 0.52],
].map(([x, y]) => new THREE.Vector2(x, y));

const innerProfile = [
  [1.35, 0.52],
  [1.3, 0.53],
  [1.25, 0.44],
  [1.13, 0.12],
  [0.9, -0.3],
  [0.55, -0.6],
  [0.0, -0.66],
].map(([x, y]) => new THREE.Vector2(x, y));

export function Bowl() {
  const outer = useMemo(() => new THREE.LatheGeometry(outerProfile, 96), []);
  const inner = useMemo(() => new THREE.LatheGeometry(innerProfile, 96), []);
  return (
    <group>
      {/* Glossy brand-orange glaze outside, cream inside – like the "Hunger" lettering */}
      <mesh geometry={outer}>
        <meshPhysicalMaterial
          color="#ff9a24"
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={inner}>
        <meshPhysicalMaterial
          color="#fff6e8"
          roughness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* foot ring */}
      <mesh position={[0, -0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.025, 12, 64]} />
        <meshStandardMaterial color="#c2410c" roughness={0.5} />
      </mesh>
    </group>
  );
}

type InstancedProps = {
  count: number;
  seed: number;
  place: (rand: () => number, i: number, dummy: THREE.Object3D) => void;
  children: React.ReactNode;
};

/** Instanced mesh whose transforms are computed once from a placement function. */
export function Scatter({ count, seed, place, children }: InstancedProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = seeded(seed);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      place(rand, i, dummy);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, seed, place]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      {children}
    </instancedMesh>
  );
}
