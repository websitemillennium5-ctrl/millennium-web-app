"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { nav, site, telHref } from "@/lib/site";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigating
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const raised = scrolled || open;

  // Negative bottom margin lets the page (and each hero background) slide underneath the floating bar
  return (
    <header className="sticky top-0 z-50 -mb-20 flex h-20 items-center xl:-mb-24 xl:h-24">
      <div className="container-x relative">
        <div
          className={`flex h-14 items-center justify-between gap-6 rounded-full border pr-2 pl-5 backdrop-blur-2xl backdrop-saturate-[1.8] transition-all duration-500 xl:h-16 xl:pr-2.5 xl:pl-7 ${
            raised
              ? "border-white/60 bg-white/75 shadow-[0_8px_32px_-12px_rgba(11,18,32,0.1)] ring-1 ring-ink/[0.04]"
              : "border-white/60 bg-white/50 shadow-[0_1px_2px_rgba(11,18,32,0.02)]"
          }`}
        >
          <Link href="/" className="shrink-0" aria-label={`${site.name} — Home`}>
            <Image src="/images/logo.png" alt={site.name} width={900} height={174} priority className="h-7 w-auto xl:h-8" />
          </Link>

          <nav className="hidden items-center gap-0.5 rounded-full bg-ink/[0.04] p-1 xl:flex" aria-label="Main">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    active
                      ? "bg-white text-ink shadow-[0_1px_3px_rgba(11,18,32,0.12)]"
                      : "text-muted hover:bg-white/60 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1 xl:flex">
            <a
              href={telHref(site.phones[0])}
              className="group flex items-center gap-2 rounded-full py-2 pr-3 pl-2 text-sm font-medium text-ink-soft transition hover:text-brand"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
                <Phone className="size-3.5" />
              </span>
              <span className="hidden whitespace-nowrap 2xl:inline">{site.phones[0]}</span>
            </a>
            <Link
              href="/contact#enquire"
              className="group flex items-center gap-2 rounded-full bg-ink py-2 pr-2 pl-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-brand"
            >
              Apply now
              <span className="flex size-7 items-center justify-center rounded-full bg-white/15 transition duration-300 group-hover:rotate-45">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full bg-ink text-white xl:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>

        {open && (
          <div className="absolute inset-x-5 top-full mt-2 overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-[0_24px_48px_-16px_rgba(11,18,32,0.3)] ring-1 ring-ink/5 backdrop-blur-xl xl:hidden">
            <nav className="flex flex-col p-3" aria-label="Mobile">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-medium transition ${
                      active ? "bg-mist text-ink" : "text-ink-soft hover:bg-mist/60"
                    }`}
                  >
                    {item.label}
                    <ArrowUpRight className={`size-4 ${active ? "text-brand" : "text-muted"}`} />
                  </Link>
                );
              })}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
                <a
                  href={telHref(site.phones[0])}
                  className="flex items-center justify-center gap-2 rounded-full border border-line py-3 font-semibold"
                >
                  <Phone className="size-4" />
                  Call us
                </a>
                <Link href="/contact#enquire" className="rounded-full bg-brand py-3 text-center font-semibold text-white">
                  Apply now
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
