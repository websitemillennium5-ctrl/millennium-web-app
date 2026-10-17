"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronsDown } from "lucide-react";
import { useLenis } from "lenis/react";
import { onPageScroll } from "@/lib/page-scroll";

const PlaneScene = dynamic(() => import("./plane-scene"), { ssr: false });

type Chapter = {
  start: number;
  label: string;
  kicker: string;
  title: React.ReactNode;
  text: string;
  points?: string[];
  dark?: boolean;
};

const chapters: Chapter[] = [
  {
    start: 0,
    label: "Dream",
    kicker: "Bihar's oldest airhostess academy",
    title: (
      <>
        Where dreams <Em>take flight.</Em>
      </>
    ),
    text: "Every career in the skies starts on the ground. Scroll to follow the journey from your first class to your first flight.",
  },
  {
    start: 0.14,
    label: "Enrol",
    kicker: "01 · Take-off",
    title: (
      <>
        Your journey <Em>begins here.</Em>
      </>
    ),
    text: "Walk in for a free counselling session and demo class. Students from any stream can apply after 12th — no prior experience needed.",
    points: ["Free counselling & demo class", "Scholarships & easy EMI", "Safe hostel facility"],
  },
  {
    start: 0.32,
    label: "Train",
    kicker: "02 · Climb",
    title: (
      <>
        Learn from those <Em>who&apos;ve flown.</Em>
      </>
    ),
    text: "Ex-airline mentors train you in in-flight operations, safety and emergency drills in simulated cabin and airport environments.",
    points: ["In-flight & ground operations", "Safety & emergency handling", "Real-world simulations"],
  },
  {
    start: 0.5,
    label: "Grooming",
    kicker: "03 · Cruise",
    title: (
      <>
        Poise, polish & <Em>presence.</Em>
      </>
    ),
    text: "Grooming, communication and personality development sessions transform how you speak, carry yourself and connect with people.",
    points: ["Grooming & deportment", "English Communication", "Confidence building"],
  },
  {
    start: 0.68,
    label: "Placement",
    kicker: "04 · Approach",
    title: (
      <>
        Interview-ready, <Em>airline-ready.</Em>
      </>
    ),
    text: "Mock interviews, group discussions and resume building — followed by placement drives with leading airlines and hotel brands.",
    points: ["Mock interviews & GDs", "Resume building", "100% placement assistance"],
  },
  {
    start: 0.84,
    label: "Fly",
    kicker: "05 · Your career",
    title: (
      <>
        450+ students <Em>now soaring.</Em>
      </>
    ),
    text: "Our alumni fly and work with IndiGo, Air India, Emirates, Qatar Airways, Akasa Air and more. You could be next.",
    dark: true,
  },
];

function Em({ children }: { children: React.ReactNode }) {
  return <em className="font-serif font-normal text-brand italic">{children}</em>;
}

