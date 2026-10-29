import Image from "next/image";
import { Cake, PartyPopper } from "lucide-react";
import { firstName, type BirthdayStudent } from "@/lib/birthdays";
import { courseStyle } from "@/lib/course-style";
import { courseTitle } from "@/lib/format";
import { site } from "@/lib/site";

const COLORS = ["#a7222d", "#f59e0b", "#0ea5e9", "#22c55e", "#ec4899", "#8b5cf6", "#facc15"];

// Confetti is laid out once with a seeded generator so the server and the browser render the same pieces.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const rand = seeded(2024);
const pieces = Array.from({ length: 40 }, (_, i) => ({
  left: rand() * 100,
  delay: rand() * 4,
  duration: 3.2 + rand() * 2.4,
  drift: (rand() - 0.5) * 90,
  size: 5 + rand() * 5,
  round: rand() > 0.65,
  color: COLORS[i % COLORS.length],
}));

/** Falling confetti over the parent (which must be `relative overflow-hidden`). */
export function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute -top-3 block"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.7,
              background: p.color,
              borderRadius: p.round ? "50%" : 2,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Birthday wishes for the signed-in student, shown on their birthday (India time). */
export function BirthdayBanner({ name, className = "" }: { name: string; className?: string }) {
  return (
    <section
      aria-label="Birthday wishes"
      className={`relative isolate overflow-hidden rounded-2xl border border-pink-200/70 bg-gradient-to-br from-pink-50 via-amber-50/80 to-white p-4 sm:p-5 ${className}`}
    >
      <Confetti />
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.12em] text-[#a7222d] uppercase ring-1 ring-pink-200/70">
            <PartyPopper className="size-3.5" /> It&apos;s your birthday
          </p>
          <h2 className="mt-2.5 text-[20px] leading-tight font-semibold tracking-tight text-ink sm:text-2xl">Happy birthday, {firstName(name)}! 🎂</h2>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-soft">
            Wishing you a day full of joy and a year that takes you places. With love from everyone at {site.name}.
          </p>
        </div>
        <Image src="/images/birthday.svg" alt="" width={140} height={140} className="w-24 shrink-0 sm:w-36" priority />
      </div>
    </section>
  );
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

/** Classmates celebrating today, for the notices page. Renders nothing when there are none. */
export function BirthdayList({ students, selfId }: { students: BirthdayStudent[]; selfId: string }) {
  if (students.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
        <Cake className="size-3.5 text-[#a7222d]" /> Birthdays today
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1.5 text-[10px] tracking-normal text-ink-soft tabular-nums ring-1 ring-ink/[0.06]">
          {students.length}
        </span>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
      </h2>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-pink-200/60 bg-white">
        {students.map((s) => {
          const me = s.id === selfId;
          return (
            <li key={s.id} className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-pink-50/50" : ""}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold text-white" style={{ background: courseStyle(s.course_slug).color }}>
                {initials(s.full_name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">
                  {s.full_name}
                  {me && <span className="font-medium text-muted"> (you)</span>}
                </span>
                <span className="block truncate text-[11.5px] text-muted">
                  {courseTitle(s.course_slug)}
                  {s.batch && ` · Batch ${s.batch}`}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-[#a7222d] ring-1 ring-pink-200/70">🎂 {me ? "Your day!" : "Wish them"}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-1 text-[11.5px] text-muted">Say happy birthday when you see them in class today.</p>
    </section>
  );
}
