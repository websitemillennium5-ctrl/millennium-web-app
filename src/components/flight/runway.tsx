"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { bloomTexture } from "./nav-lights";
import type { Progress } from "./plane-scene";
import { memo } from "./texture-cache";

/*
 * Runway in its own local space: it runs along +X from X0 to X1, centred on z = 0.
 * The plane starts its roll near x = 0, so the threshold markings sit just behind it.
 */
const X0 = -2;
const X1 = 28;
const LEN = X1 - X0;
const HALF = 0.8; // paved runway half-width
const SHOULDER = 0.55; // shoulder + fade-out beyond the runway edge
const WIDTH = 2 * (HALF + SHOULDER);

function rand32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Asphalt, paint and rubber, painted to ICAO-style markings */
function drawRunwayTexture() {
  const PPU = 140; // pixels per world unit
  const W = Math.min(4096, Math.round(LEN * PPU));
  const H = Math.round(WIDTH * PPU);
  const sx = W / LEN;
  const sz = H / WIDTH;
  const px = (x: number) => (x - X0) * sx;
  const pz = (z: number) => (z + WIDTH / 2) * sz;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = rand32(42);

  // shoulders: older, lighter, coarser asphalt
  ctx.fillStyle = "#6a707a";
  ctx.fillRect(0, 0, W, H);
  // main pavement
  ctx.fillStyle = "#3d424b";
  ctx.fillRect(0, pz(-HALF), W, pz(HALF) - pz(-HALF));

  // patchwork of resurfaced sections and stains
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const z = pz((rand() * 2 - 1) * HALF);
    const r = (0.2 + rand() * 0.6) * sz;
    const g = ctx.createRadialGradient(x, z, 0, x, z, r);
    const light = rand() > 0.5;
    g.addColorStop(0, light ? "rgba(120,126,136,0.12)" : "rgba(20,22,26,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, z - r, r * 2, r * 2);
  }
  // longitudinal paving lanes
  ctx.strokeStyle = "rgba(20,22,26,0.18)";
  ctx.lineWidth = 1.5;
  for (const z of [-0.4, 0.4]) {
    ctx.beginPath();
    ctx.moveTo(0, pz(z));
    ctx.lineTo(W, pz(z));
    ctx.stroke();
  }

  // ----- paint -----
  const paint = "rgba(236,239,242,0.94)";
  const rect = (x: number, z: number, lx: number, wz: number) => ctx.fillRect(px(x), pz(z), lx * sx, wz * sz);
  ctx.fillStyle = paint;

  // side stripes (runway edge lines)
  rect(X0 + 0.1, -HALF + 0.03, LEN, 0.03);
  rect(X0 + 0.1, HALF - 0.06, LEN, 0.03);
  // threshold bar and "piano keys"
  rect(-1.9, -HALF + 0.03, 0.04, 2 * HALF - 0.06);
  const keys = 8;
  const keyW = 0.055;
  for (let i = 0; i < keys; i++) {
    const off = 0.1 + i * 0.085;
    rect(-1.8, -HALF + off - 0.04, 0.6, keyW);
    rect(-1.8, HALF - off - keyW + 0.04, 0.6, keyW);
  }
  // runway designator, reading from the approach end
  ctx.save();
  ctx.translate(px(-0.8), pz(0));
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${0.42 * sx}px "Helvetica Neue", Arial, sans-serif`;
  ctx.scale(0.75, 1); // runway numerals are tall and narrow
  ctx.fillText("09", 0, 0);
  ctx.restore();
  ctx.fillStyle = paint;
  // centreline dashes
  for (let x = -0.2; x < X1; x += 0.9) rect(x, -0.016, 0.5, 0.032);
  // touchdown-zone bars (3, 2, aiming point, 2, 1 pairs)
  const tdz = (x: number, bars: number, len = 0.45) => {
    for (const side of [-1, 1]) {
      for (let b = 0; b < bars; b++) {
        const z = side * (0.22 + b * 0.09);
        rect(x, z - 0.025, len, 0.05);
      }
    }
  };
  tdz(0.6, 3);
  tdz(1.8, 2);
  for (const side of [-1, 1]) rect(2.9, side * 0.3 - 0.07, 0.9, 0.14); // aiming point
  tdz(4.4, 2);
  tdz(5.6, 1);

  // grain over everything — wears the paint and gives the asphalt texture
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 26 + (rand() > 0.985 ? (rand() - 0.5) * 70 : 0);
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // rubber deposits where the wheels touch down and roll
  for (let i = 0; i < 160; i++) {
    const x = 0.3 + rand() * 6;
    const z = (rand() > 0.5 ? 1 : -1) * (0.08 + rand() * 0.2);
    const len = (0.5 + rand() * 1.5) * sx;
    ctx.strokeStyle = `rgba(14,15,18,${0.04 + rand() * 0.08})`;
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    ctx.moveTo(px(x), pz(z));
    ctx.lineTo(px(x) + len, pz(z + (rand() - 0.5) * 0.03));
    ctx.stroke();
  }

  // soft fades: across the shoulders, at the start, and into the distance
  ctx.globalCompositeOperation = "destination-in";
  const across = ctx.createLinearGradient(0, 0, 0, H);
  const e = (SHOULDER - 0.05) / WIDTH;
  across.addColorStop(0, "rgba(0,0,0,0)");
  across.addColorStop(e, "rgba(0,0,0,1)");
  across.addColorStop(1 - e, "rgba(0,0,0,1)");
  across.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, W, H);
  const along = ctx.createLinearGradient(0, 0, W, 0);
  along.addColorStop(0, "rgba(0,0,0,0)");
  along.addColorStop(0.15 / LEN, "rgba(0,0,0,1)");
  along.addColorStop(12 / LEN, "rgba(0,0,0,1)");
  along.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function runwayTexture() {
  return memo("runwayTexture", () => drawRunwayTexture());
}

/** Flush-mounted runway light: metal housing, lens and a small bloom */
function RunwayLight({
  x,
  z,
  color,
  fade,
  housing,
}: {
  x: number;
  z: number;
  color: string;
  fade: number;
  housing: THREE.Material;
}) {
  const map = useMemo(() => bloomTexture(color), [color]);
  return (
    <group position={[x, 0, z]}>
      <mesh material={housing} position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.02, 0.024, 0.012, 12]} />
      </mesh>
      <mesh position={[0, 0.014, 0]}>
        <sphereGeometry args={[0.008, 10, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={fade} />
      </mesh>
      <sprite position={[0, 0.016, 0]} scale={[0.14, 0.14, 1]} renderOrder={3}>
        <spriteMaterial
          map={map}
          transparent
          opacity={0.8 * fade}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

const surfacePoint = new THREE.Vector3();

export function Runway({ progress, groundRef }: { progress: Progress; groundRef?: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const { map, housing } = useMemo(
    () => ({
      map: runwayTexture(),
      housing: new THREE.MeshStandardMaterial({ color: "#7d848f", roughness: 0.4, metalness: 0.8 }),
    }),
    [],
  );
  useEffect(() => () => (map.dispose(), housing.dispose()), [map, housing]);

  const lights = useMemo(() => {
    const out: { x: number; z: number; color: string; fade: number }[] = [];
    // white edge lights every unit, fading out with the pavement
    for (let x = -1.5; x <= 16; x += 1) {
      const fade = 1 - THREE.MathUtils.smoothstep(x, 8, 15);
      for (const z of [HALF + 0.06, -HALF - 0.06]) out.push({ x, z, color: "#f4f8ff", fade });
    }
    // green threshold lights across the approach end
    for (let i = 0; i < 8; i++) out.push({ x: -1.97, z: -HALF + 0.1 + (i * (2 * HALF - 0.2)) / 7, color: "#3dff7a", fade: 1 });
    return out;
  }, []);

  useFrame(() => {
    if (!group.current) return;
    const p = progress.current;
    const sink = THREE.MathUtils.smoothstep(p, 0.14, 0.32);
    group.current.position.y = -1.92 - sink * 6;
    group.current.visible = sink < 0.999;
    // share the surface height so the landing gear can rest on it
    if (groundRef) groundRef.current = sink < 0.02 ? group.current.getWorldPosition(surfacePoint).y : Number.NaN;
  });

  return (
    <group ref={group} position={[1.0, -1.92, 0]} rotation-y={-0.5}>
      <mesh rotation-x={-Math.PI / 2} position={[X0 + LEN / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[LEN, WIDTH]} />
        <meshStandardMaterial map={map} transparent depthWrite={false} roughness={0.92} metalness={0} />
      </mesh>
      {lights.map((l, i) => (
        <RunwayLight key={i} {...l} housing={housing} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Soft, plane-shaped ground shadow                                     */
/* ------------------------------------------------------------------ */

export const SHADOW_SIZE = 5; // world units covered by the shadow texture (before plane scale)

/** Top-down silhouette of the airliner, blurred — x along the fuselage, y across the span */
function drawPlaneShadowTexture() {
  const S = 512;
  const k = S / SHADOW_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const P = (x: number, z: number): [number, number] => [S / 2 + x * k - S, S / 2 + z * k];

  // draw everything one canvas-width to the left and let the blurred shadow land on the canvas
  // (shadowBlur is supported everywhere, unlike ctx.filter)
  const silhouette = (blur: number, alpha: number, shapes: () => void) => {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = S;
    ctx.fillStyle = "#000";
    shapes();
    ctx.restore();
  };
  const poly = (pts: [number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(...P(x, z)) : ctx.moveTo(...P(x, z))));
    ctx.closePath();
    ctx.fill();
  };
  const ellipse = (x: number, z: number, rx: number, rz: number) => {
    ctx.beginPath();
    ctx.ellipse(...P(x, z), rx * k, rz * k, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  silhouette(18, 0.8, () => {
    ellipse(0, 0, 2.0, 0.28); // fuselage
    for (const s of [1, -1]) {
      poly([
        [0.48, 0],
        [-0.62, s * 2.2],
        [-0.84, s * 2.2],
        [-0.57, 0],
      ]); // wing
      poly([
        [-1.38, 0],
        [-1.86, s * 0.85],
        [-2.06, s * 0.85],
        [-1.94, 0],
      ]); // stabiliser
      ellipse(0.17, s * 0.78, 0.36, 0.15); // engine
    }
  });
  // darker contact patches under the wheels
  silhouette(10, 0.9, () => {
    ellipse(1.55, 0, 0.09, 0.07);
    ellipse(-0.12, 0.38, 0.14, 0.08);
    ellipse(-0.12, -0.38, 0.14, 0.08);
  });

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export function planeShadowTexture() {
  return memo("planeShadowTexture", () => drawPlaneShadowTexture());
}