export function FlightStory() {
  const section = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const dawn = useRef<HTMLDivElement>(null);
  const dusk = useRef<HTMLDivElement>(null);
  const welcome = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  // mutable progress shared with the 3D scene without re-rendering on every scroll
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(true);
  // WebGL context dropped by the browser while off screen: rebuild the canvas when it's next in view
  const [gl, setGl] = useState({ key: 0, lost: false });
  if (gl.lost && inView) setGl({ key: gl.key + 1, lost: false });

  useEffect(() => {
    const el = section.current;
    if (!el) return;

    const smooth = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    const update = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / (total || 1)));
      progress.current = p;
      if (dawn.current) dawn.current.style.opacity = String(1 - smooth(0.1, 0.35, p));
      if (dusk.current) dusk.current.style.opacity = String(smooth(0.76, 0.92, p));
      if (welcome.current) {
        const out = smooth(0.02, 0.12, p);
        welcome.current.style.opacity = String(1 - out);
        welcome.current.style.transform = `translateY(${out * -40}px) scale(${1 - out * 0.05})`;
      }
      if (bar.current) bar.current.style.transform = `scaleY(${p})`;
      let idx = 0;
      chapters.forEach((c, i) => {
        if (p >= c.start) idx = i;
      });
      setActive(idx);
    };

    update();
    const offScroll = onPageScroll(lenis, update);
    window.addEventListener("resize", update);

    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);

    return () => {
      offScroll();
      window.removeEventListener("resize", update);
      io.disconnect();
    };
  }, [progress, lenis]);

  const scrollToChapter = (i: number) => {
    const el = section.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const target = el.offsetTop + total * (chapters[i].start + (i === 0 ? 0 : 0.04));
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  const dark = chapters[active].dark;

  return (
    <section ref={section} className="relative h-[620vh] bg-[#eaf2fc]" aria-label="Your journey with Millennium">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Sky layers: day base, dawn on top at the start, dusk at the end */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#7fb2ec] via-[#bcd8f5] to-[#eef5fd]" />
        <div ref={dawn} className="absolute inset-0 bg-gradient-to-b from-[#dbe8f8] via-[#f6efea] to-[#fde3d6]" />
        <div ref={dusk} className="absolute inset-0 opacity-0" style={{ background: "linear-gradient(to bottom, #0b1220 0%, #1d2742 45%, #5b3550 80%, #c2474f 100%)" }}>
          <Stars />
        </div>

        {/* Welcome greeting behind the parked plane; fades out as it takes off */}
        <div
          ref={welcome}
          aria-hidden
          className="pointer-events-none absolute right-[12%] bottom-[15%] hidden aspect-square h-[78%] max-h-[560px] origin-bottom mix-blend-multiply lg:block"
        >
          <Image
            src="/images/namaste.jpg"
            alt=""
            fill
            priority
            sizes="560px"
            className="object-cover brightness-[1.22] contrast-[1.12] saturate-[1.05] [mask-image:radial-gradient(ellipse_48%_62%_at_50%_40%,black_45%,transparent_100%)]"
          />
        </div>

        {/* 3D scene */}
        <div className="absolute inset-0">
          <PlaneScene progress={progress} active={inView} key={gl.key} onContextLost={() => setGl((g) => ({ ...g, lost: true }))} />
        </div>

        {/* Story chapters */}
        <div className="pointer-events-none relative container-x flex h-full items-end pt-16 pb-24 lg:items-center lg:pt-20 lg:pb-0">
          <div className="grid w-full max-w-xl">
            {chapters.map((c, i) => {
              const state = i === active ? "on" : i < active ? "past" : "next";
              return (
                <div
                  key={c.label}
                  aria-hidden={state !== "on"}
                  className={`[grid-area:1/1] self-end transition-all duration-700 ease-out lg:self-center ${
                    state === "on"
                      ? "pointer-events-auto translate-y-0 opacity-100 blur-0"
                      : `opacity-0 blur-sm ${state === "past" ? "-translate-y-10" : "translate-y-10"}`
                  }`}
                >
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur ${
                      c.dark ? "bg-white/10 text-white/80" : "bg-white/70 text-ink-soft shadow-sm"
                    }`}
                  >
                    {i === 0 && <span className="size-2 rounded-full bg-emerald-500" />}
                    {c.kicker}
                  </span>
                  <h2
                    className={`mt-5 text-[2.6rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl ${
                      i === 0 ? "lg:text-7xl" : "lg:text-6xl"
                    } ${c.dark ? "text-white" : "text-ink"}`}
                  >
                    {c.title}
                  </h2>
                  <p className={`mt-5 max-w-md text-base leading-relaxed sm:text-lg ${c.dark ? "text-white/75" : "text-ink-soft/80"}`}>
                    {c.text}
                  </p>
                  {c.points && (
                    <ul className="mt-6 hidden flex-wrap gap-2 sm:flex">
                      {c.points.map((pt) => (
                        <li key={pt} className="rounded-full border border-ink/10 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-ink-soft backdrop-blur">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(i === 0 || c.dark) && (
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href="/contact#enquire"
                        className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
                      >
                        Book free counselling
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <Link
                        href="/courses"
                        className={`inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition ${
                          c.dark ? "bg-white text-ink hover:bg-white/90" : "border border-ink/10 bg-white/70 text-ink backdrop-blur hover:bg-white"
                        }`}
                      >
                        Explore courses
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter rail */}
        <nav className="absolute top-1/2 right-6 hidden -translate-y-1/2 lg:block" aria-label="Story chapters">
          <div className="relative flex flex-col gap-5 pl-5">
            <div className={`absolute top-1 bottom-1 left-0 w-px ${dark ? "bg-white/20" : "bg-ink/10"}`} />
            <div ref={bar} className="absolute top-1 bottom-1 left-0 w-px origin-top scale-y-0 bg-brand" />
            {chapters.map((c, i) => (
              <button
                key={c.label}
                type="button"
                onClick={() => scrollToChapter(i)}
                className={`flex items-center gap-3 text-left text-xs font-semibold tracking-wide uppercase transition ${
                  i === active ? (dark ? "text-white" : "text-ink") : dark ? "text-white/40 hover:text-white/70" : "text-ink/35 hover:text-ink/60"
                }`}
              >
                <span
                  className={`-ml-[1.4rem] size-2.5 rounded-full border-2 transition ${
                    i <= active ? "border-brand bg-brand" : dark ? "border-white/30 bg-ink" : "border-ink/20 bg-white"
                  }`}
                />
                {c.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Scroll cue */}
        <div
          className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-medium text-ink-soft/70 transition-opacity duration-500 ${
            active === 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          Scroll to take off
          <ChevronsDown className="size-4 animate-bounce" />
        </div>
      </div>
    </section>
  );
}

function Stars() {
  // deterministic star field so server and client markup match
  const stars = Array.from({ length: 60 }, (_, i) => ({
    left: (i * 37.7) % 100,
    top: (i * 23.3) % 55,
    size: i % 7 === 0 ? 2 : 1,
    opacity: 0.3 + ((i * 13) % 7) / 10,
  }));
  return (
    <div className="absolute inset-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}
