"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROUTES = ["/about", "/courses", "/placements", "/admissions", "/contact"];

/**
 * Once the page has settled, quietly fetch the other pages so they open instantly, and cache static
 * assets on the device so the next visit loads from local storage.
 */
export function SiteBoot() {
  const router = useRouter();

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(() => ROUTES.forEach((r) => router.prefetch(r)));
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [router]);

  return null;
}
