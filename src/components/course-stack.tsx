"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { onPageScroll } from "@/lib/page-scroll";
import { ArrowRight, BookOpen, BriefcaseBusiness, Check, Clock, GraduationCap } from "lucide-react";
import { courses, partners } from "@/lib/site";

// Scroll distance given to each course, in viewport heights (part hold, part transition).
const STEP_VH = 110;
// Within each step: how much is spent holding the current course before the next starts to come in.
const HOLD = 0.35;
const FADE = 0.5;
const LAST = courses.length - 1;

const PLACEMENT_LOGOS = 8;
const hotelPartners = new Set(["Taj Hotels", "Marriott", "ITC Hotels", "Radisson", "EaseMyTrip"]);

// Up to 8 partner logos for a course: its own recruiters first (exact name, then a prefix match such as
// "Taj" -> "Taj Hotels"), topped up with other partners from the same field, then the rest.
// Courses with no recruiter logos (retail) return none and fall back to text tags.
function recruiterLogos(course: (typeof courses)[number]) {
  const own = course.recruiters
    .map((r) => partners.find((p) => p.name === r) ?? partners.find((p) => p.name.startsWith(r)))
    .filter((p): p is (typeof partners)[number] => Boolean(p));
  if (own.length === 0) return [];
  const hotels = course.category === "Hospitality";
  const sameField = partners.filter((p) => hotelPartners.has(p.name) === hotels);
  return [...new Set([...own, ...sameField, ...partners])].slice(0, PLACEMENT_LOGOS);
}

