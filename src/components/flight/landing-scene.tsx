"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Airliner } from "./airliner";
import { AircraftLight } from "./nav-lights";
import { Runway } from "./runway";
import { Airport } from "./airport";
import type { Progress } from "./plane-scene";
import { SceneWarmup } from "./scene-warmup";

/*
 * Night landing that closes the story the hero's take-off starts. Same airliner, same runway:
 * the runway runs along its local +X (world direction (0.878, 0, 0.479) after its -0.5 yaw),
 * so the plane approaches from the far left, flares, touches down and rolls out toward the viewer.
 */

// landing configuration: flaps fully out, runway parked at ground level
const LANDING_CONFIG: Progress = { current: 0 };
const DIR = new THREE.Vector3(Math.cos(0.5), 0, Math.sin(0.5));
const ORIGIN = new THREE.Vector3(1.0, -1.45, 0); // where the hero's plane sat parked

// s: distance along the runway from the parked spot; pitch: nose-up (rot z); roll: bank (rot x)
type Key = { p: number; s: number; y: number; pitch: number; roll: number };
const KEYS: Key[] = [
  { p: 0.0, s: -15, y: 2.6, pitch: 0.04, roll: 0.22 }, // turning onto final, high and far
  { p: 0.3, s: -8, y: 0.6, pitch: 0.06, roll: 0.05 }, // established on the glide path
  { p: 0.52, s: -2.6, y: -1.2, pitch: 0.1, roll: 0 }, // over the threshold
  { p: 0.6, s: -1.2, y: -1.45, pitch: 0.15, roll: 0 }, // flare and touchdown
  { p: 0.72, s: 0.1, y: -1.45, pitch: 0.03, roll: 0 }, // nose wheel down
  { p: 1.0, s: 1.4, y: -1.45, pitch: 0, roll: 0 }, // rolled out, stopped
];
export const TOUCHDOWN = 0.6;

const catmull = (a: number, b: number, c: number, d: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
};

function sample(p: number) {
  let i = KEYS.findIndex((k, idx) => idx < KEYS.length - 1 && p >= k.p && p <= KEYS[idx + 1].p);
  if (i < 0) i = p <= 0 ? 0 : KEYS.length - 2;
  const k0 = KEYS[Math.max(0, i - 1)];
  const k1 = KEYS[i];
  const k2 = KEYS[i + 1];
  const k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const t = THREE.MathUtils.clamp((p - k1.p) / (k2.p - k1.p), 0, 1);
  const f = (key: keyof Omit<Key, "p">) => catmull(k0[key], k1[key], k2[key], k3[key], t);
  // once on the runway the wheels never dip below it
  return { s: f("s"), y: p >= TOUCHDOWN ? -1.45 : Math.max(-1.45, f("y")), pitch: f("pitch"), roll: f("roll") };
}

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(220,226,236,0.9)");
  g.addColorStop(0.5, "rgba(200,208,222,0.35)");
  g.addColorStop(1, "rgba(200,208,222,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/*
 * Landing-light beam: an open cone with a soft volumetric look. Brightest at the lamp,
 * fading along its length and feathered at the silhouette so it reads as lit haze, not a solid.
 */
const BEAM_LENGTH = 5.2;
const BEAM_PITCH = 0.17; // aimed slightly down onto the runway ahead

function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#ffe9c4") }, uIntensity: { value: 0.7 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        // uv.y is 1 at the apex (lamp) and 0 at the far end
        float along = pow(vUv.y, 2.2);
        // fade toward the silhouette so the cone has no hard edge
        float facing = abs(dot(normalize(vNormal), normalize(vView)));
        float soft = smoothstep(0.0, 0.85, facing);
        float a = along * soft * uIntensity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

function LandingBeam({ position }: { position: [number, number, number] }) {
  const material = useMemo(() => beamMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  const dir: [number, number] = [Math.cos(BEAM_PITCH), -Math.sin(BEAM_PITCH)];
  return (
    <mesh
      material={material}
      position={[position[0] + (dir[0] * BEAM_LENGTH) / 2, position[1] + (dir[1] * BEAM_LENGTH) / 2, position[2]]}
      // the cone's apex points along +Y; turn it so the apex sits at the lamp and the beam fans forward
      rotation-z={Math.PI / 2 - BEAM_PITCH}
      renderOrder={5}
    >
      <coneGeometry args={[1.0, BEAM_LENGTH, 48, 1, true]} />
    </mesh>
  );
}

function LandingPlane({ progress, ground }: { progress: Progress; ground: { current: number } }) {
  const ref = useRef<THREE.Group>(null);
  const beamTarget = useRef<THREE.Object3D>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const euler = useMemo(() => new THREE.Euler(0, -0.5, 0, "YZX"), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (spot.current && beamTarget.current) spot.current.target = beamTarget.current;
  }, []);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    const p = progress.current;
    const k = sample(p);
    const airborne = 1 - THREE.MathUtils.smoothstep(p, TOUCHDOWN - 0.04, TOUCHDOWN);
    const t = clock.elapsedTime;
    pos.set(
      ORIGIN.x + DIR.x * k.s,
      k.y + Math.sin(t * 1.3) * 0.03 * airborne,
      ORIGIN.z + DIR.z * k.s,
    );
    const follow = 1 - Math.exp(-delta * 5);
    g.position.lerp(pos, follow);
    euler.set(k.roll + Math.sin(t * 0.9) * 0.03 * airborne, -0.5, k.pitch);
    quat.setFromEuler(euler);
    g.quaternion.slerp(quat, follow);
  });

  return (
    <group ref={ref} position={ORIGIN.clone().addScaledVector(DIR, -15)} scale={0.8}>
      <Airliner progress={LANDING_CONFIG} ground={ground} />
      {/* wing-root landing lights, with a spotlight pooling on the runway ahead */}
      {[0.42, -0.42].map((z) => (
        <AircraftLight key={z} position={[0.35, -0.12, z]} color="#fff6e0" size={1.6} spill={1.2} />
      ))}
      <LandingBeam position={[0.42, -0.14, 0]} />
      <spotLight ref={spot} position={[0.4, -0.15, 0]} angle={0.42} penumbra={0.8} intensity={28} distance={14} decay={1.6} color="#fff1d6" />
      <object3D ref={beamTarget} position={[6, -2.2, 0]} />
    </group>
  );
}

