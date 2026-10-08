"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Airliner } from "./airliner";
import { bloomTexture, LightSpillContext } from "./nav-lights";
import type { Progress } from "./plane-scene";
import { memo } from "./texture-cache";

/*
 * The airfield around the runway at night: turf to the horizon, approach lights with a
 * sequenced "rabbit" strobe, PAPI and taxiway signs, a lit taxiway, a glass terminal with
 * jet bridges and parked aircraft on a marked apron, tower, hangar, fuel farm, a perimeter
 * road with traffic, and the city spreading out beyond. Built in the runway's local frame (runway runs along +X from
 * x = -2, its far side is -Z) so everything lines up with <Runway>.
 */

const RUNWAY_POS: [number, number, number] = [1.0, -1.92, 0];
const RUNWAY_YAW = -0.5;

function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrassTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#121a14";
  ctx.fillRect(0, 0, S, S);
  const r = prng(3);
  // large patches of drier and lusher turf
  for (let i = 0; i < 70; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = 30 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dry = r() > 0.5;
    g.addColorStop(0, dry ? "rgba(46,46,30,0.35)" : "rgba(18,34,22,0.4)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // blades and speckle
  for (let i = 0; i < 9000; i++) {
    const v = 16 + r() * 26;
    ctx.fillStyle = `rgba(${v},${v + 8},${v + 2},${0.2 + r() * 0.4})`;
    ctx.fillRect(r() * S, r() * S, 1, 1 + r() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(70, 36);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function grassTexture() {
  return memo("grassTexture", () => drawGrassTexture());
}

/* Apron in front of the terminal: x from APRON.x0, z from the terminal face toward the taxiway */
const APRON = { x0: -12, x1: 7, z0: -9.9, z1: -3.0 };
const STANDS = [-7.5, -3.5, 0.5];
const PPU = 64;

function drawApronTexture() {
  const W = Math.round((APRON.x1 - APRON.x0) * PPU);
  const H = Math.round((APRON.z1 - APRON.z0) * PPU);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const r = prng(17);
  const px = (x: number) => (x - APRON.x0) * PPU;
  const pz = (z: number) => (z - APRON.z0) * PPU;
  ctx.fillStyle = "#3b3e43";
  ctx.fillRect(0, 0, W, H);
  // concrete slabs with slightly different tones and dark joints
  for (let y = 0; y < H; y += 48) {
    for (let x = 0; x < W; x += 48) {
      const v = 52 + r() * 12;
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(x + 1, y + 1, 46, 46);
    }
  }
  // grime, oil stains and tyre marks
  for (let i = 0; i < 220; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 4 + r() * 22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(10,10,12,${0.1 + r() * 0.25})`);
    g.addColorStop(1, "rgba(10,10,12,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 4000; i++) {
    const v = 30 + r() * 60;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},0.25)`;
    ctx.fillRect(r() * W, r() * H, 1, 1);
  }

  ctx.lineCap = "round";
  for (const [i, sx] of STANDS.entries()) {
    // dashed red stand boundary
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(200,40,40,0.75)";
    ctx.lineWidth = 3;
    ctx.strokeRect(px(sx - 1.6), pz(-9.6), 3.2 * PPU, 4.2 * PPU);
    ctx.setLineDash([]);
    // yellow lead-in line curving off the taxilane
    ctx.strokeStyle = "rgba(240,190,40,0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px(sx), pz(-9.5));
    ctx.lineTo(px(sx), pz(-5.2));
    ctx.quadraticCurveTo(px(sx), pz(-3.6), px(sx + 1.6), pz(-3.6));
    ctx.stroke();
    // stop bar and stand number
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px(sx - 0.35), pz(-9.25));
    ctx.lineTo(px(sx + 0.35), pz(-9.25));
    ctx.stroke();
    ctx.fillStyle = "rgba(240,190,40,0.95)";
    ctx.font = `bold ${PPU * 0.55}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${i + 11}`, px(sx + 0.75), pz(-5.6));
  }
  // taxilane centreline along the front of the apron
  ctx.strokeStyle = "rgba(240,190,40,0.95)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, pz(-3.6));
  ctx.lineTo(W, pz(-3.6));
  ctx.stroke();
  // white service road along the terminal
  ctx.setLineDash([24, 16]);
  ctx.strokeStyle = "rgba(230,230,230,0.6)";
  ctx.lineWidth = 3;
  for (const z of [-9.75, -9.55]) {
    ctx.beginPath();
    ctx.moveTo(0, pz(z));
    ctx.lineTo(W, pz(z));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function apronTexture() {
  return memo("apronTexture", () => drawApronTexture());
}

/**
 * Night view into a glazed terminal: one continuous interior behind the glass (ceiling downlights,
 * shopfronts, gate signs, seating, people), then the glass itself (tint, sky reflection, streaks)
 * and the curtain-wall frame (slim mullions, transoms, structural columns, floor slabs) on top.
 */
function drawFacadeTexture(width: number, floors: number, seed: number) {
  const W = 2048;
  const FH = 160;
  const H = FH * floors;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const r = prng(seed);
  const phases = Array.from({ length: 4 }, () => r() * Math.PI * 2);
  // smooth brightness along the building, so halls fade into each other instead of per-pane noise
  const light = (x: number, f: number) => {
    const u = x / W;
    const n =
      0.68 +
      0.2 * Math.sin(u * 7 + phases[0] + f) +
      0.15 * Math.sin(u * 17 + phases[1] - f * 2) +
      0.1 * Math.sin(u * 41 + phases[2]);
    return Math.min(1, Math.max(0.2, n));
  };
  const warmth = (x: number) => 0.5 + 0.5 * Math.sin((x / W) * 5 + phases[3]);

  for (let f = 0; f < floors; f++) {
    const y0 = f * FH;
    const top = y0 + 16;
    const bottom = y0 + FH;
    const ih = bottom - top;

    // interior volume: bright ceiling, darker back wall, polished floor catching the light
    for (let x = 0; x < W; x += 4) {
      const b = light(x, f);
      const w = warmth(x);
      const R = 255 * (0.7 + 0.3 * w);
      const G = 255 * (0.62 + 0.22 * w);
      const B = 255 * (0.55 + 0.35 * (1 - w));
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, `rgba(${R},${G},${B},${0.95 * b})`);
      g.addColorStop(0.18, `rgba(${R * 0.75},${G * 0.7},${B * 0.68},${0.8 * b})`);
      g.addColorStop(0.62, `rgba(${R * 0.32},${G * 0.28},${B * 0.3},${0.75 * b})`);
      g.addColorStop(1, `rgba(${R * 0.55},${G * 0.48},${B * 0.45},${0.7 * b})`);
      ctx.fillStyle = "#06080c";
      ctx.fillRect(x, top, 4, ih);
      ctx.fillStyle = g;
      ctx.fillRect(x, top, 4, ih);
    }
    // two receding rows of ceiling downlights
    for (const [row, gap, size, alpha] of [
      [top + 8, 22, 2.4, 0.95],
      [top + 18, 16, 1.6, 0.55],
    ] as const) {
      for (let x = r() * gap; x < W; x += gap) {
        const a = alpha * light(x, f);
        const g = ctx.createRadialGradient(x, row, 0, x, row, size * 4);
        g.addColorStop(0, `rgba(255,250,235,${a})`);
        g.addColorStop(1, "rgba(255,250,235,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - size * 4, row - size * 4, size * 8, size * 8);
      }
    }
    // shopfronts and lit gate signs on the back wall
    for (let x = r() * 80; x < W; x += 60 + r() * 140) {
      const w = 24 + r() * 50;
      const b = light(x, f);
      ctx.fillStyle = `rgba(255,${200 + r() * 40},${150 + r() * 60},${0.35 * b})`;
      ctx.fillRect(x, top + ih * 0.38, w, ih * 0.3);
      if (r() < 0.45) {
        ctx.fillStyle = `rgba(245,194,26,${0.85 * b + 0.1})`;
        ctx.fillRect(x + w * 0.2, top + ih * 0.27, 14 + r() * 10, 6);
      }
    }
    // rows of seating and people at different depths
    for (let x = r() * 40; x < W; x += 30 + r() * 90) {
      ctx.fillStyle = "rgba(12,12,16,0.55)";
      ctx.fillRect(x, top + ih * 0.8, 20 + r() * 40, 5);
    }
    for (let k = 0; k < width * 3.5; k++) {
      const x = r() * W;
      const near = r() < 0.5;
      const hh = near ? 34 + r() * 8 : 22 + r() * 6;
      const base = top + ih * (near ? 0.97 : 0.86);
      ctx.fillStyle = `rgba(14,12,12,${near ? 0.85 : 0.55})`;
      ctx.fillRect(x, base - hh, near ? 6 : 4, hh * 0.82);
      ctx.beginPath();
      ctx.arc(x + (near ? 3 : 2), base - hh, near ? 3.6 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // the glass: blue-grey tint, sky reflection strongest at the top, faint diagonal streaks
    const tint = ctx.createLinearGradient(0, top, 0, bottom);
    tint.addColorStop(0, "rgba(40,58,86,0.26)");
    tint.addColorStop(0.5, "rgba(18,28,44,0.1)");
    tint.addColorStop(1, "rgba(10,16,26,0.18)");
    ctx.fillStyle = tint;
    ctx.fillRect(0, top, W, ih);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, W, ih);
    ctx.clip();
    for (let x = -200; x < W; x += 140 + r() * 260) {
      ctx.fillStyle = `rgba(200,215,240,${0.03 + r() * 0.04})`;
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + 60, top);
      ctx.lineTo(x + 60 + 18 + r() * 40, top);
      ctx.lineTo(x + 18 + r() * 40, bottom);
      ctx.fill();
    }
    ctx.restore();

    // floor slab with a lit edge
    ctx.fillStyle = "#1b212b";
    ctx.fillRect(0, y0, W, 16);
    ctx.fillStyle = "rgba(160,170,190,0.35)";
    ctx.fillRect(0, y0 + 14, W, 2);
  }

  // curtain-wall frame: slim mullions with a highlight edge, transoms, heavier structural columns
  const cols = Math.round(width * 6);
  const pw = W / cols;
  for (let i = 0; i <= cols; i++) {
    const x = Math.round(i * pw);
    if (i % 6 === 0) {
      ctx.fillStyle = "#0e1219";
      ctx.fillRect(x - 5, 0, 10, H);
      ctx.fillStyle = "rgba(120,132,152,0.35)";
      ctx.fillRect(x - 5, 0, 1, H);
    } else {
      ctx.fillStyle = "#242c38";
      ctx.fillRect(x - 1, 0, 3, H);
      ctx.fillStyle = "rgba(150,162,182,0.35)";
      ctx.fillRect(x - 1, 0, 1, H);
    }
  }
  for (let f = 0; f < floors; f++) {
    ctx.fillStyle = "#242c38";
    ctx.fillRect(0, f * FH + 16 + (FH - 16) * 0.66, W, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function facadeTexture(width: number, floors: number, seed: number) {
  return memo(`facadeTexture:${JSON.stringify(width)}:${JSON.stringify(floors)}:${JSON.stringify(seed)}`, () => drawFacadeTexture(width, floors, seed));
}

function drawSignTexture(text: string, fg: string, bg: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = fg;
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text: string, fg: string, bg: string) {
  return memo(`signTexture:${JSON.stringify(text)}:${JSON.stringify(fg)}:${JSON.stringify(bg)}`, () => drawSignTexture(text, fg, bg));
}

function drawGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,214,150,0.55)");
  g.addColorStop(0.5, "rgba(255,190,120,0.18)");
  g.addColorStop(1, "rgba(255,190,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  return memo("glowTexture", () => drawGlowTexture());
}

/** A light point seen from a distance: just a bloom sprite */
function Lamp({ position, color, size = 0.12, opacity = 0.9 }: { position: [number, number, number]; color: string; size?: number; opacity?: number }) {
  const map = useMemo(() => bloomTexture(color), [color]);
  return (
    <sprite position={position} scale={[size, size, 1]} renderOrder={3}>
      <spriteMaterial map={map} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}

function Ground() {
  const map = useMemo(() => grassTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -1.93, -60]} renderOrder={-2}>
      <planeGeometry args={[420, 220]} />
      <meshStandardMaterial map={map} color="#c2d0c6" roughness={1} metalness={0} />
    </mesh>
  );
}

/** White approach-light bars before the threshold, with a strobe running toward the runway */
function ApproachLights() {
  const strobes = useRef<(THREE.Sprite | null)[]>([]);
  const bars = useMemo(() => Array.from({ length: 11 }, (_, i) => -2.6 - i * 0.75), []);
  const strobeMap = useMemo(() => bloomTexture("#ffffff"), []);

  useFrame(({ clock }) => {
    // one sweep from the far end to the threshold every half second, then a short pause
    const cycle = (clock.elapsedTime % 1) / 0.5;
    const lit = Math.floor((1 - cycle) * bars.length);
    strobes.current.forEach((s, i) => {
      if (!s) return;
      s.visible = cycle < 1 && i === lit;
    });
  });

  return (
    <group>
      {bars.map((x, i) => (
        <group key={x}>
          {[-0.24, -0.12, 0, 0.12, 0.24].map((z) => (
            <Lamp key={z} position={[x, 0.03, z]} color="#fff4dc" size={0.1} opacity={0.75} />
          ))}
          {/* red side barrettes near the threshold */}
          {i < 4 &&
            [-0.55, 0.55].map((z) => <Lamp key={z} position={[x, 0.03, z]} color="#ff3b30" size={0.09} opacity={0.8} />)}
          <sprite
            ref={(el) => {
              strobes.current[i] = el;
            }}
            position={[x, 0.05, 0]}
            scale={[0.55, 0.55, 1]}
            renderOrder={4}
          >
            <spriteMaterial map={strobeMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

function Taxiway() {
  const xs = useMemo(() => Array.from({ length: 30 }, (_, i) => -1 + i * 0.9), []);
  const near = useMemo(() => Array.from({ length: 36 }, (_, i) => -9 + i * 0.8), []);
  return (
    <group>
      {/* near-side parallel taxiway: blue edge lights, green centreline */}
      <mesh rotation-x={-Math.PI / 2} position={[5, 0.001, 2.7]} renderOrder={-1}>
        <planeGeometry args={[30, 0.6]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[5, 0.002, 2.7]} renderOrder={-1}>
        <planeGeometry args={[30, 0.02]} />
        <meshBasicMaterial color="#b8901f" />
      </mesh>
      {near.map((x) => (
        <group key={x}>
          <Lamp position={[x, 0.03, 2.38]} color="#3d7bff" size={0.16} />
          <Lamp position={[x, 0.03, 3.02]} color="#3d7bff" size={0.16} />
          <Lamp position={[x + 0.4, 0.02, 2.7]} color="#39e36b" size={0.1} opacity={0.75} />
        </group>
      ))}
      {/* rapid exit link onto the near taxiway */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={-0.6} position={[4.2, 0.001, 1.65]} renderOrder={-1}>
        <planeGeometry args={[0.5, 1.6]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[12, 0.001, -2.55]} renderOrder={-1}>
        <planeGeometry args={[30, 0.62]} />
        <meshStandardMaterial color="#14171c" roughness={0.95} />
      </mesh>
      {/* connector to the runway */}
      <mesh rotation-x={-Math.PI / 2} rotation-z={0.6} position={[3.2, 0.001, -1.7]} renderOrder={-1}>
        <planeGeometry args={[0.55, 1.9]} />
        <meshStandardMaterial color="#14171c" roughness={0.95} />
      </mesh>
      {xs.map((x) => (
        <group key={x}>
          <Lamp position={[x, 0.03, -2.22]} color="#3d7bff" size={0.17} />
          <Lamp position={[x, 0.03, -2.88]} color="#3d7bff" size={0.17} />
        </group>
      ))}
    </group>
  );
}

/** A lit glass building: dark shell, curtain-wall front, roof slab with a lit canopy edge */
function GlassBuilding({
  position,
  size,
  floors,
  seed,
}: {
  position: [number, number, number];
  size: [number, number, number];
  floors: number;
  seed: number;
}) {
  const [w, h, d] = size;
  const mats = useMemo(() => {
    const facade = facadeTexture(w, floors, seed);
    const shell = new THREE.MeshStandardMaterial({ color: "#161c27", roughness: 0.85, metalness: 0.1 });
    const front = new THREE.MeshStandardMaterial({
      map: facade,
      emissiveMap: facade,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 1.05,
      roughness: 0.35,
      metalness: 0.1,
    });
    // box faces: +x, -x, +y, -y, +z (front, toward the runway), -z
    return { facade, shell, list: [shell, shell, shell, shell, front, shell] };
  }, [w, floors, seed]);
  useEffect(
    () => () => {
      mats.facade.dispose();
      mats.shell.dispose();
      mats.list[4].dispose();
    },
    [mats],
  );
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} material={mats.list}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {/* roof slab overhanging the glass, with a pale fascia catching the moonlight */}
      <mesh position={[0, h + 0.035, 0.12]}>
        <boxGeometry args={[w + 0.3, 0.07, d + 0.5]} />
        <meshStandardMaterial color="#2a303c" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, h + 0.035, d / 2 + 0.371]}>
        <planeGeometry args={[w + 0.3, 0.07]} />
        <meshStandardMaterial color="#8a93a6" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* outer glass skin: a thin reflective sheet that picks up the sky and apron lights */}
      <mesh position={[0, h / 2, d / 2 + 0.004]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial
          color="#a9bcd6"
          transparent
          opacity={0.14}
          roughness={0.06}
          metalness={1}
          envMapIntensity={1.4}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Lightbox face for the rooftop billboard, set in the site's own fonts */
function billboardTexture() {
  const W = 2048;
  const H = 400;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const root = getComputedStyle(document.documentElement);
  const sans = root.getPropertyValue("--font-jakarta").trim() || "sans-serif";
  const serif = root.getPropertyValue("--font-instrument").trim() || "serif";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1a2233");
  bg.addColorStop(1, "#0d121c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // neon red frame
  ctx.strokeStyle = "#ff4a4a";
  ctx.lineWidth = 10;
  ctx.shadowColor = "#ff2a2a";
  ctx.shadowBlur = 30;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,255,255,0.7)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 104px ${sans}`;
  ctx.fillText("Build your career in aviation", W / 2, 140);

  ctx.shadowColor = "#ff3b3b";
  ctx.shadowBlur = 36;
  ctx.fillStyle = "#ff5a5a";
  ctx.font = `italic 400 112px ${serif}`;
  ctx.fillText("with Millennium Aviation Academy", W / 2, 278);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Glowing advertising billboard on trusses above the main terminal roof */
function Billboard({ position }: { position: [number, number, number] }) {
  const [face, setFace] = useState<THREE.CanvasTexture | null>(null);
  const halo = useMemo(() => bloomTexture("#ff6a5a"), []);
  const panel = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => {
    let tex: THREE.CanvasTexture | null = null;
    let cancelled = false;
    // draw once the web fonts are ready so the canvas doesn't bake in a fallback face
    document.fonts.ready.then(() => {
      if (cancelled) return;
      tex = billboardTexture();
      setFace(tex);
    });
    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, []);
  // a slow breathing glow, like a neon sign
  useFrame(({ clock }) => {
    if (panel.current) panel.current.color.setScalar(1.05 + Math.sin(clock.elapsedTime * 1.6) * 0.07);
  });

  const w = 5.2;
  const h = w * (400 / 2048);
  const lift = 0.32;
  return (
    <group position={position}>
      {[-w * 0.36, w * 0.36].map((x) => (
        <mesh key={x} position={[x, lift / 2, -0.04]}>
          <boxGeometry args={[0.05, lift, 0.05]} />
          <meshStandardMaterial color="#3b4252" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, lift + h / 2, -0.06]}>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.08]} />
        <meshStandardMaterial color="#232936" roughness={0.5} metalness={0.6} />
      </mesh>
      {face && (
        <mesh position={[0, lift + h / 2, -0.015]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial ref={panel} map={face} toneMapped={false} />
        </mesh>
      )}
      {/* light spilling off the sign into the night air */}
      <sprite position={[0, lift + h / 2, -0.1]} scale={[w * 1.5, h * 3.2, 1]} renderOrder={2}>
        <spriteMaterial map={halo} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight position={[0, lift + h / 2, 0.6]} intensity={1.6} distance={4} decay={1.6} color="#ff8a7a" />
    </group>
  );
}

/** Telescopic jet bridge from the terminal to an aircraft's front door */
function JetBridge({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dz, dx);
  return (
    <group>
      {/* rotunda */}
      <mesh position={[from[0], 0.42, from[1]]}>
        <cylinderGeometry args={[0.14, 0.14, 0.2, 16]} />
        <meshStandardMaterial color="#9aa3b2" roughness={0.45} metalness={0.6} />
      </mesh>
      <group position={[(from[0] + to[0]) / 2, 0.44, (from[1] + to[1]) / 2]} rotation-y={yaw}>
        <mesh>
          <boxGeometry args={[len, 0.15, 0.15]} />
          <meshStandardMaterial color="#a3acba" roughness={0.4} metalness={0.65} />
        </mesh>
        {/* faint lit windows along the tunnel */}
        <mesh position={[0, 0.02, 0.0755]}>
          <planeGeometry args={[len * 0.9, 0.035]} />
          <meshBasicMaterial color="#c9b48d" toneMapped={false} />
        </mesh>
      </group>
      {/* drive wheels under the cab end */}
      <mesh position={[from[0] + dx * 0.75, 0.18, from[1] + dz * 0.75]}>
        <cylinderGeometry args={[0.02, 0.02, 0.36, 6]} />
        <meshStandardMaterial color="#3b4252" />
      </mesh>
    </group>
  );
}

const PARKED: Progress = { current: 0.5 };

/** One of our airliners parked nose-in at a stand; its gear rests on the apron */
function ParkedAirliner({ x }: { x: number }) {
  const anchor = useRef<THREE.Group>(null);
  const ground = useRef(Number.NaN);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (anchor.current) ground.current = anchor.current.getWorldPosition(tmp).y;
  });
  return (
    <group position={[x, 0, -7.35]}>
      <group ref={anchor} />
      {/* nose (+X in the model) turned to point at the terminal (-Z) */}
      <group position={[0, 0.47, 0]} rotation-y={Math.PI / 2} scale={0.8}>
        <LightSpillContext.Provider value={false}>
          <Airliner progress={PARKED} ground={ground} />
        </LightSpillContext.Provider>
      </group>
    </group>
  );
}

/** Ground support vehicle with a flashing amber beacon */
function Vehicle({
  position,
  size,
  color,
  yaw = 0,
  phase = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  yaw?: number;
  phase?: number;
}) {
  const beacon = useRef<THREE.Sprite>(null);
  const map = useMemo(() => bloomTexture("#ffae1a"), []);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.visible = (clock.elapsedTime + phase) % 0.9 < 0.35;
  });
  return (
    <group position={position} rotation-y={yaw}>
      <mesh position={[0, size[1] / 2 + 0.02, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.3} />
      </mesh>
      <sprite ref={beacon} position={[0, size[1] + 0.05, 0]} scale={[0.2, 0.2, 1]} renderOrder={4}>
        <spriteMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <Lamp position={[size[0] / 2 + 0.01, 0.08, 0.04]} color="#fff6e0" size={0.08} />
      <Lamp position={[size[0] / 2 + 0.01, 0.08, -0.04]} color="#fff6e0" size={0.08} />
    </group>
  );
}

function Apron() {
  const map = useMemo(() => apronTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  const w = APRON.x1 - APRON.x0;
  const d = APRON.z1 - APRON.z0;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[(APRON.x0 + APRON.x1) / 2, 0.0015, (APRON.z0 + APRON.z1) / 2]}
      renderOrder={-1}
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={map} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function Terminal() {
  const glow = useMemo(() => glowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);
  const beacon = useRef<THREE.Sprite>(null);
  const beaconMap = useMemo(() => bloomTexture("#ff2a20"), []);
  const cab = useMemo(() => facadeTexture(1.6, 1, 41), []);
  useEffect(() => () => cab.dispose(), [cab]);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.visible = clock.elapsedTime % 1.5 < 0.75;
  });

  const masts = [-9.5, -5.5, -1.5, 2.5, 6];
  return (
    <group>
      <Apron />
      {/* main terminal and a lower concourse wing */}
      <GlassBuilding position={[-3, 0, -11.1]} size={[13, 0.95, 2.4]} floors={2} seed={5} />
      <GlassBuilding position={[7.2, 0, -12.2]} size={[6, 0.5, 2]} floors={1} seed={9} />
      <Billboard position={[-1.5, 1.02, -10.6]} />

      {STANDS.slice(0, 2).map((x) => (
        <ParkedAirliner key={x} x={x} />
      ))}
      {STANDS.map((x, i) => (
        // bridges at occupied stands reach the front door; the empty stand's is parked along the building
        <JetBridge key={x} from={[x - 1.1, -9.75]} to={i < 2 ? [x - 0.27, -8.55] : [x - 0.2, -9.45]} />
      ))}

      {/* ground crew around the parked aircraft */}
      <Vehicle position={[-6.4, 0, -6.6]} size={[0.28, 0.12, 0.14]} color="#d8d2c4" yaw={0.4} />
      <Vehicle position={[-8.7, 0, -7.9]} size={[0.5, 0.2, 0.17]} color="#c9cfd8" yaw={Math.PI / 2} phase={0.4} />
      <Vehicle position={[-2.4, 0, -5.9]} size={[0.22, 0.1, 0.12]} color="#e3b52a" yaw={-0.3} phase={0.2} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-2.0 + i * 0.22, 0.06, -5.7 - i * 0.05]}>
          <boxGeometry args={[0.18, 0.08, 0.12]} />
          <meshStandardMaterial color="#5b6372" roughness={0.7} />
        </mesh>
      ))}

      {/* high-mast apron floodlights with the warm pools they cast */}
      {masts.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.85, -3.4]}>
            <cylinderGeometry args={[0.018, 0.026, 1.7, 8]} />
            <meshStandardMaterial color="#5a6272" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[x, 1.72, -3.4]}>
            <boxGeometry args={[0.22, 0.05, 0.08]} />
            <meshStandardMaterial color="#3b4252" />
          </mesh>
          {[-0.07, 0, 0.07].map((o) => (
            <Lamp key={o} position={[x + o, 1.69, -3.36]} color="#ffe6bf" size={0.32} />
          ))}
          <mesh rotation-x={-Math.PI / 2} position={[x, 0.004, -5.4]} renderOrder={1}>
            <planeGeometry args={[4.2, 4.4]} />
            <meshBasicMaterial map={glow} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
      <pointLight position={[-5.5, 1.6, -5]} intensity={5} distance={9} decay={1.6} color="#ffd9a8" />
      <pointLight position={[2.5, 1.6, -5]} intensity={4} distance={9} decay={1.6} color="#ffd9a8" />

      {/* control tower: tapered concrete shaft, glazed cab with consoles glowing inside */}
      <group position={[-13.5, 0, -12.5]}>
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.13, 0.2, 2.2, 20]} />
          <meshStandardMaterial color="#5b6170" roughness={0.75} />
        </mesh>
        <mesh position={[0, 2.18, 0]}>
          <cylinderGeometry args={[0.3, 0.26, 0.06, 20]} />
          <meshStandardMaterial color="#3a404d" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.33, 0]}>
          <cylinderGeometry args={[0.32, 0.26, 0.24, 20, 1, true]} />
          <meshStandardMaterial
            map={cab}
            emissiveMap={cab}
            emissive="#9fe8d6"
            emissiveIntensity={0.55}
            color="#9fb8c4"
            roughness={0.15}
            metalness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 2.48, 0]}>
          <cylinderGeometry args={[0.36, 0.34, 0.06, 20]} />
          <meshStandardMaterial color="#2a303c" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0.08, 2.66, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.3, 4]} />
          <meshStandardMaterial color="#8a93a6" />
        </mesh>
        <sprite ref={beacon} position={[0.08, 2.83, 0]} scale={[0.3, 0.3, 1]} renderOrder={4}>
          <spriteMaterial map={beaconMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>

      {/* maintenance hangar with its doors open onto a lit floor */}
      <group position={[-27, 0, -18]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[4.5, 1.1, 3]} />
          <meshStandardMaterial color="#3a414e" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.1, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[1.5, 1.5, 4.5, 24, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#4a5260" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.48, 1.505]}>
          <planeGeometry args={[3.6, 0.9]} />
          <meshBasicMaterial color="#d9c9a8" toneMapped={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 2.6]} renderOrder={1}>
          <planeGeometry args={[4.6, 2.4]} />
          <meshBasicMaterial map={glow} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* fuel farm */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-25 + i * 1.3, 0, -15]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.6, 24]} />
            <meshStandardMaterial color="#b9bec8" roughness={0.5} metalness={0.4} />
          </mesh>
          <Lamp position={[0, 0.63, 0]} color="#ff2a20" size={0.16} />
        </group>
      ))}
    </group>
  );
}

/** PAPI glide-slope lights beside the touchdown zone: two red, two white when on the glide path */
function Papi() {
  return (
    <group position={[-0.55, 0, 1.55]}>
      {["#ff3b30", "#ff3b30", "#ffffff", "#ffffff"].map((color, i) => (
        <group key={i} position={[0, 0, i * 0.12]}>
          {/* low grey lamp housing on two legs, facing the approach */}
          <mesh position={[0, 0.022, 0]}>
            <boxGeometry args={[0.035, 0.018, 0.05]} />
            <meshStandardMaterial color="#8a919e" roughness={0.5} metalness={0.5} />
          </mesh>
          <Lamp position={[-0.03, 0.04, 0]} color={color} size={0.22} opacity={1} />
        </group>
      ))}
    </group>
  );
}

function drawWindsockTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 100;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? "#ecebe6" : "#f0581a";
    ctx.fillRect(0, i * 20, 8, 20);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windsockTexture() {
  return memo("windsockTexture", () => drawWindsockTexture());
}

/** Windsock beside the threshold: striped sleeve on a hinged frame, gently swinging in the breeze */
function Windsock() {
  const sock = useRef<THREE.Group>(null);
  const map = useMemo(() => windsockTexture(), []);
  useEffect(() => () => map.dispose(), [map]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sock.current) {
      sock.current.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.18;
      sock.current.rotation.z = -0.12 + Math.sin(t * 1.7) * 0.03;
    }
  });
  const L = 0.2;
  return (
    <group position={[-1.3, 0, 2.05]}>
      <mesh position={[0, 0.006, 0]}>
        <boxGeometry args={[0.05, 0.012, 0.05]} />
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.0035, 0.005, 0.34, 8]} />
        <meshStandardMaterial color="#d6d9df" roughness={0.4} metalness={0.6} />
      </mesh>
      <group ref={sock} position={[0, 0.33, 0]}>
        {/* mouth ring */}
        <mesh position={[0.008, 0, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.022, 0.0018, 6, 20]} />
          <meshStandardMaterial color="#c9ced8" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* sleeve: wide at the mouth, tapering downwind; the cylinder's +Y end is turned toward the pole */}
        <mesh position={[0.008 + L / 2, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.022, 0.011, L, 20, 1, true]} />
          <meshStandardMaterial map={map} roughness={0.85} side={THREE.DoubleSide} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.12} />
        </mesh>
      </group>
      <Lamp position={[0, 0.355, 0]} color="#ff3020" size={0.07} />
    </group>
  );
}

/** Lit taxiway guidance signs at the runway exit */
function Signs() {
  const maps = useMemo(
    () => [signTexture("A3 →", "#111111", "#f5c21a"), signTexture("A", "#f5c21a", "#111111"), signTexture("27", "#ffffff", "#c8102e")],
    [],
  );
  useEffect(() => () => maps.forEach((m) => m.dispose()), [maps]);
  return (
    <group position={[2.2, 0, -1.25]} rotation-y={0.2}>
      {maps.map((map, i) => (
        <group key={i} position={[i * 0.3, 0, 0]}>
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.28, 0.1, 0.03]} />
            <meshStandardMaterial color="#1a1d24" />
          </mesh>
          <mesh position={[0, 0.07, 0.016]}>
            <planeGeometry args={[0.26, 0.09]} />
            <meshBasicMaterial map={map} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Perimeter road behind the airfield: street lights and cars moving along it */
function PerimeterRoad() {
  const cars = useRef<(THREE.Group | null)[]>([]);
  const head = useMemo(() => bloomTexture("#fff4dc"), []);
  const tail = useMemo(() => bloomTexture("#ff3020"), []);
  const fleet = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ offset: i * 11, dir: i % 2 ? 1 : -1, lane: i % 2 ? 0.12 : -0.12 })), []);
  useFrame(({ clock }) => {
    cars.current.forEach((g, i) => {
      if (!g) return;
      const f = fleet[i];
      const t = (clock.elapsedTime * 1.4 + f.offset) % 90;
      g.position.x = f.dir > 0 ? -45 + t : 45 - t;
    });
  });
  return (
    <group position={[0, 0, -19]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
        <planeGeometry args={[90, 0.45]} />
        <meshStandardMaterial color="#1b1e24" roughness={0.9} />
      </mesh>
      {Array.from({ length: 30 }, (_, i) => (
        <Lamp key={i} position={[-43 + i * 3, 0.45, -0.3]} color="#ffb766" size={0.35} opacity={0.8} />
      ))}
      {fleet.map((f, i) => (
        <group
          key={i}
          ref={(el) => {
            cars.current[i] = el;
          }}
          position={[0, 0.04, f.lane]}
        >
          <sprite position={[0.06 * f.dir, 0, 0]} scale={[0.22, 0.22, 1]}>
            <spriteMaterial map={head} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
          <sprite position={[-0.06 * f.dir, 0, 0]} scale={[0.12, 0.12, 1]}>
            <spriteMaterial map={tail} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

/** Thousands of street and window lights spreading toward the horizon */
function CityLights() {
  const geometry = useMemo(() => {
    const r = prng(11);
    const count = 2400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color("#ffc27a");
    const cool = new THREE.Color("#dfe8ff");
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // clustered along a few "roads" plus general scatter
      const road = r() < 0.35;
      const x = (r() - 0.5) * 180;
      const z = road ? -40 - Math.floor(r() * 6) * 9 + (r() - 0.5) * 0.6 : -32 - r() * 70;
      pos.set([x, -1.9, z], i * 3);
      c.copy(r() < 0.75 ? warm : cool).multiplyScalar(0.55 + r() * 0.6);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial size={2} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </points>
  );
}

export function Airport() {
  return (
    <>
      <Ground />
      <CityLights />
      <group position={RUNWAY_POS} rotation-y={RUNWAY_YAW}>
        <ApproachLights />
        <Taxiway />
        <Papi />
        <Windsock />
        <Signs />
        <Terminal />
        <PerimeterRoad />
      </group>
    </>
  );
}

