"use client";

import { useEffect, useRef } from "react";

/** Brand palette with a touch of warm gold so the burst reads as a celebration rather than noise. */
const COLORS = ["#a7222d", "#d9c4a0", "#17283e", "#ffffff", "#f5e4e1", "#e8a33d", "#c9362f"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  tilt: number;
  vt: number;
  color: string;
  round: boolean;
  life: number;
};

const GRAVITY = 1100; // px/s²
const DRAG = 0.9; // per second
const FADE_AFTER = 1.6; // s

/**
 * One-off confetti burst drawn on a canvas that fills its positioned parent: two cannons fire from the lower
 * corners towards the middle, the pieces tumble back down and fade. Runs once on mount, honours reduced
 * motion, and cleans up its own frame loop. Clicks pass straight through.
 */
export function Confetti({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let pieces: Piece[] = [];

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const cannon = (x: number, y: number, angle: number, count: number, minSpeed = 520, maxSpeed = 1050) => {
      for (let i = 0; i < count; i++) {
        const a = angle + rand(-0.45, 0.45);
        const speed = rand(minSpeed, maxSpeed);
        const size = rand(8, 14);
        pieces.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          w: size,
          h: Math.random() < 0.35 ? size : size * rand(0.4, 0.65),
          rot: rand(0, Math.PI * 2),
          vr: rand(-9, 9),
          tilt: rand(0, Math.PI * 2),
          vt: rand(4, 11),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          round: Math.random() < 0.18,
          life: FADE_AFTER + rand(0.3, 1.1),
        });
      }
    };

    const frame = (now: number) => {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const drag = Math.pow(DRAG, dt);
      pieces = pieces.filter((p) => p.life > 0 && p.y < h + 24);
      for (const p of pieces) {
        p.vy += GRAVITY * dt;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.tilt += p.vt * dt;
        p.life -= dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.5));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // the "tilt" squashes the piece on one axis so it looks like paper flipping over as it falls
        ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.tilt))));
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (pieces.length) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };

    const start = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // left cannon aims up and to the right, right cannon up and to the left (canvas y grows downwards)
      cannon(0, h * 0.66, -Math.PI / 3, 110);
      cannon(w, h * 0.66, (-2 * Math.PI) / 3, 110);
      // a lighter sprinkle from the top so the header gets some too
      cannon(w / 2, -10, Math.PI / 2, 45, 60, 220);
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const timer = window.setTimeout(start, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [delay]);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${className}`} />;
}
