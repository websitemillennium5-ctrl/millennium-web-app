"use client";

import { useLenis } from "lenis/react";
import { useEffect } from "react";

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/**
 * Stops the page behind a modal from scrolling while `active`.
 * With Lenis running, pausing it is enough: it owns wheel and touch scrolling, and the page's scroll position is
 * left exactly where it was. Setting body overflow here instead would snap the browser's scroll to the top while
 * Lenis still reported the old position, which blanked the scroll-driven home page. Without Lenis (reduced
 * motion), body overflow is the only tool. Keyboard scrolling is blocked in both cases.
 */
export function useScrollLock(active: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (SCROLL_KEYS.has(e.key) && !typing && !target?.closest("[data-lenis-prevent]")) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    let previous: string | null = null;
    if (lenis) lenis.stop();
    else {
      previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      if (lenis) lenis.start();
      else document.body.style.overflow = previous ?? "";
    };
  }, [active, lenis]);
}
