"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useMemo, useRef } from "react";
import * as THREE from "three";

export type LightPattern = "steady" | "strobe" | "beacon";

/* ----------------------------- glow texture ---------------------------- */

const cache = new Map<string, THREE.Texture>();

/**
 * Photographic bloom: a sharp, white-hot peak with a long soft tail that tints
 * toward the lamp colour — how a bright point light looks through a camera lens.
 * Painted per pixel and used with additive blending, so it brightens what's behind it.
 */
export function bloomTexture(color: string) {
  const hit = cache.get(color);
  if (hit) return hit;
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(S, S);
  const c = new THREE.Color(color);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const r = Math.hypot(x - S / 2 + 0.5, y - S / 2 + 0.5) / (S / 2);
      const edge = 1 - THREE.MathUtils.smoothstep(r, 0.6, 1);
      const peak = Math.exp(-r * 22);
      const tail = 0.28 / (1 + (r * 7) ** 2);
      const a = Math.min(1, (peak + tail) * edge);
      const white = Math.exp(-r * 14); // the centre burns out to white
      const i = (y * S + x) * 4;
      img.data[i] = 255 * (c.r + (1 - c.r) * white);
      img.data[i + 1] = 255 * (c.g + (1 - c.g) * white);
      img.data[i + 2] = 255 * (c.b + (1 - c.b) * white);
      img.data[i + 3] = 255 * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(color, tex);
  return tex;
}

/* ------------------------------ patterns ------------------------------- */

/** Brightness 0..1 at time t for each real-world light pattern */
function intensity(pattern: LightPattern, t: number) {
  if (pattern === "steady") return 1;
  if (pattern === "beacon") {
    // red anti-collision beacon: ~1 Hz pulse with a soft rise and fall
    const ph = t % 1;
    return ph < 0.25 ? Math.sin((ph / 0.25) * Math.PI) : 0;
  }
  // white wingtip strobe: two sharp xenon flashes every 1.2 s with a fast decay
  const ph = t % 1.2;
  const flash = (start: number) => (ph >= start ? Math.exp(-(ph - start) * 45) : 0);
  return Math.min(1, flash(0) + flash(0.13));
}

/* -------------------------------- light -------------------------------- */

const OFF = new THREE.Color("#4a515c");

/** Set to false around background aircraft so their lamps glow without adding real scene lights */
export const LightSpillContext = createContext(true);

/**
 * An exterior aircraft light: a glass lens fairing with a lamp inside, a bloom
 * sprite, and a small point light that casts the lamp's colour onto nearby skin.
 */
export function AircraftLight({
  position,
  color,
  pattern = "steady",
  size = 0.28,
  phase = 0,
  spill = 0,
}: {
  position: [number, number, number];
  color: string;
  pattern?: LightPattern;
  size?: number;
  phase?: number;
  /** strength of the light cast onto nearby surfaces (0 = none) */
  spill?: number;
}) {
  const castsLight = useContext(LightSpillContext);
  const bulb = useRef<THREE.Mesh>(null);
  const bloom = useRef<THREE.Sprite>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const map = useMemo(() => bloomTexture(color), [color]);
  const lit = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }) => {
    const k = intensity(pattern, clock.elapsedTime + phase);
    if (bloom.current) {
      bloom.current.visible = k > 0.01;
      const s = size * (0.55 + 0.45 * k);
      bloom.current.scale.set(s, s, 1);
      bloom.current.material.opacity = k;
    }
    if (bulb.current) (bulb.current.material as THREE.MeshBasicMaterial).color.copy(OFF).lerp(lit, Math.min(1, k * 1.5));
    if (lamp.current) lamp.current.intensity = spill * k;
  });

  return (
    <group position={position}>
      {/* lamp inside a clear, lightly tinted glass fairing */}
      <mesh ref={bulb}>
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh scale={[1.7, 0.9, 1]}>
        <sphereGeometry args={[0.016, 20, 14]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.28}
          roughness={0.02}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2}
          depthWrite={false}
        />
      </mesh>
      <sprite ref={bloom} renderOrder={3}>
        <spriteMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {castsLight && spill > 0 && <pointLight ref={lamp} color={color} intensity={spill} distance={1.4} decay={2} />}
    </group>
  );
}