// One full-screen stage pins (covering the header) while the reader scrolls through every course.
// Copy cross-fades (old lifts out, new rises in) and each new photo wipes up over the last inside one frame.
// Everything is driven by transform/opacity from a single scroll progress value measured on resize.
export function CourseStack() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const photos = useRef<(HTMLDivElement | null)[]>([]);
  const photoInner = useRef<(HTMLDivElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const counter = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    const el = section.current;
    const pinned = stage.current;
    if (!el || !pinned) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (x: number) => Math.min(1, Math.max(0, x));
    const smooth = (t: number) => t * t * (3 - 2 * t);
    const round = (x: number) => Math.round(x * 1000) / 1000;
    let start = 0;
    let distance = 1;
    let current = -1;

    const measure = () => {
      const pin = parseFloat(getComputedStyle(pinned).top) || 0;
      start = el.getBoundingClientRect().top + window.scrollY - pin;
      distance = Math.max(1, el.offsetHeight - pinned.offsetHeight);
    };

    const update = () => {
      const p = clamp((window.scrollY - start) / distance) * LAST;

      // arrival of each course: 0 = not yet, 1 = fully in
      const enter = courses.map((_, k) => {
        if (k === 0) return 1;
        const e = smooth(clamp((p - (k - 1) - HOLD) / FADE));
        return reduce ? (e > 0.5 ? 1 : 0) : e;
      });

      enter.forEach((e, k) => {
        const slide = slides.current[k];
        const photo = photos.current[k];
        const inner = photoInner.current[k];
        if (!slide || !photo || !inner) return;

        const next = enter[k + 1] ?? 0;
        // outgoing copy clears in the first half of the change, incoming copy settles in the second half
        const inAmt = k === 0 ? 1 : clamp((e - 0.45) / 0.55);
        const outAmt = clamp(next / 0.5);
        const opacity = inAmt * (1 - outAmt);
        slide.style.opacity = String(round(opacity));
        slide.style.transform = `translate3d(0,${round((1 - inAmt) * 32 - outAmt * 24)}px,0)`;
        slide.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
        slide.setAttribute("aria-hidden", opacity > 0.5 ? "false" : "true");

        if (k > 0) {
          // wipe: the frame slides up while the image counter-slides, so the picture itself stays put
          photo.style.transform = `translate3d(0,${round((1 - e) * 100)}%,0)`;
          inner.style.transform = `translate3d(0,${round(-(1 - e) * 100)}%,0) scale(${round(1.08 - 0.08 * e)})`;
        }
      });

      bars.current.forEach((bar, k) => {
        if (bar) bar.style.transform = `scaleX(${round(k === 0 ? 1 : enter[k])})`;
      });

      const active = enter.reduce((acc, e, k) => (e >= 0.5 ? k : acc), 0);
      if (active !== current && counter.current) {
        current = active;
        counter.current.textContent = String(active + 1).padStart(2, "0");
      }
    };

    const onResize = () => {
      measure();
      update();
    };

    measure();
    update();
    const offScroll = onPageScroll(lenis, update);
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      offScroll();
      window.removeEventListener("resize", onResize);
    };
  }, [lenis]);

  return (
    <section
      ref={section}
      aria-label="Our programs"
      className="relative bg-white"
      style={{ height: `${100 + LAST * STEP_VH}svh` }}
    >
      <div
        ref={stage}
        // full-screen and layered above the sticky header while pinned
        className="sticky top-0 z-[60] h-svh overflow-hidden bg-white"
      >
        <div className="container-x grid h-full grid-rows-[minmax(0,34%)_1fr] gap-6 py-6 lg:grid-cols-2 lg:grid-rows-1 lg:items-center lg:gap-16 lg:py-10">
          {/* Photo frame: each course's photo wipes up over the previous one */}
          <div className="relative h-full overflow-hidden rounded-3xl bg-mist lg:order-2 lg:max-h-[44rem] lg:rounded-[2rem]">
            {courses.map((c, i) => (
              <div
                key={c.slug}
                ref={(el) => {
                  photos.current[i] = el;
                }}
                className="absolute inset-0 overflow-hidden will-change-transform"
                style={i > 0 ? { transform: "translate3d(0,100%,0)" } : undefined}
              >
                <div
                  ref={(el) => {
                    photoInner.current[i] = el;
                  }}
                  className="absolute inset-0 will-change-transform"
                  style={i > 0 ? { transform: "translate3d(0,-100%,0)" } : undefined}
                >
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority={i === 0}
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/70 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 hidden sm:block lg:inset-x-6 lg:bottom-6">
                    <p className="text-xs font-medium text-white/75">Career roles</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {c.roles.slice(0, 3).map((r) => (
                        <li key={r} className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Copy: shared progress row, then the courses stacked in one grid cell and cross-faded */}
          <div className="flex min-h-0 flex-col gap-6 lg:order-1 lg:h-full lg:max-h-[44rem] lg:gap-8 lg:py-2">
            <div className="flex items-center gap-4 text-xs font-semibold tracking-[0.16em] tabular-nums">
              <span>
                <span ref={counter} className="text-ink">
                  01
                </span>
                <span className="text-muted"> / {String(courses.length).padStart(2, "0")}</span>
              </span>
              <div className="flex flex-1 gap-1.5" aria-hidden>
                {courses.map((c, i) => (
                  <span key={c.slug} className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      ref={(el) => {
                        bars.current[i] = el;
                      }}
                      className="block h-full origin-left bg-brand"
                      style={{ transform: i === 0 ? "scaleX(1)" : "scaleX(0)" }}
                    />
                  </span>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 flex-1">
              {courses.map((c, i) => (
                <div
                  key={c.slug}
                  ref={(el) => {
                    slides.current[i] = el;
                  }}
                  aria-hidden={i > 0}
                  className="flex flex-col gap-5 [grid-area:1/1] will-change-transform lg:justify-between lg:gap-6"
                  style={i > 0 ? { opacity: 0, pointerEvents: "none" } : undefined}
                >
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">{c.category}</p>
                    <h3 className="mt-3 text-3xl leading-[1.05] font-semibold tracking-tight text-balance text-ink sm:text-5xl lg:mt-4">
                      {c.title}
                    </h3>
                    <p className="mt-3 text-lg text-muted sm:text-xl">{c.tagline}</p>
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <BookOpen className="size-4" />
                      </span>
                      You&apos;ll learn
                    </h4>
                    {/* one panel split by hairlines; 6 topics on desktop, 4 on phones */}
                    <ul className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line sm:grid-cols-3">
                      {c.highlights.map((h, j) => (
                        <li
                          key={h}
                          className={`flex items-center gap-2.5 bg-white px-3.5 py-3 transition-colors hover:bg-mist ${j > 3 ? "hidden sm:flex" : ""}`}
                        >
                          <Check className="size-4 shrink-0 text-brand" strokeWidth={2.75} />
                          <p className="text-sm leading-snug font-medium text-ink">{h}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="hidden sm:block">
                    <h4 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <BriefcaseBusiness className="size-4" />
                      </span>
                      Placements
                    </h4>
                    {recruiterLogos(c).length > 0 ? (
                      <ul className="mt-3 grid grid-cols-4 gap-2">
                        {recruiterLogos(c).map((p) => (
                          <li
                            key={p.name}
                            className={`relative h-11 overflow-hidden rounded-xl ${p.bg ? "px-1.5 py-1" : "px-3 py-2"}`}
                            style={{ backgroundColor: p.bg ?? p.tint ?? "var(--color-mist)" }}
                          >
                            {/* solid-colour logos fill the card; logos drawn on white blend into their brand tint */}
                            <span className="relative block size-full">
                              <Image
                                src={p.logo}
                                alt={p.name}
                                fill
                                sizes="160px"
                                className={`object-contain ${p.bg ? "" : "mix-blend-multiply"}`}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {c.recruiters.map((r) => (
                          <li key={r} className="rounded-xl bg-mist px-3.5 py-2.5 text-sm font-medium text-ink">
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center gap-4 rounded-[1.75rem] bg-mist p-2.5 pl-5 sm:gap-8 sm:p-3 sm:pl-7">
                    <dl className="flex flex-1 items-center gap-4 sm:gap-8">
                      <div>
                        <dt className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
                          <Clock className="size-4" /> Duration
                        </dt>
                        <dd className="mt-1 text-base font-semibold whitespace-nowrap text-ink sm:text-lg">
                          {c.duration}
                        </dd>
                      </div>
                      <span className="h-10 w-px bg-line" />
                      <div>
                        <dt className="flex items-center gap-1.5 text-xs text-muted sm:text-sm">
                          <GraduationCap className="size-4" /> Eligibility
                        </dt>
                        <dd className="mt-1 text-base font-semibold whitespace-nowrap text-ink sm:text-lg">
                          {c.eligibility.split(",")[0]}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      href={`/courses/${c.slug}`}
                      aria-label={`Explore ${c.title}`}
                      className="group inline-flex shrink-0 items-center gap-2.5 rounded-2xl bg-ink px-4 py-4 text-base font-semibold text-white transition hover:bg-brand sm:px-7 sm:py-[1.125rem]"
                    >
                      <span className="hidden sm:inline">Explore course</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
