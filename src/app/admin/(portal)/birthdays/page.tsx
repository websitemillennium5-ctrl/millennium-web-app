import Link from "next/link";
import { Cake, CalendarDays, MessageCircle, Phone, UserRound } from "lucide-react";
import { requireStaff, type Profile } from "@/lib/auth";
import { birthdayNote, isBirthdayToday } from "@/lib/birthdays";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, istDay } from "@/lib/format";
import { telHref } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, PageTitle } from "@/components/portal/ui";

const DAY = 86_400_000;
const UPCOMING_DAYS = 7;
const toUtc = (ymd: string) => Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** When this birthday next comes round, on or after `today` (both yyyy-mm-dd, India time), how far off it is and the age turned. */
function nextBirthday(dob: string, today: string) {
  const year = Number(today.slice(0, 4));
  const mmdd = dob.slice(5, 10);
  // leap-day birthdays are celebrated on 28 Feb in other years
  const inYear = (y: number) => `${y}-${mmdd === "02-29" && !isLeap(y) ? "02-28" : mmdd}`;
  const date = inYear(year) >= today ? inYear(year) : inYear(year + 1);
  return { date, days: Math.round((toUtc(date) - toUtc(today)) / DAY), age: Number(date.slice(0, 4)) - Number(dob.slice(0, 4)) };
}

/** WhatsApp link to the student with the academy's birthday wish typed in, or null without a phone number. */
function wishHref(s: Profile) {
  const digits = (s.phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const note = birthdayNote(s.full_name);
  const text = `${note.title}\n${note.body}\n— ${note.signedBy}, ${note.signedAs}`;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`;
}

const action = "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:border-ink/25 hover:bg-mist hover:text-ink";

function Row({ s, today, when }: { s: Profile; today: string; when?: string }) {
  const { age } = nextBirthday(s.date_of_birth!, today);
  const wish = wishHref(s);
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: courseStyle(s.course_slug).color }}>
        <UserRound className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <Link href={`/admin/students/${s.id}`} className="block truncate text-[13.5px] font-semibold text-ink hover:underline">
          {s.full_name}
        </Link>
        <span className="block truncate text-[11.5px] text-muted">
          {when ? `${when} · ` : ""}turns {age} · {courseTitle(s.course_slug)}
          {s.batch && ` · Batch ${s.batch}`}
        </span>
      </span>
      {s.phone && (
        <a href={telHref(s.phone)} className={action} title={s.phone}>
          <Phone className="size-3.5" strokeWidth={1.75} /> <span className="hidden sm:inline">Call</span>
        </a>
      )}
      {wish && (
        <a href={wish} target="_blank" rel="noreferrer" className={`${action} border-[#25d366]/40 text-[#128c7e] hover:border-[#25d366] hover:bg-[#25d366]/10 hover:text-[#128c7e]`}>
          <MessageCircle className="size-3.5" strokeWidth={1.75} /> <span className="hidden sm:inline">Send wishes</span>
        </a>
      )}
    </li>
  );
}

export default async function AdminBirthdays() {
  await requireStaff();
  const today = istDay();
  const supabase = await createClient();
  const [{ data }, { count: missing }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").not("date_of_birth", "is", null).order("full_name"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").is("date_of_birth", null),
  ]);
  const students = (data ?? []) as Profile[];
  const celebrating = students.filter((s) => isBirthdayToday(s.date_of_birth, today));
  const upcoming = students
    .map((s) => ({ s, ...nextBirthday(s.date_of_birth!, today) }))
    .filter((x) => x.days > 0 && x.days <= UPCOMING_DAYS)
    .sort((a, b) => a.days - b.days || a.s.full_name.localeCompare(b.s.full_name));

  return (
    <>
      <PageTitle title="Birthdays" text={`Students celebrating today, ${todayLabel.format(toUtc(today))}, and who's next this week.`} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card title={`Today${celebrating.length ? ` · ${celebrating.length}` : ""}`}>
          {celebrating.length === 0 ? (
            <Empty>
              <span className="inline-flex items-center gap-2">
                <Cake className="size-4 text-muted" strokeWidth={1.75} /> No birthdays today.
              </span>
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {celebrating.map((s) => (
                <Row key={s.id} s={s} today={today} />
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Coming up · next ${UPCOMING_DAYS} days`}>
          {upcoming.length === 0 ? (
            <Empty>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4 text-muted" strokeWidth={1.75} /> Nothing in the next week.
              </span>
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map(({ s, date, days }) => (
                <Row key={s.id} s={s} today={today} when={`${dayLabel.format(toUtc(date))} (${days === 1 ? "tomorrow" : `in ${days} days`})`} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!!missing && (
        <p className="mt-4 text-xs text-muted">
          {missing} student{missing === 1 ? " has" : "s have"} no date of birth on file yet. Add it from the student&apos;s Details form so they show up here.
        </p>
      )}
    </>
  );
}
