"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollPageToTop } from "@/lib/page-scroll";

/**
 * Every page change starts at the top, everywhere: the public site, the staff portal and the student portal.
 * Resets the window and any panel marked data-scroll-reset (the portals scroll inside their own <main> on
 * desktop, which Next doesn't reset). A URL that targets a section (#hash) is left to the browser.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  // Reloads and back/forward open at the top too, instead of the browser restoring the old position
  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (window.location.hash) return;
    scrollPageToTop();
  }, [pathname]);

  return null;
}
