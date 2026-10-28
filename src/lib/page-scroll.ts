import type Lenis from "lenis";

/**
 * Subscribes `fn` to page scrolling and returns the unsubscribe function.
 * With Lenis active this uses its scroll event, which fires inside the same animation frame that moved the
 * page, so scroll-linked DOM writes never trail the scroll by a frame (the cause of visible jitter).
 * Without Lenis (e.g. reduced motion) it falls back to the native scroll event.
 */
export function onPageScroll(lenis: Lenis | undefined, fn: () => void) {
  if (lenis) return lenis.on("scroll", fn);
  window.addEventListener("scroll", fn, { passive: true });
  return () => window.removeEventListener("scroll", fn);
}

/** Jumps the window and every panel marked data-scroll-reset back to the top, with no animation. */
export function scrollPageToTop() {
  window.scrollTo(0, 0);
  document.querySelectorAll<HTMLElement>("[data-scroll-reset]").forEach((el) => {
    el.scrollTop = 0;
  });
}
