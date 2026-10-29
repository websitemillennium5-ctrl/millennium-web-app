"use client";

import { useEffect } from "react";
import { scrollPageToTop } from "@/lib/page-scroll";

/**
 * Page changes already reset scroll (see ScrollToTop in the root layout); this covers in-page changes
 * that only touch the query string. Render with a `key` (e.g. the page number) to jump back to the top
 * whenever that key changes.
 */
export function ScrollReset() {
  useEffect(() => {
    scrollPageToTop();
  }, []);
  return null;
}
