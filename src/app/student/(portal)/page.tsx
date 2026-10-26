import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, Briefcase, CalendarDays, CalendarClock, CircleCheck, IndianRupee, MapPin, Megaphone, Pin, Sparkles } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { airlineBrand } from "@/lib/airlines";
import { getAnnouncements, getFees, getJobs, type HiringEvent } from "@/lib/data";
import { courseStyle } from "@/lib/course-style";
import { courseTitle, formatDate, formatINR } from "@/lib/format";
import { getCourse } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { BoardingPass } from "@/components/portal/boarding-pass";
import { BrandLogo } from "@/components/portal/card-grid";
import { eventHref, typeLabel } from "@/components/portal/event-list";
import { jobHref } from "@/components/portal/job-list";
import { Card } from "@/components/portal/ui";

const DAY = 86_400_000;
const requestTime = () => Date.now();
const istHour = (now: number) => Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(now));
const istDay = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
const monthShort = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

function ago(iso: string, now: number) {
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 7 * 1440) return `${Math.floor(mins / 1440)}d`;
  return formatDate(iso);
}

function QuickStat({ icon, label, value, hint, href, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string; href: string; tone: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_10px_28px_-20px_rgba(24,24,27,0.45)]">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted">{label}</span>
        <span className="block text-base leading-tight font-semibold tabular-nums text-ink">{value}</span>
        <span className="block truncate text-[11px] text-muted">{hint}</span>
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}

