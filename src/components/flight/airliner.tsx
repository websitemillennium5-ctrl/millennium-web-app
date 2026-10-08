"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { AircraftLight } from "./nav-lights";

/*
 * A procedurally built narrow-body airliner (A320-ish proportions).
 * Nose points along +X, up is +Y, right wing along +Z. Length ≈ 4 units.
 */

const R = 0.3; // fuselage radius
const LEN = 4; // fuselage length, from x = -2 (tail) to x = +2 (nose)
const BRAND = "#e3182d";
const INK = "#0e1626";

/* ---------------------------- fuselage ---------------------------- */

// s: 0 at the tail tip, 1 at the nose tip
function profile(s: number) {
  let r = R;
  let cy = 0;
  if (s > 0.86) {
    // ogive nose that droops slightly
    const t = (s - 0.86) / 0.14;
    r = R * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.6);
    cy = -0.3 * R * Math.pow(t, 1.5);
  } else if (s < 0.32) {
    // tail cone: the crown line stays almost straight while the belly sweeps up steeply,
    // ending in a small APU exhaust rather than a rounded bulb
    const t = (0.32 - s) / 0.32;
    r = R * (1 - 0.93 * Math.pow(t, 1.25));
    const crown = R * (1 - 0.38 * Math.pow(t, 1.6));
    cy = crown - r;
    if (s < 0.004) r *= s / 0.004; // close the very end behind the APU nozzle
  }
  return { r, cy };
}

/** Where the tow rope attaches: the rim of the APU exhaust at the very tip of the tail cone */
export const TAIL_TOW_POINT: [number, number, number] = [-2.03, profile(0).cy, 0];

type ShellOptions = { s0?: number; s1?: number; th0?: number; th1?: number; inflate?: number; NL?: number; NR?: number };

