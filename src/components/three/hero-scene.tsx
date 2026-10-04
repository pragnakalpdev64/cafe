"use client";

import { ContactShadows, Environment, Float, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Bowl, seeded } from "./bowl-parts";
import {
  CherryTomatoes,
  ChickpeasAndCorn,
  CucumberAvocadoOnion,
  FloaterMesh,
  type FloaterKind,
  GreensBed,
  HerbSprinkle,
  PaneerCubes,
  surfaceY,
} from "./salad-parts";

export type SceneQuality = "high" | "low";

/** Called every frame with where a topping's DOM label should sit (canvas pixels) and how visible it is (0–1). */
export type PlaceLabel = (index: number, x: number, y: number, visibility: number) => void;

type SceneProps = {
  progress: MotionValue<number>;
  quality: SceneQuality;
  active: boolean;
  /** DOM labels live outside the canvas; the scene reports where each should follow its topping. */
  placeLabel: PlaceLabel;
  /** Fires once the first frame with the salad has been drawn, so the poster can fade out. */
  onReady: () => void;
};

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export type ToppingGroup = {
  key: string;
  angle: number;
  lift: number;
  label: string;
  value: string;
};

export const TOPPINGS: ToppingGroup[] = [
  { key: "paneer", angle: 0.6, lift: 1.35, label: "Paneer", value: "+12 g protein" },
  { key: "chickpeas", angle: 2.2, lift: 1.05, label: "Chickpeas & corn", value: "+7 g protein" },
  { key: "tomatoes", angle: 3.8, lift: 1.45, label: "Cherry tomatoes", value: "Vitamin C" },
  { key: "cucumber", angle: 5.3, lift: 0.95, label: "Cucumber & avocado", value: "Fresh crunch" },
];

const TOPPING_MESHES: Record<string, (props: { angle: number }) => React.JSX.Element> = {
  paneer: PaneerCubes,
  chickpeas: ChickpeasAndCorn,
  tomatoes: CherryTomatoes,
  cucumber: CucumberAvocadoOnion,
};

const anchorWorld = new THREE.Vector3();

/** A topping group that lifts out of the bowl as the visitor scrolls; its label follows on screen. */
function Topping({
  group,
  index,
  progress,
  placeLabel,
}: {
  group: ToppingGroup;
  index: number;
  progress: MotionValue<number>;
  placeLabel: PlaceLabel;
}) {
  const ref = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Object3D>(null);
  const eased = useRef(0);
  const Mesh = TOPPING_MESHES[group.key];
  const dir = useMemo(() => new THREE.Vector3(Math.cos(group.angle), 0, Math.sin(group.angle)), [group.angle]);

  useFrame((state, delta) => {
    const target = smooth(0.38, 0.72, progress.get());
    eased.current = THREE.MathUtils.damp(eased.current, target, 6, delta);
    const e = eased.current;
    const spread = state.size.width < 768 ? 0.45 : 0.75;
    if (ref.current) {
      ref.current.position.set(dir.x * e * spread, e * group.lift, dir.z * e * spread);
      ref.current.rotation.y = e * 0.4;
    }
    if (anchorRef.current) {
      anchorRef.current.getWorldPosition(anchorWorld).project(state.camera);
      const x = ((anchorWorld.x + 1) / 2) * state.size.width;
      const y = ((1 - anchorWorld.y) / 2) * state.size.height + (1 - e) * 8;
      placeLabel(index, x, y, smooth(0.55, 0.9, e));
    }
  });

  return (
    <group ref={ref}>
      <Mesh angle={group.angle} />
      <object3D ref={anchorRef} position={[dir.x * 0.75, surfaceY(0.6) + 0.25, dir.z * 0.75]} />
    </group>
  );
}

