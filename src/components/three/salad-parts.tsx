"use client";

import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FILL_RADIUS, FILL_Y, Scatter, seeded } from "./bowl-parts";

/** Height of the salad heap at a given distance from the centre. */
export function surfaceY(r: number) {
  const n = Math.min(r / FILL_RADIUS, 1);
  return FILL_Y + 0.26 * (1 - n * n);
}

const polar = (a: number, r: number, lift = 0) =>
  [Math.cos(a) * r, surfaceY(r) + lift, Math.sin(a) * r] as const;

/* ------------------------------------------------------------------ */
/* Leaves                                                              */
/* ------------------------------------------------------------------ */

type LeafOptions = { length: number; width: number; curl: number; ruffle: number; inner: string; outer: string };

/** A cupped leaf with a ruffled edge and a pale centre rib, coloured with vertex colours. */
function makeLeaf({ length, width, curl, ruffle, inner, outer }: LeafOptions) {
  const segU = 40;
  const segV = 16;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const cIn = new THREE.Color(inner);
  const cOut = new THREE.Color(outer);
  const c = new THREE.Color();

  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const half = width * Math.pow(Math.sin(Math.PI * Math.min(u * 1.08, 1)), 0.75) + 0.004;
    for (let j = 0; j <= segV; j++) {
      const v = (j / segV) * 2 - 1;
      const edge = Math.abs(v);
      const x = u * length;
      const z = v * half;
      const y =
        curl * v * v + // cupped across the width
        0.18 * length * u * u + // tip lifts
        ruffle * edge * edge * edge * (Math.sin(u * 17 + v * 2) + 0.4 * Math.sin(u * 41)) * (0.5 + u); // wavy edge
      positions.push(x, y, z);
      c.copy(cIn).lerp(cOut, Math.min(1, edge * 1.15 + u * 0.15));
      if (edge < 0.08) c.lerp(new THREE.Color("#eef7d8"), 0.55); // centre rib
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + segV + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function LeafScatter({
  count,
  seed,
  options,
  minR,
  maxR,
}: {
  count: number;
  seed: number;
  options: LeafOptions;
  minR: number;
  maxR: number;
}) {
  const geometry = useMemo(() => makeLeaf(options), [options]);
  const place = useCallback(
    (rand: () => number, i: number, d: THREE.Object3D) => {
      const a = (i / count) * Math.PI * 2 + rand() * 0.6;
      const r = minR + rand() * (maxR - minR);
      const [x, y, z] = polar(a, r, -0.06);
      d.position.set(x, y, z);
      // point the leaf outwards and tilt it up so it rises over the rim like a real heap
      d.rotation.set(rand() * 0.3, -a + (rand() - 0.5) * 0.5, 0.45 + rand() * 0.4, "YZX");
      d.scale.setScalar(0.7 + rand() * 0.3);
    },
    [count, minR, maxR],
  );
  return (
    <Scatter count={count} seed={seed} place={place}>
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial vertexColors roughness={0.45} sheen={0.4} sheenColor="#e8f5c8" side={THREE.DoubleSide} />
    </Scatter>
  );
}

const LETTUCE: LeafOptions = { length: 0.7, width: 0.26, curl: 0.12, ruffle: 0.05, inner: "#bcd87e", outer: "#2f7424" };
const ROMAINE: LeafOptions = { length: 0.8, width: 0.17, curl: 0.07, ruffle: 0.025, inner: "#cfe39a", outer: "#3d8a2c" };
const RADICCHIO: LeafOptions = { length: 0.5, width: 0.22, curl: 0.1, ruffle: 0.04, inner: "#efd6df", outer: "#6b1a3c" };

/** Chopped greens mound + layered lettuce, romaine and radicchio leaves. */
export function GreensBed() {
  const mound = useMemo(() => {
    const g = new THREE.RingGeometry(0, FILL_RADIUS, 72, 18);
    const pos = g.attributes.position;
    const rand = seeded(5);
    const colors: number[] = [];
    const a = new THREE.Color("#2f6e22");
    const b = new THREE.Color("#79a944");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.hypot(x, y) / FILL_RADIUS;
      pos.setZ(i, 0.22 * (1 - r * r) + 0.03 * Math.sin(x * 13) * Math.cos(y * 11) + rand() * 0.02);
      c.copy(a).lerp(b, rand());
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  return (
    <group>
      <mesh geometry={mound} position={[0, FILL_Y, 0]}>
        <meshStandardMaterial vertexColors roughness={0.7} />
      </mesh>
      <LeafScatter count={16} seed={101} options={LETTUCE} minR={0.5} maxR={0.78} />
      <LeafScatter count={6} seed={113} options={ROMAINE} minR={0.3} maxR={0.65} />
      <LeafScatter count={5} seed={127} options={RADICCHIO} minR={0.25} maxR={0.7} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Toppings                                                            */
/* ------------------------------------------------------------------ */

const paneerGeometry = () => new RoundedBoxGeometry(0.17, 0.15, 0.17, 3, 0.03);

export function PaneerCubes({ angle }: { angle: number }) {
  const geometry = useMemo(() => paneerGeometry(), []);
  const place = useCallback(
    (rand: () => number, _i: number, d: THREE.Object3D) => {
      const a = angle + (rand() - 0.5) * 0.9;
      const r = 0.2 + rand() * 0.55;
      const [x, y, z] = polar(a, r, 0.08);
      d.position.set(x, y, z);
      d.rotation.set((rand() - 0.5) * 0.6, rand() * Math.PI, (rand() - 0.5) * 0.6);
    },
    [angle],
  );
  return (
    <>
      {/* plain paneer */}
      <Scatter count={5} seed={201} place={place}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#fbf1dc" roughness={0.75} />
      </Scatter>
      {/* tikka-grilled paneer */}
      <Scatter count={4} seed={207} place={place}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#e9a352" roughness={0.6} />
      </Scatter>
    </>
  );
}

export function ChickpeasAndCorn({ angle }: { angle: number }) {
  const chickpea = useCallback(
    (rand: () => number, _i: number, d: THREE.Object3D) => {
      const a = angle + (rand() - 0.5) * 1.0;
      const r = 0.2 + rand() * 0.6;
      const [x, y, z] = polar(a, r, 0.04);
      d.position.set(x, y, z);
      d.rotation.set(rand() * 3, rand() * 3, 0);
      d.scale.set(1, 0.9, 0.95);
    },
    [angle],
  );
  const corn = useCallback(
    (rand: () => number, _i: number, d: THREE.Object3D) => {
      const a = angle + 0.35 + (rand() - 0.5) * 0.9;
      const r = 0.25 + rand() * 0.55;
      const [x, y, z] = polar(a, r, 0.03);
      d.position.set(x, y, z);
      d.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      d.scale.set(1, 0.8, 0.7);
    },
    [angle],
  );
  return (
    <>
      <Scatter count={18} seed={301} place={chickpea}>
        <icosahedronGeometry args={[0.058, 2]} />
        <meshStandardMaterial color="#d9b274" roughness={0.8} />
      </Scatter>
      <Scatter count={22} seed={307} place={corn}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshPhysicalMaterial color="#f7c531" roughness={0.35} clearcoat={0.5} />
      </Scatter>
    </>
  );
}

export function CherryTomatoes({ angle }: { angle: number }) {
  const halfDome = useMemo(() => new THREE.SphereGeometry(0.105, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), []);
  const cutFace = useMemo(() => {
    const g = new THREE.CircleGeometry(0.103, 24);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const halves = useMemo(() => {
    const rand = seeded(409);
    return Array.from({ length: 4 }, () => {
      const a = angle + (rand() - 0.5) * 0.9;
      const r = 0.25 + rand() * 0.55;
      return { position: polar(a, r, 0.02), rotation: [(rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5] as const };
    });
  }, [angle]);
  const whole = useCallback(
    (rand: () => number, _i: number, d: THREE.Object3D) => {
      const a = angle + (rand() - 0.5) * 0.9;
      const r = 0.2 + rand() * 0.6;
      const [x, y, z] = polar(a, r, 0.09);
      d.position.set(x, y, z);
      d.scale.set(1, 0.92, 1);
    },
    [angle],
  );
  return (
    <>
      <Scatter count={4} seed={401} place={whole}>
        <sphereGeometry args={[0.11, 28, 20]} />
        <meshPhysicalMaterial color="#d8231b" roughness={0.18} clearcoat={1} clearcoatRoughness={0.08} />
      </Scatter>
      {halves.map((h, i) => (
        // a halved tomato: glossy skin dome, cut face up
        <group key={i} position={h.position} rotation={[Math.PI + h.rotation[0], h.rotation[1], h.rotation[2]]}>
          <mesh geometry={halfDome}>
            <meshPhysicalMaterial color="#d8231b" roughness={0.2} clearcoat={1} />
          </mesh>
          <mesh geometry={cutFace} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#f26b4f" roughness={0.45} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
            <ringGeometry args={[0.035, 0.07, 20]} />
            <meshStandardMaterial color="#f6c04a" roughness={0.4} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Cucumber slices (dark skin, pale flesh, seed ring), avocado slices and red onion rings. */
export function CucumberAvocadoOnion({ angle }: { angle: number }) {
  const cucumber = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 0.035, 32), []);
  const cucumberMaterials = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#1f5d24", roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: "#d9ecb0", roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: "#d9ecb0", roughness: 0.5 }),
    ],
    [],
  );
  const slices = useMemo(() => {
    const rand = seeded(503);
    return Array.from({ length: 6 }, (_, i) => {
      const a = angle - 0.3 + i * 0.12 + (rand() - 0.5) * 0.2;
      const r = 0.35 + rand() * 0.5;
      return {
        position: polar(a, r, 0.05 + i * 0.008),
        rotation: [(rand() - 0.5) * 0.7, rand() * 3, (rand() - 0.5) * 0.7] as const,
      };
    });
  }, [angle]);

  const avocado = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.2, Math.PI * 0.15, Math.PI * 0.85, false);
    s.absarc(0, 0.06, 0.13, Math.PI * 0.85, Math.PI * 0.15, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 });
    g.center();
    return g;
  }, []);

  const onion = useCallback(
    (rand: () => number, _i: number, d: THREE.Object3D) => {
      const a = angle + 0.4 + (rand() - 0.5) * 0.6;
      const r = 0.3 + rand() * 0.5;
      const [x, y, z] = polar(a, r, 0.05);
      d.position.set(x, y, z);
      d.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.6, 0, rand() * 3);
      d.scale.setScalar(0.8 + rand() * 0.4);
    },
    [angle],
  );

  return (
    <>
      {slices.map((s, i) => (
        <group key={i} position={s.position} rotation={s.rotation}>
          <mesh geometry={cucumber} material={cucumberMaterials} />
          <mesh position={[0, 0.0185, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.085, 24]} />
            <meshStandardMaterial color="#eef6d2" roughness={0.3} />
          </mesh>
        </group>
      ))}
      {[0, 1].map((i) => {
        const [x, y, z] = polar(angle - 0.55 + i * 0.25, 0.55 - i * 0.12, 0.07);
        return (
          <mesh key={i} geometry={avocado} position={[x, y, z]} rotation={[-1.2, 0.4 + i * 0.6, 0.2]}>
            <meshPhysicalMaterial color="#b5d35a" roughness={0.35} clearcoat={0.4} />
          </mesh>
        );
      })}
      <Scatter count={3} seed={541} place={onion}>
        <torusGeometry args={[0.1, 0.012, 8, 36]} />
        <meshPhysicalMaterial color="#a23b78" roughness={0.3} transmission={0.2} clearcoat={0.5} />
      </Scatter>
    </>
  );
}

/** Chopped coriander and cracked pepper over everything. */
export function HerbSprinkle() {
  const herb = useCallback((rand: () => number, _i: number, d: THREE.Object3D) => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (FILL_RADIUS - 0.15);
    const [x, y, z] = polar(a, r, 0.07 + rand() * 0.05);
    d.position.set(x, y, z);
    d.rotation.set(rand() * 3, rand() * 3, rand() * 3);
  }, []);
  return (
    <>
      <Scatter count={60} seed={601} place={herb}>
        <circleGeometry args={[0.028, 5]} />
        <meshStandardMaterial color="#2e8b3a" roughness={0.6} side={THREE.DoubleSide} />
      </Scatter>
      <Scatter count={50} seed={607} place={herb}>
        <icosahedronGeometry args={[0.009, 0]} />
        <meshStandardMaterial color="#2a2522" roughness={0.9} />
      </Scatter>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Floating ingredients around the bowl                                */
/* ------------------------------------------------------------------ */

export type FloaterKind = "tomato" | "cucumber" | "chickpea" | "paneer" | "leaf" | "corn";

export function FloaterMesh({ kind }: { kind: FloaterKind }) {
  const leaf = useMemo(() => (kind === "leaf" ? makeLeaf({ ...LETTUCE, length: 0.45, width: 0.16 }) : null), [kind]);
  const paneer = useMemo(() => (kind === "paneer" ? paneerGeometry() : null), [kind]);
  switch (kind) {
    case "tomato":
      return (
        <mesh>
          <sphereGeometry args={[0.12, 28, 20]} />
          <meshPhysicalMaterial color="#d8231b" roughness={0.18} clearcoat={1} />
        </mesh>
      );
    case "cucumber":
      return (
        <mesh>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 32]} />
          <meshStandardMaterial color="#cfe6a0" roughness={0.45} />
        </mesh>
      );
    case "chickpea":
      return (
        <mesh>
          <icosahedronGeometry args={[0.075, 2]} />
          <meshStandardMaterial color="#d9b274" roughness={0.8} />
        </mesh>
      );
    case "paneer":
      return (
        <mesh geometry={paneer!}>
          <meshStandardMaterial color="#fbf1dc" roughness={0.75} />
        </mesh>
      );
    case "leaf":
      return (
        <mesh geometry={leaf!}>
          <meshStandardMaterial vertexColors roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      );
    case "corn":
      return (
        <mesh scale={[1, 0.8, 0.7]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshPhysicalMaterial color="#f7c531" roughness={0.35} clearcoat={0.5} />
        </mesh>
      );
  }
}
