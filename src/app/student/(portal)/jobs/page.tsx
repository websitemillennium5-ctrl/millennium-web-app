import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { getEvents, getRecruiterEmails, searchJobs } from "@/lib/data";
import { eventMatchesRole } from "@/lib/airlines";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { EVENTS_PREVIEW, JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { EventList } from "@/components/portal/event-list";
import { JobFilters, JobFiltersSheet, JobNavProvider, JobResults, JobResultsBar } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";
import { PageTitle } from "@/components/portal/ui";

export default async function StudentJobs({ searchParams }: PageProps<"/student/jobs">) {
  const profile = await requireStudent();
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents, recruiters] = await Promise.all([searchJobs(query), getEvents({ search: query.q }), getRecruiterEmails()]);
  // Hiring events sit above the openings on the first page, narrowed by the same search and airline filters;
  // the filter sheet's button counts them on every page. Only the first few are shown here (Indian airlines
  // first), with a link to the full list, so the page stays small however many drives are on.
  const matchingEvents = allEvents.filter((e) => eventMatchesSources(e.source, query.source) && eventMatchesRole(e, query.role));
  matchingEvents.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));
  const events = query.page === 1 ? matchingEvents.slice(0, EVENTS_PREVIEW) : [];

  return (
    <>
      <ScrollReset key={query.page} />
      <PageTitle title="Airline jobs" />
      <JobNavProvider basePath="/student/jobs" query={query}>
        {/* Same layout as the public jobs board on a phone: search and role tabs up top, the rest in a bottom sheet */}
        <JobFilters basePath="/student/jobs" query={query} total={total} sidebar />
        <JobFiltersSheet basePath="/student/jobs" query={query} total={total} eventCount={matchingEvents.length} />
        <JobResultsBar basePath="/student/jobs" query={query} total={total} eventCount={query.page === 1 ? matchingEvents.length : 0} />
        <JobResults>
          {events.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">Upcoming hiring events</h2>
                {matchingEvents.length > events.length && (
                  <Link href={jobQueryHref("/student/jobs/events", query)} className="inline-flex items-center gap-0.5 text-xs font-medium text-[#a7222d] hover:underline">
                    All {matchingEvents.length} events <ChevronRight className="size-3.5" />
                  </Link>
                )}
              </div>
              <EventList events={events} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />
            </section>
          )}
          <JobList jobs={jobs} basePath="/student/jobs" recruiters={recruiters} applicant={profile} />
          <Pagination
            page={Math.min(query.page, pageCount)}
            pageCount={pageCount}
            total={total}
            pageSize={JOBS_PAGE_SIZE}
            href={(page) => jobQueryHref("/student/jobs", query, { page })}
          />
        </JobResults>
      </JobNavProvider>
    </>
  );
}
