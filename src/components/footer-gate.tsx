"use client";

import { usePathname } from "next/navigation";

/** Job and hiring-event detail pages (/airline-jobs/<source>/<id>, /airline-jobs/events/…) render without the site footer. */
export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/airline-jobs/") ? null : children;
}
