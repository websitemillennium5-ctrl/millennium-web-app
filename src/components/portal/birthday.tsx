import Image from "next/image";
import { BadgeCheck, Cake, UserRound } from "lucide-react";
import { birthdayNote, firstName, type BirthdayStudent } from "@/lib/birthdays";
import { courseStyle } from "@/lib/course-style";
import { courseTitle } from "@/lib/format";
import { site } from "@/lib/site";

/** Birthday wishes for the signed-in student, shown on their birthday (India time). Quiet and minimal: one line, the cake. */
export function BirthdayBanner({ name, className = "" }: { name: string; className?: string }) {
  return (
    <section aria-label="Birthday wishes" className={`flex items-center gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-[0.12em] text-muted uppercase">Today</p>
        <h2 className="mt-1 text-[22px] leading-tight font-semibold tracking-tight text-ink sm:text-[26px]">Happy birthday, {firstName(name)}</h2>
        <p className="mt-1.5 text-sm text-muted">From all of us at {site.shortName}.</p>
      </div>
      <Image src="/images/birthday.svg" alt="" width={200} height={200} className="w-20 shrink-0 sm:w-24" priority />
    </section>
  );
}

/**
 * The birthday wish as a post in the notices feed, styled like the announcement cards: the academy's avatar and
 * handle, a one-line note from the founder and the team, and a cake photo (Unsplash, unsplash.com/photos/e9a21285b5f3).
 */
export function BirthdayPost({ name }: { name: string }) {
  const note = birthdayNote(name);
  return (
    <section aria-label="Birthday wishes" className="overflow-hidden rounded-2xl border border-line/70 bg-white">
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
          <p className="flex items-center gap-1 text-[13px] leading-tight font-semibold text-ink">
            Millennium
            <BadgeCheck className="size-3.5 shrink-0 fill-sky-500 text-white" />
          </p>
          <p className="mt-0.5 truncate text-[11.5px] leading-tight text-muted">@millenniumairhostess · Today</p>

          <h2 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{note.title}</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-soft">{note.body}</p>
          {/* signature block: the name, with the role and team on the line under it */}
          <p className="mt-3 text-[13px] leading-snug">
            <span className="block font-semibold text-ink">{note.signedBy}</span>
            <span className="block text-[12px] text-muted">{note.signedAs}</span>
          </p>

          <span className="mt-3 block overflow-hidden rounded-xl border border-line bg-mist">
            <Image src="/images/birthday-cake.jpg" alt="A birthday cake covered in colourful sprinkles" width={1200} height={675} sizes="(min-width: 1024px) 36rem, 100vw" className="h-auto w-full" priority />
          </span>
        </div>
      </div>
    </section>
  );
}

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
      <ul className="divide-y divide-line/70 overflow-hidden rounded-2xl border border-line/70 bg-white">
        {students.map((s) => {
          const me = s.id === selfId;
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: courseStyle(s.course_slug).color }}>
                <UserRound className="size-5" strokeWidth={1.75} />
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
              <span className="shrink-0 text-[11.5px] text-muted">🎂</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
