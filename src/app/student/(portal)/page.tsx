import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Briefcase, CalendarDays, CalendarClock, ChevronRight, CircleCheck, IndianRupee, MapPin, Megaphone, Sparkles } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { airlineBrand } from "@/lib/airlines";
import { getAnnouncements, getFees, getJobs, type HiringEvent } from "@/lib/data";
import { courseStyle } from "@/lib/course-style";
import { formatDate, formatINR } from "@/lib/format";
import { getCourse } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { BoardingPass } from "@/components/portal/boarding-pass";
import { BrandLogo } from "@/components/portal/card-grid";
import { eventHref, typeLabel } from "@/components/portal/event-list";
import { jobHref } from "@/components/portal/job-list";

const DAY = 86_400_000;
const requestTime = () => Date.now();
const istHour = (now: number) => Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now));
const istDay = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
const monthShort = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });
const weekdayShort = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });

/** "Today", "Yesterday", "3d ago", then "2w ago", for a job's posted date (YYYY-MM-DD) against today's IST date */
function postedAgo(posted: string, today: string) {
  const days = Math.round((Date.parse(today) - Date.parse(posted.slice(0, 10))) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function QuickStat({
  icon,
  label,
  value,
  hint,
  href,
  color,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  href: string;
  /** accent colour for the icon, glow and progress bar */
  color: string;
  /** 0–1, drawn as a thin bar under the value */
  progress?: number;
}) {
  return (
    <Link
      href={href}
      className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-line bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-22px_rgba(24,24,27,0.5)] active:scale-[0.98]"
    >
      {/* soft colour wash in the corner */}
      <span aria-hidden className="absolute -top-10 -right-10 -z-10 size-28 rounded-full opacity-[0.13] blur-2xl" style={{ background: color }} />
      <span className="flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: color, boxShadow: `0 6px 14px -6px ${color}` }}>
          {icon}
        </span>
        <span className="flex size-6 items-center justify-center rounded-full bg-mist text-muted transition group-hover:bg-ink group-hover:text-white">
          <ArrowUpRight className="size-3.5" />
        </span>
      </span>
      <span className="mt-3 block text-[22px] leading-none font-semibold tracking-tight tabular-nums text-ink">{value}</span>
      <span className="mt-1.5 block text-[12px] font-medium text-ink-soft">{label}</span>
      {progress !== undefined ? (
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-mist">
          <span className="block h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: color }} />
        </span>
      ) : null}
      <span className="mt-1.5 block truncate text-[11px] text-muted">{hint}</span>
    </Link>
  );
}

export default async function StudentDashboard() {
  const profile = await requireStudent();
  const now = requestTime();
  const today = istDay(now);
  const supabase = await createClient();
  const [fees, jobs, events, weekJobs, announcements] = await Promise.all([
    getFees(profile.id, profile.fee_total),
    getJobs({ limit: 4 }),
    supabase.from("all_hiring_events").select("*").eq("is_active", true).gte("event_date", today).order("event_date").limit(6),
    supabase
      .from("all_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("posted_at", istDay(now - 7 * DAY)),
    getAnnouncements(20),
  ]);
  // Announcements posted today (India time), newest first; the latest is shown above the boarding pass
  const todays = announcements
    .filter((a) => istDay(Date.parse(a.created_at)) === today)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const upcoming = (events.data ?? []) as HiringEvent[];
  const course = profile.course_slug ? getCourse(profile.course_slug) : undefined;
  const style = courseStyle(profile.course_slug);
  const firstName = profile.full_name.split(" ")[0] || "there";
  const paidShare = profile.fee_total > 0 ? Math.min(fees.paid / profile.fee_total, 1) : 1;
  const days = Math.max(1, Math.floor((now - Date.parse(`${profile.joined_on}T00:00:00+05:30`)) / DAY) + 1);
  const hour = istHour(now);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: style.color }}>
            <Sparkles className="size-3.5" /> Day {days} of your journey
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
            {greeting}, {firstName} 👋
          </h1>
        </div>
        {fees.due > 0 && (
          <Link href="/student/fees" className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100">
            <span className="size-1.5 rounded-full bg-red-500" />
            {formatINR(fees.due)} fee balance due
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>

      {todays.length > 0 && (
        <Link
          href="/student/announcements"
          className="group mb-4 flex items-start gap-3 rounded-2xl border border-[#a7222d]/15 bg-gradient-to-br from-[#a7222d]/[0.06] to-white p-3.5 transition hover:border-[#a7222d]/30 active:scale-[0.99]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#a7222d] text-white shadow-md shadow-[#a7222d]/25">
            <Megaphone className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-[#a7222d] uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-[#a7222d]" />
              Today&apos;s announcement
              {todays.length > 1 && <span className="font-medium tracking-normal normal-case text-muted">· +{todays.length - 1} more</span>}
            </span>
            <span className="mt-0.5 block truncate text-[13.5px] font-semibold text-ink">{todays[0].title}</span>
            {todays[0].body && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{todays[0].body}</span>}
          </span>
          <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      )}

      <BoardingPass profile={profile} duration={course?.duration} />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat
          href="/student/fees"
          icon={fees.due > 0 ? <IndianRupee className="size-4" /> : <CircleCheck className="size-4" />}
          color={fees.due > 0 ? "#d97706" : "#3a8a3f"}
          progress={paidShare}
          label="Fees paid"
          value={`${Math.round(paidShare * 100)}%`}
          hint={fees.due > 0 ? `${formatINR(fees.due)} left to pay` : "All clear 🎉"}
        />
        <QuickStat
          href="/student/profile"
          icon={<CalendarDays className="size-4" />}
          color="#0284c7"
          label="Days in training"
          value={days}
          hint={`Since ${formatDate(profile.joined_on)}`}
        />
        <QuickStat
          href="/student/jobs"
          icon={<CalendarClock className="size-4" />}
          color="#7c3aed"
          label="Hiring events"
          value={upcoming.length ? formatDate(upcoming[0].event_date).replace(/ \d{4}$/, "") : "—"}
          hint={upcoming.length ? `Next: ${upcoming[0].brand}` : "None scheduled"}
        />
        <QuickStat
          href="/student/jobs"
          icon={<Briefcase className="size-4" />}
          color="#a7222d"
          label="New jobs this week"
          value={weekJobs.count ?? 0}
          hint="Across all airlines"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Upcoming hiring events: a swipeable row of cards, like an app's "up next" shelf */}
        <section className="min-w-0">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CalendarClock className="size-4 text-[#7c3aed]" /> Upcoming hiring events
            </h2>
            <Link href="/student/jobs" className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-muted hover:text-ink">
              See all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white py-6 text-center text-xs text-muted">No upcoming events right now — check back soon.</p>
          ) : (
            <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
              {upcoming.map((e) => {
                const d = new Date(`${e.event_date}T00:00:00Z`);
                const isToday = e.event_date === today;
                return (
                  <li key={`${e.source}:${e.id}`} className="w-[78%] shrink-0 snap-start">
                    <Link
                      href={eventHref("/student/jobs", e)}
                      className="group flex h-full flex-col rounded-2xl border border-line bg-white p-3.5 transition hover:border-ink/15 hover:shadow-[0_14px_32px_-22px_rgba(24,24,27,0.5)] active:scale-[0.98]"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="-my-1 origin-left scale-[0.8]">
                          <BrandLogo brand={airlineBrand(e.source, e.brand)} />
                        </span>
                        {/* Minimal date pill: a live green dot for today, otherwise the weekday and date */}
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                            isToday ? "bg-good/10 text-good" : "bg-mist text-ink-soft"
                          }`}
                        >
                          {isToday ? (
                            <span className="relative flex size-1.5">
                              <span className="absolute inset-0 animate-ping rounded-full bg-good opacity-60" />
                              <span className="relative size-1.5 rounded-full bg-good" />
                            </span>
                          ) : (
                            <CalendarDays className="size-3 text-muted" />
                          )}
                          {isToday ? "Today" : `${weekdayShort.format(d)}, ${d.getUTCDate()} ${monthShort.format(d)}`}
                        </span>
                      </span>
                      <span className="mt-3 line-clamp-2 text-[13.5px] leading-snug font-semibold text-ink">{e.title}</span>
                      <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                        <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-ink-soft">{typeLabel[e.event_type]}</span>
                        {e.city && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                            <MapPin className="size-3" /> {e.city}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Briefcase className="size-4 text-[#a7222d]" /> Latest airline jobs
            </h2>
            <Link href="/student/jobs" className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-muted hover:text-ink">
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white py-6 text-center text-xs text-muted">New openings will show up here.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {jobs.map((j) => {
                const brand = airlineBrand(j.source, j.company);
                const posted = j.posted_at ? postedAgo(j.posted_at, today) : null;
                return (
                  <li key={`${j.source}:${j.id}`}>
                    <Link href={jobHref("/student/jobs", j)} className="group flex items-center gap-3 px-3.5 py-3 transition hover:bg-mist/60 active:bg-mist">
                      {brand.logo ? (
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-1.5">
                          <Image src={brand.logo} alt={brand.name} width={44} height={44} className="max-h-full w-auto object-contain" />
                        </span>
                      ) : (
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-wider text-white"
                          style={{ background: `linear-gradient(135deg, ${brand.color}, color-mix(in srgb, ${brand.color} 70%, black))` }}
                          aria-label={brand.name}
                        >
                          {brand.code}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{j.title}</span>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted">
                          <span className="shrink-0 font-medium text-ink-soft">{j.company}</span>
                          {j.location && (
                            <>
                              <MapPin className="size-3 shrink-0" />
                              <span className="truncate">{j.location}</span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        {posted && (
                          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${posted === "Today" ? "bg-good/10 text-good" : "bg-mist text-muted"}`}>
                            {posted}
                          </span>
                        )}
                        <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {course && (
        <Link
          href={`/courses/${course.slug}`}
          className="group mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-ink/15 active:scale-[0.99]"
        >
          <span className="size-12 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${course.image})` }} />
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Your programme</span>
            <span className="block truncate text-[13.5px] font-semibold text-ink">{course.title}</span>
            <span className="block text-[11.5px] text-muted">
              {course.duration} · {course.modules.length} modules
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:text-ink" />
        </Link>
      )}
    </>
  );
}