export default async function StudentDashboard() {
  const profile = await requireStudent();
  const now = requestTime();
  const today = istDay(now);
  const supabase = await createClient();
  const [fees, announcements, jobs, events, weekJobs] = await Promise.all([
    getFees(profile.id, profile.fee_total),
    getAnnouncements(5),
    getJobs({ limit: 4 }),
    supabase.from("all_hiring_events").select("*").eq("is_active", true).gte("event_date", today).order("event_date").limit(4),
    supabase
      .from("all_jobs")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("posted_at", istDay(now - 7 * DAY)),
  ]);
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

      <BoardingPass profile={profile} duration={course?.duration} />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat
          href="/student/fees"
          icon={fees.due > 0 ? <IndianRupee className="size-4" /> : <CircleCheck className="size-4" />}
          tone={fees.due > 0 ? "bg-amber-50 text-amber-700" : "bg-good/10 text-good"}
          label="Fees paid"
          value={`${Math.round(paidShare * 100)}%`}
          hint={fees.due > 0 ? `${formatINR(fees.due)} left to pay` : "All clear 🎉"}
        />
        <QuickStat
          href="/student/profile"
          icon={<CalendarDays className="size-4" />}
          tone="bg-sky-50 text-sky-700"
          label="Days in training"
          value={days}
          hint={`Since ${formatDate(profile.joined_on)}`}
        />
        <QuickStat
          href="/student/jobs"
          icon={<CalendarClock className="size-4" />}
          tone="bg-violet-50 text-violet-700"
          label="Hiring events"
          value={upcoming.length ? formatDate(upcoming[0].event_date).replace(/ \d{4}$/, "") : "—"}
          hint={upcoming.length ? `Next: ${upcoming[0].brand}` : "None scheduled"}
        />
        <QuickStat
          href="/student/jobs"
          icon={<Briefcase className="size-4" />}
          tone="bg-rose-50 text-rose-700"
          label="New jobs this week"
          value={weekJobs.count ?? 0}
          hint="Across all airlines"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        {/* Announcements as a feed */}
        <section className="overflow-hidden rounded-2xl border border-line bg-white lg:col-span-3">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Megaphone className="size-4 text-muted" strokeWidth={1.75} /> Notice board
            </h2>
            <span className="text-[11px] text-muted">From the Millennium team</span>
          </header>
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-mist text-muted">
                <Megaphone className="size-5" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">No announcements yet</p>
              <p className="mt-1 text-xs text-muted">Class updates and notices will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className={`px-4 py-3 ${a.pinned ? "bg-amber-50/40" : ""}`}>
                  {a.pinned && (
                    <p className="mb-1 ml-12 flex items-center gap-1 text-[10.5px] font-semibold text-amber-700">
                      <Pin className="size-3" /> Pinned
                    </p>
                  )}
                  <div className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-[11px] font-bold text-white">M</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-[13px]">
                        <span className="font-semibold text-ink">Millennium</span>
                        <BadgeCheck className="size-3.5 fill-sky-500 text-white" />
                        <span className="text-muted">
                          · {a.course_slug ? courseTitle(a.course_slug) : "Everyone"} · {ago(a.created_at, now)}
                        </span>
                      </p>
                      <h3 className="mt-1 text-[13.5px] font-semibold text-ink">{a.title}</h3>
                      {a.body && <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-ink-soft">{a.body}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5 lg:col-span-2">
          <Card
            title="Upcoming hiring events"
            action={
              <Link href="/student/jobs" className="text-[11.5px] font-medium text-muted hover:text-ink">
                See all
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">No upcoming events right now — check back soon.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((e) => {
                  const d = new Date(`${e.event_date}T00:00:00Z`);
                  const isToday = e.event_date === today;
                  return (
                    <li key={`${e.source}:${e.id}`}>
                      <Link href={eventHref("/student/jobs", e)} className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-mist/70">
                        <span className={`flex w-11 shrink-0 flex-col items-center rounded-lg border py-1 ${isToday ? "border-good/30 bg-good/10 text-good" : "border-line bg-white text-ink"}`}>
                          <span className="text-[9.5px] font-semibold tracking-wider uppercase opacity-70">{monthShort.format(d)}</span>
                          <span className="text-base leading-none font-bold">{d.getUTCDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink group-hover:underline">{e.title}</span>
                          <span className="flex items-center gap-1 truncate text-[11.5px] text-muted">
                            {e.brand} · {typeLabel[e.event_type]}
                            {e.city && (
                              <>
                                <MapPin className="ml-1 size-3 shrink-0" /> {e.city}
                              </>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Latest airline jobs"
            action={
              <Link href="/student/jobs" className="text-[11.5px] font-medium text-muted hover:text-ink">
                View all
              </Link>
            }
          >
            {jobs.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">New openings will show up here.</p>
            ) : (
              <ul className="space-y-1">
                {jobs.map((j) => (
                  <li key={`${j.source}:${j.id}`}>
                    <Link href={jobHref("/student/jobs", j)} className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-mist/70">
                      <span className="origin-left scale-[0.7] -mr-6 -my-2">
                        <BrandLogo brand={airlineBrand(j.source, j.company)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink group-hover:underline">{j.title}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {j.company}
                          {j.location && ` · ${j.location}`}
                        </span>
                      </span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {course && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid lg:grid-cols-[16rem_1fr]">
            <div
              className="relative min-h-36 bg-cover bg-center"
              style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.65)), url(${course.image})` }}
            >
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[10.5px] font-semibold tracking-[0.14em] uppercase opacity-80">Your programme</p>
                <p className="text-[15px] font-semibold">{course.title}</p>
                <p className="text-[11.5px] opacity-80">{course.duration}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[12.5px] leading-relaxed text-muted">{course.summary}</p>
              <p className="mt-4 mb-2 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Flight path</p>
              <ol className="flex flex-wrap gap-1.5">
                {course.modules.map((m, i) => (
                  <li key={m} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pr-2.5 pl-0.5 text-xs text-ink-soft">
                    <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: style.color }}>
                      {i + 1}
                    </span>
                    {m}
                  </li>
                ))}
              </ol>
              {course.roles.length > 0 && (
                <>
                  <p className="mt-4 mb-2 text-[10.5px] font-semibold tracking-[0.12em] text-muted uppercase">Where this can take you</p>
                  <div className="flex flex-wrap gap-1.5">
                    {course.roles.map((r) => (
                      <span key={r} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.chip}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
