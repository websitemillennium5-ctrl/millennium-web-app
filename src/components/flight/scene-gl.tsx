"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { coarse } from "./device";

/** Render-resolution range for the scene canvases: on phones, full-screen canvases at the screen's native 3x density overwhelm the GPU */
export const SCENE_DPR: [number, number] = coarse ? [1, 1.25] : [1, 2];

/**
 * WebGL options for the scene canvases. Phones skip multisampling, which quadruples each canvas's GPU
 * memory: iOS Safari otherwise runs out mid-scroll and paints blank tiles until it catches up.
 */
export const SCENE_GL = { antialias: !coarse, alpha: true, powerPreference: "high-performance" } as const;

/**
 * Mobile browsers silently drop the WebGL context of a canvas that is off screen when memory runs
 * short, which leaves the scene blank when the reader scrolls back. Report it so the owner can
 * remount the canvas (cheap, since every texture and model comes from the in-memory cache).
 */
export function watchContextLoss(gl: THREE.WebGLRenderer, onLost?: () => void) {
  gl.domElement.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      onLost?.();
    },
    { once: true },
  );
}

/**
 * Steps the render resolution down while frames run slow, so weaker phones trade a little
 * sharpness for a smooth scroll instead of stuttering.
 */
export function AdaptiveResolution() {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useThree((s) => s.viewport.dpr);
  const acc = useRef({ time: 0, frames: 0 });
  useFrame((_, delta) => {
    const a = acc.current;
    // ignore stalls (tab switches, the frame after a long scroll jump)
    if (delta > 0.25) return;
    a.time += delta;
    a.frames += 1;
    if (a.time < 1.5) return;
    const avg = a.time / a.frames;
    a.time = 0;
    a.frames = 0;
    if (avg > 1 / 45 && dpr > 1) setDpr(Math.max(1, dpr - 0.25));
  });
  return null;
}
