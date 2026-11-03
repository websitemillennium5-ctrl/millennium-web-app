"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, MessageCircle, PhoneCall, X } from "lucide-react";
import { Confetti } from "@/components/confetti";
import { openContactChat } from "@/components/contact-chat";
import { openCounselling } from "@/components/counselling";
import { useScrollLock } from "@/lib/scroll-lock";
import { partners, placedStudents } from "@/lib/site";

const faces = ["Riya Raj", "Saumya Srivastav", "Anushka Kishore"].map((name) => placedStudents.find((s) => s.name === name)!);

/** Small tag that hangs under the floating header bar and leads to the placements page. Not on the jobs board, where it crowds the heading. */
export function PlacementsTag() {
  const pathname = usePathname();
  if (pathname.startsWith("/airline-jobs")) return null;
  return (
    <Link
      href="/placements"
      className="group absolute top-full left-1/2 mt-2 hidden h-9 -translate-x-1/2 items-center gap-2 rounded-full border border-white/60 bg-white/80 pr-3.5 pl-1.5 text-xs font-medium whitespace-nowrap text-ink shadow-[0_12px_32px_-12px_rgba(11,18,32,0.35)] ring-1 ring-ink/[0.04] backdrop-blur-2xl backdrop-saturate-[1.8] transition hover:bg-white lg:flex"
    >
      <span className="flex -space-x-1.5">
        {faces.map((s) => (
          <Image key={s.name} src={s.photo} alt="" width={48} height={48} className="size-6 rounded-full object-cover ring-2 ring-white" />
        ))}
      </span>
      <span>
        <strong className="font-semibold">450+</strong> students placed
      </span>
      <span className="hidden text-muted sm:inline">· IndiGo, Air India, Akasa &amp; more</span>
      <ArrowUpRight className="size-3.5 text-muted transition duration-300 group-hover:rotate-45 group-hover:text-ink" />
    </Link>
  );
}

const SEEN_KEY = "placements-popup-seen-at";
const DAY = 24 * 60 * 60 * 1000;
const DELAY = 2500;

/**
 * Placements spotlight shown once to a visitor, then not again for 24 hours (tracked in localStorage).
 * Skipped on the placements page itself.
 */
