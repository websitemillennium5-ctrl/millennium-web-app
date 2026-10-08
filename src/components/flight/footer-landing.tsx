"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLenis } from "lenis/react";
import { onPageScroll } from "@/lib/page-scroll";
import { NightSky } from "./night-sky";

// once the scene is on screen the landing plays by itself, in real time, over this long
const LANDING_MS = 6000;
// hold on the stopped plane before scrolling on to the footer
const SETTLE_MS = 1200;
// glide down to the footer links, seconds
const GLIDE_S = 2.2;
// how quickly the plane's motion catches up with the landing clock (higher = snappier)
const CATCH_UP = 3;

// phones and tablets get a quicker, punchier landing so readers aren't held on the scene
const MOBILE_QUERY = "(max-width: 1023px)";
const MOBILE = { landingMs: 1500, settleMs: 100, glideS: 0.9, catchUp: 12 };
// on mobile the landing starts as soon as the scene begins to come on screen
const MOBILE_TRIGGER = 0.95;
const DESKTOP_TRIGGER = 0.6;

const LandingScene = dynamic(() => import("./landing-scene"), { ssr: false });

/**
 * The closing chapter of the hero's flight story: when the footer scene settles on screen the
 * airliner makes a night approach and lands by itself, rolling to a stop at the bottom of the page.
 */
export function FooterLanding() {
  const band = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const landed = useRef<(() => void) | null>(null);
  const catchUp = useRef(CATCH_UP);
  const [inView, setInView] = useState(false);
  // WebGL context dropped by the browser while off screen: rebuild the canvas when it's next in view
  const [gl, setGl] = useState({ key: 0, lost: false });
  if (gl.lost && inView) setGl({ key: gl.key + 1, lost: false });
  const lenis = useLenis();

  useEffect(() => {
    const el = band.current;
    if (!el) return;
    // the landing runs on the clock, not the scroll wheel, so it always plays at a natural pace
    let started: number | null = null;
    let raf = 0;
    // pace for the current landing, picked when it starts
    let pace = { landingMs: LANDING_MS, settleMs: SETTLE_MS, glideS: GLIDE_S, catchUp: CATCH_UP };
    const tick = (now: number) => {
      if (started === null || started < 0) started = now;
      target.current = Math.min(1, (now - started) / pace.landingMs);
      if (target.current < 1) raf = requestAnimationFrame(tick);
    };
    // after touchdown and rollout, glide the page on down to the footer links
    let settle = 0;
    // the scene calls this once the plane has actually rolled to a stop on screen
    landed.current = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(scrollToFooter, pace.settleMs);
    };
    const scrollToFooter = () => {
      const rect = el.getBoundingClientRect();
      // skip if the reader has already left the scene (scrolled back up, or on down to the footer)
      const trigger = window.matchMedia(MOBILE_QUERY).matches ? MOBILE_TRIGGER : DESKTOP_TRIGGER;
      if (rect.top > window.innerHeight * trigger || rect.bottom <= 0) return;
      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= bottom - 4) return;
      if (lenis) {
        // lock: trackpad momentum still arriving after the reader's last swipe must not cancel the glide
        lenis.scrollTo(bottom, { duration: pace.glideS, lock: true, force: true });
      } else {
        window.scrollTo({ top: bottom, behavior: "smooth" });
      }
    };
    const update = () => {
      // the scene stays pinned to the viewport for the length of this track
      const rect = el.getBoundingClientRect();
      // auto-trigger the landing as soon as the scene is mostly on screen
      const mobile = window.matchMedia(MOBILE_QUERY).matches;
      const trigger = mobile ? MOBILE_TRIGGER : DESKTOP_TRIGGER;
      if (started === null && rect.top <= window.innerHeight * trigger && rect.bottom > 0) {
        pace = mobile
          ? MOBILE
          : { landingMs: LANDING_MS, settleMs: SETTLE_MS, glideS: GLIDE_S, catchUp: CATCH_UP };
        catchUp.current = pace.catchUp;
        raf = requestAnimationFrame(tick);
        started = -1; // claimed; the first tick sets the real start time
      }
      // reset once the scene is back below the fold, so it lands again next time
      if (rect.top >= window.innerHeight) {
        cancelAnimationFrame(raf);
        window.clearTimeout(settle);
        started = null;
        target.current = 0;
      }
    };
    update();
    const offScroll = onPageScroll(lenis, update);
    window.addEventListener("resize", update);
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      offScroll();
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("resize", update);
      io.disconnect();
    };
  }, [target, lenis]);

  return (
    // tall scroll track; the scene inside stays pinned to the screen until the plane has landed
    <div ref={band} className="relative h-[340vh]">
      <div className="sticky top-0 isolate h-svh overflow-hidden bg-ink">
        <NightSky />

        <div aria-hidden className="absolute inset-0">
          <LandingScene targetRef={target} landedRef={landed} catchUpRef={catchUp} active={inView} key={gl.key} onContextLost={() => setGl((g) => ({ ...g, lost: true }))} />
        </div>
        {/* runway fades into the footer below */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-ink"
        />

        <div className="pointer-events-none relative container-x pt-28 [text-shadow:0_2px_24px_rgba(3,6,13,0.85)] lg:pt-36">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
            <span className="h-px w-6 bg-white/40" />
            Final approach
          </p>
          <h2 className="mt-4 max-w-xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
            Your career,{" "}
            <em className="font-serif font-normal text-brand italic">
              cleared for landing.
            </em>
          </h2>
          <p className="mt-5 max-w-md text-white/60">
            Every journey that starts at Millennium ends at a gate of your
            choice.
          </p>
          <Link
            href="/contact#enquire"
            className="group pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-full bg-white py-2 pr-2 pl-6 text-sm font-semibold text-ink transition hover:bg-brand hover:text-white"
          >
            Book free counselling
            <span className="flex size-8 items-center justify-center rounded-full bg-ink text-white transition group-hover:translate-x-0.5 group-hover:bg-white group-hover:text-brand">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
