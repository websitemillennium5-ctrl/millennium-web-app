import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getEvents, getRecruiterEmails } from "@/lib/data";
import { eventMatchesRole } from "@/lib/airlines";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { EventList } from "@/components/portal/event-list";
import { PageTitle } from "@/components/portal/ui";

/** Every upcoming hiring event matching the jobs page's filters; the jobs page itself shows only the first few. */
export default async function StudentEvents({ searchParams }: PageProps<"/student/jobs/events">) {
  const profile = await requireStudent();
  const query = parseJobQuery(await searchParams);
  const [allEvents, recruiters] = await Promise.all([getEvents({ search: query.q }), getRecruiterEmails()]);
  const events = allEvents.filter((e) => eventMatchesSources(e.source, query.source) && eventMatchesRole(e, query.role));
  events.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));

  return (
    <>
      <PageTitle
        title="Hiring events"
        text={`${events.length} upcoming walk-in${events.length === 1 ? "" : "s"}, open days and drives${query.q ? ` matching “${query.q}”` : ""}.`}
        action={
          <Link href={jobQueryHref("/student/jobs", query)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
        }
      />
      <EventList events={events} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />
    </>
  );
}
