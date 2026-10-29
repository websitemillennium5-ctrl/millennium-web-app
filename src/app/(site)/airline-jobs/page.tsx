import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getEvents, searchJobs } from "@/lib/data";
import { eventMatchesRole } from "@/lib/airlines";
import { eventMatchesSources, isIndianSource } from "@/lib/job-sources";
import { EVENTS_PREVIEW, JOBS_PAGE_SIZE, jobQueryHref, parseJobQuery } from "@/lib/job-query";
import { CtaBand } from "@/components/ui";
import { EventList } from "@/components/portal/event-list";
import { JobFilters, JobFiltersSheet, JobFiltersSidebar, JobNavProvider, JobResults, JobResultsBar } from "@/components/portal/job-filters";
import { JobList } from "@/components/portal/job-list";
import { JobsBoardHeading } from "@/components/portal/jobs-skeleton";
import { Pagination } from "@/components/portal/pagination";
import { ScrollReset } from "@/components/portal/scroll-reset";

export const metadata: Metadata = {
  title: "Airline Jobs",
  description:
    "Free, up-to-date cabin crew, ground staff, airport and hotel job openings plus walk-in interviews from IndiGo, Air India, Akasa Air, Emirates, Qatar Airways, Etihad, Marriott, Hilton, Taj and more.",
};

// Public version of the student jobs page: same listings (active ones only, via the anon RLS policy), no login.
export default async function AirlineJobsPage({ searchParams }: PageProps<"/airline-jobs">) {
  const query = parseJobQuery(await searchParams);
  const [{ jobs, total, pageCount }, allEvents] = await Promise.all([searchJobs(query), getEvents({ search: query.q })]);
  const matchingEvents = allEvents.filter((e) => eventMatchesSources(e.source, query.source) && eventMatchesRole(e, query.role));
  // Only the first few events are listed (Indian airlines first), on the first page only, with a link to the full
  // list; the mobile sheet's button counts them on every page.
  matchingEvents.sort((a, b) => Number(isIndianSource(b.source)) - Number(isIndianSource(a.source)));
  const events = query.page === 1 ? matchingEvents.slice(0, EVENTS_PREVIEW) : [];

  return (
    <>
      <section className="portal container-x pt-28 pb-12 lg:pt-36 lg:pb-16">
        <JobsBoardHeading />
        <ScrollReset key={query.page} />
        <JobNavProvider basePath="/airline-jobs" query={query}>
          <JobFilters basePath="/airline-jobs" query={query} total={total} sidebar />
          <JobFiltersSheet basePath="/airline-jobs" query={query} total={total} eventCount={matchingEvents.length} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
            {/* data-lenis-prevent: let the wheel scroll this column instead of the site-wide smooth scroll */}
            <div data-lenis-prevent className="scrollbar-none hidden min-w-0 lg:sticky lg:block lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:overscroll-contain">
              <JobFiltersSidebar basePath="/airline-jobs" query={query} />
            </div>
            <div className="min-w-0">
              <JobResultsBar basePath="/airline-jobs" query={query} total={total} eventCount={query.page === 1 ? matchingEvents.length : 0} />
              <JobResults>
                {events.length > 0 && (
                  <section className="mb-8">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h2 className="text-sm font-semibold text-ink">Upcoming hiring events</h2>
                      {matchingEvents.length > events.length && (
                        <Link href={jobQueryHref("/airline-jobs/events", query)} className="inline-flex items-center gap-0.5 text-xs font-medium text-[#a7222d] hover:underline">
                          All {matchingEvents.length} events <ChevronRight className="size-3.5" />
                        </Link>
                      )}
                    </div>
                    <EventList events={events} basePath="/airline-jobs" gated />
                  </section>
                )}
                <JobList jobs={jobs} basePath="/airline-jobs" gated />
                <Pagination
                  page={Math.min(query.page, pageCount)}
                  pageCount={pageCount}
                  total={total}
                  pageSize={JOBS_PAGE_SIZE}
                  href={(page) => jobQueryHref("/airline-jobs", query, { page })}
                />
              </JobResults>
            </div>
          </div>
        </JobNavProvider>
      </section>

      <CtaBand />
    </>
  );
}
