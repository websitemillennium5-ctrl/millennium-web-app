"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Airliner } from "./airliner";
import { TowBanner } from "./tow-banner";
import { planeShadowTexture, Runway, SHADOW_SIZE } from "./runway";
import { SceneWarmup } from "./scene-warmup";
import { memo } from "./texture-cache";
import { AdaptiveResolution, SCENE_DPR, SCENE_GL, watchContextLoss } from "./scene-gl";

export type Progress = { current: number };

const WHITE = new THREE.Color("#ffffff");
const DUSK_CLOUD = new THREE.Color("#b9a9c9");

/* ------------------------------------------------------------------ */
/* Flight path: keyframes over scroll progress (0 → 1)                 */
/* rot = [roll (x), yaw (y), pitch (z)], plane nose points along +X    */
/* ------------------------------------------------------------------ */
type Key = { p: number; pos: [number, number, number]; rot: [number, number, number] };

const KEYS: Key[] = [
  { p: 0.0, pos: [1.0, -1.45, 0], rot: [0, -0.5, 0] }, // parked on the runway
  { p: 0.1, pos: [2.0, -1.45, 0.55], rot: [0, -0.5, 0] }, // rolling
  { p: 0.18, pos: [2.9, -0.85, 0.95], rot: [-0.05, -0.45, 0.32] }, // lift-off
  { p: 0.3, pos: [2.4, 0.25, 0.5], rot: [-0.3, -0.25, 0.12] }, // climbing bank
  { p: 0.45, pos: [2.0, -0.1, 1.8], rot: [0.35, 0.25, 0.0] }, // cruise, showing the top
  { p: 0.6, pos: [2.6, 0.3, 0.6], rot: [-0.3, -0.6, 0.05] }, // banking toward camera
  { p: 0.75, pos: [1.9, 0.0, 2.2], rot: [0.0, 0.08, 0.02] }, // close-up side profile
  { p: 0.88, pos: [2.6, 0.6, 0.0], rot: [0.4, 0.5, 0.15] }, // turning away
  { p: 1.0, pos: [7.5, 2.6, -11], rot: [0.2, 0.7, 0.2] }, // off into the distance
];

const catmull = (a: number, b: number, c: number, d: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
};

function sample(p: number) {
  const i = Math.max(0, KEYS.findIndex((k, idx) => idx < KEYS.length - 1 && p >= k.p && p <= KEYS[idx + 1].p));
  const k0 = KEYS[Math.max(0, i - 1)];
  const k1 = KEYS[i];
  const k2 = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const t = THREE.MathUtils.clamp((p - k1.p) / (k2.p - k1.p || 1), 0, 1);
  const pos = [0, 1, 2].map((j) => catmull(k0.pos[j], k1.pos[j], k2.pos[j], k3.pos[j], t)) as [number, number, number];
  const rot = [0, 1, 2].map((j) => catmull(k0.rot[j], k1.rot[j], k2.rot[j], k3.rot[j], t)) as [number, number, number];
  return { pos, rot };
}

/* ------------------------------------------------------------------ */
/* Clouds that stream past to sell the sense of speed                   */
/* Each cloud is a cluster of soft billboard puffs: sunlit tops,        */
/* blue-grey shaded bases and a hazier tint for distant clouds.         */
/* ------------------------------------------------------------------ */
const PUFF_VARIANTS = 4;
const CLOUD_SHADES = [
  { top: "#ffffff", base: "#c3cfdf" }, // near, upper puffs
  { top: "#eef3fa", base: "#a9b8cc" }, // near, lower puffs (in their own shadow)
  { top: "#f4f8fd", base: "#cdd8e6" }, // far, upper puffs (hazy)
  { top: "#e4ebf5", base: "#bac7d8" }, // far, lower puffs
];

