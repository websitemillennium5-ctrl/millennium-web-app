"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cancelFrame, frame } from "motion";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";

/**
 * Site-wide Lenis smooth scrolling, stepped by Motion's frame loop so the scroll position and every
 * scroll-linked effect (see onPageScroll) update in the same frame — no one-frame lag, no jitter.
 */
export function SmoothScroll() {
  const lenisRef = useRef<LenisRef>(null);
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();

  // Every page opens at the top — on reload too — unless the URL targets a section (#hash)
  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (window.location.hash) return;
    const lenis = lenisRef.current?.lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [pathname]);

  // Respect reduced-motion users: keep native scrolling for them
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const step = ({ timestamp }: { timestamp: number }) => lenisRef.current?.lenis?.raf(timestamp);
    frame.update(step, true);
    return () => cancelFrame(step);
  }, [enabled]);

  if (!enabled) return null;

  // Rendered without children: the root instance is shared via useLenis() anywhere in the tree
  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        // Framer-style glide: a fixed-length expo ease-out rather than a per-frame lerp
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        anchors: { offset: -96 },
      }}
    />
  );
}
