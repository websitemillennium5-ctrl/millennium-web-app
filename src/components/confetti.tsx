"use client";

import { useState, type CSSProperties } from "react";

/** Festive multi-colour set: blue, violet, teal, yellow, red, pink, cyan and an off-white. */
const COLORS = ["#2563eb", "#7c3aed", "#0f766e", "#f5b301", "#ef4444", "#ec4899", "#06b6d4", "#f6f5f2"];
const SHAPES = ["ribbon", "ribbon", "strip", "square", "circle"] as const;
const COUNT = 90;

type Piece = {
  id: number;
  left: number;
  color: string;
  dur: number;
  delay: number;
  drift: number;
  spin: number;
  flip: number;
  w: number;
  h: number;
  radius: string;
};

const shape = (kind: (typeof SHAPES)[number]) => {
  const t = Math.random();
  switch (kind) {
    case "ribbon":
      return { w: 7 + 4 * t, h: 12 + 7 * t, radius: "2px" };
    case "strip":
      return { w: 3 + 1.5 * t, h: 13 + 9 * t, radius: "2px" };
    case "square":
      return { w: 6 + 4 * t, h: 6 + 4 * t, radius: "2px" };
    default:
      return { w: 6 + 5 * t, h: 6 + 5 * t, radius: "9999px" };
  }
};

const makePiece = (_: unknown, i: number): Piece => {
  const dur = 4.5 + 4 * Math.random();
  return {
    id: i,
    left: 100 * Math.random(),
    color: COLORS[(3 * i + Math.floor(3 * Math.random())) % COLORS.length],
    dur,
    // a negative delay starts each piece part-way through its fall, so the sky is already full on the first frame
    delay: -(Math.random() * dur),
    drift: (Math.random() - 0.5) * 36,
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + 900 * Math.random()),
    flip: 0.5 + 1.1 * Math.random(),
    ...shape(SHAPES[i % SHAPES.length]),
  };
};

/**
 * Gentle, continuous confetti fall that fills its positioned parent: slim ribbons, strips, squares and dots
 * drift down the whole height, swaying sideways, spinning and flipping, each on its own loop. Pure CSS
 * animation (see `.confetti-piece` in globals.css), hidden under prefers-reduced-motion, clicks pass through.
 */
export function Confetti({ className = "" }: { className?: string }) {
  const [pieces] = useState(() => Array.from({ length: COUNT }, makePiece));
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, "--dur": `${p.dur}s`, "--delay": `${p.delay}s`, "--drift": `${p.drift}vw`, "--spin": `${p.spin}deg` } as CSSProperties}
        >
          <span
            className="confetti-inner"
            style={{ "--w": `${p.w}px`, "--h": `${p.h}px`, "--c": p.color, "--radius": p.radius, "--flip": `${p.flip}s` } as CSSProperties}
          />
        </span>
      ))}
    </div>
  );
}