/** A lumpy, soft-edged puff built from overlapping blobs, lit from above */
function drawPuffTexture(seed: number, shade: { top: string; base: string }) {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(seed);
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * S * 0.2;
    const x = S / 2 + Math.cos(a) * d * 1.15;
    const y = S / 2 + Math.sin(a) * d * 0.8 - S * 0.03;
    const r = S * (0.12 + rand() * 0.14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.55, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  // light from above: bright crown fading to a cool, shadowed underside
  ctx.globalCompositeOperation = "source-atop";
  const light = ctx.createLinearGradient(0, S * 0.2, 0, S * 0.8);
  light.addColorStop(0, shade.top);
  light.addColorStop(0.5, shade.top);
  light.addColorStop(1, shade.base);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, S, S);
  // a few soft inner shadows between the billows
  for (let i = 0; i < 6; i++) {
    const x = S * (0.3 + rand() * 0.4);
    const y = S * (0.5 + rand() * 0.15);
    const r = S * (0.08 + rand() * 0.08);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,140,170,0.14)");
    g.addColorStop(1, "rgba(120,140,170,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function puffTexture(seed: number, shade: { top: string; base: string }) {
  return memo(`puffTexture:${JSON.stringify(seed)}:${JSON.stringify(shade)}`, () => drawPuffTexture(seed, shade));
}

function Clouds({ progress }: { progress: Progress }) {
  const group = useRef<THREE.Group>(null);
  const materials = useMemo(
    () =>
      CLOUD_SHADES.map((shade, si) =>
        Array.from(
          { length: PUFF_VARIANTS },
          (_, v) =>
            new THREE.SpriteMaterial({
              map: puffTexture(11 + v * 7, shade),
              transparent: true,
              depthWrite: false,
              fog: false,
              opacity: si >= 2 ? 0.85 : 1,
            }),
        ),
      ),
    [],
  );
  const clouds = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: 30 }, () => {
      const z = -14 + rand() * 11;
      const far = z < -9;
      const w = 1.1 + rand() * 0.9; // half-width of the cumulus
      const n = 10 + Math.floor(rand() * 7);
      return {
        x: -16 + rand() * 32,
        y: -3 + rand() * 7.5,
        z,
        s: 0.45 + rand() * 0.55,
        puffs: Array.from({ length: n }, () => {
          const px = (rand() * 2 - 1) * w;
          const edge = 1 - (px / w) ** 2; // taller in the middle, flat base
          const py = rand() * edge * 0.75;
          const upper = py > 0.25;
          return {
            x: px,
            y: py,
            z: (rand() * 2 - 1) * 0.5,
            r: (0.8 + rand() * 0.7) * (0.6 + edge * 0.5),
            mat: (far ? 2 : 0) + (upper ? 0 : 1),
            variant: Math.floor(rand() * PUFF_VARIANTS),
          };
        }),
      };
    });
  }, []);

  useEffect(() => () => materials.flat().forEach((m) => (m.map?.dispose(), m.dispose())), [materials]);

  const dims = useRef<{ mats: THREE.SpriteMaterial[]; base: THREE.Color[] } | null>(null);
  const tint = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const p = progress.current;
    // clouds only appear once we're airborne
    const appear = THREE.MathUtils.smoothstep(p, 0.08, 0.22);
    // tint toward dusk at the end of the story
    const dusk = THREE.MathUtils.smoothstep(p, 0.76, 0.92);
    // the shared materials are collected from the scene graph so they can be tinted per frame
    if (!dims.current) {
      const mats = new Set<THREE.SpriteMaterial>();
      g.traverse((o) => {
        if ((o as THREE.Sprite).isSprite) mats.add((o as THREE.Sprite).material);
      });
      dims.current = { mats: [...mats], base: [...mats].map((m) => m.color.clone()) };
    }
    tint.lerpColors(WHITE, DUSK_CLOUD, dusk);
    dims.current.mats.forEach((m, i) => m.color.copy(dims.current!.base[i]).multiply(tint));

    g.children.forEach((child, i) => {
      const c = clouds[i];
      const depth = (-3 - c.z) / 11; // 0 = near, 1 = far; far clouds move slower
      const travel = p * 40 * (1.2 - depth * 0.7) + clock.elapsedTime * 0.12;
      child.position.x = wrap(c.x - travel, -17, 17);
      child.position.y = c.y + (1 - appear) * 6;
      child.position.z = c.z;
      child.scale.setScalar(Math.max(c.s * appear * (1 - dusk * 0.45), 0.0001));
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i}>
          {c.puffs.map((puff, j) => (
            <sprite
              key={j}
              material={materials[puff.mat][puff.variant]}
              position={[puff.x, puff.y, puff.z]}
              scale={[puff.r * 2.1, puff.r * 1.6, 1]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */

function FlyingPlane({ progress, ground }: { progress: Progress; ground: { current: number } }) {
  const ref = useRef<THREE.Group>(null);
  const gear = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const tmpEuler = useMemo(() => new THREE.Euler(0, 0, 0, "YZX"), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const shadowMap = useMemo(() => planeShadowTexture(), []);
  useEffect(() => () => shadowMap.dispose(), [shadowMap]);

  useFrame(({ clock, pointer }, delta) => {
    const g = ref.current;
    if (!g) return;
    const p = progress.current;
    const { pos, rot } = sample(p);
    const t = clock.elapsedTime;
    if (p < 0.16) {
      // on the ground the path must never pitch the nose down or roll a wingtip into the runway
      rot[2] = Math.max(0, rot[2]);
      rot[0] *= THREE.MathUtils.smoothstep(p, 0.1, 0.16);
    }

    // Responsive framing: on narrow screens keep the plane centred in the upper half
    const aspect = size.width / size.height;
    const narrow = aspect < 1;
    const xFactor = narrow ? 0.18 : Math.min(0.82, aspect / 2);
    const scale = narrow ? 0.48 : 0.8;

    const airborne = THREE.MathUtils.smoothstep(p, 0.12, 0.22);
    const target = new THREE.Vector3(
      pos[0] * xFactor + pointer.x * 0.15 * airborne,
      pos[1] + Math.sin(t * 1.2) * 0.06 * airborne + pointer.y * 0.1 * airborne,
      pos[2],
    );
    const k = 1 - Math.exp(-delta * 5);
    g.position.lerp(target, k);

    tmpEuler.set(rot[0] + Math.sin(t * 0.8) * 0.04 * airborne, rot[1], rot[2] + Math.sin(t * 1.1) * 0.02 * airborne);
    tmpQuat.setFromEuler(tmpEuler);
    g.quaternion.slerp(tmpQuat, k);
    g.scale.setScalar(scale);

    // retract the landing gear shortly after lift-off
    if (gear.current) {
      const down = 1 - THREE.MathUtils.smoothstep(p, 0.19, 0.27);
      gear.current.scale.set(1, Math.max(down, 0.001), 1);
      gear.current.visible = down > 0.01;
    }

    if (shadow.current) {
      // sun overhead: the silhouette sits right under the plane, turned with its heading
      shadow.current.position.set(g.position.x, -1.91, g.position.z);
      shadow.current.rotation.set(-Math.PI / 2, 0, rot[1]);
      shadow.current.scale.setScalar(scale);
      const m = shadow.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.42 * (1 - airborne);
      shadow.current.visible = m.opacity > 0.01;
    }
  });


  return (
    <>
      <group ref={ref}>
        <Airliner gearRef={gear} progress={progress} ground={ground} />
        <TowBanner progress={progress} />
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} renderOrder={0}>
        <planeGeometry args={[SHADOW_SIZE, SHADOW_SIZE]} />
        <meshBasicMaterial map={shadowMap} color="#0b1220" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </>
  );
}

/** On portrait screens, lift the runway + plane into the top half so the story text stays clear */
function ResponsiveRig({ progress, children }: { progress: Progress; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const narrow = size.width / size.height < 1;
    const airborne = THREE.MathUtils.smoothstep(progress.current, 0.12, 0.22);
    const target = narrow ? 1.3 + (1 - airborne) * 1.0 : 0;
    ref.current.position.y += (target - ref.current.position.y) * (1 - Math.exp(-delta * 6));
  });
  return <group ref={ref}>{children}</group>;
}

function CameraRig({ progress }: { progress: Progress }) {
  useFrame(({ camera }, delta) => {
    const p = progress.current;
    const y = THREE.MathUtils.lerp(0.4, 0, THREE.MathUtils.smoothstep(p, 0, 0.3));
    camera.position.y += (y - camera.position.y) * (1 - Math.exp(-delta * 4));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function PlaneScene({
  progress,
  active,
  onContextLost,
}: {
  progress: Progress;
  active: boolean;
  onContextLost?: () => void;
}) {
  // world-space height of the runway surface, written by <Runway>, read by the landing gear
  const ground = useRef(Number.NaN);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={SCENE_DPR}
      camera={{ position: [0, 0.4, 9], fov: 35 }}
      gl={SCENE_GL}
      onCreated={({ gl, scene }) => {
        watchContextLoss(gl, onContextLost);
        // studio-style reflections so the paint and metal read as real materials
        const pmrem = new THREE.PMREMGenerator(gl);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.55;
        pmrem.dispose();
      }}
    >
      <hemisphereLight args={["#ffffff", "#9fb3cc", 0.9]} />
      <directionalLight position={[5, 8, 6]} intensity={2.4} />
      <directionalLight position={[-6, 2, -4]} intensity={0.6} color="#ffd9c2" />
      <CameraRig progress={progress} />
      <Clouds progress={progress} />
      <ResponsiveRig progress={progress}>
        <Runway progress={progress} groundRef={ground} />
        <FlyingPlane progress={progress} ground={ground} />
      </ResponsiveRig>
      <AdaptiveResolution />
      <SceneWarmup id="hero" />
    </Canvas>
  );
}

/* helpers */
function wrap(v: number, min: number, max: number) {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
