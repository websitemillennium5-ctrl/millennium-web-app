import Link from "next/link";
import { ArrowUpRight, Pin } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getAnnouncements, getFees, getJobs } from "@/lib/data";
import { courseTitle, formatDate, formatINR } from "@/lib/format";
import { getCourse } from "@/lib/site";
import { Banner, Card, Empty, PageTitle, Stat } from "@/components/portal/ui";

export default async function StudentDashboard() {
  const profile = await requireStudent();
  const [fees, announcements, jobs] = await Promise.all([
    getFees(profile.id, profile.fee_total),
    getAnnouncements(6),
    getJobs({ limit: 4 }),
  ]);
  const course = profile.course_slug ? getCourse(profile.course_slug) : undefined;
  const firstName = profile.full_name.split(" ")[0] || "there";
  const paidShare = profile.fee_total > 0 ? fees.paid / profile.fee_total : 0;

  return (
    <>
      <PageTitle title={`Hi, ${firstName}`} text="Here's what's happening at Millennium." />

      {fees.due > 0 && (
        <div className="mb-5">
          <Banner
            action={
              <Link href="/student/fees" className="shrink-0 rounded-full bg-ink px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-ink-soft">
                View fees
              </Link>
            }
          >
            <span className="font-medium text-ink">{formatINR(fees.due)} fee balance due.</span> Pay at the front office and it will show here.
          </Banner>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Course" value={<span className="text-base">{courseTitle(profile.course_slug)}</span>} hint={course?.duration} />
        <Stat label="Batch" value={<span className="text-base">{profile.batch ?? "—"}</span>} hint={`Roll no. ${profile.roll_no ?? "—"}`} />
        <Stat label="Fees paid" value={formatINR(fees.paid)} hint={`of ${formatINR(profile.fee_total)}`} tone="good" meter={paidShare} />
        <Stat label="Balance due" value={formatINR(fees.due)} tone={fees.due > 0 ? "warn" : "good"} hint={fees.due > 0 ? "Pay at the front office" : "All clear"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card title="Announcements" className="lg:col-span-3">
          {announcements.length === 0 ? (
            <Empty>No announcements yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {announcements.map((a) => (
                <li key={a.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    {a.pinned && <Pin className="size-3.5 text-ink" />}
                    <h3 className="text-sm font-medium text-ink">{a.title}</h3>
                  </div>
                  {a.body && <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-muted">{a.body}</p>}
                  <span className="mt-2 inline-flex rounded-md border border-line bg-mist px-1.5 py-0.5 text-xs text-ink-soft">{formatDate(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {course && (
            <Card title="Your programme">
              <p className="text-[13px] leading-relaxed text-muted">{course.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {course.modules.slice(0, 6).map((m) => (
                  <span key={m} className="rounded-md border border-line bg-mist px-1.5 py-0.5 text-xs text-ink-soft">
                    {m}
                  </span>
                ))}
              </div>
            </Card>
          )}
          <Card
            title="Latest airline jobs"
            action={
              <Link href="/student/jobs" className="text-[13px] font-medium text-ink hover:underline">
                View all
              </Link>
            }
          >
            {jobs.length === 0 ? (
              <Empty>New openings will show up here.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {jobs.map((j) => (
                  <li key={`${j.source}:${j.id}`} className="py-2.5 first:pt-0 last:pb-0">
                    <a href={j.url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-medium text-ink group-hover:underline">{j.title}</span>
                        <span className="text-[13px] text-muted">
                          {j.company}
                          {j.location && ` · ${j.location}`}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted group-hover:text-ink" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
