"use client";

import { useEffect } from "react";

/**
 * The portal content panel scrolls inside its own <main>, which Next doesn't reset on navigation.
 * Render with a `key` (e.g. the page number) to jump back to the top whenever that key changes.
 */
export function ScrollReset() {
  useEffect(() => {
    document.querySelector(".portal main")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, []);
  return null;
}