/** Surface of revolution following the fuselage profile. UVs are normalised over the s / θ ranges. */
function fuselageGeometry({ s0 = 0, s1 = 1, th0 = 0, th1 = Math.PI * 2, inflate = 0, NL = 200, NR = 64 }: ShellOptions = {}) {
  const pos: number[] = [];
  const nrm: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const eps = 1e-3;

  for (let i = 0; i <= NL; i++) {
    const s = s0 + ((s1 - s0) * i) / NL;
    const x = -LEN / 2 + LEN * s;
    const { r: r0, cy } = profile(s);
    const r = r0 * (1 + inflate);
    const a = profile(Math.max(0, s - eps));
    const b = profile(Math.min(1, s + eps));
    const ds = (Math.min(1, s + eps) - Math.max(0, s - eps)) * LEN;
    const dr = (b.r - a.r) / ds;
    const dcy = (b.cy - a.cy) / ds;
    for (let j = 0; j <= NR; j++) {
      const th = th0 + ((th1 - th0) * j) / NR;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      pos.push(x, cy + r * c, r * sn);
      // analytic outward normal of (x, cy + r cosθ, r sinθ)
      const n = new THREE.Vector3(-(dcy * c + dr), c, sn).normalize();
      nrm.push(n.x, n.y, n.z);
      uv.push((s - s0) / (s1 - s0), 1 - j / NR);
    }
  }
  for (let i = 0; i < NL; i++) {
    for (let j = 0; j < NR; j++) {
      const a = i * (NR + 1) + j;
      const b = a + NR + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Livery painted on a canvas: u runs tail→nose, v runs around the body from the crown */
function liveryTexture() {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const X = (s: number) => s * W;
  const Y = (th: number) => (th / (Math.PI * 2)) * H;
  const sOf = (x: number) => (x + LEN / 2) / LEN;
  const wPx = (w: number) => (w / LEN) * W;
  const hPx = (h: number) => (h / (2 * Math.PI * R)) * H;
  const PI = Math.PI;

  // base paint with a subtle sheen gradient
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#ffffff");
  base.addColorStop(0.5, "#f1f3f6");
  base.addColorStop(1, "#ffffff");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // navy belly with a swept front edge, symmetric about θ = π (the keel)
  const bellyTop = (s: number) => PI - (s < 0.8 ? 0.85 + (0.8 - s) * 0.25 : 0.85 - ((s - 0.8) / 0.14) * 0.85);
  const belly = (offset: number) => {
    ctx.beginPath();
    for (let s = 0; s <= 0.94; s += 0.005) ctx.lineTo(X(s), Y(bellyTop(s) - offset));
    for (let s = 0.94; s >= 0; s -= 0.005) ctx.lineTo(X(s), Y(2 * PI - bellyTop(s) + offset));
    ctx.closePath();
  };
  belly(0.09);
  ctx.fillStyle = BRAND;
  ctx.fill();
  belly(0);
  ctx.fillStyle = INK;
  ctx.fill();

  // red tail sweep flowing into the fin, drawn on both halves (θ near 0 and near 2π)
  for (const sign of [1, -1]) {
    const y0 = sign === 1 ? 0 : H;
    ctx.beginPath();
    ctx.moveTo(X(0), y0);
    ctx.lineTo(X(0.27), y0);
    ctx.quadraticCurveTo(X(0.2), y0 + sign * Y(0.9), X(0.06), y0 + sign * Y(PI - 0.6));
    ctx.lineTo(X(0), y0 + sign * Y(PI - 0.4));
    ctx.closePath();
    ctx.fillStyle = BRAND;
    ctx.fill();
  }

  const roundRect = (cx: number, cy: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  };

  // both sides of the aircraft: +z side is θ ≈ π/2, -z side is θ ≈ 3π/2 (mirrored offsets)
  const sides = [
    { th: (d: number) => PI / 2 - d },
    { th: (d: number) => (3 * PI) / 2 + d },
  ];

  const doors = [sOf(1.48), sOf(-0.82), sOf(0.18)];
  for (const side of sides) {
    // cabin windows
    for (let x = -0.78; x <= 1.36; x += 0.076) {
      const s = sOf(x);
      if (doors.some((d) => Math.abs(d - s) < 0.014)) continue;
      const cx = X(s);
      const cy = Y(side.th(0.1));
      const w = wPx(0.036);
      const h = hPx(0.052);
      const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
      g.addColorStop(0, "#3b4658");
      g.addColorStop(1, "#0b111c");
      roundRect(cx, cy, w, h, w / 2.2);
      ctx.fillStyle = g;
      ctx.fill();
    }
    // doors (outlined) — two main, one over-wing exit
    doors.forEach((s, i) => {
      const small = i === 2;
      roundRect(X(s), Y(side.th(small ? 0.1 : 0.03)), wPx(small ? 0.05 : 0.08), hPx(small ? 0.09 : 0.17), 6);
      ctx.strokeStyle = "#aab2bf";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // fuselage titles; the -z side is drawn rotated 180° so it reads correctly from that side
  const title = (th: number, flip: boolean) => {
    ctx.save();
    ctx.translate(X(sOf(0.3)), Y(th));
    if (flip) ctx.rotate(PI);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    ctx.font = `800 ${hPx(0.11)}px "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif`;
    ctx.letterSpacing = "6px";
    ctx.fillText("MILLENNIUM", 0, 0);
    ctx.font = `600 ${hPx(0.045)}px "Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif`;
    ctx.letterSpacing = "10px";
    ctx.fillStyle = BRAND;
    ctx.fillText("AIR HOSTESS ACADEMY", 0, hPx(0.085));
    ctx.restore();
  };
  title(PI / 2 - 0.68, false);
  title((3 * PI) / 2 + 0.68, true);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ----------------------------- cockpit ----------------------------- */

// Region of the nose covered by the cockpit glass shell
const CK = { s0: 0.89, s1: 0.98, th0: -1.35, th1: 1.35 };

/**
 * Cockpit windows drawn in (s, θ) space for the +z side and mirrored for the -z side.
 * Layout follows an A320: two-piece windshield split by a centre post, then the
 * sliding (DV) window and the rear side window, with raked frame posts.
 */
function cockpitTexture() {
  const W = 1024;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const X = (s: number) => ((s - CK.s0) / (CK.s1 - CK.s0)) * W;
  const Y = (th: number) => ((th - CK.th0) / (CK.th1 - CK.th0)) * H;

  // The window band, in (s, θ) for the +z side. θ is measured from the crown, so a larger
  // θ is lower on the side of the nose. The band sits just above the cabin-window line
  // and narrows as it runs forward.
  const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
  const top = (s: number) => lerp(0.9, 0.6, (s - 0.905) / 0.041);
  const bottom = (s: number) => lerp(1.32, 1.12, (s - 0.905) / 0.044);
  const LEAN = 0.003; // posts lean aft toward the top

  // a side pane between two posts
  const sidePane = (sa: number, sf: number): [number, number][] => [
    [sa, top(sa)],
    [sf, top(sf)],
    [sf + LEAN, bottom(sf + LEAN)],
    [sa + LEAN, bottom(sa + LEAN)],
  ];

  // windshield: aft post, then a lower edge that curves forward and inward to the centre post
  const windshield: [number, number][] = [];
  const wsAft = 0.946;
  const post = 0.045; // half-width of the centre post, in radians
  for (let k = 0; k <= 12; k++) {
    // top edge, from the aft post inward to the centre post
    const th = lerp(top(wsAft), post, k / 12);
    windshield.push([wsAft + 0.007 * (1 - (th / top(wsAft)) ** 2), th]);
  }
  for (let k = 0; k <= 16; k++) {
    // lower edge, from the centre post back out and down to the aft post
    const th = lerp(post, bottom(wsAft + LEAN), k / 16);
    const b = bottom(wsAft + LEAN);
    windshield.push([wsAft + LEAN + 0.021 * (1 - (th / b) ** 2), th]);
  }

  const panes: [number, number][][] = [
    windshield,
    sidePane(0.925, 0.9425), // sliding (DV) window
    sidePane(0.9055, 0.922), // rear side window
  ];

  const path = (pts: [number, number][], mirror: boolean, inset = 0) => {
    // simple inset toward the centroid to draw the frame seal
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    ctx.beginPath();
    pts.forEach(([s, th], i) => {
      const ss = s + (cx - s) * inset;
      const tt = th + (cy - th) * inset;
      const px = X(ss);
      const py = Y(mirror ? -tt : tt);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  };

  for (const mirror of [false, true]) {
    panes.forEach((pts) => {
      // dark frame seal around the glass
      path(pts, mirror, -0.06);
      ctx.fillStyle = "#3a4250";
      ctx.lineJoin = "round";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "#3a4250";
      ctx.stroke();
      ctx.fill();

      // tinted glass: deep blue-black with a sky reflection toward the top edge
      path(pts, mirror);
      // gradient runs from the crown side (sky reflection) to the lower edge (dark)
      const ths = pts.map(([, th]) => th);
      const yHigh = Y(mirror ? -Math.min(...ths) : Math.min(...ths));
      const yLow = Y(mirror ? -Math.max(...ths) : Math.max(...ths));
      const g = ctx.createLinearGradient(0, yHigh, 0, yLow);
      g.addColorStop(0, "#8eaacb");
      g.addColorStop(0.3, "#3d5674");
      g.addColorStop(0.7, "#141f31");
      g.addColorStop(1, "#070c15");
      ctx.fillStyle = g;
      ctx.lineWidth = 8;
      ctx.strokeStyle = g;
      ctx.stroke();
      ctx.fill();

      // diagonal glint
      ctx.save();
      path(pts, mirror);
      ctx.clip();
      const xs = pts.map(([s]) => X(s));
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      const glint = ctx.createLinearGradient(left, Math.min(yHigh, yLow), right, Math.max(yHigh, yLow));
      glint.addColorStop(0.35, "rgba(255,255,255,0)");
      glint.addColorStop(0.5, "rgba(255,255,255,0.18)");
      glint.addColorStop(0.62, "rgba(255,255,255,0)");
      ctx.fillStyle = glint;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    });

    // windshield wiper resting along the lower edge
    ctx.beginPath();
    const wy = (th: number) => Y(mirror ? -th : th);
    ctx.moveTo(X(0.9655), wy(0.3));
    ctx.lineTo(X(0.9585), wy(0.75));
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1f27";
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------- lifting surfaces ------------------------ */

type Section = { x: number; y: number; z: number; c: number; t: number };

// NACA 4-digit symmetric thickness distribution
const naca = (u: number, t: number) =>
  5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);

/**
 * Lofts airfoil sections along local +Z. x = leading edge, chord runs toward -X.
 * [u0, u1] selects a slice of the chord, e.g. [0.72, 1] for an elevator or rudder.
 */
function loft(sections: Section[], n = 20, u0 = 0, u1 = 1) {
  const foil: [number, number][] = [];
  const at = (k: number) => u0 + (u1 - u0) * 0.5 * (1 - Math.cos((Math.PI * k) / n));
  for (let k = n; k >= 0; k--) foil.push([at(k), naca(at(k), 1)]);
  for (let k = u0 === 0 ? 1 : 0; k <= (u1 === 1 ? n - 1 : n); k++) foil.push([at(k), -naca(at(k), 1)]);
  const M = foil.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  sections.forEach((sec) => {
    foil.forEach(([u, v]) => {
      const x = sec.x - u * sec.c;
      pos.push(x, sec.y + v * sec.t * sec.c, sec.z);
      uv.push(x, sec.z);
    });
  });
  for (let si = 0; si < sections.length - 1; si++) {
    for (let m = 0; m < M; m++) {
      const a = si * M + m;
      const b = si * M + ((m + 1) % M);
      const c = a + M;
      const d = b + M;
      idx.push(a, b, c, b, d, c);
    }
  }
  // root cap (so separate panels read as solid when they deflect)
  const first = sections[0];
  const rootCentre = pos.length / 3;
  pos.push(first.x - first.c * ((u0 + u1) / 2), first.y, first.z);
  uv.push(first.x - first.c * ((u0 + u1) / 2), first.z);
  for (let m = 0; m < M; m++) idx.push((m + 1) % M, rootCentre, m);

  // tip cap
  const last = sections[sections.length - 1];
  const centre = pos.length / 3;
  const mid = (u0 + u1) / 2;
  pos.push(last.x - last.c * mid, last.y, last.z);
  uv.push(last.x - last.c * mid, last.z);
  const off = (sections.length - 1) * M;
  for (let m = 0; m < M; m++) idx.push(off + m, centre, off + ((m + 1) % M));

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------- wing ------------------------------- */

const WING: Section[] = [
  { x: 0.48, y: 0, z: 0, c: 1.05, t: 0.13 },
  { x: 0.2, y: 0.075, z: 0.75, c: 0.62, t: 0.11 },
  { x: -0.62, y: 0.22, z: 2.2, c: 0.22, t: 0.09 },
];
const WING_HINGE = 0.74; // flap / aileron hinge, fraction of chord
const SLAT_CHORD = 0.12; // slats occupy the first 12% of chord outboard

/** Planform section interpolated at spanwise station z */
function sectionAt(secs: Section[], z: number): Section {
  const i = Math.max(0, secs.findIndex((s, k) => k < secs.length - 1 && z >= s.z && z <= secs[k + 1].z));
  const a = secs[i];
  const b = secs[Math.min(i + 1, secs.length - 1)];
  const t = b.z === a.z ? 0 : (z - a.z) / (b.z - a.z);
  const l = (p: number, q: number) => p + (q - p) * t;
  return { x: l(a.x, b.x), y: l(a.y, b.y), z, c: l(a.c, b.c), t: l(a.t, b.t) };
}

/** The planform between two spanwise stations, keeping any kinks in between */
function slice(secs: Section[], z0: number, z1: number) {
  return [sectionAt(secs, z0), ...secs.filter((s) => s.z > z0 && s.z < z1), sectionAt(secs, z1)];
}

/** Point on the chord line at fraction u of the local chord, at station z */
function chordPoint(z: number, u: number) {
  const s = sectionAt(WING, z);
  return new THREE.Vector3(s.x - u * s.c, s.y, z);
}

type Surface = {
  kind: "flapIn" | "flapOut" | "aileron" | "slat";
  geometry: THREE.BufferGeometry;
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
};

/** A hinged panel: geometry re-centred on its hinge so it can rotate about the hinge line */
function surface(kind: Surface["kind"], z0: number, z1: number, u0: number, u1: number, hingeU: number, n = 10): Surface {
  const geometry = loft(slice(WING, z0, z1), n, u0, u1);
  const a = chordPoint(z0, hingeU);
  const b = chordPoint(z1, hingeU);
  geometry.translate(-a.x, -a.y, -a.z);
  return { kind, geometry, pivot: a, axis: b.sub(a).normalize() };
}

const WING_BOUNDS = { x0: -1.0, x1: 0.62, z0: 0, z1: 2.3 };

/** Panel lines, spoilers, access panels and walkway painted in wing (x, z) space */
function wingTexture() {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const { x0, x1, z0, z1 } = WING_BOUNDS;
  const px = (x: number) => ((x - x0) / (x1 - x0)) * S;
  const pz = (z: number) => S - ((z - z0) / (z1 - z0)) * S;
  const at = (z: number, u: number) => {
    const p = chordPoint(z, u);
    return [px(p.x), pz(z)] as const;
  };
  const line = (pts: (readonly [number, number])[], color: string, width: number, dash: number[] = []) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const along = (u: number, za: number, zb: number) =>
    Array.from({ length: 12 }, (_, i) => at(za + ((zb - za) * i) / 11, u));

  ctx.fillStyle = "#e6e9ee";
  ctx.fillRect(0, 0, S, S);

  // subtle chordwise sheen so the skin isn't a flat colour
  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, "rgba(0,0,0,0.05)");
  g.addColorStop(0.6, "rgba(255,255,255,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.03)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const panel = "rgba(90,100,115,0.45)";
  // front and rear spar lines
  line(along(0.16, 0.05, 2.15), panel, 1.5);
  line(along(0.62, 0.05, 2.1), panel, 1.5);
  // spanwise rib lines between the spars
  for (let z = 0.25; z < 2.1; z += 0.22) line([at(z, 0.16), at(z, 0.62)], "rgba(90,100,115,0.18)", 1);

  // five spoiler panels ahead of the flaps
  const spoilers = [0.32, 0.56, 0.8, 1.04, 1.28, 1.52];
  for (let i = 0; i < spoilers.length - 1; i++) {
    const za = spoilers[i] + 0.008;
    const zb = spoilers[i + 1] - 0.008;
    line([at(za, 0.625), at(zb, 0.625), at(zb, WING_HINGE - 0.004), at(za, WING_HINGE - 0.004), at(za, 0.625)], "rgba(70,80,95,0.6)", 2);
  }

  // fuel / access panels along the wing box
  for (let z = 0.35; z < 2.0; z += 0.24) {
    const [cx, cy] = at(z, 0.4);
    ctx.beginPath();
    ctx.ellipse(cx, cy, S * 0.012, S * 0.006, 0, 0, Math.PI * 2);
    ctx.strokeStyle = panel;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // walkway near the root, outlined with a dashed "no step" border
  line([at(0.08, 0.2), at(0.6, 0.22), at(0.6, 0.55), at(0.08, 0.55), at(0.08, 0.2)], "rgba(60,66,78,0.55)", 2, [10, 7]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / (x1 - x0), 1 / (z1 - z0));
  tex.offset.set(-x0 / (x1 - x0), -z0 / (z1 - z0));
  return tex;
}

function buildWing() {
  const surfaces: Surface[] = [
    surface("slat", 0.95, 2.17, 0, SLAT_CHORD, SLAT_CHORD, 8),
    surface("flapIn", 0.2, 0.75, WING_HINGE, 1, WING_HINGE),
    surface("flapOut", 0.75, 1.55, WING_HINGE, 1, WING_HINGE),
    surface("aileron", 1.55, 2.04, WING_HINGE, 1, WING_HINGE),
  ];
  // flap-track fairings ("canoes") under the trailing edge
  const canoes = [0.5, 1.0, 1.38].map((z) => {
    const s = sectionAt(WING, z);
    return { x: s.x - s.c * 0.86, y: s.y - s.t * s.c * 0.45 - 0.03, z, len: s.c * 0.42 };
  });
  return {
    fixed: [
      loft(slice(WING, 0, 0.95), 20, 0, WING_HINGE), // inboard wing box
      loft(slice(WING, 0.95, 2.2), 20, SLAT_CHORD, WING_HINGE), // outboard wing box behind the slats
      loft(slice(WING, 0, 0.2), 8, WING_HINGE, 1), // fixed trailing edge at the root
      loft(slice(WING, 2.04, 2.2), 6, WING_HINGE, 1), // fixed trailing edge at the tip
      loft(slice(WING, 2.17, 2.2), 6, 0, SLAT_CHORD), // leading-edge tip cap
    ],
    surfaces,
    canoes,
  };
}

/** Animates one hinged surface: flaps and slats deploy for take-off, ailerons trim the gentle rocking */
function ControlSurface({
  surface: sf,
  side,
  progress,
  material,
}: {
  surface: Surface;
  side: 1 | -1;
  progress?: { current: number };
  material: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const p = progress?.current ?? 0.5;
    // take-off configuration on the runway, cleaned up during the climb
    const deploy = 1 - THREE.MathUtils.smoothstep(p, 0.2, 0.34);
    const t = clock.elapsedTime;
    let angle = 0;
    g.position.copy(sf.pivot);
    if (sf.kind === "flapIn" || sf.kind === "flapOut") {
      angle = (sf.kind === "flapIn" ? 0.42 : 0.34) * deploy;
      // Fowler motion: the flap slides aft as it drops
      g.position.x -= 0.05 * deploy;
      g.position.y -= 0.012 * deploy;
    } else if (sf.kind === "slat") {
      angle = -0.22 * deploy;
      g.position.x += 0.03 * deploy;
      g.position.y -= 0.012 * deploy;
    } else {
      // ailerons move opposite on each wing, matching the plane's slight roll wobble
      const airborne = THREE.MathUtils.smoothstep(p, 0.15, 0.25);
      angle = side * Math.sin(t * 0.8) * 0.14 * airborne;
    }
    g.quaternion.copy(q.setFromAxisAngle(sf.axis, angle));
  });

  return (
    <group ref={ref}>
      <mesh geometry={sf.geometry} material={material} />
    </group>
  );
}

/* ------------------------------ wheels ------------------------------ */

type WheelGeometry = {
  tyre: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  brake: THREE.BufferGeometry;
  bolt: THREE.BufferGeometry;
  boltRing: number;
  boltZ: number;
  width: number;
};

const wheelCache = new Map<string, WheelGeometry>();

/** Lathe around the wheel's axle (local Z), with +Z the outboard face */
function axleLathe(points: [number, number][], segments: number) {
  const g = new THREE.LatheGeometry(
    points.map(([r, z]) => new THREE.Vector2(Math.max(r, 0.0001), z)),
    segments,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Tyre, rim, brake and bolt geometry for a wheel of radius r and width w (shared between legs) */
function wheelGeometry(r: number, w: number): WheelGeometry {
  const key = `${r}:${w}`;
  const hit = wheelCache.get(key);
  if (hit) return hit;

  // tyre: a superellipse cross-section (squarish shoulders) swept around the axle.
  // The loop starts at the bead so the tread sits in the middle of the texture's v range.
  const bead = r * 0.6;
  const rc = (r + bead) / 2;
  const a = (r - bead) / 2;
  const b = w / 2;
  const n = 3.2;
  const tyrePts: [number, number][] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI + (2 * Math.PI * i) / N;
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    tyrePts.push([rc + a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(sn) * Math.abs(sn) ** (2 / n)]);
  }

  // rim: hub cap → hub → dished web → flange (outboard), then back across the barrel
  const rim = axleLathe(
    [
      [0, 0.44 * w],
      [0.1 * r, 0.42 * w],
      [0.16 * r, 0.34 * w],
      [0.2 * r, 0.3 * w],
      [0.24 * r, 0.3 * w],
      [0.28 * r, 0.22 * w],
      [0.44 * r, 0.12 * w],
      [0.54 * r, 0.16 * w],
      [0.6 * r, 0.3 * w],
      [0.63 * r, 0.36 * w],
      [0.6 * r, 0.38 * w],
      [0.58 * r, 0.3 * w],
      [0.58 * r, -0.36 * w],
      [0.62 * r, -0.4 * w],
      [0.5 * r, -0.4 * w],
      [0.2 * r, -0.32 * w],
      [0, -0.3 * w],
    ],
    40,
  );

  const geo: WheelGeometry = {
    tyre: axleLathe(tyrePts, 64),
    rim,
    // carbon brake stack tucked inside the barrel on the inboard side
    brake: axleLathe(
      [
        [0.12 * r, -0.05 * w],
        [0.5 * r, -0.05 * w],
        [0.5 * r, -0.62 * w],
        [0.12 * r, -0.62 * w],
      ],
      32,
    ),
    bolt: new THREE.CylinderGeometry(0.035 * r, 0.035 * r, 0.06 * w, 6).rotateX(Math.PI / 2),
    boltRing: 0.22 * r,
    boltZ: 0.33 * w,
    width: w,
  };
  wheelCache.set(key, geo);
  return geo;
}

/** Rubber: tread grooves and sidewall rings as colour + bump maps (u runs around, v across the tyre) */
function tyreTextures() {
  const W = 64;
  const H = 512;
  const make = (paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    paint(canvas.getContext("2d")!);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(24, 1);
    return tex;
  };
  // v (canvas y) runs bead → sidewall → tread (middle) → sidewall → bead
  const grooves = [0.44, 0.5, 0.56];
  const rings = [0.3, 0.34, 0.66, 0.7];
  const map = make((ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1c20");
    g.addColorStop(0.38, "#26292e");
    g.addColorStop(0.5, "#2c2f35"); // worn, slightly greyer tread
    g.addColorStop(0.62, "#26292e");
    g.addColorStop(1, "#1a1c20");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0c0d0f";
    grooves.forEach((v) => ctx.fillRect(0, v * H - 4, W, 8));
    ctx.fillStyle = "#34373d";
    rings.forEach((v) => ctx.fillRect(0, v * H - 1, W, 2));
    addSpeckle(ctx, W, H);
  });
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = make((ctx) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000000";
    grooves.forEach((v) => ctx.fillRect(0, v * H - 4, W, 8));
    ctx.fillStyle = "#b0b0b0";
    rings.forEach((v) => ctx.fillRect(0, v * H - 1.5, W, 3));
  });
  return { map, bump };
}

// tiny speckle so the rubber isn't perfectly flat
function addSpeckle(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const rand = mulberry(11);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.03})`;
    ctx.fillRect(rand() * W, rand() * H, 1, 1);
  }
}

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One complete wheel. `side` mirrors it so the dished face always points outboard. */
function Wheel({ r, w, side, brake, materials }: { r: number; w: number; side: 1 | -1; brake: boolean; materials: GearMaterials }) {
  const geo = wheelGeometry(r, w);
  const bolts = 8;
  return (
    <group scale={[1, 1, side]}>
      <mesh geometry={geo.tyre} material={materials.tyre} />
      <mesh geometry={geo.rim} material={materials.rim} />
      {brake && <mesh geometry={geo.brake} material={materials.brake} />}
      {Array.from({ length: bolts }, (_, i) => {
        const a = (i / bolts) * Math.PI * 2;
        return (
          <mesh
            key={i}
            geometry={geo.bolt}
            material={materials.chrome}
            position={[Math.cos(a) * geo.boltRing, Math.sin(a) * geo.boltRing, geo.boltZ]}
          />
        );
      })}
    </group>
  );
}

/* --------------------------- landing gear --------------------------- */

const STRUT_OUTER = 0.13; // fixed outer cylinder of the oleo strut
const EXT_MIN = 0.19; // fully compressed (axle distance below the attach point)
const EXT_MAX = 0.37; // fully extended, hanging free after lift-off
const LINK = 0.12; // torque-link arm length

type GearMaterials = { metal: THREE.Material; chrome: THREE.Material; tyre: THREE.Material; rim: THREE.Material; brake: THREE.Material };

/**
 * One oleo-pneumatic gear leg. Every frame it measures the distance from its attach
 * point down to the runway and sets the strut so the tyres rest on the surface.
 * A spring-damper gives the strut its bounce when the wheels unload at rotation and
 * lift-off; the tyres can never sink below the runway, the strut compresses instead.
 */
function GearLeg({
  position,
  wheels,
  ground,
  materials,
}: {
  position: [number, number, number];
  wheels: { x: number; z: number; r: number; w?: number; brake?: boolean }[];
  ground?: { current: number };
  materials: GearMaterials;
}) {
  const leg = useRef<THREE.Group>(null);
  const axle = useRef<THREE.Group>(null);
  const piston = useRef<THREE.Mesh>(null);
  const upperLink = useRef<THREE.Mesh>(null);
  const lowerLink = useRef<THREE.Mesh>(null);
  const state = useRef({ ext: 0.3, vel: 0 });
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), scale: new THREE.Vector3() }), []);
  const radius = Math.max(...wheels.map((w) => w.r));

  useFrame((_, delta) => {
    const g = leg.current;
    if (!g) return;
    const st = state.current;
    let target = EXT_MAX;
    const groundY = ground?.current ?? Number.NaN;
    if (Number.isFinite(groundY)) {
      g.getWorldPosition(tmp.pos);
      g.getWorldScale(tmp.scale);
      // only while the gear is fully down (not part-way through retracting)
      if (tmp.scale.y > 0.2 && Math.abs(tmp.scale.y - tmp.scale.x) < 0.02) {
        // small runway irregularities, fixed to the pavement so they only move when the plane does
        const bump = 0.0025 * (Math.sin(tmp.pos.x * 23) + Math.sin(tmp.pos.z * 31 + tmp.pos.x * 7));
        const reach = (tmp.pos.y - (groundY + bump)) / tmp.scale.y - radius;
        target = THREE.MathUtils.clamp(reach, EXT_MIN, EXT_MAX);
      }
    }
    // spring-damper toward the target extension
    const dt = Math.min(delta, 1 / 30);
    const accel = 650 * (target - st.ext) - 30 * st.vel;
    st.vel += accel * dt;
    st.ext += st.vel * dt;
    // the runway pushes back: the tyre may never pass through the surface
    if (st.ext > target) {
      st.ext = target;
      st.vel = Math.min(st.vel, 0);
    }
    st.ext = THREE.MathUtils.clamp(st.ext, EXT_MIN, EXT_MAX);

    if (axle.current) axle.current.position.y = -st.ext;
    if (piston.current) {
      const len = Math.max(0.001, st.ext - STRUT_OUTER);
      piston.current.scale.y = len;
      piston.current.position.y = -STRUT_OUTER - len / 2;
    }

    // torque links: two arms hinged at a knee that folds forward as the strut compresses
    const top = -STRUT_OUTER + 0.012;
    const bottom = -st.ext + 0.03;
    const half = (top - bottom) / 2;
    const knee = Math.sqrt(Math.max(0, LINK * LINK - half * half));
    const place = (mesh: THREE.Mesh | null, y0: number, y1: number) => {
      if (!mesh) return;
      const vx = knee;
      const vy = y1 - y0;
      mesh.position.set(knee / 2 + 0.018, (y0 + y1) / 2, 0);
      mesh.rotation.z = Math.atan2(-vx, vy);
    };
    place(upperLink.current, top, top - half);
    place(lowerLink.current, bottom, bottom + half);
  });

  return (
    <group ref={leg} position={position}>
      {/* outer cylinder */}
      <mesh material={materials.metal} position={[0, -STRUT_OUTER / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.02, STRUT_OUTER, 14]} />
      </mesh>
      {/* sliding chrome piston, stretched every frame */}
      <mesh ref={piston} material={materials.chrome}>
        <cylinderGeometry args={[0.013, 0.013, 1, 12]} />
      </mesh>
      {/* gland nut where the piston enters the cylinder */}
      <mesh material={materials.metal} position={[0, -STRUT_OUTER, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.012, 14]} />
      </mesh>
      {/* scissor torque links */}
      <mesh ref={upperLink} material={materials.metal}>
        <boxGeometry args={[0.008, LINK, 0.018]} />
      </mesh>
      <mesh ref={lowerLink} material={materials.metal}>
        <boxGeometry args={[0.008, LINK, 0.018]} />
      </mesh>
      <group ref={axle}>
        {/* axle beam */}
        <mesh material={materials.metal} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.01, 0.01, Math.max(0.09, ...wheels.map((w) => Math.abs(w.z) * 2 + 0.05)), 8]} />
        </mesh>
        {wheels.map((w, i) => (
          <group key={i} position={[w.x, 0, w.z]}>
            <Wheel r={w.r} w={w.w ?? 0.045} side={w.z < 0 ? -1 : 1} brake={!!w.brake} materials={materials} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** Red fin with swept white/navy ribbons and sparkles. UVs are world (x, height). */
function finTexture(bounds: { x0: number; x1: number; y0: number; y1: number }) {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, "#f0293d");
  g.addColorStop(1, "#b80f21");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const px = (x: number) => ((x - bounds.x0) / (bounds.x1 - bounds.x0)) * S;
  const py = (y: number) => S - ((y - bounds.y0) / (bounds.y1 - bounds.y0)) * S;
  const k = S / (bounds.x1 - bounds.x0); // world units → px

  ctx.save();
  ctx.translate(0.1 * k, 0); // artwork shifted with the fin
  // flight-path ribbons sweeping up from the trailing root towards the tip
  const ribbon = (off: number, width: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(px(-2.15 + off), py(0.12 - off * 0.4));
    ctx.quadraticCurveTo(px(-1.2 + off), py(0.42 - off), px(-1.92 + off * 0.3), py(1.3));
    ctx.strokeStyle = color;
    ctx.lineWidth = width * k;
    ctx.lineCap = "butt";
    ctx.stroke();
  };
  ribbon(0, 0.11, "#ffffff");
  ribbon(0.13, 0.035, INK);
  ribbon(0.2, 0.018, "#ffffff");

  // four-point sparkles in the space behind the ribbons
  const star = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.22;
      ctx.lineTo(px(cx) + Math.cos(a) * rr * k, py(cy) + Math.sin(a) * rr * k);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  };
  star(-1.86, 0.6, 0.09);
  star(-1.95, 0.86, 0.04);
  ctx.restore();

  // rudder hinge: a fine dark panel line with a soft highlight beside it
  const hinge = (dx: number, color: string, width: number) => {
    const [root, tip] = FIN;
    ctx.beginPath();
    ctx.moveTo(px(root.x - root.c * HINGE + dx), py(root.z));
    ctx.lineTo(px(tip.x - tip.c * HINGE + dx), py(tip.z));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  hinge(0.004, "rgba(255,255,255,0.18)", 2);
  hinge(0, "rgba(40,10,15,0.45)", 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.repeat.set(1 / (bounds.x1 - bounds.x0), 1 / (bounds.y1 - bounds.y0));
  tex.offset.set(-bounds.x0 / (bounds.x1 - bounds.x0), -bounds.y0 / (bounds.y1 - bounds.y0));
  return tex;
}

/* ------------------------------ engine ----------------------------- */

function lathe(points: [number, number][], segments = 48) {
  const g = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  g.rotateZ(-Math.PI / 2); // lathe axis (+Y) → +X
  return g;
}

/* ------------------------------------------------------------------ */

const STAB: Section[] = [
  { x: -1.2, y: 0, z: 0, c: 0.56, t: 0.1 },
  { x: -1.68, y: 0.07, z: 0.86, c: 0.2, t: 0.09 },
];

const FIN: Section[] = [
  { x: -0.9, y: 0, z: 0.16, c: 0.98, t: 0.11 },
  { x: -1.6, y: 0, z: 1.13, c: 0.31, t: 0.1 },
  { x: -1.615, y: 0, z: 1.16, c: 0.29, t: 0.07 }, // rounded tip fairing
  { x: -1.635, y: 0, z: 1.175, c: 0.25, t: 0.035 },
];

// rudder / elevator hinge line as a fraction of chord
const HINGE = 0.7;

export function Airliner({
  gearRef,
  progress,
  ground,
}: {
  gearRef?: React.Ref<THREE.Group>;
  /** scroll progress, drives flaps / slats */
  progress?: { current: number };
  /** world-space height of the runway surface (NaN when there is no ground) */
  ground?: { current: number };
}) {
  const assets = useMemo(() => {
    const finBounds = { x0: -2.08, x1: -0.5, y0: 0.1, y1: 1.18 };
    return {
      fuselage: fuselageGeometry(),
      cockpit: fuselageGeometry({ ...CK, inflate: 0.004, NL: 80, NR: 96 }),
      cockpitMap: cockpitTexture(),
      wing: buildWing(),
      wingMap: wingTexture(),
      winglet: loft([
        { x: 0, y: 0, z: 0, c: 0.22, t: 0.08 },
        { x: -0.07, y: 0, z: 0.1, c: 0.15, t: 0.08 },
        { x: -0.14, y: 0, z: 0.2, c: 0.07, t: 0.08 },
      ]),
      stab: loft(STAB, 20, 0, HINGE),
      elevator: loft(STAB, 8, HINGE, 1),
      fin: loft(FIN, 20, 0, HINGE),
      rudder: loft(FIN, 8, HINGE, 1),
      // dorsal fillet blending the fin's leading edge into the crown of the fuselage
      dorsal: loft([
        { x: -0.58, y: 0, z: 0.2, c: 0.6, t: 0.06 },
        { x: -1.1, y: 0, z: 0.46, c: 0.32, t: 0.1 },
      ]),
      pylon: loft([
        { x: 0.62, y: 0, z: 0.11, c: 0.72, t: 0.16 },
        { x: 0.48, y: 0, z: 0.22, c: 0.7, t: 0.16 },
      ]),
      nacelle: lathe([
        [0.1, 0],
        [0.125, 0.1],
        [0.148, 0.32],
        [0.152, 0.52],
        [0.146, 0.66],
        [0.132, 0.72],
        [0.118, 0.715],
        [0.113, 0.67],
      ]),
      lip: lathe([
        [0.146, 0.66],
        [0.132, 0.72],
        [0.118, 0.715],
        [0.113, 0.68],
      ]),
      exhaust: lathe([
        [0.0, -0.07],
        [0.035, -0.04],
        [0.065, 0.0],
        [0.082, 0.04],
      ]),
      spinner: lathe([
        [0.0, 0.7],
        [0.025, 0.68],
        [0.04, 0.64],
        [0.042, 0.62],
      ]),
      livery: liveryTexture(),
      tyre: tyreTextures(),
      finMap: finTexture(finBounds),
    };
  }, []);

  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({
        map: assets.livery,
        roughness: 0.32,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      cockpit: new THREE.MeshPhysicalMaterial({
        map: assets.cockpitMap,
        transparent: true,
        depthWrite: false,
        roughness: 0.06,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.6,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
      wing: new THREE.MeshPhysicalMaterial({
        map: assets.wingMap,
        color: "#f4f6f9",
        roughness: 0.45,
        metalness: 0.3,
        clearcoat: 0.2,
        envMapIntensity: 0.6,
        side: THREE.DoubleSide,
      }),
      // satin finish: a flat fin mirrors the whole studio environment if it's too glossy
      fin: new THREE.MeshPhysicalMaterial({
        map: assets.finMap,
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
      control: new THREE.MeshPhysicalMaterial({
        map: assets.wingMap,
        color: "#dce1e8",
        roughness: 0.5,
        metalness: 0.3,
        clearcoat: 0.15,
        envMapIntensity: 0.6,
        side: THREE.DoubleSide,
      }),
      brand: new THREE.MeshPhysicalMaterial({
        color: BRAND,
        roughness: 0.3,
        clearcoat: 1,
        side: THREE.DoubleSide,
      }),
      nacelle: new THREE.MeshPhysicalMaterial({
        color: "#f4f6f9",
        roughness: 0.3,
        clearcoat: 1,
        side: THREE.DoubleSide,
      }),
      chrome: new THREE.MeshStandardMaterial({ color: "#e6e9ee", roughness: 0.15, metalness: 1, side: THREE.DoubleSide }),
      metal: new THREE.MeshStandardMaterial({ color: "#8d96a4", roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide }),
      fan: new THREE.MeshStandardMaterial({ color: "#1a212d", roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
      tyre: new THREE.MeshStandardMaterial({
        map: assets.tyre.map,
        bumpMap: assets.tyre.bump,
        bumpScale: 3,
        roughness: 0.88,
        metalness: 0,
        envMapIntensity: 0.3,
      }),
      rim: new THREE.MeshStandardMaterial({ color: "#c8ced7", roughness: 0.32, metalness: 0.75, side: THREE.DoubleSide }),
      brake: new THREE.MeshStandardMaterial({ color: "#2b2e33", roughness: 0.55, metalness: 0.5 }),
    }),
    [assets],
  );

  const engine = (
    <group position={[-0.17, -0.17, 0.78]}>
      <mesh geometry={assets.nacelle} material={mats.nacelle} />
      <mesh geometry={assets.lip} material={mats.chrome} />
      <mesh geometry={assets.exhaust} material={mats.metal} />
      <mesh geometry={assets.spinner} material={mats.chrome} />
      {/* fan face */}
      <mesh material={mats.fan} position={[0.62, 0, 0]} rotation-y={Math.PI / 2}>
        <circleGeometry args={[0.114, 40]} />
      </mesh>
      {/* red accent ring */}
      <mesh material={mats.brand} position={[0.5, 0, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.1525, 0.006, 8, 48]} />
      </mesh>
      {/* pylon: a thin vertical airfoil from the nacelle up into the wing */}
      <mesh geometry={assets.pylon} material={mats.nacelle} rotation-x={-Math.PI / 2} />
    </group>
  );

  // navLight: green on the right (starboard, +Z) wingtip, red on the left (port)
  const wingSide = (navLight: string, strobePhase: number, side: 1 | -1) => (
    <>
      {assets.wing.fixed.map((geo, i) => (
        <mesh key={i} geometry={geo} material={mats.wing} />
      ))}
      {assets.wing.surfaces.map((sf) => (
        <ControlSurface key={sf.kind} surface={sf} side={side} progress={progress} material={mats.control} />
      ))}
      {assets.wing.canoes.map((c) => (
        <mesh key={c.z} material={mats.wing} position={[c.x, c.y, c.z]} scale={[c.len / 2, 0.032, 0.028]}>
          <sphereGeometry args={[1, 20, 12]} />
        </mesh>
      ))}
      <group position={[-0.62, 0.22, 2.2]} rotation={[-Math.PI / 2 + 0.45, 0, 0]}>
        <mesh geometry={assets.winglet} material={mats.brand} />
      </group>
      {/* wingtip navigation light (leading edge) and white strobe (trailing edge) */}
      <AircraftLight position={[-0.6, 0.215, 2.19]} color={navLight} size={0.5} spill={0.6} />
      <AircraftLight position={[-0.84, 0.225, 2.18]} color="#ffffff" pattern="strobe" size={0.9} phase={strobePhase} spill={3} />
      {engine}
    </>
  );

  return (
    <group>
      <mesh geometry={assets.fuselage} material={mats.body} />
      <mesh geometry={assets.cockpit} material={mats.cockpit} renderOrder={1} />

      {/* wings, low-mounted with dihedral */}
      <group position={[0, -0.19, 0]}>
        {wingSide("#2bff6e", 0, 1)}
        <group scale={[1, 1, -1]}>{wingSide("#ff2a2a", 0, -1)}</group>
      </group>

      {/* horizontal stabilisers with separate elevators */}
      <group position={[0, 0.11, 0]}>
        {[1, -1].map((side) => (
          <group key={side} scale={[1, 1, side]}>
            <mesh geometry={assets.stab} material={mats.wing} />
            <mesh geometry={assets.elevator} material={mats.control} />
          </group>
        ))}
      </group>

      {/* vertical fin, rudder and dorsal fillet: lofted along +Z then stood upright */}
      <group rotation-x={-Math.PI / 2}>
        <mesh geometry={assets.fin} material={mats.fin} />
        <mesh geometry={assets.rudder} material={mats.fin} />
        <mesh geometry={assets.dorsal} material={mats.fin} />
      </group>

      {/* white tail navigation light, red anti-collision beacons on the crown and belly */}
      <AircraftLight position={[-2.04, profile(0).cy + 0.03, 0]} color="#ffffff" size={0.4} spill={0.4} />
      <AircraftLight position={[0.15, R + 0.012, 0]} color="#ff2020" pattern="beacon" size={0.55} spill={0.9} />
      <AircraftLight position={[-0.35, -R - 0.012, 0]} color="#ff2020" pattern="beacon" size={0.55} phase={0.5} spill={0.9} />

      {/* APU exhaust nozzle at the tip of the tail cone */}
      <group position={[-2.0, profile(0).cy, 0]}>
        <mesh material={mats.metal} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.024, 0.02, 0.06, 20, 1, true]} />
        </mesh>
        <mesh material={mats.fan} position={[-0.02, 0, 0]} rotation-y={-Math.PI / 2}>
          <circleGeometry args={[0.019, 20]} />
        </mesh>
      </group>

      {/* landing gear — oleo struts follow the runway; the parent group retracts after take-off */}
      <group ref={gearRef}>
        <GearLeg
          position={[1.55, -0.22, 0]}
          wheels={[
            { x: 0, z: 0.036, r: 0.07, w: 0.042 },
            { x: 0, z: -0.036, r: 0.07, w: 0.042 },
          ]}
          ground={ground}
          materials={mats}
        />
        {[1, -1].map((side) => (
          <GearLeg
            key={side}
            position={[-0.12, -0.2, side * 0.38]}
            wheels={[
              { x: 0, z: 0.042, r: 0.085, w: 0.05, brake: true },
              { x: 0, z: -0.042, r: 0.085, w: 0.05, brake: true },
            ]}
            ground={ground}
            materials={mats}
          />
        ))}
      </group>
    </group>
  );
}