/** Tyre smoke where the mains meet the runway */
function TouchdownSmoke({ progress }: { progress: Progress }) {
  const map = useMemo(() => smokeTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  const spot = useMemo(() => ORIGIN.clone().addScaledVector(DIR, -1.3).setY(-1.86), []);

  useFrame(() => {
    const p = progress.current;
    const life = THREE.MathUtils.clamp((p - TOUCHDOWN) / 0.16, 0, 1);
    puffs.current.forEach((s, i) => {
      if (!s) return;
      const alive = life > 0 && life < 1;
      s.visible = alive;
      if (!alive) return;
      const side = i % 2 === 0 ? 1 : -1;
      const drift = life * (0.4 + i * 0.12);
      s.position.set(spot.x - DIR.x * drift + side * 0.12, spot.y + life * 0.25, spot.z - DIR.z * drift + side * 0.28);
      const size = 0.25 + life * (0.9 + i * 0.15);
      s.scale.set(size, size * 0.7, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.55;
    });
  });

  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            puffs.current[i] = el;
          }}
          visible={false}
          renderOrder={4}
        >
          <spriteMaterial map={map} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

/** Frames the runway for the footer band: shifted right on wide screens, smaller on phones */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const aspect = size.width / size.height;
    if (aspect < 1) {
      g.position.set(-1.1, -0.35, 0);
      g.scale.setScalar(0.55);
    } else {
      g.position.set(THREE.MathUtils.clamp((aspect - 1.5) * 1.1, 0, 1.8), 0, 0);
      g.scale.setScalar(1);
    }
  });
  return <group ref={ref}>{children}</group>;
}

/** Eases the rendered progress toward the scroll target so the landing glides */
/**
 * Eases the rendered progress toward the target so the landing glides, and reports once the
 * plane on screen has actually come to rest (the eased value has caught up with a finished target).
 */
function ProgressSmoother({
  targetRef,
  progressRef,
  landedRef,
}: {
  targetRef: Progress;
  progressRef: Progress;
  landedRef: { current: (() => void) | null };
}) {
  const fired = useRef(false);
  useFrame((_, delta) => {
    progressRef.current += (targetRef.current - progressRef.current) * (1 - Math.exp(-delta * 3));
    if (targetRef.current < 0.5) fired.current = false;
    if (!fired.current && targetRef.current >= 1 && progressRef.current > 0.997) {
      fired.current = true;
      landedRef.current?.();
    }
  });
  return null;
}

export default function LandingScene({
  targetRef,
  landedRef,
  active,
}: {
  targetRef: Progress;
  /** called once the plane has stopped on the runway */
  landedRef: { current: (() => void) | null };
  active: boolean;
}) {
  const ground = useRef(Number.NaN);
  const progress = useRef(0);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 9], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene, camera }) => {
        camera.lookAt(0, 0, 0);
        const pmrem = new THREE.PMREMGenerator(gl);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.18;
        pmrem.dispose();
      }}
    >
      {/* moonlight and a cool night sky fill */}
      <hemisphereLight args={["#8ea6ff", "#0b1220", 0.45]} />
      <directionalLight position={[-4, 6, 3]} intensity={0.7} color="#c3d0ff" />
      <directionalLight position={[6, 1, -4]} intensity={0.35} color="#ff9e7a" />
      <ProgressSmoother targetRef={targetRef} progressRef={progress} landedRef={landedRef} />
      {/* night haze: the airfield fades into the horizon glow */}
      <fog attach="fog" args={["#141b2d", 14, 70]} />
      <Rig>
        <Airport />
        <Runway progress={LANDING_CONFIG} groundRef={ground} />
        <LandingPlane progress={progress} ground={ground} />
        <TouchdownSmoke progress={progress} />
      </Rig>
      <SceneWarmup id="landing" />
    </Canvas>
  );
}