function Floaters({ count }: { count: number }) {
  const ref = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const rand = seeded(97);
    const kinds: FloaterKind[] = ["tomato", "cucumber", "chickpea", "paneer", "leaf", "corn"];
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + rand() * 0.4;
      const r = 2.0 + rand() * 0.8;
      return {
        kind: kinds[i % kinds.length],
        position: [Math.cos(a) * r, -0.4 + rand() * 1.9, Math.sin(a) * r] as [number, number, number],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as [number, number, number],
        speed: 1 + rand() * 1.5,
      };
    });
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={ref}>
      {items.map((it, i) => (
        <Float key={i} speed={it.speed} rotationIntensity={1.2} floatIntensity={0.8} floatingRange={[-0.12, 0.12]}>
          <group position={it.position} rotation={it.rotation}>
            <FloaterMesh kind={it.kind} />
          </group>
        </Float>
      ))}
    </group>
  );
}

/** Places the bowl for the screen size, follows the pointer and spins with the scroll. */
function Rig({ progress, children }: { progress: MotionValue<number>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const { size } = useThree();
  const mobile = size.width < 768;

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const p = progress.get();
    const explode = smooth(0.38, 0.72, p);
    yaw.current += delta * 0.18 * (1 - explode * 0.85);

    const baseX = mobile ? 0 : 1.45;
    const baseY = mobile ? -1.05 : -0.2;
    const targetX = THREE.MathUtils.lerp(baseX, mobile ? 0 : 1.1, explode);
    const targetY = THREE.MathUtils.lerp(baseY, mobile ? -1.35 : -0.75, explode);
    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 4, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 4, delta);

    const tiltX = 0.22 + state.pointer.y * -0.1 + explode * 0.12;
    const tiltY = yaw.current + state.pointer.x * 0.35;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tiltX, 4, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, tiltY, 4, delta);

    const s = mobile ? 0.62 : 0.86;
    g.scale.setScalar(s);
  });

  return <group ref={ref}>{children}</group>;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // wait one more frame so the drawn image is on screen before the poster fades
    requestAnimationFrame(onReady);
  });
  return null;
}

function CameraMove({ progress }: { progress: MotionValue<number> }) {
  useFrame((state, delta) => {
    const e = smooth(0.3, 0.8, progress.get());
    const cam = state.camera;
    cam.position.y = THREE.MathUtils.damp(cam.position.y, THREE.MathUtils.lerp(2.3, 3.2, e), 3, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, THREE.MathUtils.lerp(6.4, 6.0, e), 3, delta);
    cam.lookAt(0, -0.1, 0);
  });
  return null;
}

export default function HeroScene({ progress, quality, active, placeLabel, onReady }: SceneProps) {
  const [dpr, setDpr] = useState(quality === "high" ? 1.5 : 1);
  const high = quality === "high";

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 2.3, 6.4], fov: 34 }}
      gl={{ antialias: high, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <FirstFrame onReady={onReady} />
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <CameraMove progress={progress} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 2.5]} intensity={2.1} color="#fff6ea" />
      <directionalLight position={[-4, 2, -2]} intensity={0.7} color="#bbf7d0" />
      {high && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 2]} scale={[6, 2, 1]} color="#fff8ee" />
          <Lightformer form="rect" intensity={1.2} position={[-4, 1, 1]} scale={[2, 4, 1]} color="#dcfce7" />
          <Lightformer form="circle" intensity={1.5} position={[4, 2, -2]} scale={2} color="#ffa933" />
        </Environment>
      )}

      <Rig progress={progress}>
        <Bowl />
        <GreensBed />
        <HerbSprinkle />
        {TOPPINGS.map((t, i) => (
          <Topping key={t.key} group={t} index={i} progress={progress} placeLabel={placeLabel} />
        ))}
        <Floaters count={high ? 16 : 8} />
        <ContactShadows
          position={[0, -0.88, 0]}
          opacity={0.5}
          scale={6}
          blur={2.4}
          far={2.5}
          resolution={high ? 512 : 256}
          color="#0f3d22"
        />
      </Rig>
    </Canvas>
  );
}
