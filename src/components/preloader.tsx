"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { Plane } from "lucide-react";
import { PRELOAD_DONE, whenReady } from "@/lib/preload";

// keep the intro on screen long enough to read as deliberate, never long enough to trap anyone
const MIN_MS = 1400;
const MIN_MS_RETURNING = 500;
const MAX_MS = 12000;
const SEEN_KEY = "millennium:visited";
const EXIT_MS = 900;

const ROUTES = ["/about", "/courses", "/placements", "/admissions", "/contact"];

/**
 * First-load curtain. It is server-rendered so it covers the page from the very first paint, and
 * lifts only once fonts, images and both WebGL scenes (shaders compiled, textures on the GPU) are
 * ready — so the site is smooth from the first scroll. Mounted in the root layout, it runs once per
 * visit; client-side navigation never shows it again.
 */
/**
 * Next.js images are lazy by default, so sections further down stay blank until scrolled to (slow on
 * mobile data). Switch every image on the page to eager and wait until each is downloaded and
 * decoded, so it paints instantly when it comes into view.
 */
function loadAllImages(onProgress: (fraction: number) => void) {
  const imgs = Array.from(document.images);
  if (!imgs.length) return Promise.resolve();
  let count = 0;
  return Promise.all(
    imgs.map((img) => {
      if (img.loading === "lazy") img.loading = "eager";
      const loaded = img.complete
        ? Promise.resolve()
        : new Promise<void>((r) => {
            img.addEventListener("load", () => r(), { once: true });
            img.addEventListener("error", () => r(), { once: true });
          });
      return loaded
        .then(() => img.decode().catch(() => {}))
        .then(() => onProgress(++count / imgs.length));
    }),
  );
}

export function Preloader() {
  const [phase, setPhase] = useState<"loading" | "leaving" | "done">("loading");
  const [shown, setShown] = useState(0);
  const target = useRef(0);
  const router = useRouter();
  const lenis = useLenis();

  // hold the page still underneath while loading
  useEffect(() => {
    if (phase === "done") return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      root.style.overflow = "";
      lenis?.start();
    };
  }, [phase, lenis]);

  useEffect(() => {
    // each task carries a weight; images report fractional progress as they arrive
    const done = new Map<string, number>();
    const weights: Record<string, number> = { fonts: 1, page: 1, images: 4, landing: 2 };
    const onHome = window.location.pathname === "/";
    if (onHome) weights.hero = 2;
    const total = Object.values(weights).reduce((a, w) => a + w, 0);
    const report = (key: string, fraction = 1) => {
      done.set(key, Math.max(done.get(key) ?? 0, fraction));
      let sum = 0;
      for (const [k, f] of done) sum += f * weights[k];
      target.current = Math.max(target.current, sum / total);
    };
    const track = (key: string, p: Promise<unknown>) => p.then(() => report(key));

    const tasks = [
      track("fonts", document.fonts.ready),
      track(
        "page",
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise((r) => window.addEventListener("load", r, { once: true })),
      ),
      track("images", loadAllImages((f) => report("images", f))),
      // the footer's night landing is on every page; the hero flight only on the home page
      track("landing", whenReady("landing")),
      ...(onHome ? [track("hero", whenReady("hero"))] : []),
    ];

    // returning visitors have everything cached, so don't hold them on the intro
    let returning = false;
    try {
      returning = localStorage.getItem(SEEN_KEY) === "1";
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}

    const started = performance.now();
    let cancelled = false;
    const timeout = new Promise((r) => window.setTimeout(r, MAX_MS));
    Promise.race([Promise.all(tasks), timeout]).then(() => {
      const wait = Math.max(0, (returning ? MIN_MS_RETURNING : MIN_MS) - (performance.now() - started));
      window.setTimeout(() => {
        if (cancelled) return;
        target.current = 1;
        setPhase("leaving");
      }, wait);
    });

    // displayed percentage eases toward the real one, creeping ahead a little so it never looks stuck
    let raf = 0;
    let value = 0;
    const tick = () => {
      const t = Math.min(1, target.current + 0.08 * (1 - target.current));
      value += (t - value) * 0.06;
      if (target.current === 1) value = Math.max(value, Math.min(1, value + 0.04));
      setShown(Math.min(100, Math.round(value * 100)));
      if (value < 0.999) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    const id = window.setTimeout(() => {
      setPhase("done");
      window.dispatchEvent(new Event(PRELOAD_DONE));
      // with the page settled, quietly fetch the other pages so they open instantly
      const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
      idle(() => ROUTES.forEach((r) => router.prefetch(r)));
      // cache static assets on the device so the next visit loads from local storage
      if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  if (phase === "done") return null;

  return (
    <div
      id="preloader"
      role="status"
      aria-live="polite"
      aria-label="Loading Millennium Air Hostess Academy"
      className={`preloader fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-sky text-ink ${
        phase === "leaving" ? "preloader-leave" : ""
      }`}
    >
      <link rel="preload" as="image" href="/images/earth.jpg" />
      {/* soft daylight sky */}
      <div aria-hidden className="preloader-sky absolute inset-0" />

      {/* a turning Earth with an airliner on orbit around it */}
      <div aria-hidden className="preloader-stage relative">
        <div className="preloader-earth absolute inset-0 overflow-hidden rounded-full">
          <div className="preloader-earth-map absolute inset-y-0 left-0" />
          <div className="preloader-earth-shade absolute inset-0 rounded-full" />
        </div>
        <div className="preloader-orbit absolute -inset-[22%]">
          <div className="preloader-orbit-spin absolute inset-0">
            <span className="preloader-trail" />
            <span className="preloader-plane">
              <Plane className="size-12 rotate-45 fill-white text-ink sm:size-14" strokeWidth={1.25} />
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-16 flex flex-col items-center gap-5 px-6 text-center">
        <Image src="/images/logo.png" alt="" width={900} height={174} priority className="h-9 w-auto" />
        <p className="text-xs font-semibold tracking-[0.28em] text-muted uppercase">Preparing for take-off</p>
        <div className="flex w-56 items-center gap-3">
          <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full origin-left bg-brand" style={{ transform: `scaleX(${shown / 100})` }} />
          </div>
          <span className="w-9 text-right font-mono text-xs text-ink/70 tabular-nums">{shown}%</span>
        </div>
      </div>

      {/* if scripts never run, don't leave the curtain down */}
      <noscript>
        <style>{"#preloader{display:none!important}"}</style>
      </noscript>
    </div>
  );
}
