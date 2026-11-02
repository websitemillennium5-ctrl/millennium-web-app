"use client";

import { useLenis } from "lenis/react";
import { useEffect } from "react";

/**
 * Stops the page behind a modal from scrolling while `active`: native scrolling via body overflow, and Lenis's
 * smooth scrolling (which otherwise keeps reacting to wheel and touch moves over the backdrop).
 */
export function useScrollLock(active: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.body.style.overflow = previous;
      lenis?.start();
    };
  }, [active, lenis]);
}