export function PlacementsPopup() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [show, setShow] = useState(false);
  useScrollLock(show);

  useEffect(() => {
    if (pathname.startsWith("/placements")) return;
    let seenAt = 0;
    try {
      seenAt = Number(localStorage.getItem(SEEN_KEY)) || 0;
    } catch {}
    if (Date.now() - seenAt < DAY) return;

    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {}
      setShow(true);
    }, DELAY);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (show) dialog.current?.showModal();
  }, [show]);

  if (!show) return null;
  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      data-lenis-prevent
      onClose={() => setShow(false)}
      // The dialog itself is a transparent full-screen layer: the confetti canvas fills it and falls over the
      // blurred page, and the white card is centred on top of that
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 text-left text-ink backdrop:bg-ink/65 backdrop:backdrop-blur-md"
    >
      {/* Confetti keeps falling over the blurred page for as long as the card is open; behind the card, clicks pass through */}
      <Confetti />
      <div onClick={(e) => e.target === e.currentTarget && close()} className="relative z-10 flex h-full items-center justify-center p-4">
        <div className="w-full max-w-lg animate-pop-in overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_-24px_rgba(11,18,32,0.5)]">
          <div className="relative max-h-[88vh] overflow-y-auto">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30"
            >
              <X className="size-4" />
            </button>

            <div className="relative overflow-hidden bg-ink px-6 pt-7 pb-6 text-white sm:px-8 sm:pt-8">
              <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/40 blur-3xl" />
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
                <span className="h-px w-6 bg-white/50" />
                Placements
              </span>
              <h2 className="mt-3 text-3xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-4xl">
                450+ students <em className="font-serif font-normal text-white/85 italic">got the job.</em>
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                In just three years our students have started careers with IndiGo, Air India, Akasa Air, Emirates,
                Qatar Airways and premium hotel brands.
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid grid-cols-3 gap-2.5">
                {placedStudents.map((s) => {
                  const partner = partners.find((p) => p.name === s.company);
                  return (
                    <figure key={s.name} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink">
                      <Image src={s.photo} alt="" fill sizes="160px" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 via-45% to-transparent" />
                      {partner && (
                        <span
                          className="absolute top-2 left-2 flex h-6 items-center rounded-md bg-white px-1.5 shadow-sm"
                          style={partner.bg ? { backgroundColor: partner.bg } : undefined}
                        >
                          <Image src={partner.logo} alt={partner.name} width={48} height={16} className="max-h-3.5 w-auto object-contain" />
                        </span>
                      )}
                      <figcaption className="absolute inset-x-0 bottom-0 p-2.5 text-white">
                        <p className="truncate text-xs leading-tight font-semibold">{s.name}</p>
                        <p className="mt-0.5 truncate text-[10px] leading-tight text-white/70">{s.role}</p>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {partners.slice(0, 5).map((p) => (
                    <span
                      key={p.name}
                      className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 ring-2 ring-white shadow-[0_2px_8px_-2px_rgba(11,18,32,0.2)]"
                      style={p.bg ? { backgroundColor: p.bg } : undefined}
                    >
                      <Image src={p.logo} alt={p.name} width={36} height={36} className="max-h-full w-auto object-contain" />
                    </span>
                  ))}
                </div>
                <p className="text-xs leading-snug text-muted">
                  <span className="font-semibold text-ink">15+ hiring partners</span> across airlines, airports and hotels.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <Link
                  href="/placements"
                  onClick={close}
                  className="group flex items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white transition hover:bg-ink-soft"
                >
                  See placements
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openCounselling();
                  }}
                  className="flex items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  <PhoneCall className="size-4" strokeWidth={2} />
                  Free consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Phones and tablets only: the placements highlight, the Find jobs button and the chat button share one
 * pill pinned to the bottom. It slides away while scrolling down and returns on the first scroll up.
 * Hidden on the jobs board, which has its own Filters button there.
 */
export function PlacementsDock() {
  const pathname = usePathname();
  const { down: hidden, overHero } = useScrollingDown();
  if (pathname.startsWith("/airline-jobs")) return null;
  return (
    <div
      // Over the hero's 3D scene the frosted glass is dropped: blurring a full-screen canvas every frame is what
      // makes phones paint blank tiles on a fast scroll
      className={`fixed inset-x-5 bottom-5 z-[70] flex h-14 items-center gap-2 rounded-full border border-white/60 p-1.5 text-ink shadow-[0_12px_32px_-12px_rgba(11,18,32,0.35)] ring-1 ring-ink/[0.04] transition-all duration-300 lg:hidden ${
        overHero ? "bg-white/95" : "bg-white/80 backdrop-blur-2xl backdrop-saturate-[1.8]"
      } ${hidden ? "pointer-events-none translate-y-24 opacity-0" : ""}`}
    >
      <Link href="/placements" className="flex min-w-0 flex-1 items-center gap-2 pl-1">
        <span className="flex shrink-0 -space-x-2">
          {faces.map((s) => (
            <Image key={s.name} src={s.photo} alt="" width={56} height={56} className="size-7 rounded-full object-cover ring-2 ring-white" />
          ))}
        </span>
        <span className="truncate text-sm font-semibold whitespace-nowrap">450+ placed</span>
      </Link>
      <Link
        href="/airline-jobs"
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink pr-3 pl-4 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-brand"
      >
        Find jobs
        <ArrowRight className="size-4" />
      </Link>
      <button
        type="button"
        onClick={openContactChat}
        aria-label="Chat with us"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark"
      >
        <MessageCircle className="size-5" />
      </button>
    </div>
  );
}

/**
 * True while the page is being scrolled down (past the top); flips back on the first upward scroll. On the home
 * page the hero is a long scroll-driven scene (the plane taking off), and the dock stays put until that scene
 * has fully played out and scrolled away.
 */
function useScrollingDown() {
  const [down, setDown] = useState(false);
  const [overHero, setOverHero] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const heroStillPlaying = () => {
      const hero = document.querySelector("[data-hero-story]");
      return Boolean(hero) && hero!.getBoundingClientRect().bottom > window.innerHeight;
    };
    const first = requestAnimationFrame(() => setOverHero(heroStillPlaying()));
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      const hero = heroStillPlaying();
      setOverHero(hero);
      // Ignore tiny jitters and always show near the top of the page
      if (Math.abs(delta) < 6) return;
      setDown(delta > 0 && y > 80 && !hero);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return { down, overHero };
}
