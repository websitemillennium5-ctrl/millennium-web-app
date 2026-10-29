import Image from "next/image";
import { BadgeCheck, Cake, PartyPopper } from "lucide-react";
import { BIRTHDAY_FROM, birthdayNote, firstName, type BirthdayStudent } from "@/lib/birthdays";
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
const pieces = Array.from({ length: 32 }, (_, i) => ({
  left: rand() * 100,
  delay: rand() * 4,
  duration: 3.6 + rand() * 2.4,
  drift: (rand() - 0.5) * 90,
  size: 4 + rand() * 4,
  round: rand() > 0.65,
  color: COLORS[i % COLORS.length],
}));

/** Falling confetti over the parent (which must be `relative overflow-hidden`); kept light so text stays readable. */
export function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
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

/**
 * Birthday wishes for the signed-in student, shown on their birthday (India time): a warm card with soft colour
 * pools in the corners, light confetti, the name in the brand gradient, a floating cake and the academy's sign-off.
 */
export function BirthdayBanner({ name, className = "" }: { name: string; className?: string }) {
  return (
    <section
      aria-label="Birthday wishes"
      className={`relative isolate overflow-hidden rounded-3xl border border-pink-200/80 bg-white p-5 shadow-[0_28px_60px_-40px_rgba(167,34,45,0.5)] sm:p-6 ${className}`}
    >
      {/* Backdrop: a gentle gradient with blurred pools of pink, amber and sky (behind the content, above the white) */}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-pink-50 via-amber-50/70 to-sky-50" />
      <span aria-hidden className="absolute -top-16 -left-12 -z-10 size-52 rounded-full bg-pink-300/40 blur-3xl" />
      <span aria-hidden className="absolute -right-12 -bottom-24 -z-10 size-64 rounded-full bg-amber-300/40 blur-3xl" />
      <span aria-hidden className="absolute top-1/2 right-[30%] -z-10 size-40 -translate-y-1/2 rounded-full bg-sky-300/30 blur-3xl" />
      <Confetti />

      <div className="relative flex items-center gap-5 sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[10.5px] font-semibold tracking-[0.14em] text-[#a7222d] uppercase shadow-sm ring-1 ring-pink-200/80 backdrop-blur">
            <PartyPopper className="size-3.5" /> It&apos;s your birthday
          </p>
          <h2 className="mt-3 text-[24px] leading-[1.1] font-semibold tracking-tight text-balance text-ink sm:text-[30px]">
            Happy birthday, <span className="bg-gradient-to-r from-[#a7222d] via-[#e11d48] to-[#f59e0b] bg-clip-text text-transparent">{firstName(name)}!</span>
          </h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft sm:text-sm">Wishing you a day full of joy and a year that takes you places.</p>
          <p className="mt-4 flex items-center gap-2 text-[12px] text-muted">
            <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-line">
              <Image src="/images/logo-mark.png" alt="" width={48} height={48} className="size-full scale-[1.35] object-contain" />
            </span>
            <span>
              With love from everyone at <span className="font-medium text-ink-soft">{site.name}</span>
            </span>
          </p>
        </div>

        <div className="relative shrink-0">
          {/* soft white glow so the cake sits on the backdrop rather than floating over the confetti */}
          <span aria-hidden className="absolute inset-0 -z-10 scale-110 rounded-full bg-white/70 blur-2xl" />
          <Image src="/images/birthday.svg" alt="" width={200} height={200} className="animate-float w-28 drop-shadow-[0_18px_24px_rgba(167,34,45,0.18)] sm:w-44" priority />
        </div>
      </div>
    </section>
  );
}

/**
 * The birthday wish as a post in the notices feed, styled like the announcement cards: the academy's avatar and
 * handle, a note from the founder and the team, and a cake photo (Unsplash, unsplash.com/photos/e9a21285b5f3).
 */
export function BirthdayPost({ name }: { name: string }) {
  const note = birthdayNote(name);
  return (
    <section aria-label="Birthday wishes" className="overflow-hidden rounded-2xl border border-pink-200/70 bg-white">
      <div className="flex gap-3 px-4 py-4">
        <span className="relative h-fit shrink-0">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-line">
            <Image src="/images/logo-mark.png" alt="" width={80} height={80} className="size-full scale-[1.35] object-contain" />
          </span>
          <span aria-hidden className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full bg-[#a7222d] text-white ring-2 ring-white">
            <Cake className="size-2.5" strokeWidth={2.25} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-[13px] leading-tight font-semibold text-ink">
                Millennium
                <BadgeCheck className="size-3.5 shrink-0 fill-sky-500 text-white" />
              </p>
              <p className="mt-0.5 truncate text-[11.5px] leading-tight text-muted">@millenniumairhostess · Today</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pink-50 px-2 py-1 text-[10px] leading-none font-semibold text-[#a7222d] ring-1 ring-pink-200/70">
              <PartyPopper className="size-3" /> Birthday
            </span>
          </div>

          <h2 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{note.title}</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{note.body}</p>
          <p className="mt-2 text-[13px] text-ink-soft">
            — <span className="font-semibold text-ink">{BIRTHDAY_FROM.name}</span>, {BIRTHDAY_FROM.role}, and the Millennium team
          </p>

          <span className="mt-3 block overflow-hidden rounded-xl border border-line bg-mist">
            <Image src="/images/birthday-cake.jpg" alt="A birthday cake covered in colourful sprinkles" width={1200} height={675} sizes="(min-width: 1024px) 36rem, 100vw" className="h-auto w-full" priority />
          </span>
        </div>
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
